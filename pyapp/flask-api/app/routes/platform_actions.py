"""Platform actions routes — self-service + admin approval."""
from flask import Blueprint, request
from app.utils.responses import ok, fail
from app.controllers.platform_actions import PlatformActionController
from app.middleware.auth import require_roles
from app.middleware.api_key import require_api_key, require_scope
from app.middleware.rate_limit import rate_limit
from app.extensions import db

platform_actions_bp = Blueprint("platform_actions", __name__)


# ── Admin endpoints ──────────────────────────────────────────────

@platform_actions_bp.route("/platform-actions/pending", methods=["GET"])
def list_pending():
    """List actions awaiting admin approval."""
    try:
        result = PlatformActionController.list_pending(db)
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)


@platform_actions_bp.route("/platform-actions/<action_id>/approve", methods=["POST"])
@require_roles("SUPER_ADMIN")
def approve_action(action_id: str):
    """Admin approves a pending action."""
    try:
        result = PlatformActionController.approve_action(db, action_id)
        return ok(result, "action approved")
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@platform_actions_bp.route("/platform-actions", methods=["GET"])
def list_actions():
    """List all approved actions, optionally filtered by platform."""
    try:
        platform_id = request.args.get("platform_id")
        result = PlatformActionController.list_actions(db, platform_id=platform_id)
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)


# ── Self-service endpoint (requires API key) ────────────────────

@platform_actions_bp.route("/platform-actions/register", methods=["POST"])
@rate_limit(max_requests=60, window_seconds=60)
@require_api_key
@require_scope("actions:create")
def register_action():
    """Platform registers a new action via API key."""
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return fail("request body required", 400)
        platform_id = request.platform_key.platform_id
        result = PlatformActionController.register_action(
            db, platform_id, data, key_id=request.platform_key.id
        )
        return ok(result, "action registered — pending admin approval", 201)
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)

