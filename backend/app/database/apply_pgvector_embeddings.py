from sqlalchemy import text
from app.database.database import engine


SQL_STATEMENTS = [
    "CREATE EXTENSION IF NOT EXISTS vector;",
    (
        "CREATE TABLE IF NOT EXISTS expert_embeddings (\n"
        "    user_id UUID PRIMARY KEY,\n"
        "    source_text TEXT,\n"
        "    embedding VECTOR(1536),\n"
        "    model_name TEXT DEFAULT 'text-embedding-3-small',\n"
        "    embedding_version TEXT,\n"
        "    created_at TIMESTAMPTZ DEFAULT NOW()\n"
        ");"
    ),
    (
        "CREATE TABLE IF NOT EXISTS event_embeddings (\n"
        "    event_id UUID PRIMARY KEY,\n"
        "    summary TEXT,\n"
        "    embedding VECTOR(1536),\n"
        "    model_name TEXT DEFAULT 'text-embedding-3-small',\n"
        "    embedding_version TEXT,\n"
        "    created_at TIMESTAMPTZ DEFAULT NOW()\n"
        ");"
    ),
    (
        "CREATE INDEX IF NOT EXISTS expert_embeddings_embedding_idx\n"
        "    ON expert_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);"
    ),
    (
        "CREATE INDEX IF NOT EXISTS event_embeddings_embedding_idx\n"
        "    ON event_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);"
    ),
]


def main():
    with engine.begin() as conn:
        for stmt in SQL_STATEMENTS:
            conn.execute(text(stmt))
    print("pgvector enabled and embeddings tables/indexes ensured")


if __name__ == "__main__":
    main()

