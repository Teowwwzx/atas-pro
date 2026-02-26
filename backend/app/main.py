# app/main.py


import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.routers import admin_router, event_router, follows_router, email_router, auth_router, user_router, profile_router, review_router, notification_router, taxonomy_router
from prometheus_fastapi_instrumentator import Instrumentator, metrics
try:
    from app.routers import organization_router
    _has_org_router = hasattr(organization_router, "router")
except ImportError:
    _has_org_router = False
from app.database.database import get_db, Base, engine
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    # Initialize Rate Limiter
    from app.core.redis import async_redis_client
    from fastapi_limiter import FastAPILimiter
    await FastAPILimiter.init(async_redis_client)
    
    # Schema is managed by Alembic migrations (see docker-entrypoint.sh)
    # Do NOT call Base.metadata.create_all() here — it conflicts with Alembic.
    yield
    # Shutdown
    # Close Redis connection
    await async_redis_client.aclose()
    
    
    # Close database connections gracefully to prevent "stuck" reloads
    engine.dispose()

app = FastAPI(
    title="ATAS API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "https://thedzx.site",
        "https://www.thedzx.site",
        "https://atas-fyp-git-master-teowzxs-projects.vercel.app",
        settings.FRONTEND_BASE_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Include your routers
app.include_router(admin_router.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(event_router.router, prefix="/api/v1", tags=["Events"])
app.include_router(follows_router.router, prefix="/api/v1", tags=["Follows"])
app.include_router(email_router.router, prefix="/api/v1/email", tags=["Email"])
app.include_router(auth_router.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(user_router.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(profile_router.router, prefix="/api/v1/profiles", tags=["Profiles"])
if _has_org_router:
    app.include_router(organization_router.router, prefix="/api/v1", tags=["Organizations"])
app.include_router(review_router.router, prefix="/api/v1", tags=["Reviews"])
app.include_router(notification_router.router, prefix="/api/v1", tags=["Notifications"])

from app.routers import ai_router
app.include_router(ai_router.router, prefix="/api/v1/ai", tags=["AI"])

if os.environ.get("TESTING") == "1" or os.environ.get("PYTEST_CURRENT_TEST"):
    SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

from app.routers import communication_log_router
app.include_router(communication_log_router.router, prefix="/api/v1", tags=["Communications"])
app.include_router(taxonomy_router.router, prefix="/api/v1", tags=["Taxonomy"])

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}

# Prometheus Instrumentation
instrumentator = Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    should_instrument_requests_inprogress=True,
    excluded_handlers=[".*admin.*", "/metrics"],
    env_var_name="ENABLE_METRICS",
    inprogress_name="inprogress",
    inprogress_labels=True,
)

instrumentator.add(
    metrics.request_size(should_include_handler=True, should_include_method=True, should_include_status=True)
).add(
    metrics.response_size(should_include_handler=True, should_include_method=True, should_include_status=True)
).add(
    metrics.latency(should_include_handler=True, should_include_method=True, should_include_status=True)
).add(
    metrics.requests(should_include_handler=True, should_include_method=True, should_include_status=True)
)

instrumentator.instrument(app).expose(app)

from app.routers import chat_router
app.include_router(chat_router.router, prefix="/api/v1", tags=["Chat"])

from app.routers import booking_router
app.include_router(booking_router.router, prefix="/api/v1", tags=["Bookings"])

# Ensure pgvector extension and embeddings tables exist in development/runtime
# Moved to startup event to prevent import-time execution
# try:
#     from app.database.apply_pgvector_embeddings import main as ensure_pgvector
#     ensure_pgvector()
# except Exception as e:
#     logger.warning(f"Could not init pgvector on import: {e}")

# 1. 捕获所有未知的“爆雷”
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"💥 System Crash: {exc}", exc_info=True) # 记录详细错误堆栈给开发看
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error. Please contact support."} # 给用户看优雅的提示
    )

# 2. 捕获特定的业务错误 (比如你自定义的)
class BusinessError(Exception):
    def __init__(self, msg: str):
        self.msg = msg

@app.exception_handler(BusinessError)
async def business_error_handler(request: Request, exc: BusinessError):
    return JSONResponse(status_code=400, content={"detail": exc.msg})

    
@app.get("/")
def read_root():
    return {"message": "Welcome to the ATAS API!"}

@app.get("/api/v1/ping")
def ping():
    return {"message": "pong"}
