from sqlalchemy import text
from app.database.database import engine


SQL = [
    "DROP INDEX IF EXISTS expert_embeddings_embedding_idx",
    "DROP INDEX IF EXISTS event_embeddings_embedding_idx",
    "ALTER TABLE expert_embeddings ALTER COLUMN embedding TYPE vector(768)",
    "ALTER TABLE event_embeddings ALTER COLUMN embedding TYPE vector(768)",
    "CREATE INDEX IF NOT EXISTS expert_embeddings_embedding_idx ON expert_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)",
    "CREATE INDEX IF NOT EXISTS event_embeddings_embedding_idx ON event_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)",
]


def main():
    with engine.begin() as conn:
        for stmt in SQL:
            conn.execute(text(stmt))
    print("Adjusted embeddings vector dimension to 768 and recreated indexes")


if __name__ == "__main__":
    main()

