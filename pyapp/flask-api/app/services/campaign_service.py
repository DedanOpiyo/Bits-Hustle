"""Campaigns service — extracted from CampaignController."""

from app.extensions import db
from sqlalchemy.orm import joinedload


class CampaignService:
    @staticmethod
    def list(db, page=1, per_page=20, search=""):
        from app.models import Campaign
        from app.utils.serializers import to_dict
        q = db.session.query(Campaign).options(
            joinedload(Campaign.platform),
            joinedload(Campaign.tasks)
        )
        if search:
            q = q.filter(Campaign.name.ilike(f"%{search}%"))
        paginated = q.order_by(Campaign.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(c, with_relations=True) for c in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def get(db, cid):
        from app.models import Campaign
        from app.utils.serializers import to_dict
        c = db.session.query(Campaign).options(
            joinedload(Campaign.platform),
            joinedload(Campaign.tasks)
        ).get(cid)
        if not c:
            raise ValueError("not found")
        return to_dict(c)

    @staticmethod
    def create(db, payload: dict, created_by_id=None):
        from app.models import Campaign, Ambassador, User
        from app.utils.serializers import to_dict
        from app.controllers.notifications import NotificationController
        required = ("name", "description", "platformId", "startDate", "endDate", "budget")
        if not all(k in payload for k in required):
            raise ValueError("name, description, platformId, startDate, endDate, budget required")
        approval_status = payload.get("approvalStatus")
        is_active = payload.get("isActive", False)
        if created_by_id:
            creator = db.session.get(User, created_by_id)
            if creator and creator.role and creator.role.name == "PARTNER_ADVERTISER":
                approval_status = approval_status or "PENDING"
                is_active = False
            else:
                approval_status = approval_status or "APPROVED"
                is_active = True
        else:
            approval_status = approval_status or "PENDING"
            is_active = payload.get("isActive", False)
        c = Campaign(
            name=payload["name"],
            description=payload["description"],
            platform_id=payload["platformId"],
            created_by_id=created_by_id,
            start_date=payload["startDate"],
            end_date=payload["endDate"],
            budget=payload["budget"],
            reward_structure=payload.get("rewardStructure", {}),
            approval_status=approval_status,
            is_active=is_active,
        )
        db.session.add(c)
        db.session.commit()
        all_ambs = db.session.query(Ambassador).all()
        for amb in all_ambs:
            amb_user = amb.user
            if amb_user:
                platform_name = ""
                if c.platform_id:
                    from app.models import PlatformType
                    platform = db.session.get(PlatformType, c.platform_id)
                    platform_name = f" for {platform.display_name}" if platform else ""
                NotificationController.create(
                    db,
                    user_id=amb_user.id,
                    title="New Campaign Available",
                    message=f"A new campaign '{c.name}'{platform_name} is now open for submissions.",
                    reference_type="CAMPAIGN",
                    reference_id=c.id,
                    platform_id=c.platform_id,
                )
        return to_dict(c)

    @staticmethod
    def update(db, cid, payload: dict):
        from app.models import Campaign
        from app.utils.serializers import to_dict
        c = db.session.get(Campaign, cid)
        if not c:
            raise ValueError("not found")
        for field in ("name", "description", "platformId", "startDate", "endDate", "budget", "rewardStructure", "isActive"):
            if field in payload:
                setattr(c, field.lower().replace("Id", "_id").replace("Structure", "_structure"), payload[field])
        db.session.commit()
        return to_dict(c)

    @staticmethod
    def review(db, cid, payload: dict, reviewed_by_id=None):
        from app.models import Campaign, User
        from app.utils.serializers import to_dict
        from app.controllers.notifications import NotificationController
        from datetime import datetime

        c = db.session.get(Campaign, cid)
        if not c:
            raise ValueError("not found")
        if "approvalStatus" not in payload or payload["approvalStatus"] not in ("APPROVED", "REJECTED"):
            raise ValueError("approvalStatus must be APPROVED or REJECTED")
        c.approval_status = payload["approvalStatus"]
        c.approved_by_id = reviewed_by_id
        c.approved_at = datetime.utcnow()
        c.approval_notes = payload.get("approvalNotes")
        c.is_active = c.approval_status == "APPROVED"
        db.session.commit()

        creator = db.session.get(User, c.created_by_id) if c.created_by_id else None
        if creator:
            platform_name = ""
            if c.platform_id:
                from app.models import PlatformType
                platform = db.session.get(PlatformType, c.platform_id)
                platform_name = f" for {platform.display_name}" if platform else ""
            NotificationController.create(
                db,
                user_id=creator.id,
                title=f"Campaign {c.approval_status.title()}",
                message=f"Your campaign '{c.name}'{platform_name} was {c.approval_status.lower()}.",
                reference_type="CAMPAIGN",
                reference_id=c.id,
                platform_id=c.platform_id,
            )
        return to_dict(c)

    @staticmethod
    def delete(db, cid):
        from app.models import Campaign
        c = db.session.get(Campaign, cid)
        if not c:
            raise ValueError("not found")
        db.session.delete(c)
        db.session.commit()
        return dict(deleted=True)

