"""Auth helpers: password hashing, JWT token generation."""

from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token
from app.extensions import bcrypt, jwt


def hash_password(plain: str) -> str:
    return bcrypt.generate_password_hash(plain).decode("utf-8")


def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.check_password_hash(hashed, plain)


def make_token(identity: str) -> str:
    return create_access_token(identity=identity)

