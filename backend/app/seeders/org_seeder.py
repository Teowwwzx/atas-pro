import logging
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user_model import User
from app.models.organization_model import Organization, OrganizationType, OrganizationStatus, OrganizationVisibility, OrganizationRole, organization_members

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_orgs():
    """
    Seeds the database with initial organizations.
    """
    db = SessionLocal()
    try:
        logger.info("Seeding organizations...")

        # 1. Find Owner (Admin)
        admin_user = db.query(User).filter(User.email == "admin@gmail.com").first()
        if not admin_user:
            logger.error("Admin user not found. Please seed users first.")
            return

        # 2. Check if APU exists
        apu_org = db.query(Organization).filter(Organization.name == "Asia Pacific University").first()
        
        if not apu_org:
            apu_org = Organization(
                name="Asia Pacific University",
                type=OrganizationType.university,
                status=OrganizationStatus.approved,
                visibility=OrganizationVisibility.public,
                owner_id=admin_user.id,
                description="Asia Pacific University of Technology & Innovation (APU) is amongst Malaysia's Premier Private Universities.",
                website_url="https://www.apu.edu.my",
                location="Kuala Lumpur, Malaysia",
                logo_url="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Asia_Pacific_University_of_Technology_%26_Innovation_Logo.jpg/1200px-Asia_Pacific_University_of_Technology_%26_Innovation_Logo.jpg" # Placeholder or real
            )
            db.add(apu_org)
            db.commit() # Commit to get ID
            db.refresh(apu_org)
            logger.info("Created organization: Asia Pacific University")
            
            # Add Admin as Member/Owner in junction table if needed
            # The model has 'members' relationship. Owner is usually a member too?
            # organization_members table has role column.
            
            # Check if admin is already a member
            stmt = organization_members.insert().values(
                org_id=apu_org.id,
                user_id=admin_user.id,
                role=OrganizationRole.owner
            )
            try:
                db.execute(stmt)
                db.commit()
                logger.info(f"Added {admin_user.email} as owner of APU")
            except Exception as e:
                 logger.warning(f"Could not add owner to members (might be duplicate key if logic checked poorly): {e}")

        else:
            logger.info("Organization 'Asia Pacific University' already exists.")

    except Exception as e:
        logger.error(f"Error seeding organizations: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_orgs()
