import uuid
from app.extensions import db
from app.services.check_in_service import CheckInService


class CheckInController:
    @staticmethod
    def create_check_in(db, payload: dict, ambassador_id=None, override=False):
        return CheckInService.create(db, payload, ambassador_id=ambassador_id, override=override)

    @staticmethod
    def scan_check_in(db, hub_id=None, payload=None, ambassador_id=None, override=False):
        return CheckInService.scan(db, hub_id=hub_id, payload=payload, ambassador_id=ambassador_id, override=override)

    @staticmethod
    def list_check_ins(db, ambassador_id):
        return CheckInService.list(db, ambassador_id)

    @staticmethod
    def check_out(db, checkin_id, user_id=None):
        return CheckInService.check_out(db, checkin_id, user_id=user_id)

    @staticmethod
    def get_hub_attendance(db, hub_id, date=None):
        return CheckInService.get_hub_attendance(db, hub_id, date=date)

    @staticmethod
    def get_hub_attendance_trends(db, hub_id, days=7):
        return CheckInService.get_hub_attendance_trends(db, hub_id, days=days)

