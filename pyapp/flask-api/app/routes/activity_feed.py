"""Activity feed."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail

activity_feed_bp = Blueprint("activity_feed", __name__)
from app.controllers.activity_feed import ActivityFeedController


@activity_feed_bp.route("/activity-feed", methods=["GET"])
def activity_feed():
    ambassador_id = request.args.get("ambassadorId")
    hub_id = request.args.get("hubId")
    try:
        result = ActivityFeedController.get_activity_feed(db, ambassador_id=ambassador_id, hub_id=hub_id)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)

