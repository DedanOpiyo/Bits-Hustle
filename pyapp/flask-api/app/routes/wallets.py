"""Wallets + transactions."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles, any_authenticated

wallets_bp = Blueprint("wallets", __name__)
from app.controllers.wallets import WalletController


@wallets_bp.route("/wallets", methods=["GET"])
@require_roles("SUPER_ADMIN", "FINANCE_OFFICER")
def list_wallets():
    try:
        result = WalletController.list_wallets(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@wallets_bp.route("/wallets/<uuid:wallet_id>", methods=["GET"])
@any_authenticated
def get_wallet(wallet_id):
    try:
        result = WalletController.get_wallet(db, str(wallet_id))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@wallets_bp.route("/wallets/<uuid:wallet_id>/details", methods=["GET"])
@any_authenticated
def get_wallet_details(wallet_id):
    try:
        result = WalletController.get_wallet_details(db, str(wallet_id))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@wallets_bp.route("/wallets/<uuid:wallet_id>/transactions", methods=["GET"])
@any_authenticated
def list_transactions(wallet_id):
    try:
        result = WalletController.list_transactions(db, str(wallet_id))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)

