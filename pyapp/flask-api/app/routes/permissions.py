"""Permission routes."""

from flask import Blueprint, request
from app.utils.responses import ok, fail
from app.controllers.permissions import PermissionController
from app.middleware.auth import require_roles
from app.extensions import db

permissions_bp = Blueprint("permissions", __name__)


@permissions_bp.route("/permissions", methods=["GET"])
@require_roles("SUPER_ADMIN")
def list_permissions():
    try:
        permissions = PermissionController.list_permissions(db)
        return ok(permissions)
    except Exception as e:
        return fail(str(e), 500)


@permissions_bp.route("/permissions/<uuid:permission_id>", methods=["GET"])
@require_roles("SUPER_ADMIN")
def get_permission(permission_id):
    try:
        permission = PermissionController.get_permission(db, str(permission_id))
        return ok(permission)
    except Exception as e:
        return fail(str(e), 404)


@permissions_bp.route("/permissions", methods=["POST"])
@require_roles("SUPER_ADMIN")
def create_permission():
    data = request.get_json() or {}
    try:
        permission = PermissionController.create_permission(db, data)
        return ok(permission, "created", 201)
    except Exception as e:
        return fail(str(e), 400)


@permissions_bp.route("/permissions/<uuid:permission_id>", methods=["PUT"])
@require_roles("SUPER_ADMIN")
def update_permission(permission_id):
    data = request.get_json() or {}
    try:
        permission = PermissionController.update_permission(db, str(permission_id), data)
        return ok(permission)
    except Exception as e:
        return fail(str(e), 400)


@permissions_bp.route("/permissions/<uuid:permission_id>", methods=["DELETE"])
@require_roles("SUPER_ADMIN")
def delete_permission(permission_id):
    try:
        PermissionController.delete_permission(db, str(permission_id))
        return ok({"message": "permission deleted"})
    except Exception as e:
        return fail(str(e), 400)
