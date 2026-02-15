import os
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.services.ai_service import generate_text_embedding, _vec_to_pg


def _upsert_event_embedding(db: Session, event_id, emb_vec: list[float], source_text: str):
    pg = _vec_to_pg(emb_vec)
    sql = text(
        """
        INSERT INTO event_embeddings(event_id, embedding, source_text)
        VALUES (:eid, CAST(:emb AS vector), :src)
        ON CONFLICT (event_id) DO UPDATE SET embedding = EXCLUDED.embedding, source_text = EXCLUDED.source_text
        """
    )
    db.execute(sql, {"eid": event_id, "emb": pg, "src": source_text})


def _upsert_expert_embedding(db: Session, user_id, emb_vec: list[float], source_text: str):
    pg = _vec_to_pg(emb_vec)
    sql = text(
        """
        INSERT INTO expert_embeddings(user_id, embedding, source_text)
        VALUES (:uid, CAST(:emb AS vector), :src)
        ON CONFLICT (user_id) DO UPDATE SET embedding = EXCLUDED.embedding, source_text = EXCLUDED.source_text
        """
    )
    db.execute(sql, {"uid": user_id, "emb": pg, "src": source_text})


def backfill(limit_events: int = 10, limit_experts: int = 10):
    db = SessionLocal()
    try:
        # Events: public visibility
        rows = db.execute(text("SELECT id, title, description, format, type FROM events WHERE visibility='public' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT :lim"), {"lim": limit_events}).fetchall()
        for r in rows:
            title = r[1] or ""
            desc = r[2] or ""
            src = f"{title}\n{desc}\nformat:{r[3]} type:{r[4]}"
            emb = generate_text_embedding(src)
            if emb:
                _upsert_event_embedding(db, r[0], emb, src)

        # Experts: public profiles with expert role
        rows = db.execute(text(
            """
            SELECT p.user_id, p.full_name, p.bio, p.availability
            FROM profiles p
            JOIN users u ON u.id = p.user_id
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE r.name='expert' AND p.visibility='public'
            ORDER BY u.created_at DESC
            LIMIT :lim
            """
        ), {"lim": limit_experts}).fetchall()
        for r in rows:
            name = r[1] or ""
            bio = r[2] or ""
            availability = r[3] or ""
            src = f"{name}\n{bio}\navailability:{availability}"
            emb = generate_text_embedding(src)
            if emb:
                _upsert_expert_embedding(db, r[0], emb, src)

        db.commit()
        print(f"Backfilled up to {limit_events} events and {limit_experts} experts with embeddings")
    except Exception as e:
        db.rollback()
        print(f"Backfill error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    backfill()
