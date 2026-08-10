import hmac
import hashlib
import json
from datetime import datetime, timezone
from flask import current_app
from app.utils.serializers import to_dict


class WebhookService:
    @staticmethod
    def verify_signature(db, payload: dict, signature: str, timestamp: str) -> bool:
        platform_id = payload.get("platform_id")
        webhook_secret = ""

        if platform_id:
            from app.models import PlatformType
            pt_model = db.session.get(PlatformType, platform_id)
            if pt_model and pt_model.webhook_secret:
                webhook_secret = pt_model.webhook_secret

        if not webhook_secret:
            webhook_secret = current_app.config.get("WEBHOOK_SECRET", "")

        if not webhook_secret:
            return False

        try:
            timestamp_dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            if abs((now - timestamp_dt).total_seconds()) > 300:
                return False
        except (ValueError, TypeError):
            return False

        payload_str = json.dumps(payload, separators=(",", ":"), sort_keys=True)
        expected_sig = hmac.new(
            webhook_secret.encode("utf-8"),
            payload_str.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(signature, expected_sig)

    @staticmethod
    def process_conversion(db, payload: dict):
        from app.models import Ambassador, PlatformType, Referral, ReferralRate, RoleType, User
        from app.services.wallet_service import WalletService
        from app.controllers.notifications import NotificationController
        from sqlalchemy import or_

        referral_id = payload.get("referral_id")
        referral_code = payload.get("referral_code")
        conversion_status = payload.get("conversion_status", "CONVERTED")
        action = payload.get("action", "CONVERSION")
        transaction_amount = payload.get("amount", 0.0)
        platform_id = payload.get("platform_id") or payload.get("platformId")
        platform_name = payload.get("platform_name") or payload.get("platform")
        external_user_id = payload.get("external_user_id")
        email = (payload.get("email") or "").strip().lower()
        phone = (payload.get("phone") or "").strip()
        email_verified = bool(payload.get("email_verified"))
        phone_verified = bool(payload.get("phone_verified"))
        name = (payload.get("name") or payload.get("external_user_name") or "Referred User").strip()

        if not referral_id and not referral_code:
            raise ValueError("referral_id or referral_code required")
        if not external_user_id:
            raise ValueError("external_user_id required")
        if not ((email and email_verified) or (phone and phone_verified)):
            raise ValueError("verified email or verified phone required")

        platform = None
        if platform_id:
            platform = db.session.get(PlatformType, platform_id)
        elif platform_name:
            platform = db.session.query(PlatformType).filter(
                or_(PlatformType.name == platform_name, PlatformType.display_name == platform_name)
            ).first()

        r = None
        if referral_id:
            r = db.session.get(Referral, referral_id)
        elif referral_code:
            q = db.session.query(Referral).filter(Referral.referral_code_used == referral_code)
            if platform:
                q = q.filter(Referral.platform_id == platform.id)
            r = q.order_by(Referral.created_at.desc()).first()

        if not platform and r:
            platform = r.platform

        if not r and referral_code:
            if not platform:
                raise ValueError("platform_id or platform_name required")

            ambassador = db.session.query(Ambassador).filter_by(referral_code=referral_code).first()
            if not ambassador:
                raise ValueError("referral code not found")

            referred_user = None
            if email:
                referred_user = db.session.query(User).filter_by(email=email).first()
            if not referred_user and phone:
                referred_user = db.session.query(User).filter_by(phone_number=phone).first()
            if not referred_user and external_user_id:
                generated_email = f"external-{platform.id}-{external_user_id}@bits-hustle.local"
                referred_user = db.session.query(User).filter_by(email=generated_email).first()

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

                generated_email = email or f"external-{platform.id}-{external_user_id or referral_code}@bits-hustle.local"
                referred_user = User(
                    email=generated_email,
                    password="",
                    name=name,
                    phone_number=phone or None,
                    role_id=referred_role.id,
                    is_user_active=False,
                )
                db.session.add(referred_user)
                db.session.flush()

            r = db.session.query(Referral).filter_by(
                ambassador_id=ambassador.id,
                platform_id=platform.id,
                referred_user_id=referred_user.id,
            ).first()

            if not r:
                r = Referral(
                    ambassador_id=ambassador.id,
                    platform_id=platform.id,
                    referred_user_id=referred_user.id,
                    referral_code_used=referral_code,
                    action=action,
                    referred_platform_id=platform.id,
                    conversion_status="PENDING",
                    status="PENDING",
                )
                db.session.add(r)
                db.session.flush()

        if not r:
            raise ValueError("referral not found")

        if r.conversion_status == "CONVERTED":
            return to_dict(r)

        old_status = r.conversion_status
        r.conversion_status = conversion_status
        r.action = action
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise ValueError("database commit failed: {}".format(str(e)))

        if old_status != "CONVERTED" and conversion_status == "CONVERTED":
            try:
                # Find rate record to check is_percentage flag
                from app.services.referral_rate_service import ReferralRateService
                rate_record = db.session.query(ReferralRate).filter(
                    ReferralRate.platform_id == r.platform_id,
                    ReferralRate.tier == (r.ambassador.tier if r.ambassador else "DEFAULT"),
                    ReferralRate.action == action,
                    ReferralRate.is_active == True
                ).order_by(ReferralRate.created_at.desc()).first()

                # Calculate reward based on is_percentage flag
                if rate_record and rate_record.is_percentage:
                    rate_value = rate_record.rate
                    reward = (transaction_amount * rate_value) / 100
                else:
                    reward = ReferralRateService.get_rate(
                        db,
                        platform_id=r.platform_id,
                        tier=r.ambassador.tier if r.ambassador else "DEFAULT",
                        action=action
                    )

                if reward > 0 and r.ambassador and r.ambassador.wallet:
                    WalletService.credit(
                        r.ambassador.wallet.id,
                        reward,
                        f"Referral {action.lower()} reward (external platform)",
                        reference_type="REFERRAL_CONVERSION",
                        reference_id=r.id,
                        platform_id=r.platform_id,
                    )

                amb_user = r.ambassador.user if r.ambassador and r.ambassador.user else None
                if amb_user:
                    NotificationController.create(
                        db,
                        user_id=amb_user.id,
                        title="Referral Converted",
                        message=f"A referral from an external platform has converted ({action})! You earned KES {reward}.",
                        reference_type="REFERRAL",
                        reference_id=r.id,
                        platform_id=r.platform_id,
                    )

                # Send outbound webhook to partner platform
                if r.platform_id and reward > 0:
                    from app.services.outbound_webhook_service import OutboundWebhookService
                    OutboundWebhookService.notify_commission_paid(
                        db, r.id, r.platform_id, reward
                    )
            except Exception:
                pass

        return to_dict(r)

    @staticmethod
    def process_lead_status(db, payload: dict):
        from app.models import Lead, LeadStatusType, PlatformType
        from app.services.lead_service import LeadService
        from sqlalchemy import or_

        lead_id = payload.get("lead_id") or payload.get("leadId")
        external_user_id = payload.get("external_user_id")
        requested_status = payload.get("lead_status") or payload.get("status") or payload.get("conversion_status")
        platform_id = payload.get("platform_id") or payload.get("platformId")
        platform_name = payload.get("platform_name") or payload.get("platform")
        email = (payload.get("email") or "").strip().lower()
        phone = (payload.get("phone") or "").strip()
        email_verified = bool(payload.get("email_verified"))
        phone_verified = bool(payload.get("phone_verified"))

        if not external_user_id:
            raise ValueError("external_user_id required")
        if not requested_status:
            raise ValueError("lead_status required")
        if not ((email and email_verified) or (phone and phone_verified)):
            raise ValueError("verified email or verified phone required")

        normalized_status = str(requested_status).upper()
        if normalized_status == "CONVERSION":
            normalized_status = "CONVERTED"

        status = db.session.query(LeadStatusType).filter(
            or_(LeadStatusType.name == normalized_status, LeadStatusType.display_name == normalized_status)
        ).first()
        if not status:
            raise ValueError("lead status not found")

        lead = None
        if lead_id:
            lead = db.session.get(Lead, lead_id)
        else:
            platform = None
            if platform_id:
                platform = db.session.get(PlatformType, platform_id)
            elif platform_name:
                platform = db.session.query(PlatformType).filter(
                    or_(PlatformType.name == platform_name, PlatformType.display_name == platform_name)
                ).first()
            if not platform:
                raise ValueError("platform_id or platform_name required when lead_id is not provided")
            if not email and not phone:
                raise ValueError("email or phone required when lead_id is not provided")

            q = db.session.query(Lead).filter(Lead.platform_id == platform.id)
            candidate_leads = q.order_by(Lead.created_at.desc()).all()
            for candidate in candidate_leads:
                contact_info = candidate.contact_info or {}
                email_match = email and (contact_info.get("email") or "").strip().lower() == email
                phone_match = phone and (contact_info.get("phone") or "").strip() == phone
                if email_match or phone_match:
                    lead = candidate
                    break

        if not lead:
            raise ValueError("lead not found")

        return LeadService.update_status(db, lead.id, status.id)

    @staticmethod
    def log_webhook_attempt(db, payload: dict, success: bool, error: str = ""):
        from app.models import AuditLog
        try:
            entity_id = payload.get("referral_id") or ""
            log = AuditLog(
                user_id=None,
                action="WEBHOOK_CONVERSION",
                entity_type="REFERRAL",
                entity_id=entity_id,
                changes={
                    "payload": payload,
                    "success": success,
                    "error": error,
                },
            )
            db.session.add(log)
            db.session.commit()
        except Exception:
            pass