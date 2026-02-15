import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.models.event_model import Event, EventParticipant, EventParticipantStatus, EventPaymentStatus
from app.models.notification_model import NotificationType
from app.models.user_model import User
from app.services.notification_service import NotificationService
from app.services import cloudinary_service


class EventPaymentService:

    @staticmethod
    def upload_payment_proof(
        db: Session,
        *,
        event_id: uuid.UUID,
        file: UploadFile,
        current_user: User,
    ) -> EventParticipant:
        event = db.query(Event).filter(Event.id == event_id).first()
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found")

        participant = (
            db.query(EventParticipant)
            .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == current_user.id)
            .first()
        )
        if participant is None:
            raise HTTPException(status_code=404, detail="You are not a participant")

        try:
            url = cloudinary_service.upload_file(file, "payment_proofs")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

        participant.payment_proof_url = url
        participant.payment_status = EventPaymentStatus.pending
        if participant.status == EventParticipantStatus.rejected:
            participant.status = EventParticipantStatus.pending

        db.add(participant)
        db.commit()
        db.refresh(participant)

        NotificationService.create_notification(
            db=db,
            recipient_id=event.organizer_id,
            actor_id=current_user.id,
            type=NotificationType.event,
            content=f"Participant {current_user.full_name} uploaded payment proof for '{event.title}'",
            link_url=f"/main/events/{event.id}?tab=participants&filter=pending",
        )
        db.commit()

        return participant

    @staticmethod
    def verify_participant_payment(
        db: Session,
        *,
        event_id: uuid.UUID,
        participant_id: uuid.UUID,
        new_status: EventParticipantStatus,
        current_user: User,
    ) -> EventParticipant:
        event = db.query(Event).filter(Event.id == event_id).first()
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found")

        is_admin = any(getattr(role, "name", None) == "admin" for role in getattr(current_user, "roles", []))
        if event.organizer_id != current_user.id and not is_admin:
            raise HTTPException(status_code=403, detail="Only organizer or admin can verify payments")

        participant = (
            db.query(EventParticipant)
            .filter(EventParticipant.id == participant_id, EventParticipant.event_id == event.id)
            .first()
        )
        if participant is None:
            raise HTTPException(status_code=404, detail="Participant not found")

        if new_status == EventParticipantStatus.accepted:
            participant.payment_status = EventPaymentStatus.verified
            participant.status = EventParticipantStatus.accepted
        elif new_status == EventParticipantStatus.rejected:
            participant.payment_status = EventPaymentStatus.rejected
            participant.status = EventParticipantStatus.rejected

        db.add(participant)
        db.commit()
        db.refresh(participant)

        if participant.user_id:
            NotificationService.create_notification(
                db=db,
                recipient_id=participant.user_id,
                actor_id=current_user.id,
                type=NotificationType.event,
                content=(
                    f"Your payment for '{event.title}' has been {participant.payment_status.value}. "
                    f"Status: {participant.status.value}"
                ),
                link_url=f"/main/events/{event.id}",
            )
            db.commit()

        return participant

    @staticmethod
    def update_event_payment_qr(
        db: Session,
        *,
        event_id: uuid.UUID,
        file: UploadFile,
        current_user: User,
    ) -> Event:
        event = db.query(Event).filter(Event.id == event_id).first()
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found")

        if event.organizer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only organizer can upload payment QR")

        url = cloudinary_service.upload_file(file, "event_payment_qr")
        event.payment_qr_url = url
        db.add(event)
        db.commit()
        db.refresh(event)
        return event
