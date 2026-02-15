import resend
from app.core.config import settings
import logging
import uuid
from typing import Optional
from app.models.event_model import Event, EventParticipantRole
from datetime import datetime
from app.models.event_model import EventProposal
from app.models.communication_log_model import CommunicationLog, CommunicationType, CommunicationStatus
from app.database.database import SessionLocal

logger = logging.getLogger(__name__)

resend.api_key = settings.RESEND_API_KEY


def _format_dt(dt: datetime) -> str:
    try:
        if dt.tzinfo:
            return dt.strftime("%b %d, %Y %H:%M %Z")
        return dt.strftime("%b %d, %Y %H:%M")
    except Exception:
        return str(dt)


def _wrap_html(title: str, inner_html: str) -> str:
    return (
        "<div style=\"background:#f6f9fc;padding:24px;font-family:Arial,Helvetica,sans-serif;\">"
        "<div style=\"max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);\">"
        "<div style=\"background:#0f172a;padding:24px;\">"
        f"<h2 style=\"margin:0;font-size:20px;font-weight:bold;color:#ffffff;text-align:center;\">{title}</h2>"
        "</div>"
        "<div style=\"padding:24px;color:#0f172a;\">"
        f"{inner_html}"
        "</div>"
        "<div style=\"padding:16px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;\">"
        "ATAS • This is an automated message."
        "</div>"
        "</div>"
        "</div>"
    )

def _log_and_send(email: str, subject: str, html: str, metadata: dict = None):
    """
    Helper to log email attempt to DB and send via Resend.
    """
    # Sanitize metadata for JSON serialization (convert UUIDs to strings)
    sanitized_metadata = {}
    if metadata:
        for k, v in metadata.items():
            if isinstance(v, (uuid.UUID,)):
                sanitized_metadata[k] = str(v)
            else:
                sanitized_metadata[k] = v

    db = SessionLocal()
    log = CommunicationLog(
        type=CommunicationType.EMAIL,
        recipient=email,
        subject=subject,
        content=html, # Or maybe just summary? No, content is fine if not too huge.
        status=CommunicationStatus.PENDING,
        metadata_payload=sanitized_metadata or {}
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    params = {
        "from": settings.SENDER_EMAIL,
        "to": [email],
        "subject": subject,
        "html": html,
    }

    try:
        resend.Emails.send(params)
        log.status = CommunicationStatus.SENT
        db.commit()
    except Exception as e:
        logger.error(f"Error sending email to {email}: {e}")
    
        log.status = CommunicationStatus.FAILED
        log.error_message = str(e)
        db.commit()
    finally:
        db.close()

def send_verification_email(email: str, token: str):
    # token is now a 6-digit code
    verify_link = f"{settings.FRONTEND_BASE_URL}/verify/{token}?email={email}"
    html = _wrap_html(
        "Verify your email",
        (
            f"<p style=\"margin:0 0 12px;\">Please verify your email address to activate your account.</p>"
            f"<div style=\"background:#f3f4f6;padding:16px;text-align:center;border-radius:8px;margin:16px 0;\">"
            f"<span style=\"font-size:24px;font-weight:bold;letter-spacing:4px;color:#111827;\">{token}</span>"
            f"</div>"
            f"<p style=\"margin:0 0 16px;color:#6b7280;font-size:14px;text-align:center;\">Enter this code in the verification page, or click the button below:</p>"
            f"<div style=\"text-align:center;\">"
            f"<a href=\"{verify_link}\" style=\"display:inline-block;background:#ca8a04;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;\">Verify Email</a>"
            f"</div>"
        ),
    )
    _log_and_send(email, "Verify your email address", html, {"type": "verification"})

def send_password_reset_email(email: str, token: str):
    # token is now a 6-digit code
    html = _wrap_html(
        "Reset your password",
        (
            f"<p style=\"margin:0 0 12px;\">Use the following code to reset your password.</p>"
            f"<div style=\"background:#f3f4f6;padding:16px;text-align:center;border-radius:8px;margin:16px 0;\">"
            f"<span style=\"font-size:24px;font-weight:bold;letter-spacing:4px;color:#111827;\">{token}</span>"
            f"</div>"
            f"<p style=\"margin:0;color:#6b7280;font-size:14px;text-align:center;\">Enter this code in the password reset page.</p>"
        ),
    )
    _log_and_send(email, "Reset your password", html, {"type": "password_reset"})

def send_event_joined_email(email: str, event: Event):
    """Send a confirmation email when a user joins a public event."""
    event_link = f"{settings.FRONTEND_BASE_URL}/events/{event.id}"
    subject = f"You're registered: {event.title}"
    html = _wrap_html(
        subject,
        (
            f"<p style=\"margin:0 0 12px;\">Thank you for registering for <strong>{event.title}</strong>.</p>"
            f"<p style=\"margin:0 0 16px;\"><strong>Starts:</strong> {_format_dt(event.start_datetime)}</p>"
            f"<a href=\"{event_link}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;\">View Event</a>"
        ),
    )
    _log_and_send(email, subject, html, {"type": "event_joined", "event_id": event.id})


def send_event_invitation_email(email: str, event: Event, role: EventParticipantRole, description: Optional[str] = None):
    """Send an invitation email to a participant for an event."""
    event_link = f"{settings.FRONTEND_BASE_URL}/events/{event.id}"
    subject = f"You're invited: {event.title}"
    desc_html = f"<p style=\"margin:0 0 12px;\">{description}</p>" if description else ""
    html = _wrap_html(
        subject,
        (
            f"<p style=\"margin:0 0 12px;\">You are invited to <strong>{event.title}</strong> as <strong>{role.value}</strong>.</p>"
            f"{desc_html}"
            f"<p style=\"margin:0 0 16px;\"><strong>Starts:</strong> {_format_dt(event.start_datetime)}</p>"
            f"<a href=\"{event_link}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;\">View Event</a>"
        ),
    )
    _log_and_send(email, subject, html, {"type": "event_invitation", "event_id": event.id, "role": role.value})


def send_event_role_update_email(email: str, event: Event, new_role: EventParticipantRole, description: Optional[str] = None):
    """Notify a participant that their role has been updated for an event."""
    event_link = f"{settings.FRONTEND_BASE_URL}/events/{event.id}"
    subject = f"Your role was updated for: {event.title}"
    desc_html = f"<p style=\"margin:0 0 12px;\">{description}</p>" if description else ""
    html = _wrap_html(
        subject,
        (
            f"<p style=\"margin:0 0 12px;\">Your role for <strong>{event.title}</strong> is now <strong>{new_role.value}</strong>.</p>"
            f"{desc_html}"
            f"<p style=\"margin:0 0 16px;\"><strong>Starts:</strong> {_format_dt(event.start_datetime)}</p>"
            f"<a href=\"{event_link}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;\">View Event</a>"
        ),
    )
    _log_and_send(email, subject, html, {"type": "event_role_update", "event_id": event.id, "new_role": new_role.value})


def send_event_removed_email(email: str, event: Event, description: Optional[str] = None):
    """Notify a participant that they have been removed from an event."""
    subject = f"You have been removed from: {event.title}"
    desc_html = f"<p style=\"margin:0 0 12px;\">{description}</p>" if description else ""
    html = _wrap_html(
        subject,
        (
            f"<p style=\"margin:0;\">Your participation in <strong>{event.title}</strong> has been removed by the organizer.</p>"
            f"{desc_html}"
        ),
    )
    _log_and_send(email, subject, html, {"type": "event_removed", "event_id": event.id})


def send_event_reminder_email(email: str, event: Event, when_label: str):
    """Send a reminder email for an upcoming event.
    when_label examples: "one_week", "three_days", "one_day".
    """
    event_link = f"{settings.FRONTEND_BASE_URL}/events/{event.id}"
    subject = f"Reminder: {event.title} starts soon"
    pretty_when = {
        "one_week": "1 week before",
        "three_days": "3 days before",
        "one_day": "1 day before",
    }.get(when_label, "Upcoming")
    html = _wrap_html(
        subject,
        (
            f"<p style=\"margin:0 0 12px;\">This is your reminder ({pretty_when}).</p>"
            f"<p style=\"margin:0 0 16px;\"><strong>Starts:</strong> {_format_dt(event.start_datetime)}</p>"
            f"<a href=\"{event_link}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;\">View Event</a>"
        ),
    )
    _log_and_send(email, subject, html, {"type": "event_reminder", "event_id": event.id, "when": when_label})


def send_event_proposal_comment_email(email: str, event: Event, proposal: EventProposal, comment_content: str):
    """Notify proposal owner of a new comment."""
    event_link = f"{settings.FRONTEND_BASE_URL}/events/{event.id}"
    subject = f"New comment on your proposal: {event.title}"
    html = _wrap_html(
        subject,
        (
            f"<p style=\"margin:0 0 12px;\">A new comment was added to your proposal for <strong>{event.title}</strong>.</p>"
            f"<blockquote style=\"margin:0 0 16px;padding:12px;border-left:3px solid #e5e7eb;color:#334155;\">{comment_content}</blockquote>"
            f"<a href=\"{event_link}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;\">View Event</a>"
        ),
    )
    _log_and_send(email, subject, html, {"type": "proposal_comment", "event_id": event.id})
