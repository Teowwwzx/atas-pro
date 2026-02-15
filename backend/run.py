
import uvicorn
import os

if __name__ == "__main__":
    # Mitigate file-watcher instability on synced folders (e.g., OneDrive) by forcing polling
    # This reduces spurious reload loops or crashes when many transient files are touched.
    os.environ.setdefault("WATCHFILES_FORCE_POLLING", "1")

    # Ensure we are in the correct directory (backend root)
    # This helps if the script is run from a different location
    current_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(current_dir)

    print("Starting ATAS API server with optimized reload settings...")
    print(f"Working directory: {current_dir}")
    print("Watching 'app' directory only. Ignoring 'alembic' migrations to prevent restart loops.")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        # Only watch the application code
        reload_dirs=["app"],
        # Only reload on Python source changes to avoid noisy transient files
        reload_includes=["*.py"],
        # Explicitly exclude migration and environment directories
        reload_excludes=["alembic", "venv", ".venv", "__pycache__", ".git"],
        log_level="info"
    )
