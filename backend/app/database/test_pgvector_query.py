from sqlalchemy import text
from app.database.database import engine

def main():
    with engine.begin() as conn:
        d = conn.execute(text("SELECT '[0.1,0.2,0.3]'::vector <-> '[0.1,0.2,0.3]'::vector AS dist")).fetchone()
        print("distance:", d[0])
        e = conn.execute(text("SELECT count(*) FROM expert_embeddings")).fetchone()
        v = conn.execute(text("SELECT count(*) FROM event_embeddings")).fetchone()
        print("expert_embeddings rows:", e[0])
        print("event_embeddings rows:", v[0])

if __name__ == "__main__":
    main()

