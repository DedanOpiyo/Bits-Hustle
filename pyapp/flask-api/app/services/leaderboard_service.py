from app.extensions import db


class LeaderboardService:
    @staticmethod
    def get_leaderboard(db, scope="national", hub_id=None, campaign_id=None, metric="performance", limit=50):
        from app.models import Ambassador, Wallet, Campaign, TaskSubmission, Task, User
        from app.utils.serializers import to_dict
        from sqlalchemy import func, desc, case

        metric = (metric or "performance").lower()
        if metric not in ("performance", "training"):
            metric = "performance"

        # Base query joining Ambassador with Wallet and aggregating performance metrics
        completed_sub = (
            db.session.query(
                TaskSubmission.ambassador_id.label("amb_id"),
                func.count(case((TaskSubmission.status_id.isnot(None), 1))).label("tasks_completed"),
            )
            .group_by(TaskSubmission.ambassador_id)
            .subquery()
        )

        q = db.session.query(
            Ambassador,
            Wallet,
            func.coalesce(completed_sub.c.tasks_completed, 0).label("tasks_completed"),
        ).join(Wallet, Wallet.ambassador_id == Ambassador.id).outerjoin(
            completed_sub, completed_sub.c.amb_id == Ambassador.id
        )

        # Apply filters based on scope
        if scope == "hub" and hub_id:
            q = q.filter(Ambassador.hub_id == hub_id)
        elif scope == "campaign" and campaign_id:
            q = q.join(Ambassador.task_submissions)\
                 .join(Task)\
                 .filter(Task.campaign_id == campaign_id)

        # Order by the selected ranking metric
        if metric == "training":
            # Training ranking: completed training/tasks first, then total points/earnings as tie-breaker
            q = q.order_by(
                desc(func.coalesce(completed_sub.c.tasks_completed, 0)),
                desc(Wallet.total_earned),
            ).limit(limit)
        else:
            # Performance ranking (default): total earnings first
            q = q.order_by(desc(Wallet.total_earned)).limit(limit)

        results = q.all()

        # Format results
        leaderboard = []
        for ambassador, wallet, tasks_completed in results:
            leaderboard.append({
                "ambassador": {
                    "id": str(ambassador.id),
                    "referralCode": ambassador.referral_code,
                    "user": {
                        "id": str(ambassador.user.id) if ambassador.user else None,
                        "name": ambassador.user.name if ambassador.user else None,
                        "email": ambassador.user.email if ambassador.user else None
                    }
                },
                "wallet": to_dict(wallet),
                "tasks_completed": int(tasks_completed or 0),
                "rank": len(leaderboard) + 1  # Simple ranking
            })

        return leaderboard

    @staticmethod
    def get_hub_leaderboard(db, hub_id=None, limit=50):
        """Get leaderboard for a specific hub"""
        return LeaderboardService.get_leaderboard(db, scope="hub", hub_id=hub_id, limit=limit)

    @staticmethod
    def get_national_leaderboard(db, limit=50):
        """Get national leaderboard (all ambassadors)"""
        return LeaderboardService.get_leaderboard(db, scope="national", limit=limit)

    @staticmethod
    def get_campaign_leaderboard(db, campaign_id=None, limit=50):
        """Get leaderboard for a specific campaign"""
        return LeaderboardService.get_leaderboard(db, scope="campaign", campaign_id=campaign_id, limit=limit)
