"""Dynamic referral rates service - admin configurable."""
from flask import current_app


class ReferralRateService:
    @staticmethod
    def get_rate(db, platform_id: str | None = None, tier: str = "DEFAULT", action: str = "CONVERSION") -> float:
        """
        Get the referral rate for a platform/tier/action combination.
        Falls back to default rate if no specific rate is configured.
        """
        from app.models import ReferralRate

        # Try to find rate for specific platform + tier + action
        rate = db.session.query(ReferralRate).filter(
            ReferralRate.platform_id == platform_id,
            ReferralRate.tier == tier,
            ReferralRate.action == action,
            ReferralRate.is_active == True
        ).order_by(ReferralRate.created_at.desc()).first()

        if rate:
            return rate.rate

        # Try default action rate
        rate = db.session.query(ReferralRate).filter(
            ReferralRate.platform_id == platform_id,
            ReferralRate.tier == tier,
            ReferralRate.action == "CONVERSION",
            ReferralRate.is_active == True
        ).first()

        if rate:
            return rate.rate

        # Try default tier rate
        rate = db.session.query(ReferralRate).filter(
            ReferralRate.platform_id == platform_id,
            ReferralRate.tier == "DEFAULT",
            ReferralRate.is_active == True
        ).first()

        if rate:
            return rate.rate

        # Fall back to config default
        return current_app.config.get("REFERRAL_REWARD_AMOUNT", 100.0)

    @staticmethod
    def _rate_to_dict(rate):
        """Convert a ReferralRate to a dict with platform info."""
        from app.utils.serializers import to_dict
        result = to_dict(rate)
        if rate.platform:
            result["platform_name"] = rate.platform.display_name
            result["platform"] = to_dict(rate.platform)
        return result

    @staticmethod
    def get_rates(db, platform_id: str | None = None):
        """Get all configured rates, optionally filtered by platform."""
        from app.models import ReferralRate

        query = db.session.query(ReferralRate).filter(ReferralRate.is_active == True)
        if platform_id:
            query = query.filter(ReferralRate.platform_id == platform_id)

        rates = query.options(
            db.joinedload(ReferralRate.platform)
        ).order_by(ReferralRate.platform_id, ReferralRate.tier, ReferralRate.action).all()
        return [ReferralRateService._rate_to_dict(r) for r in rates]

    @staticmethod
    def set_rate(db, platform_id: str | None = None, tier: str = "DEFAULT", rate: float = 100.0, action: str = "CONVERSION", created_by: str | None = None, is_percentage: bool = False):
        """Create or update a referral rate for a platform/tier/action."""
        from app.models import ReferralRate
        from app.utils.serializers import to_dict

        if rate < 0:
            raise ValueError("rate must be zero or greater")
        if is_percentage and rate > 100:
            raise ValueError("percentage referral rate cannot exceed 100")

        existing = db.session.query(ReferralRate).filter(
            ReferralRate.platform_id == platform_id,
            ReferralRate.tier == tier,
            ReferralRate.action == action
        ).first()

        if existing:
            existing.rate = rate
            existing.is_percentage = is_percentage
            existing.is_active = True
            existing.created_by_id = created_by
            db.session.commit()
            return to_dict(existing)

        new_rate = ReferralRate(
            platform_id=platform_id,
            tier=tier,
            action=action,
            rate=rate,
            is_percentage=is_percentage,
            created_by_id=created_by
        )
        db.session.add(new_rate)
        db.session.commit()
        return to_dict(new_rate)

    @staticmethod
    def disable_rate(db, rate_id: str):
        """Soft-delete a rate by disabling it."""
        from app.models import ReferralRate

        rate = db.session.get(ReferralRate, rate_id)
        if rate:
            rate.is_active = False
            db.session.commit()
        return rate

