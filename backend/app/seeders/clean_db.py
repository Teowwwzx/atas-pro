import logging
from sqlalchemy import text
from app.database.database import SessionLocal, engine, Base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean_database():
    """
    Cleans the database by truncating all tables.
    """
    db = SessionLocal()
    try:
        logger.info("Cleaning database...")
        
        # specific order or cascade? Cascade is easier.
        # We'll retrieve all table names and truncate them.
        # For PostgreSQL, TRUNCATE ... CASCADE is efficient.
        
        # Get all table names
        # This query works for PostgreSQL
        tables = db.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")).fetchall()
        
        table_names = [table[0] for table in tables if table[0] != 'alembic_version']
        
        if not table_names:
            logger.info("No tables to clean.")
            return

        # Disable triggers to speed up (optional, but TRUNCATE CASCADE usually handles FKs)
        # db.execute(text("SET session_replication_role = 'replica';"))

        for table in table_names:
            try:
                # Use cascade to handle foreign keys
                db.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
                logger.info(f"Table {table} cleaned.")
            except Exception as e:
                logger.warning(f"Could not clean table {table}: {e}")

        # db.execute(text("SET session_replication_role = 'origin';"))
        
        db.commit()
        logger.info("Database cleaned successfully.")
        
    except Exception as e:
        logger.error(f"Error cleaning database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
