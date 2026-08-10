"""Announcements CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles, any_authenticated
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models import User

announcements_bp = Blueprint("announcements", __name__)
from app.controllers.announcements import AnnouncementController


@announcements_bp.route("/announcements", methods=["GET"])
@any_authenticated
def list_announcements():
    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        user = db.session.get(User, identity)
        page = request.args.get("page", default=1, type=int)
        per_page = request.args.get("per_page", default=20, type=int)
        search = request.args.get("search", default="")
        announcement_type = request.args.get("type", default=None)
        hub_id = request.args.get("hub_id", default=None)

        if hub_id is None and user and user.role and user.role.name == "HUB_MANAGER":
            ambassador = getattr(user, "ambassador_profile", None)
            if ambassador and getattr(ambassador, "hub_id", None):
                hub_id = ambassador.hub_id

        result = AnnouncementController.list_announcements(
            db,
            page=page,
            per_page=per_page,
            search=search,
            announcement_type=announcement_type,
            hub_id=hub_id,
        )
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@announcements_bp.route("/announcements/<uuid:aid>", methods=["GET"])
@any_authenticated
def get_announcement(aid):
    try:
        result = AnnouncementController.get_announcement(db, str(aid))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@announcements_bp.route("/announcements", methods=["POST"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def create_announcement():
    data = request.get_json() or {}
    identity = get_jwt_identity()
    data = dict(data, authorId=identity)
    try:
        result = AnnouncementController.create_announcement(db, data)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@announcements_bp.route("/announcements/<uuid:aid>", methods=["PUT"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def update_announcement(aid):
    data = request.get_json() or {}
    try:
        result = AnnouncementController.update_announcement(db, str(aid), data)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@announcements_bp.route("/announcements/<uuid:aid>", methods=["DELETE"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def delete_announcement(aid):
    try:
        result = AnnouncementController.delete_announcement(db, str(aid))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)
