"""Auth routes: login, register, forgot/reset password, profile."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import any_authenticated, require_roles
from flask_jwt_extended import get_jwt_identity

auth_bp = Blueprint("auth", __name__)
from app.controllers.auth import AuthController


def _get_request_data():
    data = request.get_json(silent=True)
    if data is None:
        data = request.form.to_dict() if request.form else {}
    return data or {}


@auth_bp.route("/auth/login", methods=["POST"], endpoint="login")
def login():
    data = _get_request_data()
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return fail("email and password required", 400)
    try:
        result = AuthController.login(db, email, password)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@auth_bp.route("/auth/register", methods=["POST"], endpoint="register")
def register():
    data = _get_request_data()
    try:
        result = AuthController.register(db, data)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@auth_bp.route("/auth/profile", methods=["GET"], endpoint="profile")
@any_authenticated
def profile():
    identity = get_jwt_identity()
    try:
        result = AuthController.get_user(db, str(identity))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@auth_bp.route("/auth/change-password", methods=["POST"], endpoint="change_password")
@any_authenticated
def change_password():
    data = _get_request_data()
    identity = get_jwt_identity()
    try:
        AuthController.change_password(db, str(identity), data)
        return ok({"message": "password changed successfully"})
    except ValueError as e:
        return fail(str(e), 400)


@auth_bp.route("/auth/forgot-password", methods=["POST"], endpoint="forgot_password")
def forgot_password():
    data = _get_request_data()
    email = data.get("email")
    if not email:
        return fail("email is required", 400)
    try:
        AuthController.forgot_password(db, email)
        return ok({"message": "password reset link sent"})
    except ValueError as e:
        return fail(str(e), 400)


@auth_bp.route("/auth/reset-password/<token>", methods=["POST"], endpoint="reset_password")
def reset_password(token):
    data = _get_request_data()
    new_password = data.get("password")
    print(f"[DEBUG] reset-password: token={token[:8]}..., data={data}, password={'***' if new_password else 'MISSING'}")
    if not new_password:
        return fail("password is required", 400)
    try:
        AuthController.reset_password(db, token, new_password)
        return ok({"message": "password reset successful"})
    except ValueError as e:
        return fail(str(e), 400)


@auth_bp.route("/auth/me", methods=["GET"], endpoint="me")
@any_authenticated
def me():
    identity = get_jwt_identity()
    try:
        result = AuthController.get_me(db, str(identity))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


