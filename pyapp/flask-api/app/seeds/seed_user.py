"""Seed the database with the initial admin / ambassador user.

Usage:
    python -m app.seeds.seed_user
    FAST_SEED=1 python -m app.seeds.seed_user   # skip role prompt, defaults to AMBASSADOR
"""

import os
import sys
import uuid

# ── project bootstrap ──────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.environ.setdefault("FLASK_ENV", "development")

from app.factory import create_app
from app.extensions import db
from app.models import User, RoleType, Ambassador, Wallet, Hub, UserSetting
from app.utils.auth import hash_password
from app.utils.serializers import to_dict


EMAIL    = "Stevenmuriuki15@gmail.com"
PASSWORD = "Steve@2019"


def _get_or_create_role(session, name, display_name):
    role = session.query(RoleType).filter_by(name=name).first()
    if role is None:
        role = RoleType(
            id=str(uuid.uuid4()),
            name=name,
            display_name=display_name or name,
            description=f"Auto-created seed role: {name}",
        )
        session.add(role)
        session.flush()
    return role


def _ensure_hub(session):
    """Find or create a default hub so an ambassador can be linked."""
    hub = session.query(Hub).first()
    if hub is None:
        hub = Hub(
            id=str(uuid.uuid4()),
            name="Main Hub",
            location="Nairobi, Kenya",
            qr_code="",
            manager_id=None,
        )
        session.add(hub)
        session.flush()
    return hub


def seed(email: str, password: str, role: str = "AMBASSADOR"):
    app = create_app()
    with app.app_context():
        db.create_all()
        session = db.session

        role_map = {
            "super_admin":     "SUPER_ADMIN",
            "hub_manager":     "HUB_MANAGER",
            "ambassador":      "AMBASSADOR",
            "admin":           "ADMIN",
            "finance_officer": "FINANCE_OFFICER",
            "support_officer": "SUPPORT_OFFICER",
        }
        role_key = role.lower().replace(" ", "_").replace("-", "_")
        role_name = role_map.get(role_key, role.upper())

        role_obj = _get_or_create_role(session, role_name, role_name.replace("_", " ").title())

        existing = session.query(User).filter_by(email=email).first()
        if existing:
            print(f"[seed] User {email!r} already exists — updating password.")
            existing.password = hash_password(password)
            session.commit()
            print(f"[seed] Updated password for {email!r}.")
            return

        user = User(
            id=str(uuid.uuid4()),
            email=email,
            password=hash_password(password),
            name=email,
            role_id=role_obj.id,
            is_user_active=True,
        )
        session.add(user)
        session.flush()  # flush here so we have user.id for Ambassador / JWT

        token = __import__("app.utils.auth", fromlist=["make_token"]).make_token(str(user.id))
        print(f"\n[seed] Token  : {token}")

        # ── Always create a default user setting ────────────────────────────────
        setting = UserSetting(
            id=str(uuid.uuid4()),
            user_id=user.id,
            email_notifications=True,
            sms_notifications=False,
            theme="LIGHT",
            language="EN",
            timezone="Africa/Nairobi",
        )
        session.add(setting)

        # ── Ambassador extras (only when role == AMBASSADOR) ────────────────────
        if role_obj.name == "AMBASSADOR":
            hub = _ensure_hub(session)
            referral_code = f"REF-{str(user.id)[:8].upper()}"
            amb = Ambassador(
                id=str(uuid.uuid4()),
                user_id=user.id,
                hub_id=hub.id,
                referral_code=referral_code,
                tier="JUNIOR",
                status="ACTIVE",
            )
            session.add(amb)
            session.flush()

            wallet = Wallet(
                id=str(uuid.uuid4()),
                ambassador_id=amb.id,
                current_balance=0.0,
                pending_earnings=0.0,
                total_earned=0.0,
                total_withdrawn=0.0,
            )
            session.add(wallet)

        session.commit()
        print(f"[seed] ✅  Created user  : {email}")
        print(f"[seed]     name           : {name}")
        print(f"[seed]     role           : {role_obj.name}")
        print(f"[seed]     password       : {password}")
        if role_obj.name == "AMBASSADOR":
            print(f"[seed]     hub            : {hub.name}")
            print(f"[seed]     referral code  : {referral_code}")
            print(f"[seed]     wallet         : created (balance 0.0)")
        print()


def prompt_role():
    print("Select a role for Stevenmuriuki15@gmail.com:")
    options = {
        "1": ("SUPER_ADMIN",        "Super Admin"),
        "2": ("HUB_MANAGER",        "Hub Manager"),
        "3": ("AMBASSADOR",         "Ambassador  (will also create Hub + Wallet)"),
        "4": ("ADMIN",              "Admin"),
        "5": ("FINANCE_OFFICER",    "Finance Officer"),
        "6": ("SUPPORT_OFFICER",    "Support Officer"),
    }
    for key, (name, label) in options.items():
        print(f"  [{key}] {label}")
    choice = input("\nEnter number (default 1 = SUPER_ADMIN): ").strip() or "1"
    return options.get(choice, options["1"])[0]


if __name__ == "__main__":
    selected_role = "AMBASSADOR" if os.environ.get("FAST_SEED") else prompt_role()
    seed(EMAIL, PASSWORD, role=selected_role)

