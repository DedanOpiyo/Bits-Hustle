"""Referrals CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles, any_authenticated
from flask_jwt_extended import get_jwt_identity
from app.models import User, Ambassador

referrals_bp = Blueprint("referrals", __name__)
from app.controllers.referrals import ReferralController


@referrals_bp.route("/referrals", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def list_referrals():
    try:
        result = ReferralController.list_referrals(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@referrals_bp.route("/referrals/my", methods=["GET"])
@require_roles("AMBASSADOR")
def list_my_referrals():
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    if not user or user.role.name != "AMBASSADOR":
        return fail("forbidden", 403)
    amb = db.session.query(Ambassador).filter_by(user_id=identity).first()
    if not amb:
        return fail("ambassador not found", 404)
    try:
        result = ReferralController.list_referrals_for_ambassador(db, ambassador_id=amb.id)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@referrals_bp.route("/referrals", methods=["POST"])
@any_authenticated
def create_referral():
    data = request.get_json() or {}
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    ambassador_id = identity
    if user and user.role.name == "AMBASSADOR":
        amb = db.session.query(Ambassador).filter_by(user_id=identity).first()
        if amb:
            ambassador_id = amb.id
        else:
            return fail("ambassador not found", 404)
    try:
        result = ReferralController.create_referral(db, data, ambassador_id=ambassador_id)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@referrals_bp.route("/referrals/<uuid:referral_id>/status", methods=["PUT"])
@any_authenticated
def update_referral_status(referral_id):
    data = request.get_json() or {}
    if not data.get("status"):
        return fail("status required", 400)
    try:
        result = ReferralController.update_referral_status(db, str(referral_id), data["status"])
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@referrals_bp.route("/referrals/<uuid:referral_id>/my-status", methods=["PUT"])
@require_roles("AMBASSADOR")
def update_my_referral_status(referral_id):
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    if not user or user.role.name != "AMBASSADOR":
        return fail("forbidden", 403)
    amb = db.session.query(Ambassador).filter_by(user_id=identity).first()
    if not amb:
        return fail("ambassador not found", 404)
    data = request.get_json() or {}
    if not data.get("status"):
        return fail("status required", 400)
    try:
        result = ReferralController.update_referral_status(db, str(referral_id), data["status"], ambassador_id=amb.id)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


