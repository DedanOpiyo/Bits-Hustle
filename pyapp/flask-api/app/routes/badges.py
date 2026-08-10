"""Badges + ambassador badge assignments."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles, any_authenticated
from flask_jwt_extended import get_jwt_identity

badges_bp = Blueprint("badges", __name__)
from app.controllers.badges import BadgeController


@badges_bp.route("/badges", methods=["GET"])
def list_badges():
    try:
        result = BadgeController.list_badges(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@badges_bp.route("/my-badges", methods=["GET"])
@any_authenticated
def my_badges():
    identity = get_jwt_identity()
    try:
        result = BadgeController.my_badges(db, user_id=identity)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@badges_bp.route("/badges", methods=["POST"])
@require_roles("SUPER_ADMIN")
def create_badge():
    data = request.get_json() or {}
    try:
        result = BadgeController.create_badge(db, data)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


