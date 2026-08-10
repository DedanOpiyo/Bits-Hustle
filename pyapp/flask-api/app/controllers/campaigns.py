import uuid
from app.extensions import db
from app.services.campaign_service import CampaignService


class CampaignController:
    @staticmethod
    def list_campaigns(db, page=1, per_page=20, search=""):
        return CampaignService.list(db, page=page, per_page=per_page, search=search)

    @staticmethod
    def get_campaign(db, cid):
        return CampaignService.get(db, cid)

    @staticmethod
    def create_campaign(db, payload: dict, created_by_id=None):
        return CampaignService.create(db, payload, created_by_id=created_by_id)

    @staticmethod
    def update_campaign(db, cid, payload: dict):
        return CampaignService.update(db, cid, payload)

    @staticmethod
    def review_campaign(db, cid, payload: dict, reviewed_by_id=None):
        return CampaignService.review(db, cid, payload, reviewed_by_id=reviewed_by_id)

    @staticmethod
    def delete_campaign(db, cid):
        return CampaignService.delete(db, cid)

