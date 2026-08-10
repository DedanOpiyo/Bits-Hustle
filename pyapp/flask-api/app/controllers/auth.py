import uuid
import secrets
from datetime import datetime, timedelta
from app.extensions import db
from app.services.role_permission_service import RolePermissionService
from app.models import Ambassador, AssignmentWorker
import logging

logger = logging.getLogger(__name__)


class AuthController:
    @staticmethod
    def login(db, email, password):
        from app.models import User
        from app.utils.serializers import to_dict
        user = db.session.query(User).filter_by(email=email).first()
        if not user:
            raise ValueError("invalid credentials")
        from app.utils.auth import check_password
        if not check_password(password, user.password):
            raise ValueError("invalid credentials")
        if not user.is_active:
            raise ValueError("account pending admin approval or inactive")
        from app.utils.auth import make_token
        token = make_token(str(user.id))
        d = to_dict(user)
        d["is_active"] = user.is_active
        d["must_change_password"] = getattr(user, "must_change_password", False)
        if user.role:
            d["role"] = to_dict(user.role)
            d["permissions"] = RolePermissionService.get_user_permissions(user)
        else:
            d["role"] = None
            d["permissions"] = []
        # Add ambassador_id if the user is an ambassador
        ambassador = db.session.query(Ambassador).filter_by(user_id=user.id).first()
        if ambassador:
            d["ambassador_id"] = ambassador.id
        # Add assignment worker status
        worker = db.session.query(AssignmentWorker).filter_by(user_id=user.id).first()
        d["is_assignment_worker"] = bool(worker)
        return dict(token=token, user=d)

    @staticmethod
    def change_password(db, user_id, payload: dict):
        from app.models import User
        from app.utils.auth import hash_password, check_password
        user = db.session.get(User, user_id)
        if not user:
            raise ValueError("user not found")
        current_password = payload.get("currentPassword")
        new_password = payload.get("newPassword")
        if not current_password or not new_password:
            raise ValueError("currentPassword and newPassword are required")
        if len(new_password) < 6:
            raise ValueError("password must be at least 6 characters")
        if not check_password(current_password, user.password):
            raise ValueError("current password is incorrect")
        user.password = hash_password(new_password)
        user.must_change_password = False
        db.session.commit()

    @staticmethod
    def forgot_password(db, email: str):
        from app.models import User
        from app.services.email_service import EmailService
        from flask import current_app
        user = db.session.query(User).filter_by(email=email).first()
        if not user:
            logger.info(f"Password reset requested for non-existent email: {email}")
            return
        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        user.password_reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url}/reset-password?token={token}"
        print(f"[DEBUG] forgot_password: email={email}, token={token[:8]}...")
        try:
            EmailService.send(
                to=email,
                subject="Reset Your Password",
                body_html=f"""
                <html><body>
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password (valid for 1 hour):</p>
                <p><a href="{reset_link}">Reset Password</a></p>
                <p>If you did not request this, please ignore this email.</p>
                </body></html>
                """,
                body_text=f"Reset your password using this link: {reset_link}",
            )
            logger.info(f"Password reset email sent to {email}")
        except Exception as exc:
            logger.error(f"Failed to send password reset email to {email}: {exc}")

    @staticmethod
    def reset_password(db, token: str, new_password: str):
        from app.models import User
        from app.utils.auth import hash_password
        if len(new_password) < 6:
            raise ValueError("password must be at least 6 characters")
        user = db.session.query(User).filter_by(
            password_reset_token=token,
        ).first()
        print(f"[DEBUG] reset_password: token={token[:8]}..., user_found={user is not None}")
        if not user:
            raise ValueError("invalid or expired reset token")
        print(f"[DEBUG] reset_password: token_expires={user.password_reset_token_expires}")
        if user.password_reset_token_expires < datetime.utcnow():
            raise ValueError("reset token has expired")
        user.password = hash_password(new_password)
        user.must_change_password = False
        user.password_reset_token = None
        user.password_reset_token_expires = None
        db.session.commit()

    @staticmethod
    def register(db, payload: dict):
        from app.models import User, Ambassador, Wallet, RoleType
        from app.utils.auth import hash_password
        from app.utils.serializers import to_dict

        required = ("email", "password", "name")
        missing = [k for k in required if k not in payload or not str(payload.get(k, "")).strip()]
        if missing:
            raise ValueError(f"email, password, name, hubId required. Missing: {missing}")

        ambassador_role = db.session.query(RoleType).filter_by(name="AMBASSADOR").first()
        if not ambassador_role:
            raise ValueError("Ambassador role not configured")

        email_exists = db.session.query(User).filter_by(email=payload["email"]).first()
        if email_exists:
            raise ValueError("email already exists")

        phone_number = (payload.get("phoneNumber") or "").strip() or None
        if phone_number:
            phone_exists = db.session.query(User).filter_by(phone_number=phone_number).first()
            if phone_exists:
                raise ValueError("phone number already exists")

        user = User(
            email=payload["email"],
            password=hash_password(payload["password"]),
            name=payload["name"],
            role_id=ambassador_role.id,
            phone_number=phone_number,
            is_user_active=False,
            must_change_password=False,
        )
        db.session.add(user)
        db.session.flush()

        referral_code = f"B2H-{str(uuid.uuid4())[:8].upper()}"
        ambassador = Ambassador(
            user_id=user.id,
            hub_id=payload["hubId"],
            referral_code=referral_code,
            tier="JUNIOR",
            status="ACTIVE",
        )
        db.session.add(ambassador)
        db.session.flush()

        wallet = Wallet(
            ambassador_id=ambassador.id,
            current_balance=0.0,
            pending_earnings=0.0,
            total_earned=0.0,
            total_withdrawn=0.0,
        )
        db.session.add(wallet)

        db.session.commit()
        return to_dict(user)

    @staticmethod
    def get_user(db, user_id):
        from app.models import User
        from app.utils.serializers import to_dict
        user = db.session.get(User, user_id)
        if not user:
            raise ValueError("user not found")
        d = to_dict(user)
        d["is_active"] = user.is_active
        d["must_change_password"] = getattr(user, "must_change_password", False)
        if user.role:
            d["role"] = to_dict(user.role)
        # Add ambassador_id if the user is an ambassador
        ambassador = db.session.query(Ambassador).filter_by(user_id=user.id).first()
        if ambassador:
            d["ambassador_id"] = ambassador.id
            d["ambassador_profile"] = to_dict(ambassador)
        return d

    @staticmethod
    def get_me(db, user_id):
        from app.models import User, AssignmentWorker
        from app.utils.serializers import to_dict
        user = db.session.get(User, user_id)
        if not user:
            raise ValueError("user not found")
        d = to_dict(user)
        d["is_active"] = user.is_active
        d["must_change_password"] = getattr(user, "must_change_password", False)
        if user.role:
            d["role"] = to_dict(user.role)
            d["permissions"] = RolePermissionService.get_user_permissions(user)
        else:
            d["role"] = None
            d["permissions"] = []
        # Add ambassador_profile object for frontend compatibility
        ambassador = db.session.query(Ambassador).filter_by(user_id=user.id).first()
        if ambassador:
            d["ambassador_id"] = ambassador.id
            d["ambassador_profile"] = to_dict(ambassador)
        # Add assignment worker status
        worker = db.session.query(AssignmentWorker).filter_by(user_id=user.id).first()
        d["is_assignment_worker"] = bool(worker)
        if worker:
            d["assignment_worker"] = to_dict(worker)
        return d



