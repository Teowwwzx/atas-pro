from sqlalchemy.orm import Session
from sqlalchemy.sql import func
import logging
import json
from app.models.email_template_model import EmailTemplate as EmailTemplateModel
from app.models.event_model import EventMailTemplate

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_default_email_templates(db: Session) -> None:
    """
    Seeds system-level email templates (Verification, Forgot Password, etc.)
    """
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    defaults = [
        {
            "name": "email_verification",
            "subject": "Verify your email",
            "body_html": '<p>Hello {{user_name}},</p><p>Please verify your email by clicking <a href="{{verification_link}}">this link</a>.</p>',
            "variables": ["user_name", "verification_link"],
        },
        {
            "name": "forgot_password",
            "subject": "Reset your password",
            "body_html": '<p>Hello {{user_name}},</p><p>Reset your password using <a href="{{reset_link}}">this link</a>.</p>',
            "variables": ["user_name", "reset_link"],
        },
        {
            "name": "moderation_notice",
            "subject": "Your event has an update",
            "body_html": '<p>Hello {{user_name}},</p><p>Your event "{{event_title}}" has been reviewed by our team.</p><p>Reason: {{reason}}</p>',
            "variables": ["user_name", "event_title", "reason"],
        },
    ]
    for d in defaults:
        existing = (
            db.query(EmailTemplateModel)
            .filter(func.lower(EmailTemplateModel.name) == func.lower(d["name"]))
            .first()
        )
        if existing is None:
            item = EmailTemplateModel(
                name=d["name"],
                subject=d["subject"],
                body_html=d["body_html"],
                variables=json.dumps(d["variables"]),
                created_at=now,
            )
            db.add(item)
            logger.info(f"Added system template: {d['name']}")
    db.commit()


def seed_event_email_templates(db: Session) -> None:
    """
    Seeds default email templates for events (Invitation, Confirmation, etc.)
    """
    logger.info("Seeding event email templates...")

    templates = [
        {
            "type": "invitation",
            "subject": "You're invited to {event_title}!",
            "body": """Hi {name},

You have been invited to participate in {event_title}.

Event Details:
Date: {start_date}
Location: {location}

Click here to accept the invitation: {link}

Best regards,
The Team""",
            "is_default": True
        },
        {
            "type": "confirmation",
            "subject": "Registration Confirmed: {event_title}",
            "body": """Hi {name},

Your registration for {event_title} has been confirmed.

We look forward to seeing you there!

Best regards,
The Team""",
            "is_default": True
        },
        {
            "type": "reminder",
            "subject": "Reminder: {event_title} is coming up!",
            "body": """Hi {name},

This is a friendly reminder that {event_title} is happening on {start_date}.

Don't miss out!

Best regards,
The Team""",
            "is_default": True
        },
            {
            "type": "update",
            "subject": "Update regarding {event_title}",
            "body": """Hi {name},

There has been an update to {event_title}.

{update_message}

Best regards,
The Team""",
            "is_default": True
        }
    ]

    for tmpl in templates:
        # Check if default template of this type already exists to avoid duplicates
        existing = db.query(EventMailTemplate).filter(
            EventMailTemplate.type == tmpl["type"],
            EventMailTemplate.is_default == True
        ).first()

        if not existing:
            new_template = EventMailTemplate(
                type=tmpl["type"],
                subject=tmpl["subject"],
                body=tmpl["body"],
                is_default=tmpl["is_default"]
            )
            db.add(new_template)
            logger.info(f"Added event template type: {tmpl['type']}")
        else:
            logger.info(f"Event template type {tmpl['type']} already exists. Skipping.")

    db.commit()


def seed_email_templates(db: Session = None):
    """
    Main entry point to seed all email templates.
    """
    should_close = False
    if db is None:
        from app.database.database import SessionLocal
        db = SessionLocal()
        should_close = True

    try:
        seed_default_email_templates(db)
        seed_event_email_templates(db)
        logger.info("All email templates seeded successfully.")
    except Exception as e:
        logger.error(f"Error seeding email templates: {e}")
        db.rollback()
    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    seed_email_templates()

