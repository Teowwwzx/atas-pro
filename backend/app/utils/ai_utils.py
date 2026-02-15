
from sqlalchemy import text

def generate_text_embedding(text: str) -> list[float] | None:
    # Placeholder: Future implementation for OpenAI/Vector embeddings
    # print(f"Generate embedding for: {text[:50]}...")
    return None

def _vec_to_pg(vec: list[float]) -> str:
    return str(vec)
