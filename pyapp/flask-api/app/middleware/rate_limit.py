"""Rate limiting middleware for webhook endpoints."""
import time
from functools import wraps
from flask import request, jsonify


# In-memory store for rate limiting (use Redis in production)
_rate_limit_store = {}


def _get_client_key():
    """Get a unique key for rate limiting based on IP and endpoint."""
    return f"{request.remote_addr}:{request.endpoint}"


def rate_limit(max_requests=60, window_seconds=60):
    """
    Rate limiting decorator.

    Args:
        max_requests: Maximum number of requests allowed in the window
        window_seconds: Time window in seconds
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            key = _get_client_key()
            now = time.time()
            window_start = now - window_seconds

            # Clean old entries
            if key in _rate_limit_store:
                _rate_limit_store[key] = [
                    ts for ts in _rate_limit_store[key] if ts > window_start
                ]
            else:
                _rate_limit_store[key] = []

            # Check limit
            if len(_rate_limit_store[key]) >= max_requests:
                return jsonify({
                    "success": False,
                    "message": "Rate limit exceeded. Please try again later.",
                    "retry_after": window_seconds
                }), 429

            # Record this request
            _rate_limit_store[key].append(now)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def webhook_rate_limit(max_requests=100, window_seconds=60):
    """
    Rate limiting specifically for webhook endpoints.
    More lenient limits for trusted platforms.
    """
    return rate_limit(max_requests=max_requests, window_seconds=window_seconds)
