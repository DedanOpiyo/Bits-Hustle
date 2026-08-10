"""Campaigns CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles
from flask_jwt_extended import get_jwt_identity

campaigns_bp = Blueprint("campaigns", __name__)
from app.controllers.campaigns import CampaignController


@campaigns_bp.route("/campaigns", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER", "SUPPORT_OFFICER", "PARTNER_ADVERTISER", "AMBASSADOR")
def list_campaigns():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("perPage", 20, type=int)
    created_by = request.args.get("createdById")
    try:
        result = CampaignController.list_campaigns(db, page=page, per_page=per_page)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@campaigns_bp.route("/campaigns/<uuid:cid>", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER", "SUPPORT_OFFICER", "PARTNER_ADVERTISER", "AMBASSADOR")
def get_campaign(cid):
    try:
        result = CampaignController.get_campaign(db, str(cid))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@campaigns_bp.route("/campaigns", methods=["POST"])
@require_roles("SUPER_ADMIN", "PARTNER_ADVERTISER")
def create_campaign():
    data = request.get_json() or {}
    identity = get_jwt_identity()
    try:
        result = CampaignController.create_campaign(db, data, created_by_id=identity)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@campaigns_bp.route("/campaigns/<uuid:cid>", methods=["PUT"])
@require_roles("SUPER_ADMIN", "PARTNER_ADVERTISER")
def update_campaign(cid):
    data = request.get_json() or {}
    try:
        result = CampaignController.update_campaign(db, str(cid), data)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@campaigns_bp.route("/campaigns/<uuid:cid>/review", methods=["POST"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def review_campaign(cid):
    data = request.get_json() or {}
    identity = get_jwt_identity()
    try:
        result = CampaignController.review_campaign(db, str(cid), data, reviewed_by_id=identity)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@campaigns_bp.route("/campaigns/<uuid:cid>", methods=["DELETE"])
@require_roles("SUPER_ADMIN", "PARTNER_ADVERTISER")
def delete_campaign(cid):
    try:
        CampaignController.delete_campaign(db, str(cid))
        return ok({"message": "campaign deleted"})
    except ValueError as e:
        return fail(str(e), 404)


