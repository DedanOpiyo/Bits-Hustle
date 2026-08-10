"""Hubs CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles, any_authenticated
from flask_jwt_extended import get_jwt_identity
from app.models import User, Hub

hubs_bp = Blueprint("hubs", __name__)
from app.controllers.hubs import HubController


@hubs_bp.route("/hubs", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def list_hubs():
    try:
        result = HubController.list_hubs(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@hubs_bp.route("/public/hubs", methods=["GET"])
def list_public_hubs():
    try:
        result = HubController.list_hubs(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@hubs_bp.route("/hubs", methods=["POST"])
@require_roles("SUPER_ADMIN")
def create_hub():
    data = request.get_json() or {}
    try:
        result = HubController.create_hub(db, data)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@hubs_bp.route("/hubs/<uuid:hub_id>", methods=["PUT"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def update_hub(hub_id):
    data = request.get_json() or {}
    try:
        result = HubController.update_hub(db, str(hub_id), data)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@hubs_bp.route("/hubs/<uuid:hub_id>", methods=["DELETE"])
@require_roles("SUPER_ADMIN")
def delete_hub(hub_id):
    try:
        HubController.delete_hub(db, str(hub_id))
        return ok({"message": "hub deleted"})
    except ValueError as e:
        return fail(str(e), 404)


@hubs_bp.route("/hubs/my-hub", methods=["GET"])
@any_authenticated
def get_my_hub():
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    if not user:
        return fail("user not found", 404)
    is_hub_manager = user.role and user.role.name == "HUB_MANAGER"
    is_super_admin = user.role and user.role.name == "SUPER_ADMIN"
    if not is_hub_manager and not is_super_admin:
        return fail("permission denied", 403)
    if is_hub_manager:
        hub = db.session.query(Hub).filter_by(manager_id=identity).first()
        if not hub:
            return fail("no hub assigned", 404)
        return ok({"id": str(hub.id), "name": hub.name, "location": hub.location})
    # Super admin - return first hub or all hubs
    hub = db.session.query(Hub).first()
    if hub:
        return ok({"id": str(hub.id), "name": hub.name, "location": hub.location})
    return fail("no hubs found", 404)


