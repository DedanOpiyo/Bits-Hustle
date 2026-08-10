"""Learning resources CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles, any_authenticated

learning_resources_bp = Blueprint("learning_resources", __name__)
from app.controllers.learning_resources import LearningResourceController


@learning_resources_bp.route("/learning-resources", methods=["GET"])
def list_resources():
    try:
        result = LearningResourceController.list_resources(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@learning_resources_bp.route("/learning-resources/<uuid:rid>", methods=["GET"])
def get_resource(rid):
    try:
        result = LearningResourceController.get_resource(db, str(rid))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@learning_resources_bp.route("/learning-resources", methods=["POST"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def create_resource():
    data = request.get_json() or {}
    try:
        result = LearningResourceController.create_resource(db, data)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


