from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.extensions import db
from app.models import User, RolePermission, Permission, RoleType, AssignmentWorker
from app.services.role_permission_service import RolePermissionService


def rbac_required(resource: str, action: str):
    """Require JWT + permission check for (resource, action)."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            identity = get_jwt_identity()
            if not identity:
                return jsonify({"error": "unauthenticated"}), 401

            user = db.session.get(User, identity)
            if not user or not user.is_active:
                return jsonify({"error": "unauthorized"}), 401

            if not RolePermissionService.has_permission(user, resource, action):
                return jsonify({"error": "forbidden"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_roles(*role_names: str):
    """Blueprint-level decorator — allow only listed role names or assignment workers."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            identity = get_jwt_identity()
            if not identity:
                return jsonify({"error": "unauthenticated"}), 401
            user = db.session.get(User, identity)
            if not user or not user.is_active:
                return jsonify({"error": "unauthorized"}), 401
            if user.role.name in role_names:
                return fn(*args, **kwargs)
            if "GIG_WORKER" in role_names:
                worker = (
                    db.session.query(AssignmentWorker)
                    .filter(AssignmentWorker.user_id == user.id, AssignmentWorker.is_active.is_(True))
                    .first()
                )
                if worker:
                    return fn(*args, **kwargs)
            return jsonify({"error": "forbidden"}), 403
        return wrapper
    return decorator


def any_authenticated(fn):
    """Allow any active logged-in user (no role filter)."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        identity = get_jwt_identity()
        if not identity:
            return jsonify({"error": "unauthenticated"}), 401
        user = db.session.get(User, identity)
        if not user or not user.is_active:
            return jsonify({"error": "unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper

