"""Users CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles, any_authenticated

users_bp = Blueprint("users", __name__)
from app.controllers.users import UserController


@users_bp.route("/users", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER", "SUPPORT_OFFICER")
def list_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("perPage", 20, type=int)
    search = request.args.get("search", "")
    try:
        result = UserController.list_users(db, page=page, per_page=per_page, search=search)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@users_bp.route("/users/<uuid:user_id>", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER", "SUPPORT_OFFICER")
def get_user(user_id):
    try:
        result = UserController.get_user(db, str(user_id))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@users_bp.route("/users", methods=["POST"])
@require_roles("SUPER_ADMIN")
def create_user():
    data = request.get_json() or {}
    try:
        result = UserController.create_user(db, data)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@users_bp.route("/users/<uuid:user_id>", methods=["PUT"])
@require_roles("SUPER_ADMIN")
def update_user(user_id):
    data = request.get_json() or {}
    try:
        result = UserController.update_user(db, str(user_id), data)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@users_bp.route("/users/<uuid:user_id>/activate", methods=["PUT"])
@require_roles("SUPER_ADMIN")
def activate_user(user_id):
    try:
        result = UserController.activate_user(db, str(user_id))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@users_bp.route("/users/<uuid:user_id>/deactivate", methods=["PUT"])
@require_roles("SUPER_ADMIN")
def deactivate_user(user_id):
    try:
        result = UserController.deactivate_user(db, str(user_id))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@users_bp.route("/users/<uuid:user_id>", methods=["DELETE"])
@require_roles("SUPER_ADMIN")
def delete_user(user_id):
    try:
        UserController.delete_user(db, str(user_id))
        return ok({"message": "user deleted"})
    except ValueError as e:
        return fail(str(e), 404)


