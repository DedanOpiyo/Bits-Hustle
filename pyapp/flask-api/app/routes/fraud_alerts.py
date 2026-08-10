"""Fraud alerts CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles, any_authenticated
from flask_jwt_extended import get_jwt_identity

fraud_alerts_bp = Blueprint("fraud_alerts", __name__)
from app.controllers.fraud_alerts import FraudAlertController


@fraud_alerts_bp.route("/fraud-alerts", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER")
def list_alerts():
    try:
        result = FraudAlertController.list_fraud_alerts(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@fraud_alerts_bp.route("/fraud-alerts/<uuid:fid>/resolve", methods=["PUT"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER")
def resolve_alert(fid):
    identity = get_jwt_identity()
    try:
        result = FraudAlertController.resolve_fraud_alert(db, str(fid), resolved_by_id=identity)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)

