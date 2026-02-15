from sqlalchemy import Column, String, Text, ForeignKey, DateTime, func, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
from app.database.database import Base
import uuid

# Define a placeholder for Vector if pgvector is not installed
# This ensures the model can be imported even if we use raw SQL for actual operations
try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    from sqlalchemy.types import UserDefinedType
    class Vector(UserDefinedType):
        def __init__(self, dim=None):
            self.dim = dim
        def get_col_spec(self, **kw):
            return "VECTOR"
        def bind_processor(self, dialect):
            def process(value):
                return value
            return process
        def result_processor(self, dialect, coltype):
            def process(value):
                return value
            return process

class ExpertEmbedding(Base):
    __tablename__ = "expert_embeddings"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True)
    source_text = Column(Text)
    embedding = Column(Vector(768)) # Matches existing dimension logic
    model_name = Column(Text, default='text-embedding-3-small')
    embedding_version = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Explicitly define the index to match database state and prevent Alembic from dropping it
    __table_args__ = (
        Index(
            'expert_embeddings_embedding_idx',
            embedding,
            postgresql_using='hnsw',
            postgresql_with={'m': 16, 'ef_construction': 64},
            postgresql_ops={'embedding': 'vector_cosine_ops'}
        ),
    )

class EventEmbedding(Base):
    __tablename__ = "event_embeddings"
    
    event_id = Column(UUID(as_uuid=True), primary_key=True)
    summary = Column(Text)
    source_text = Column(Text) # It seems source_text is used in logic but summary is in some DDL. Let's align with usage.
    embedding = Column(Vector(768))
    model_name = Column(Text, default='text-embedding-3-small')
    embedding_version = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Explicitly define the index to match database state and prevent Alembic from dropping it
    __table_args__ = (
        Index(
            'event_embeddings_embedding_idx',
            embedding,
            postgresql_using='hnsw',
            postgresql_with={'m': 16, 'ef_construction': 64},
            postgresql_ops={'embedding': 'vector_cosine_ops'}
        ),
    )
