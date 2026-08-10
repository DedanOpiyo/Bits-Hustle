"""Action types routes."""

from flask import Blueprint, request
from app.utils.responses import ok, fail
from app.controllers.action_types import ActionTypeController
from app.extensions import db

action_types_bp = Blueprint("action_types", __name__)


@action_types_bp.route("/action-types", methods=["GET"])
def list_action_types():
    try:
        result = ActionTypeController.list_action_types(db)
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)


@action_types_bp.route("/action-types", methods=["POST"])
def create_action_type():
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return fail("request body required", 400)
        result = ActionTypeController.create_action_type(db, data)
        return ok(result, "action type created", 201)
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@action_types_bp.route("/action-types/<at_id>", methods=["PUT"])
def update_action_type(at_id: str):
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return fail("request body required", 400)
        result = ActionTypeController.update_action_type(db, at_id, data)
        return ok(result, "action type updated")
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@action_types_bp.route("/action-types/<at_id>", methods=["DELETE"])
def delete_action_type(at_id: str):
    try:
        result = ActionTypeController.delete_action_type(db, at_id)
        return ok(result, "action type deleted")
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)

