"""Analytics / advanced reporting."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import any_authenticated

analytics_bp = Blueprint("analytics", __name__)
from app.controllers.analytics import AnalyticsController


@analytics_bp.route("/analytics/overview", methods=["GET"])
@any_authenticated
def overview():
    try:
        result = AnalyticsController.overview(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@analytics_bp.route("/analytics/hub-kpis", methods=["GET"])
@any_authenticated
def hub_kpis():
    try:
        result = AnalyticsController.hub_kpis(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@analytics_bp.route("/analytics/ambassador-kpis", methods=["GET"])
@any_authenticated
def ambassador_kpis():
    try:
        result = AnalyticsController.ambassador_kpis(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@analytics_bp.route("/analytics/finance-kpis", methods=["GET"])
@any_authenticated
def finance_kpis():
    try:
        result = AnalyticsController.finance_kpis(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@analytics_bp.route("/analytics/platforms", methods=["GET"])
@any_authenticated
def platform_metrics():
    try:
        result = AnalyticsController.platform_metrics(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@analytics_bp.route("/analytics/daily-questions", methods=["GET"])
@any_authenticated
def daily_questions():
    try:
        result = AnalyticsController.daily_questions(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@analytics_bp.route("/analytics/funnel", methods=["GET"])
@any_authenticated
def funnel_analysis():
    try:
        result = AnalyticsController.funnel_analysis(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@analytics_bp.route("/analytics/advanced-kpis", methods=["GET"])
@any_authenticated
def advanced_kpis():
    try:
        result = AnalyticsController.advanced_kpis(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@analytics_bp.route("/analytics/hub-manager/<uuid:hub_id>", methods=["GET"])
@any_authenticated
def hub_manager_dashboard(hub_id):
    try:
        result = AnalyticsController.hub_manager_dashboard(db, str(hub_id))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)

