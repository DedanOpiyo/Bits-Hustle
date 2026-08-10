from app.extensions import db
from app.services.payout_request_service import PayoutRequestService


class PayoutRequestController:
    @staticmethod
    def list_payout_requests(db, page=1, per_page=20, search="", platform_id=None):
        return PayoutRequestService.list(db, page=page, per_page=per_page, search=search, platform_id=platform_id)

    @staticmethod
    def list_payout_requests_for_templates(db, page=1, per_page=20, search="", platform_id=None):
        return PayoutRequestService.list_for_templates(db, page=page, per_page=per_page, search=search, platform_id=platform_id)

    @staticmethod
    def create_payout_request(db, payload, ambassador_id=None):
        return PayoutRequestService.create(db, payload, ambassador_id=ambassador_id)

    @staticmethod
    def review_payout_request(db, pid, payload, reviewed_by_id=None):
        return PayoutRequestService.review(db, pid, payload, reviewed_by_id=reviewed_by_id)

    @staticmethod
    def authorize_payout_request(db, pid, payload=None, reviewed_by_id=None):
        return PayoutRequestService.authorize(db, pid, payload, reviewed_by_id=reviewed_by_id)

    @staticmethod
    def update_payout_request(db, pid, payload, edited_by_id=None):
        return PayoutRequestService.update(db, pid, payload, edited_by_id=edited_by_id)
