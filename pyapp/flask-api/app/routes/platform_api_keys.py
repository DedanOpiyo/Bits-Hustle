"""Platform API keys routes."""

from flask import Blueprint, request
from app.utils.responses import ok, fail
from app.controllers.platform_api_keys import PlatformApiKeyController
from app.middleware.auth import require_roles
from app.extensions import db


platform_api_keys_bp = Blueprint("platform_api_keys", __name__)


@platform_api_keys_bp.route("/platform-api-keys", methods=["GET"])
@require_roles("SUPER_ADMIN")
def list_keys():
    try:
        platform_id = request.args.get("platform_id")
        result = PlatformApiKeyController.list_keys(db, platform_id=platform_id)
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)


@platform_api_keys_bp.route("/platform-api-keys", methods=["POST"])
@require_roles("SUPER_ADMIN")
def create_key():
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return fail("request body required", 400)
        result = PlatformApiKeyController.create_key(db, data)
        return ok(result, "api key created", 201)
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@platform_api_keys_bp.route("/platform-api-keys/regenerate", methods=["POST"])
@require_roles("SUPER_ADMIN")
def regenerate_key():
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return fail("request body required", 400)
        platform_id = data.get("platform_id")
        if not platform_id:
            return fail("platform_id required", 400)
        result = PlatformApiKeyController.regenerate_key(
            db,
            platform_id,
            name=data.get("name"),
            scopes=data.get("scopes"),
            revoke_existing=bool(data.get("revoke_existing", False)),
        )
        return ok(result, "api key regenerated", 201)
    except ValueError as e:
        db.session.rollback()
        return fail(str(e), 400)
    except Exception as e:
        db.session.rollback()
        return fail(str(e), 500)


@platform_api_keys_bp.route("/platform-api-keys/<key_id>", methods=["DELETE"])
@require_roles("SUPER_ADMIN")
def delete_key(key_id: str):
    try:
        result = PlatformApiKeyController.delete_key(db, key_id)
        return ok(result, "api key revoked")
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


