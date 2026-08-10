"""Role permission routes."""

from flask import Blueprint, request
from app.utils.responses import ok, fail
from app.controllers.role_permissions import RolePermissionController
from app.middleware.auth import require_roles
from app.extensions import db

role_permissions_bp = Blueprint("role_permissions", __name__)


@role_permissions_bp.route("/role-permissions", methods=["GET"])
@require_roles("SUPER_ADMIN")
def list_role_permissions():
    try:
        role_permissions = RolePermissionController.list_role_permissions(db)
        return ok(role_permissions)
    except Exception as e:
        return fail(str(e), 500)


@role_permissions_bp.route("/role-permissions/<uuid:role_permission_id>", methods=["GET"])
@require_roles("SUPER_ADMIN")
def get_role_permission(role_permission_id):
    try:
        role_permission = RolePermissionController.get_role_permission(db, str(role_permission_id))
        return ok(role_permission)
    except Exception as e:
        return fail(str(e), 404)


@role_permissions_bp.route("/role-permissions", methods=["POST"])
@require_roles("SUPER_ADMIN")
def create_role_permission():
    data = request.get_json() or {}
    try:
        role_permission = RolePermissionController.create_role_permission(db, data)
        return ok(role_permission, "created", 201)
    except Exception as e:
        return fail(str(e), 400)


@role_permissions_bp.route("/role-permissions/<uuid:role_permission_id>", methods=["PUT"])
@require_roles("SUPER_ADMIN")
def update_role_permission(role_permission_id):
    data = request.get_json() or {}
    try:
        role_permission = RolePermissionController.update_role_permission(db, str(role_permission_id), data)
        return ok(role_permission)
    except Exception as e:
        return fail(str(e), 400)


@role_permissions_bp.route("/role-permissions/<uuid:role_permission_id>", methods=["DELETE"])
@require_roles("SUPER_ADMIN")
def delete_role_permission(role_permission_id):
    try:
        RolePermissionController.delete_role_permission(db, str(role_permission_id))
        return ok({"message": "role permission deleted"})
    except Exception as e:
        return fail(str(e), 400)
