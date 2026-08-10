from app.extensions import db
from app.services.referral_service import ReferralService
from datetime import datetime
from app.models import Referral


class ReferralController:
    @staticmethod
    def list_referrals(db, page=1, per_page=20, search=""):
        return ReferralService.list(db, page=page, per_page=per_page, search=search)

    @staticmethod
    def list_referrals_for_templates(db, page=1, per_page=20, search=""):
        return ReferralService.list_for_templates(db, page=page, per_page=per_page, search=search)

    @staticmethod
    def list_referrals_for_ambassador(db, ambassador_id, page=1, per_page=20, search=""):
        return ReferralService.list_for_ambassador(db, ambassador_id, page=page, per_page=per_page, search=search)

    @staticmethod
    def create_referral(db, payload, ambassador_id=None):
        result = ReferralService.create(db, payload, ambassador_id=ambassador_id)
        if payload.get("approve"):
            r = db.session.get(Referral, result["id"])
            if r and datetime.utcnow() > r.expires_at:
                raise ValueError("referral has expired")
            if r:
                try:
                    from app.controllers.badges import BadgeController
                    from app.services.tier_service import AmbassadorTierService
                    BadgeController.check_and_award(db, r.ambassador_id)
                    AmbassadorTierService.evaluate(db, r.ambassador_id)
                except Exception:
                    pass
        return result

    @staticmethod
    def update_referral_status(db, referral_id, status, ambassador_id=None):
        return ReferralService.update_conversion_status(db, referral_id, status, ambassador_id=ambassador_id)


