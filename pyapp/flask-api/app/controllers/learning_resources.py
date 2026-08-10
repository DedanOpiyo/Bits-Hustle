import uuid
from app.extensions import db


class LearningResourceController:
    @staticmethod
    def create_resource(db, payload: dict):
        from app.services.learning_resource_service import LearningResourceService
        from app.utils.serializers import to_dict
        resource = LearningResourceService.create(db, payload)
        return to_dict(resource)

    @staticmethod
    def list_resources(db, page=1, per_page=20, search=""):
        from app.services.learning_resource_service import LearningResourceService
        result = LearningResourceService.list(db, page, per_page, search)
        # The service already returns with_relations=True items
        return result

    @staticmethod
    def get_resource(db, rid):
        from app.models import LearningResource
        from app.utils.serializers import to_dict
        r = db.session.get(LearningResource, rid)
        if not r:
            raise ValueError("not found")
        return to_dict(r)

    @staticmethod
    def update_resource(db, rid, payload: dict):
        from app.services.learning_resource_service import LearningResourceService
        from app.utils.serializers import to_dict
        resource = LearningResourceService.update(db, rid, payload)
        return to_dict(resource)

    @staticmethod
    def delete_resource(db, rid):
        from app.services.learning_resource_service import LearningResourceService
        return LearningResourceService.delete(db, rid)

