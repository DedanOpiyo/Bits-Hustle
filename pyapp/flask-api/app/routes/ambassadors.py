"""Ambassadors CRUD + profile."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles
from flask_jwt_extended import get_jwt_identity
from app.models import User, Ambassador, Hub

ambassadors_bp = Blueprint("ambassadors", __name__)
from app.controllers.ambassadors import AmbassadorController


@ambassadors_bp.route("/ambassadors", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER", "SUPPORT_OFFICER")
def list_ambassadors():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("perPage", 20, type=int)
    try:
        result = AmbassadorController.list_ambassadors(db, page=page, per_page=per_page)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@ambassadors_bp.route("/ambassadors", methods=["POST"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def create_ambassador():
    data = request.get_json() or {}
    try:
        result = AmbassadorController.create_ambassador(db, data)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@ambassadors_bp.route("/ambassadors/<uuid:amb_id>", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER", "SUPPORT_OFFICER", "AMBASSADOR")
def get_ambassador(amb_id):
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    if user and user.role.name == "AMBASSADOR":
        amb = db.session.query(Ambassador).filter_by(user_id=identity).first()
        if amb:
            amb_id = amb.id
        else:
            return fail("forbidden", 403)
    try:
        result = AmbassadorController.get_ambassador(db, str(amb_id))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@ambassadors_bp.route("/ambassadors/<uuid:amb_id>/wallet", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER", "AMBASSADOR")
def get_ambassador_wallet(amb_id):
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    actual_amb_id = amb_id
    if user and user.role.name == "AMBASSADOR":
        amb = db.session.query(Ambassador).filter_by(user_id=identity).first()
        if amb:
            actual_amb_id = amb.id
        else:
            return fail("forbidden", 403)
    try:
        result = AmbassadorController.get_ambassador_wallet(db, str(actual_amb_id))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@ambassadors_bp.route("/ambassadors/<uuid:amb_id>", methods=["PUT"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def update_ambassador(amb_id):
    data = request.get_json() or {}
    try:
        result = AmbassadorController.update_ambassador(db, str(amb_id), data)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@ambassadors_bp.route("/ambassadors/<uuid:amb_id>/submissions", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER", "SUPPORT_OFFICER", "AMBASSADOR")
def get_ambassador_submissions(amb_id):
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    actual_amb_id = amb_id
    if user and user.role.name == "AMBASSADOR":
        amb = db.session.query(Ambassador).filter_by(user_id=identity).first()
        if amb:
            actual_amb_id = amb.id
        else:
            return fail("forbidden", 403)
    try:
        result = AmbassadorController.get_ambassador_submissions(db, str(actual_amb_id))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@ambassadors_bp.route("/hubs/<uuid:hub_id>/ambassadors", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def get_hub_ambassadors(hub_id):
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    if not user:
        return fail("user not found", 404)
    if user.role.name == "HUB_MANAGER":
        managed_hub = db.session.query(Ambassador).filter_by(user_id=identity).first()
        hub = db.session.query(Hub).filter_by(id=str(hub_id), manager_id=identity).first()
        if not hub:
            return fail("you can only view ambassadors for your assigned hub", 403)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("perPage", 20, type=int)
    try:
        result = AmbassadorController.get_hub_ambassadors(db, str(hub_id), page=page, per_page=per_page)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@ambassadors_bp.route("/ambassadors/<uuid:amb_id>/detail", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER", "AMBASSADOR")
def get_ambassador_detail(amb_id):
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    if not user:
        return fail("user not found", 404)
    actual_amb_id = amb_id
    if user.role.name == "AMBASSADOR":
        amb = db.session.query(Ambassador).filter_by(user_id=identity).first()
        if amb:
            actual_amb_id = amb.id
        else:
            return fail("forbidden", 403)
    elif user.role.name == "HUB_MANAGER":
        amb = db.session.query(Ambassador).filter_by(id=str(actual_amb_id)).first()
        if not amb:
            return fail("ambassador not found", 404)
        hub = db.session.query(Hub).filter_by(id=amb.hub_id, manager_id=identity).first()
        if not hub:
            return fail("you can only view details for ambassadors in your hub", 403)
    try:
        result = AmbassadorController.get_ambassador_detail(db, str(actual_amb_id))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@ambassadors_bp.route("/ambassadors/<uuid:amb_id>/fraud-flag", methods=["POST"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def flag_ambassador_fraud(amb_id):
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    if not user:
        return fail("user not found", 404)
    if user.role.name == "HUB_MANAGER":
        amb = db.session.query(Ambassador).filter_by(id=str(amb_id)).first()
        if not amb:
            return fail("ambassador not found", 404)
        hub = db.session.query(Hub).filter_by(id=amb.hub_id, manager_id=identity).first()
        if not hub:
            return fail("you can only flag fraud for ambassadors in your hub", 403)
    data = request.get_json() or {}
    try:
        result = AmbassadorController.flag_ambassador_fraud(db, str(amb_id), data)
        return ok(result, "fraud flag recorded", 201)
    except ValueError as e:
        return fail(str(e), 400)
