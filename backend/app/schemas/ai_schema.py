from pydantic import BaseModel
from typing import Optional, List
import uuid

class EmbeddingRequest(BaseModel):
    text: str

class SemanticSearchRequest(BaseModel):
    query: str
    limit: int = 10
    role_filter: Optional[str] = None

class ProposalRequest(BaseModel):
    expert_name: str
    student_name: Optional[str] = None
    topic: str

class ProposalResponse(BaseModel):
    title: str
    description: str
