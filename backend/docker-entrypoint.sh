#!/bin/bash
set -e

# Activate virtual environment
source /opt/venv/bin/activate

# Optional: Wait for DB to be ready

# Run vector DB setup only if the script exists
if [ -f "app/database/ensure_pgvector_tables.py" ]; then
    echo "Running pgvector setup..."
    python -m app.database.ensure_pgvector_tables
else
    echo "Skipping pgvector setup (script not found)..."
fi

# Run Alembic migrations
echo "Running database migrations..."
if ! alembic upgrade head; then
    echo "⚠️  Alembic upgrade failed (DB may already be up-to-date). Stamping head..."
    alembic stamp head
fi

# Exec the passed command
exec "$@"
