from datetime import datetime, timedelta, timezone
import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.event_model import Event, EventReminder
from app.models.notification_model import NotificationType
from app.models.user_model import User
from app.services.notification_service import NotificationService
from app.services.email_service import send_event_reminder_email


class EventReminderService:

    @staticmethod
    def create_reminder(db: Session, *, event_id: uuid.UUID, user: User, option: str) -> EventReminder:
        event = db.query(Event).filter(Event.id == event_id).first()
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found")

        if event.organizer_id != user.id:
            from app.models.event_model import EventParticipant

            my_participation = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == user.id,
                )
                .first()
            )
            if my_participation is None:
                raise HTTPException(status_code=403, detail="You must join the event to set a reminder")

        delta_map = {
            "one_week": timedelta(days=7),
            "three_days": timedelta(days=3),
            "one_day": timedelta(days=1),
        }
        if option not in delta_map:
            raise HTTPException(
                status_code=400,
                detail="Invalid reminder option. Use one_week, three_days, or one_day",
            )

        existing_unsent = (
            db.query(EventReminder)
            .filter(
                EventReminder.event_id == event.id,
                EventReminder.user_id == user.id,
                EventReminder.option == option,
                EventReminder.is_sent == False,
            )
            .first()
        )
        if existing_unsent is not None:
            raise HTTPException(status_code=409, detail="Reminder for this option already exists")

        remind_at = event.start_datetime - delta_map[option]
        reminder = EventReminder(
            event_id=event.id,
            user_id=user.id,
            option=option,
            remind_at=remind_at,
            is_sent=False,
        )
        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        return reminder

    @staticmethod
    def delete_pending_reminders(db: Session, *, event_id: uuid.UUID, user_id: uuid.UUID) -> None:
        reminders = (
            db.query(EventReminder)
            .filter(
                EventReminder.event_id == event_id,
                EventReminder.user_id == user_id,
                EventReminder.is_sent == False,
            )
            .all()
        )
        if not reminders:
            raise HTTPException(status_code=404, detail="No active reminder found")

        for r in reminders:
            db.delete(r)
        db.commit()

    @staticmethod
    def list_my_reminders(db: Session, *, user_id: uuid.UUID, upcoming_only: bool) -> list[EventReminder]:
        now_utc = datetime.now(timezone.utc)
        q = db.query(EventReminder).filter(EventReminder.user_id == user_id)
        if upcoming_only:
            q = q.filter(EventReminder.remind_at >= now_utc, EventReminder.is_sent == False)
        return q.order_by(EventReminder.remind_at.asc()).all()

    @staticmethod
    def run_due_for_user(db: Session, *, user: User, limit: int) -> list[EventReminder]:
        now = datetime.now(timezone.utc)
        due = (
            db.query(EventReminder)
            .filter(
                EventReminder.user_id == user.id,
                EventReminder.is_sent == False,
                EventReminder.remind_at <= now,
            )
            .order_by(EventReminder.remind_at.asc())
            .limit(limit)
            .all()
        )

        processed: list[EventReminder] = []
        for r in due:
            event = db.query(Event).filter(Event.id == r.event_id).first()
            if event is None:
                r.is_sent = True
                r.sent_at = now
                db.add(r)
                continue

            NotificationService.create_notification(
                db=db,
                recipient_id=r.user_id,
                actor_id=r.user_id,
                type=NotificationType.event,
                content=f"Reminder: '{event.title}' starts at {event.start_datetime}",
                link_url=f"/main/events/{event.id}",
            )

            if user.email:
                try:
                    send_event_reminder_email(email=user.email, event=event, when_label=r.option)
                except Exception:
                    pass

            r.is_sent = True
            r.sent_at = now
            db.add(r)
            processed.append(r)

        db.commit()
        for pr in processed:
            db.refresh(pr)
        return processed
