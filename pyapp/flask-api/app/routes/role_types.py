"""Role types routes."""

from flask import Blueprint, request
from app.utils.responses import ok, fail
from app.controllers.role_types import RoleTypeController
from app.middleware.auth import require_roles
from app.extensions import db

role_types_bp = Blueprint("role_types", __name__)


@role_types_bp.route("/role-types", methods=["GET"])
@require_roles("SUPER_ADMIN")
def list_role_types():
    try:
        role_types = RoleTypeController.list_role_types(db)
        return ok(role_types)
    except Exception as e:
        return fail(str(e), 500)


@role_types_bp.route("/role-types/<uuid:role_type_id>", methods=["GET"])
@require_roles("SUPER_ADMIN")
def get_role_type(role_type_id):
    try:
        role_type = RoleTypeController.get_role_type(db, str(role_type_id))
        return ok(role_type)
    except Exception as e:
        return fail(str(e), 404)


@role_types_bp.route("/role-types", methods=["POST"])
@require_roles("SUPER_ADMIN")
def create_role_type():
    data = request.get_json() or {}
    try:
        role_type = RoleTypeController.create_role_type(db, data)
        return ok(role_type, "created", 201)
    except Exception as e:
        return fail(str(e), 400)


@role_types_bp.route("/role-types/<uuid:role_type_id>", methods=["PUT"])
@require_roles("SUPER_ADMIN")
def update_role_type(role_type_id):
    data = request.get_json() or {}
    try:
        role_type = RoleTypeController.update_role_type(db, str(role_type_id), data)
        return ok(role_type)
    except Exception as e:
        return fail(str(e), 400)


@role_types_bp.route("/role-types/<uuid:role_type_id>", methods=["DELETE"])
@require_roles("SUPER_ADMIN")
def delete_role_type(role_type_id):
    try:
        RoleTypeController.delete_role_type(db, str(role_type_id))
        return ok({"message": "role type deleted"})
    except Exception as e:
        return fail(str(e), 400)
