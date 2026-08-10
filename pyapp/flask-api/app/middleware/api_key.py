"""API key authentication and scope enforcement for partner platform endpoints."""
from functools import wraps
from flask import request
from app.utils.responses import fail
from app.controllers.platform_api_keys import PlatformApiKeyController
from app.extensions import db


def require_api_key(f):
    """Decorator that authenticates requests via X-API-Key header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get("X-API-Key")
        if not key:
            return fail("X-API-Key header required", 401)
        platform_key = PlatformApiKeyController.verify_key(db, key)
        if not platform_key:
            return fail("invalid or revoked API key", 401)
        request.platform_key = platform_key
        return f(*args, **kwargs)
    return decorated


def require_scope(*required_scopes):
    """Decorator that enforces API key scopes. Must be used after require_api_key."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            platform_key = getattr(request, "platform_key", None)
            if not platform_key:
                return fail("X-API-Key header required", 401)
            key_scopes = platform_key.scopes or []
            if not any(scope in key_scopes for scope in required_scopes):
                return fail(
                    f"insufficient scope: requires one of {', '.join(required_scopes)}",
                    403,
                )
            return f(*args, **kwargs)
        return decorated
    return decorator
