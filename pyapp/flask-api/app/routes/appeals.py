"""Appeals CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import any_authenticated, require_roles
from flask_jwt_extended import get_jwt_identity

appeals_bp = Blueprint("appeals", __name__)
from app.controllers.appeals import AppealController


@appeals_bp.route("/appeals", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def list_appeals():
    try:
        result = AppealController.list_appeals(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@appeals_bp.route("/my-appeals", methods=["GET"])
@any_authenticated
def my_appeals():
    identity = get_jwt_identity()
    try:
        result = AppealController.my_appeals(db, user_id=identity)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@appeals_bp.route("/appeals", methods=["POST"])
@any_authenticated
def create_appeal():
    data = request.get_json() or {}
    identity = get_jwt_identity()
    try:
        result = AppealController.create_appeal(db, data, ambassador_id=identity)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@appeals_bp.route("/appeals/<uuid:aid>", methods=["PUT"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def review_appeal(aid):
    data = request.get_json() or {}
    identity = get_jwt_identity()
    try:
        result = AppealController.review_appeal(db, str(aid), data, reviewed_by_id=identity)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


