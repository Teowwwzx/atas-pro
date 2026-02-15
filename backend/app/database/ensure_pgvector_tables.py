from sqlalchemy import text
from app.database.database import engine


DDL = [
    "CREATE EXTENSION IF NOT EXISTS vector",
    "CREATE TABLE IF NOT EXISTS expert_embeddings (user_id UUID PRIMARY KEY, embedding VECTOR(768), source_text TEXT)",
    "CREATE TABLE IF NOT EXISTS event_embeddings (event_id UUID PRIMARY KEY, embedding VECTOR(768), source_text TEXT)",
    "CREATE INDEX IF NOT EXISTS expert_embeddings_embedding_idx ON expert_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)",
    "CREATE INDEX IF NOT EXISTS event_embeddings_embedding_idx ON event_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)",
]


def main():
    with engine.begin() as conn:
        for stmt in DDL:
            conn.execute(text(stmt))
    print("Ensured pgvector extension, tables, and indexes (768 dims)")


if __name__ == "__main__":
    main()

