"""Assignment category routes."""

from flask import Blueprint, request
from app.utils.responses import ok, fail
from app.controllers.assignment_categories import AssignmentCategoryController
from app.extensions import db
from app.middleware.auth import rbac_required

assignment_categories_bp = Blueprint("assignment_categories", __name__)


@assignment_categories_bp.route("/assignment-categories", methods=["GET"])
def list_categories():
    try:
        result = AssignmentCategoryController.list_categories(db)
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)


@assignment_categories_bp.route("/assignment-categories", methods=["POST"])
@rbac_required("assignments", "manage")
def create_category():
    try:
        data = request.get_json()
        if not data:
            return fail("request body required", 400)
        result = AssignmentCategoryController.create_category(db, data)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@assignment_categories_bp.route("/assignment-categories/<category_id>", methods=["GET"])
def get_category(category_id):
    try:
        # We don't have a controller method for getting a single category by id.
        # We'll implement it here or in the controller? Let's check the controller.
        # The controller only has list, create, update, delete.
        # We can either add a method to the controller or do it inline.
        # Since we don't want to change the controller for now, we'll do it inline.
        from app.models import AssignmentCategory
        category = db.session.get(AssignmentCategory, category_id)
        if not category:
            return fail("not found", 404)
        from app.utils.serializers import to_dict
        return ok(to_dict(category))
    except Exception as e:
        return fail(str(e), 500)


@assignment_categories_bp.route("/assignment-categories/<category_id>", methods=["PUT"])
@rbac_required("assignments", "manage")
def update_category(category_id):
    try:
        data = request.get_json()
        if not data:
            return fail("request body required", 400)
        result = AssignmentCategoryController.update_category(db, category_id, data)
        return ok(result, "updated")
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@assignment_categories_bp.route("/assignment-categories/<category_id>", methods=["DELETE"])
@rbac_required("assignments", "manage")
def delete_category(category_id):
    try:
        result = AssignmentCategoryController.delete_category(db, category_id)
        return ok(result, "deleted")
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)