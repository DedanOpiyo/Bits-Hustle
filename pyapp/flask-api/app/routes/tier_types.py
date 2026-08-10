"""Tier types routes."""

from flask import Blueprint, request
from app.utils.responses import ok, fail
from app.controllers.tier_types import TierTypeController
from app.extensions import db

tier_types_bp = Blueprint("tier_types", __name__)


@tier_types_bp.route("/tier-types", methods=["GET"])
def list_tier_types():
    try:
        result = TierTypeController.list_tier_types(db)
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)


@tier_types_bp.route("/tier-types", methods=["POST"])
def create_tier_type():
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return fail("request body required", 400)
        result = TierTypeController.create_tier_type(db, data)
        return ok(result, "tier type created", 201)
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@tier_types_bp.route("/tier-types/<tt_id>", methods=["PUT"])
def update_tier_type(tt_id: str):
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return fail("request body required", 400)
        result = TierTypeController.update_tier_type(db, tt_id, data)
        return ok(result, "tier type updated")
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@tier_types_bp.route("/tier-types/<tt_id>", methods=["DELETE"])
def delete_tier_type(tt_id: str):
    try:
        result = TierTypeController.delete_tier_type(db, tt_id)
        return ok(result, "tier type deleted")
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)

