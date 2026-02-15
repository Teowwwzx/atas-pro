from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database.database import Base

class Blocklist(Base):
    __tablename__ = 'blocklist'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jti = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

