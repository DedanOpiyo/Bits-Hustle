from app.extensions import db


class LeadService:
    @staticmethod
    def create(db, payload: dict, ambassador_id=None):
        from app.models import Lead, Ambassador, Campaign, LeadStatusType, User
        from app.utils.serializers import to_dict
        required = ("contactInfo", "campaignId", "platformId")
        if not all(k in payload for k in required):
            raise ValueError("contactInfo, campaignId, platformId required")
        amb = None
        if ambassador_id:
            user = db.session.get(User, ambassador_id)
            if user and user.role and user.role.name == "AMBASSADOR":
                amb = db.session.query(Ambassador).filter_by(user_id=ambassador_id).first()
            else:
                amb = db.session.get(Ambassador, ambassador_id)
        if not amb:
            raise ValueError("ambassador not found")
        ci = payload.get("contactInfo", {})

        # Get default status if not provided
        status_id = payload.get("statusId")
        if not status_id:
            default_status = db.session.query(LeadStatusType).filter_by(name="NEW").first()
            if default_status:
                status_id = default_status.id
            else:
                first_status = db.session.query(LeadStatusType).first()
                status_id = first_status.id if first_status else None

        # Check for duplicate lead in the same campaign (check after fetch to avoid JSONB issues)
        existing_leads = db.session.query(Lead).filter(
            Lead.campaign_id == payload["campaignId"]
        ).all()
        for existing in existing_leads:
            existing_ci = (existing.contact_info or {})
            phone_match = ci.get('phone') and existing_ci.get('phone') == ci['phone']
            email_match = ci.get('email') and existing_ci.get('email') == ci['email']
            if phone_match or email_match:
                raise ValueError("Duplicate lead detected for this campaign")

        lead = Lead()
        lead.ambassador_id = str(amb.id)
        lead.submitted_by_ambassador_id = str(amb.id)
        lead.campaign_id = payload["campaignId"]
        lead.platform_id = payload["platformId"]
        lead.contact_info = payload["contactInfo"]
        lead.status_id = status_id
        db.session.add(lead)
        db.session.commit()

        # ── credit base lead reward ──
        try:
            from app.config import Config
            from app.services.wallet_service import WalletService
            reward = Config.LEAD_REWARD_AMOUNT
            if reward > 0:
                WalletService.credit(
                    amb.wallet.id,
                    reward,
                    "Lead reward",
                    reference_type="LEAD",
                    reference_id=lead.id,
                    platform_id=lead.platform_id,
                )
        except Exception:
            pass

        # ── tier promotion after lead created ──
        try:
            from app.services.tier_service import AmbassadorTierService
            AmbassadorTierService.evaluate(db, amb.id)
        except Exception:
            pass
        return lead

    @staticmethod
    def update_status(db, lead_id, status_id):
        """Update lead status and credit conversion reward if applicable."""
        from app.models import Lead, LeadStatusType
        from app.utils.serializers import to_dict

        lead = db.session.get(Lead, lead_id)
        if not lead:
            raise ValueError("lead not found")

        old_status_id = lead.status_id
        lead.status_id = status_id
        db.session.commit()

        # Check if status changed to CONVERTED
        if old_status_id != status_id:
            new_status = db.session.get(LeadStatusType, status_id)
            if new_status and new_status.name == "CONVERTED":
                try:
                    from app.config import Config
                    from app.services.wallet_service import WalletService
                    from app.controllers.notifications import NotificationController
                    reward = Config.LEAD_CONVERSION_REWARD_AMOUNT
                    if reward > 0:
                        WalletService.credit(
                            lead.ambassador.wallet.id,
                            reward,
                            "Lead conversion reward",
                            reference_type="LEAD_CONVERSION",
                            reference_id=lead.id,
                            platform_id=lead.platform_id,
                        )
                    # Notify ambassador
                    amb_user = lead.ambassador.user if lead.ambassador and lead.ambassador.user else None
                    if amb_user:
                        NotificationController.create(
                            db,
                            user_id=amb_user.id,
                            title="Lead Converted",
                            message=f"Your lead has been converted! You earned KES {reward}.",
                            reference_type="LEAD",
                            reference_id=lead.id,
                            platform_id=lead.platform_id,
                        )
                except Exception:
                    pass

        return to_dict(lead)
