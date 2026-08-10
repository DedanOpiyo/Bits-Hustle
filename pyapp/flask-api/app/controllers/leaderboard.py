import uuid
from app.extensions import db


class LeaderboardController:
    @staticmethod
    def leaderboard(db, scope="national", hub_id=None, campaign_id=None, metric="performance"):
        from app.services.leaderboard_service import LeaderboardService

        leaderboard_data = LeaderboardService.get_leaderboard(
            db,
            scope=scope,
            hub_id=hub_id,
            campaign_id=campaign_id,
            metric=metric,
        )

        return leaderboard_data

