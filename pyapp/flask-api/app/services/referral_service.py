from app.extensions import db
from sqlalchemy.orm import joinedload
from app.models import Ambassador
from flask import current_app
from datetime import datetime


class ReferralService:
    @staticmethod
    def list(db, page=1, per_page=20, search=""):
        from app.models import Referral, Ambassador
        from app.utils.serializers import to_dict
        q = db.session.query(Referral).options(
            joinedload(Referral.ambassador).joinedload(Ambassador.user),
            joinedload(Referral.platform),
            joinedload(Referral.referred_user)
        )
        if search:
            q = q.filter(Referral.status.ilike(f"%{search}%"))
        paginated = q.order_by(Referral.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(r, with_relations=True) for r in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def list_for_ambassador(db, ambassador_id, page=1, per_page=20, search=""):
        from app.models import Referral, Ambassador
        from app.utils.serializers import to_dict
        q = db.session.query(Referral).options(
            joinedload(Referral.ambassador).joinedload(Ambassador.user),
            joinedload(Referral.platform),
            joinedload(Referral.referred_platform),
            joinedload(Referral.referred_user)
        ).filter(Referral.ambassador_id == ambassador_id)
        if search:
            q = q.filter(Referral.status.ilike(f"%{search}%"))
        paginated = q.order_by(Referral.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(r, with_relations=True) for r in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def list_for_templates(db, page=1, per_page=20, search=""):
        from app.models import Referral, Ambassador
        from app.utils.serializers import to_dict
        q = db.session.query(Referral).options(
            joinedload(Referral.ambassador).joinedload(Ambassador.user),
            joinedload(Referral.platform),
            joinedload(Referral.referred_user)
        )
        if search:
            q = q.filter(Referral.status.ilike(f"%{search}%"))
        paginated = q.order_by(Referral.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(r, with_relations=True) for r in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def create(db, payload: dict, ambassador_id=None):
        from app.models import Referral, Ambassador, PlatformType, User, RoleType
        from app.utils.serializers import to_dict
        from app.controllers.notifications import NotificationController
        from datetime import datetime, timedelta
        platform_id = payload.get("platformId") or payload.get("platform")
        if not platform_id:
            raise ValueError("platformId required")
        amb = None
        if ambassador_id:
            amb = db.session.get(Ambassador, ambassador_id)
        if not amb:
            raise ValueError("ambassador not found")

        platform = db.session.get(PlatformType, platform_id)
        if not platform:
            raise ValueError("platform not found")

        referred_user_id = payload.get("referredUserId")
        if not referred_user_id:
            email = (payload.get("email") or "").strip().lower()
            phone = (payload.get("phone") or "").strip()
            name = (payload.get("name") or "").strip()
            if not name:
                raise ValueError("name required")
            if not email and not phone:
                raise ValueError("email or phone required")

            referred_user = None
            if email:
                referred_user = db.session.query(User).filter_by(email=email).first()
            if not referred_user and phone:
                referred_user = db.session.query(User).filter_by(phone_number=phone).first()

            if not referred_user:
                referred_role = db.session.query(RoleType).filter_by(name="REFERRED_USER").first()
                if not referred_role:
                    referred_role = RoleType(
                        name="REFERRED_USER",
                        display_name="Referred User",
                        description="User captured through ambassador referral tracking",
                        is_active=True,
                    )
                    db.session.add(referred_role)
                    db.session.flush()

                referred_user = User(
                    email=email or f"referral-{phone}@bits-hustle.local",
                    password="",
                    name=name,
                    phone_number=phone or None,
                    role_id=referred_role.id,
                    is_user_active=False,
                )
                db.session.add(referred_user)
                db.session.flush()
            referred_user_id = referred_user.id

        attribution_days = current_app.config.get("REFERRAL_ATTRIBUTION_DAYS", 30)
        expires_at = datetime.utcnow() + timedelta(days=attribution_days)
        r = Referral(
            ambassador_id=str(amb.id),
            platform_id=platform_id,
            referred_user_id=referred_user_id,
            referral_code_used=amb.referral_code,
            action=payload.get("action"),
            referred_platform_id=platform_id,
            conversion_status=payload.get("conversionStatus", "PENDING"),
            status=payload.get("status", "PENDING"),
            expires_at=expires_at,
        )
        db.session.add(r)
        db.session.commit()
        amb_user = amb.user if amb and amb.user else None
        if amb_user:
            platform_name = platform.display_name if platform else "Unknown Platform"
            NotificationController.create(
                db,
                user_id=amb_user.id,
                title="Referral Created",
                message=f"New referral for {platform_name} platform submitted.",
                reference_type="REFERRAL",
                reference_id=r.id,
                platform_id=r.platform_id,
            )
        return to_dict(r)

    @staticmethod
    def update_conversion_status(db, referral_id, new_status, ambassador_id=None):
        """Update referral conversion status and credit reward when converted."""
        from app.models import Referral, Ambassador
        from app.utils.serializers import to_dict
        from app.controllers.notifications import NotificationController

        r = db.session.get(Referral, referral_id)
        if not r:
            raise ValueError("referral not found")

        # Verify ownership when ambassador_id is provided
        if ambassador_id and r.ambassador_id != ambassador_id:
            raise ValueError("forbidden: not your referral")

        old_status = r.conversion_status
        r.conversion_status = new_status
        db.session.commit()

        # Credit reward when status changes to CONVERTED (within attribution window)
        if old_status != "CONVERTED" and new_status == "CONVERTED":
            # Check attribution window — no commission after expiry
            if r.expires_at and datetime.utcnow() > r.expires_at:
                r.conversion_status = "EXPIRED"
                db.session.commit()
                return to_dict(r)

            try:
                from app.config import Config
                from app.services.wallet_service import WalletService
                reward = Config.REFERRAL_REWARD_AMOUNT
                if reward > 0:
                    WalletService.credit(
                        r.ambassador.wallet.id,
                        reward,
                        "Referral conversion reward",
                        reference_type="REFERRAL_CONVERSION",
                        reference_id=r.id,
                        platform_id=r.platform_id,
                    )
                # Notify ambassador
                amb_user = r.ambassador.user if r.ambassador and r.ambassador.user else None
                if amb_user:
                    NotificationController.create(
                        db,
                        user_id=amb_user.id,
                        title="Referral Converted",
                        message=f"A referral has converted! You earned KES {reward}.",
                        reference_type="REFERRAL",
                        reference_id=r.id,
                        platform_id=r.platform_id,
                    )
            except Exception:
                pass

        return to_dict(r)