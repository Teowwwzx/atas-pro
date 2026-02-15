import logging
from dotenv import load_dotenv
load_dotenv()
from app.database.database import SessionLocal
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_tables():
    db = SessionLocal()
    try:
        tables = [
            "events",
            "event_categories",
            "event_participants",
            "event_mail_templates",
            "event_checklist_items",
            "event_checklist_assignments",
            "event_checklist_item_files",
            "event_embeddings",
            "event_pictures",
            "event_proposals",
            "event_proposal_comments",
            "event_reminders",
            "event_walk_in_tokens"
        ]

        logger.info("--- Table Row Counts ---")
        for table in tables:
            try:
                count = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                status = "✅ USED" if count > 0 else "⚠️ EMPTY"
                logger.info(f"{table:<30}: {count} rows ({status})")
            except Exception as e:
                logger.error(f"{table:<30}: ERROR ({e})")
        
    finally:
        db.close()

if __name__ == "__main__":
    verify_tables()
