"""Leads CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles, any_authenticated
from flask_jwt_extended import get_jwt_identity

leads_bp = Blueprint("leads", __name__)
from app.controllers.leads import LeadController


@leads_bp.route("/leads", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER", "SUPPORT_OFFICER", "AMBASSADOR")
def list_leads():
    identity = get_jwt_identity()
    try:
        result = LeadController.list_leads(db, ambassador_id=identity)
        print("Leads result:", result)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@leads_bp.route("/leads", methods=["POST"])
@any_authenticated
def create_lead():
    data = request.get_json() or {}
    identity = get_jwt_identity()
    try:
        result = LeadController.create_lead(db, data, ambassador_id=identity)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@leads_bp.route("/leads/<uuid:lead_id>/status", methods=["PUT"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def update_lead_status(lead_id):
    data = request.get_json() or {}
    if not data.get("statusId"):
        return fail("statusId required", 400)
    try:
        result = LeadController.update_lead_status(db, str(lead_id), data["statusId"])
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


