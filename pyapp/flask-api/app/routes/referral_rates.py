from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.services.referral_rate_service import ReferralRateService
from app.middleware.api_key import require_api_key, require_scope
from app.middleware.rate_limit import rate_limit

referral_rates_bp = Blueprint("referral_rates", __name__)


def _as_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on", "percentage")
    return bool(value)


@referral_rates_bp.route("/referral-rates", methods=["GET"])
@require_api_key
@require_scope("rates:read", "rates:create", "rates:update")
def get_rates():
    platform_id = request.args.get("platform_id")
    rates = ReferralRateService.get_rates(db, platform_id)
    return ok(rates)


@referral_rates_bp.route("/referral-rates", methods=["POST"])
@rate_limit(max_requests=60, window_seconds=60)
@require_api_key
@require_scope("rates:create", "rates:update")
def set_rate():
    data = request.get_json(silent=True) or {}
    if not data:
        return fail("request body required", 400)

    rate = data.get("rate")
    if rate is None:
        return fail("rate required", 400)

    try:
        rate_val = float(rate)
    except (ValueError, TypeError):
        return fail("rate must be a number", 400)

    if rate_val < 0:
        return fail("rate must be zero or greater", 400)

    is_percentage = _as_bool(data.get("is_percentage", False))
    if is_percentage and rate_val > 100:
        return fail("percentage referral rate cannot exceed 100", 400)

    platform_id = data.get("platform_id") or None
    tier = data.get("tier", "DEFAULT")
    action = data.get("action", "CONVERSION")

    if platform_id:
        from app.models import PlatformType
        platform = db.session.get(PlatformType, platform_id)
        if not platform:
            return fail(f"platform '{platform_id}' not found", 404)

    saved_rate = ReferralRateService.set_rate(db, platform_id, tier, rate_val, action, is_percentage=is_percentage)
    return ok(saved_rate, "rate saved", 201)


@referral_rates_bp.route("/referral-rates/<rate_id>", methods=["DELETE"])
@require_api_key
@require_scope("rates:update")
def disable_rate(rate_id: str):
    if not rate_id:
        return fail("rate_id required", 400)

    ReferralRateService.disable_rate(db, rate_id)
    return ok(None, "rate disabled")

