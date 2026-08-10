"""Leaderboard."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import any_authenticated
from app.controllers.leaderboard import LeaderboardController


leaderboard_bp = Blueprint("leaderboard", __name__)


@leaderboard_bp.route("/leaderboard", methods=["GET"])
@any_authenticated
def leaderboard():
    scope = request.args.get("scope", "national")
    hub_id = request.args.get("hubId")
    campaign_id = request.args.get("campaignId")
    metric = request.args.get("metric", "performance")
    try:
        result = LeaderboardController.leaderboard(
            db, scope=scope, hub_id=hub_id, campaign_id=campaign_id, metric=metric
        )
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)

