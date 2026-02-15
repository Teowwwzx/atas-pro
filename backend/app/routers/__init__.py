import importlib

admin_router = importlib.import_module("app.routers.admin_router")
event_router = importlib.import_module("app.routers.event_router")
follows_router = importlib.import_module("app.routers.follows_router")
email_router = importlib.import_module("app.routers.email_router")
auth_router = importlib.import_module("app.routers.auth_router")
user_router = importlib.import_module("app.routers.user_router")
profile_router = importlib.import_module("app.routers.profile_router")
review_router = importlib.import_module("app.routers.review_router")
notification_router = importlib.import_module("app.routers.notification_router")
taxonomy_router = importlib.import_module("app.routers.taxonomy_router")
try:
    organization_router = importlib.import_module("app.routers.organization_router")
except ModuleNotFoundError:
    organization_router = None
