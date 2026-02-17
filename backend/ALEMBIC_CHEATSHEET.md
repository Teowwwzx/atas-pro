# 🐘 Alembic Migration Cheatsheet

Alembic is a database migration tool for usage with SQLAlchemy. It helps you manage database schema changes (creating tables, adding columns) in a version-controlled way.

## 🚦 When to run migrations?
You **DO NOT** need to run migrations for every code change.
Run them **ONLY** when you modify `app/models/*.py` files:
- Creating a new model (Table)
- Adding/Removing a column
- Changing a column type (e.g., `String` -> `Integer`)
- Modifying constraints (Unique, Nullable, Foreign Keys)

---

## 🛠️ Common Commands

### 1. Check Status
See if your models match the database.
```bash
alembic check
```
- **Success:** No output or "No new upgrade operations detected."
- **Failure:** Shows list of detected differences (drift).

### 2. Create a Migration (Auto)
Generate a new migration script based on changes in your models.
```bash
alembic revision --autogenerate -m "describe_your_change"
```
*Example: `alembic revision --autogenerate -m "add_avatar_to_users"`*

### 3. Apply Migrations (Upgrade)
Apply pending migrations to the database (make it up-to-date).
```bash
alembic upgrade head
```

### 4. Undo Last Migration (Downgrade)
Revert the last applied migration (be careful with data loss!).
```bash
alembic downgrade -1
```

### 5. View History
Show migration history.
```bash
alembic history
```

### 6. Show Current Version
Show the current revision of the database.
```bash
alembic current
```

---

## 🚨 Troubleshooting "Drift"
If `alembic check` fails but you didn't change models, it might be due to:
1.  **Type Mismatches:** (e.g., `pgvector` types sometimes confuse Alembic).
2.  **Manual DB Changes:** Someone changed the DB manually without a migration.
3.  **Import Issues:** The model file wasn't imported in `alembic/env.py`, so Alembic doesn't "see" it.

### Fix Drift (Sync)
If the DB is correct but Alembic is confused, you might need to adjust the migration file manually or use:
```bash
# If models are right, generate a migration to sync DB to models
alembic revision --autogenerate -m "sync_schema"
alembic upgrade head
```
