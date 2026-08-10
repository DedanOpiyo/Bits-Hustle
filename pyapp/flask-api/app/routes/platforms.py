"""Platform types routes."""

from flask import Blueprint, request
from app.utils.responses import ok, fail
from app.controllers.platform_types import PlatformTypeController
from app.middleware.api_key import require_api_key
from app.extensions import db
from app.middleware.auth import require_roles

platforms_bp = Blueprint("platforms", __name__)


@platforms_bp.route("/platforms", methods=["GET"])
def list_platforms():
    try:
        result = PlatformTypeController.list_platform_types(db)
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)


@platforms_bp.route("/platforms", methods=["POST"])
@require_roles("SUPER_ADMIN")
def create_platform():
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return fail("request body required", 400)
        result = PlatformTypeController.create_platform_type(db, data)
        return ok(result, "platform created", 201)
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@platforms_bp.route("/platforms/<pt_id>", methods=["PUT"])
@require_roles("SUPER_ADMIN")
def update_platform(pt_id: str):
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return fail("request body required", 400)
        result = PlatformTypeController.update_platform_type(db, pt_id, data)
        return ok(result, "platform updated")
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@platforms_bp.route("/platforms/<pt_id>", methods=["DELETE"])
@require_roles("SUPER_ADMIN")
def delete_platform(pt_id: str):
    try:
        result = PlatformTypeController.delete_platform_type(db, pt_id)
        return ok(result, "platform deleted")
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@platforms_bp.route("/platforms/<pt_id>/webhook-secret", methods=["POST"])
@require_roles("SUPER_ADMIN")
def generate_webhook_secret(pt_id: str):
    try:
        result = PlatformTypeController.generate_webhook_secret(db, pt_id)
        return ok(result, "webhook secret generated — copy it now", 201)
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@platforms_bp.route("/platforms/<pt_id>/webhook-url", methods=["PUT"])
@require_roles("SUPER_ADMIN")
def set_webhook_url(pt_id: str):
    try:
        data = request.get_json(silent=True) or {}
        if not data or not data.get("webhook_url"):
            return fail("webhook_url required", 400)
        result = PlatformTypeController.set_webhook_url(db, pt_id, data["webhook_url"])
        return ok(result, "webhook URL updated")
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


# ── Partner self-service endpoints (API key auth) ───────────────

@platforms_bp.route("/platforms/me/webhook-url", methods=["PUT"])
@require_api_key
def set_own_webhook_url():
    """Partner sets their own webhook URL via API key."""
    try:
        data = request.get_json(silent=True) or {}
        if not data or not data.get("webhook_url"):
            return fail("webhook_url required", 400)
        result = PlatformTypeController.set_webhook_url(
            db, request.platform_key.platform_id, data["webhook_url"]
        )
        return ok(result, "webhook URL updated")
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@platforms_bp.route("/platforms/me", methods=["GET"])
@require_api_key
def get_own_platform():
    """Partner retrieves their own platform info via API key."""
    try:
        result = PlatformTypeController.get_platform_type(
            db, request.platform_key.platform_id
        )
        if result:
            result.pop("webhook_secret", None)
            result.pop("webhook_secret_hash", None)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)
    except Exception as e:
        return fail(str(e), 500)

