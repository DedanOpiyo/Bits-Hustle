import uuid
from app.extensions import db


class AnalyticsController:
    @staticmethod
    def overview(db):
        from app.models import Transaction, TaskSubmission, Lead
        from app.utils.serializers import to_dict
        from sqlalchemy import func
        total_revenue = db.session.query(func.sum(Transaction.amount)).scalar() or 0
        task_count = db.session.query(TaskSubmission).count()
        lead_count = db.session.query(Lead).count()
        return dict(
            totalRevenue=float(total_revenue),
            totalTasks=task_count,
            totalLeads=lead_count,
        )

    @staticmethod
    def finance_kpis(db):
        from app.models import PayoutRequest, PayoutStatusType, Transaction
        from app.utils.serializers import to_dict
        from datetime import datetime, timedelta
        from decimal import Decimal
        approved_reqs = db.session.query(PayoutRequest).join(
            PayoutStatusType
        ).filter(PayoutStatusType.name == "APPROVED").all()
        total_approved = sum(r.amount for r in approved_reqs)
        pending_count = db.session.query(PayoutRequest).join(
            PayoutStatusType
        ).filter(PayoutStatusType.name == "PENDING").count()
        avg_payout = (total_approved / len(approved_reqs)) if approved_reqs else 0
        turnaround_hours = 0
        if approved_reqs:
            diffs = [
                (r.reviewed_at - r.created_at).total_seconds() / 3600
                for r in approved_reqs if r.reviewed_at
            ]
            if diffs:
                turnaround_hours = round(sum(diffs) / len(diffs), 2)
        total_earnings = db.session.query(
            db.func.sum(Transaction.amount)
        ).filter(Transaction.type == "EARNING").scalar() or 0
        return dict(
            totalCommissionsEarned=float(total_earnings),
            totalPayoutsApproved=float(total_approved) if total_approved else 0,
            pendingPayoutsCount=pending_count,
            avgPayoutAmount=float(avg_payout),
            avgTurnaroundHours=turnaround_hours,
        )

    @staticmethod
    def hub_kpis(db):
        from app.models import Hub, CheckIn, Ambassador
        from app.utils.serializers import to_dict
        from datetime import datetime, timezone, timedelta
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        daily_att = db.session.query(Hub.id, Hub.name, db.func.count(CheckIn.id).label("checkins")).\
            join(CheckIn, CheckIn.hub_id == Hub.id).\
            filter(CheckIn.check_in_time >= today).\
            group_by(Hub.id, Hub.name).all()
        active_per_hub = db.session.query(
            Hub.id, Hub.name, db.func.count(Ambassador.id).label("ambassadors")
        ).join(Ambassador, Ambassador.hub_id == Hub.id).group_by(Hub.id, Hub.name).all()
        return dict(
            dailyAttendance=[
                {"hubId": str(r.id), "hubName": r.name, "checkins": int(r.checkins)}
                for r in daily_att
            ],
            activePerHub=[
                {"hubId": str(r.id), "hubName": r.name, "activeAmbassadors": int(r.ambassadors)}
                for r in active_per_hub
            ],
        )

    @staticmethod
    def ambassador_kpis(db):
        from app.models import Ambassador, Wallet, CheckIn, Lead, TaskSubmission
        from app.utils.serializers import to_dict
        from datetime import datetime, timedelta
        total = db.session.query(Ambassador).count()
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        seven_days_ago = now - timedelta(days=7)
        active = db.session.query(Ambassador.id).join(
            CheckIn, CheckIn.ambassador_id == Ambassador.id
        ).filter(CheckIn.check_in_time >= thirty_days_ago).count()
        new_7d = db.session.query(Ambassador).filter(Ambassador.created_at >= seven_days_ago).count()
        new_30d = db.session.query(Ambassador).filter(Ambassador.created_at >= thirty_days_ago).count()
        avg_earnings = db.session.query(db.func.avg(Wallet.total_earned)).scalar() or 0
        top_5 = db.session.query(Ambassador, Wallet).join(
            Wallet, Wallet.ambassador_id == Ambassador.id
        ).order_by(Wallet.total_earned.desc()).limit(5).all()
        top_performers = []
        for amb, w in top_5:
            top_performers.append({
                "ambassadorId": str(amb.id),
                "name": amb.user.name if amb.user else None,
                "totalEarned": float(w.total_earned or 0),
            })
        return dict(
            total=total,
            active=active,
            new7d=new_7d,
            new30d=new_30d,
            avgEarnings=float(avg_earnings),
            topPerformers=top_performers,
            # Retention rates (30/60/90 day)
            retention30d=round((active / total * 100), 1) if total > 0 else 0,
            retention60d=round((db.session.query(Ambassador.id).join(
                CheckIn, CheckIn.ambassador_id == Ambassador.id
            ).filter(CheckIn.check_in_time >= now - timedelta(days=60)).distinct().count() / total * 100), 1) if total > 0 else 0,
            retention90d=round((db.session.query(Ambassador.id).join(
                CheckIn, CheckIn.ambassador_id == Ambassador.id
            ).filter(CheckIn.check_in_time >= now - timedelta(days=90)).distinct().count() / total * 100), 1) if total > 0 else 0,
        )

    @staticmethod
    def advanced_kpis(db):
        """Calculate CPA, ROI, and Hub ROI."""
        from app.models import Campaign, Transaction, Lead, Referral, Hub, CheckIn, Wallet, Ambassador
        from app.utils.serializers import to_dict
        from sqlalchemy import func
        from datetime import datetime, timedelta

        now = datetime.utcnow()

        # Cost Per Acquisition (total campaign spend / total conversions)
        total_campaign_spend = db.session.query(func.coalesce(func.sum(Campaign.budget), 0)).scalar()
        total_conversions = db.session.query(Referral).filter_by(conversion_status="CONVERTED").count()
        cpa = round(float(total_campaign_spend) / total_conversions, 2) if total_conversions > 0 else 0

        # ROI per campaign: (revenue from platform - campaign cost) / campaign cost
        campaigns = db.session.query(Campaign).all()
        campaign_roi = []
        for c in campaigns:
            # Revenue attributed to this campaign (earnings from leads/referrals/tasks in this campaign)
            revenue = db.session.query(func.coalesce(func.sum(Transaction.amount), 0)).join(
                Wallet, Transaction.wallet_id == Wallet.id
            ).join(
                Ambassador, Wallet.ambassador_id == Ambassador.id
            ).join(
                Lead, Ambassador.id == Lead.ambassador_id
            ).filter(
                Lead.campaign_id == c.id,
                Transaction.type == "EARNING"
            ).scalar()
            cost = float(c.budget or 0)
            roi = round(((revenue - cost) / cost * 100), 1) if cost > 0 else 0
            campaign_roi.append({
                "campaignId": str(c.id),
                "campaignName": c.name,
                "revenue": float(revenue),
                "cost": cost,
                "roi": roi,
            })

        # Hub ROI: value generated per hub vs operating cost
        hubs = db.session.query(Hub).all()
        hub_roi = []
        for h in hubs:
            h_checkins = db.session.query(func.count(CheckIn.id)).filter_by(hub_id=h.id).scalar() or 0
            h_ambassadors = db.session.query(func.count(Ambassador.id)).filter_by(hub_id=h.id).scalar() or 0
            h_earnings = db.session.query(func.coalesce(func.sum(Transaction.amount), 0)).join(
                Wallet, Transaction.wallet_id == Wallet.id
            ).join(
                Ambassador, Wallet.ambassador_id == Ambassador.id
            ).filter(Ambassador.hub_id == h.id, Transaction.type == "EARNING").scalar()
            # Assume operating cost = KES 50 per check-in (facility, manager time, etc.)
            operating_cost = h_checkins * 50
            hub_value = float(h_earnings)
            hub_roi_pct = round(((hub_value - operating_cost) / operating_cost * 100), 1) if operating_cost > 0 else 0
            hub_roi.append({
                "hubId": str(h.id),
                "hubName": h.name,
                "checkins": int(h_checkins),
                "ambassadors": int(h_ambassadors),
                "valueGenerated": hub_value,
                "operatingCost": operating_cost,
                "roi": hub_roi_pct,
            })

        return {
            "costPerAcquisition": cpa,
            "totalCampaignSpend": float(total_campaign_spend),
            "totalConversions": total_conversions,
            "campaignROI": campaign_roi,
            "hubROI": hub_roi,
        }

    @staticmethod
    def platform_metrics(db):
        from app.models import PlatformType, Lead, Campaign, Wallet, Transaction, Ambassador
        from app.utils.serializers import to_dict
        from sqlalchemy import func
        platforms = db.session.query(PlatformType).all()
        result = []
        for p in platforms:
            lead_count = (
                db.session.query(func.count(Lead.id))
                .join(Campaign)
                .filter(Campaign.platform_id == p.id)
                .scalar()
            )
            campaign_count = (
                db.session.query(func.count(Campaign.id))
                .filter(Campaign.platform_id == p.id)
                .scalar()
            )
            total_earnings = (
                db.session.query(func.coalesce(func.sum(Transaction.amount), 0))
                .join(Wallet, Transaction.wallet_id == Wallet.id)
                .join(Ambassador, Wallet.ambassador_id == Ambassador.id)
                .join(Lead, Ambassador.id == Lead.ambassador_id)
                .join(Campaign, Lead.campaign_id == Campaign.id)
                .filter(Campaign.platform_id == p.id, Transaction.type == "EARNING")
                .scalar()
            )
            result.append(
                {
                    "platform": {"id": str(p.id), "name": p.name, "displayName": p.display_name},
                    "leadCount": int(lead_count),
                    "campaignCount": int(campaign_count),
                    "totalEarnings": float(total_earnings),
                }
            )
        return result

    @staticmethod
    def daily_questions(db):
        """Answer the Seven Daily Questions from the BRD."""
        from app.models import Hub, CheckIn, TaskSubmission, Lead, Referral, Transaction, Wallet, PayoutRequest, PayoutStatusType, TaskStatusType, LeadStatusType, Ambassador, PlatformType
        from app.utils.serializers import to_dict
        from datetime import datetime, timezone, timedelta
        from sqlalchemy import func

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        # 1. Who showed up? (Attendance)
        today_checkins = db.session.query(CheckIn).filter(
            CheckIn.check_in_time >= today_start,
            CheckIn.check_in_time < today_end
        ).all()
        unique_checked_in = set(ci.ambassador_id for ci in today_checkins)

        # 2. Who worked? (Task Completion)
        tasks_submitted_today = db.session.query(TaskSubmission).filter(
            TaskSubmission.created_at >= today_start,
            TaskSubmission.created_at < today_end
        ).count()
        approved_status = db.session.query(TaskStatusType).filter_by(name="APPROVED").first()
        tasks_approved_today = 0
        if approved_status:
            tasks_approved_today = db.session.query(TaskSubmission).filter(
                TaskSubmission.status_id == approved_status.id,
                TaskSubmission.reviewed_at >= today_start,
                TaskSubmission.reviewed_at < today_end
            ).count()

        # 3. What did they produce? (Lead Generation)
        leads_today = db.session.query(Lead).filter(
            Lead.created_at >= today_start,
            Lead.created_at < today_end
        ).count()

        # 4. What growth/revenue came from it? (Conversion Tracking)
        converted_today = db.session.query(Referral).filter(
            Referral.conversion_status == "CONVERTED",
            Referral.updated_at >= today_start,
            Referral.updated_at < today_end
        ).count()
        conversions_by_platform = []
        platforms = db.session.query(PlatformType).all()
        for p in platforms:
            p_conversions = db.session.query(Referral).filter(
                Referral.conversion_status == "CONVERTED",
                Referral.platform_id == p.id
            ).count()
            p_revenue = db.session.query(func.coalesce(func.sum(Transaction.amount), 0)).join(
                Wallet, Transaction.wallet_id == Wallet.id
            ).join(
                Ambassador, Wallet.ambassador_id == Ambassador.id
            ).join(
                Referral, Ambassador.id == Referral.ambassador_id
            ).filter(
                Referral.platform_id == p.id,
                Transaction.type == "EARNING"
            ).scalar()
            conversions_by_platform.append({
                "platform": p.display_name,
                "conversions": p_conversions,
                "revenue": float(p_revenue),
            })

        # 5. What should they be paid? (Earnings)
        earnings_today = db.session.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.type == "EARNING",
            Transaction.created_at >= today_start,
            Transaction.created_at < today_end
        ).scalar()
        pending_payouts = db.session.query(PayoutRequest).join(
            PayoutStatusType
        ).filter(PayoutStatusType.name == "PENDING").count()

        # 6. Which hubs are winning? (Hub Performance)
        hub_stats = []
        hubs = db.session.query(Hub).all()
        for h in hubs:
            h_checkins = db.session.query(CheckIn).filter(
                CheckIn.hub_id == h.id,
                CheckIn.check_in_time >= today_start,
                CheckIn.check_in_time < today_end
            ).count()
            h_ambassadors = db.session.query(func.count(Ambassador.id)).filter_by(hub_id=h.id).scalar() or 0
            h_leads = db.session.query(func.count(Lead.id)).join(
                Ambassador, Lead.ambassador_id == Ambassador.id
            ).filter(Ambassador.hub_id == h.id).scalar() or 0
            hub_stats.append({
                "hubId": str(h.id),
                "hubName": h.name,
                "checkinsToday": h_checkins,
                "ambassadors": int(h_ambassadors),
                "leads": int(h_leads),
            })
        hub_stats.sort(key=lambda x: x["checkinsToday"], reverse=True)

        # 7. Where are we leaking? (Funnel drop-offs)
        total_leads = db.session.query(Lead).count()
        lead_status_types = db.session.query(LeadStatusType).all()
        lead_funnel = []
        for st in lead_status_types:
            count = db.session.query(func.count(Lead.id)).filter(Lead.status_id == st.id).scalar() or 0
            lead_funnel.append({
                "status": st.display_name,
                "count": int(count),
                "percentage": round((int(count) / total_leads * 100), 1) if total_leads > 0 else 0,
            })

        return {
            "date": today_start.isoformat(),
            "whoShowedUp": {
                "totalCheckins": len(today_checkins),
                "uniqueAmbassadors": len(unique_checked_in),
            },
            "whoWorked": {
                "tasksSubmitted": tasks_submitted_today,
                "tasksApproved": tasks_approved_today,
            },
            "whatProduced": {
                "leadsGenerated": leads_today,
            },
            "growthRevenue": {
                "conversionsToday": converted_today,
                "byPlatform": conversions_by_platform,
            },
            "whatToPay": {
                "earningsToday": float(earnings_today),
                "pendingPayouts": pending_payouts,
            },
            "winningHubs": hub_stats,
            "leakAnalysis": {
                "totalLeads": total_leads,
                "leadFunnel": lead_funnel,
            },
        }

    @staticmethod
    def funnel_analysis(db):
        """Detailed funnel analysis across all key conversion paths."""
        from app.models import Lead, Referral, Task, TaskSubmission, Campaign, LeadStatusType, TaskStatusType, PayoutRequest, PayoutStatusType
        from app.utils.serializers import to_dict
        from sqlalchemy import func

        # Lead funnel: new → contacted → converted → lost
        total_leads = db.session.query(Lead).count()
        lead_funnel = []
        lead_statuses = db.session.query(LeadStatusType).order_by(LeadStatusType.sort_order).all()
        for st in lead_statuses:
            count = db.session.query(func.count(Lead.id)).filter(Lead.status_id == st.id).scalar() or 0
            lead_funnel.append({
                "stage": st.display_name,
                "count": int(count),
                "percentage": round((int(count) / total_leads * 100), 1) if total_leads > 0 else 0,
            })

        # Referral funnel: referred → signup → converted
        total_referrals = db.session.query(Referral).count()
        referral_pending = db.session.query(Referral).filter_by(conversion_status="PENDING").count()
        referral_converted = db.session.query(Referral).filter_by(conversion_status="CONVERTED").count()
        referral_expired = db.session.query(Referral).filter_by(conversion_status="EXPIRED").count()
        referral_funnel = [
            {"stage": "Referred", "count": total_referrals, "percentage": 100},
            {"stage": "Pending", "count": referral_pending, "percentage": round((referral_pending / total_referrals * 100), 1) if total_referrals > 0 else 0},
            {"stage": "Converted", "count": referral_converted, "percentage": round((referral_converted / total_referrals * 100), 1) if total_referrals > 0 else 0},
            {"stage": "Expired", "count": referral_expired, "percentage": round((referral_expired / total_referrals * 100), 1) if total_referrals > 0 else 0},
        ]

        # Task funnel: assigned → submitted → approved → rejected
        total_tasks = db.session.query(Task).count()
        total_submissions = db.session.query(TaskSubmission).count()
        task_funnel = []
        task_statuses = db.session.query(TaskStatusType).order_by(TaskStatusType.sort_order).all()
        for st in task_statuses:
            count = db.session.query(func.count(TaskSubmission.id)).filter(TaskSubmission.status_id == st.id).scalar() or 0
            task_funnel.append({
                "stage": st.display_name,
                "count": int(count),
                "percentage": round((int(count) / total_submissions * 100), 1) if total_submissions > 0 else 0,
            })

        # Payout funnel: requested → approved → rejected
        total_payouts = db.session.query(PayoutRequest).count()
        payout_funnel = []
        payout_statuses = db.session.query(PayoutStatusType).order_by(PayoutStatusType.sort_order).all()
        for st in payout_statuses:
            count = db.session.query(func.count(PayoutRequest.id)).filter(PayoutRequest.status_id == st.id).scalar() or 0
            payout_funnel.append({
                "stage": st.display_name,
                "count": int(count),
                "percentage": round((int(count) / total_payouts * 100), 1) if total_payouts > 0 else 0,
            })

        return {
            "leadFunnel": lead_funnel,
            "referralFunnel": referral_funnel,
            "taskFunnel": task_funnel,
            "payoutFunnel": payout_funnel,
            "totals": {
                "leads": total_leads,
                "referrals": total_referrals,
                "taskSubmissions": total_submissions,
                "payoutRequests": total_payouts,
            },
        }

    @staticmethod
    def hub_manager_dashboard(db, hub_id):
        """Dashboard data specifically for Hub Managers."""
        from app.models import Hub, Ambassador, CheckIn, Lead, TaskSubmission, TaskStatusType, Transaction, Wallet, PayoutRequest, PayoutStatusType, Task, Campaign
        from app.utils.serializers import to_dict
        from datetime import datetime, timezone, timedelta
        from sqlalchemy import func
        from sqlalchemy.orm import joinedload

        hub = db.session.get(Hub, hub_id)
        if not hub:
            raise ValueError("hub not found")

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)

        # Total ambassadors in this hub
        total_ambassadors = db.session.query(func.count(Ambassador.id)).filter_by(hub_id=hub_id).scalar() or 0

        # Active ambassadors (checked in or submitted task in last 30 days)
        thirty_days_ago = now - timedelta(days=30)
        active_ambassadors = db.session.query(func.count(func.distinct(Ambassador.id))).join(
            CheckIn, CheckIn.ambassador_id == Ambassador.id
        ).filter(
            Ambassador.hub_id == hub_id,
            CheckIn.check_in_time >= thirty_days_ago
        ).scalar() or 0

        # Today's attendance
        today_checkins = db.session.query(func.count(CheckIn.id)).filter(
            CheckIn.hub_id == hub_id,
            CheckIn.check_in_time >= today_start
        ).scalar() or 0
        today_unique = db.session.query(func.count(func.distinct(CheckIn.ambassador_id))).filter(
            CheckIn.hub_id == hub_id,
            CheckIn.check_in_time >= today_start
        ).scalar() or 0

        # Pending task submissions (from ambassadors in this hub)
        submitted_status = db.session.query(TaskStatusType).filter_by(name="SUBMITTED").first()
        pending_submissions = 0
        if submitted_status:
            pending_submissions = db.session.query(func.count(TaskSubmission.id)).join(
                Ambassador, TaskSubmission.ambassador_id == Ambassador.id
            ).filter(
                Ambassador.hub_id == hub_id,
                TaskSubmission.status_id == submitted_status.id
            ).scalar() or 0

        # Leads generated this week
        leads_this_week = db.session.query(func.count(Lead.id)).join(
            Ambassador, Lead.ambassador_id == Ambassador.id
        ).filter(
            Ambassador.hub_id == hub_id,
            Lead.created_at >= week_start
        ).scalar() or 0

        # Total conversions (referrals converted)
        conversions_this_month = db.session.query(func.count(TaskSubmission.id)).join(
            Ambassador, TaskSubmission.ambassador_id == Ambassador.id
        ).join(
            TaskStatusType, TaskSubmission.status_id == TaskStatusType.id
        ).filter(
            Ambassador.hub_id == hub_id,
            TaskStatusType.name == "APPROVED",
            TaskSubmission.reviewed_at >= month_start
        ).scalar() or 0

        # Total earnings distributed this month
        earnings_this_month = db.session.query(func.coalesce(func.sum(Transaction.amount), 0)).join(
            Wallet, Transaction.wallet_id == Wallet.id
        ).join(
            Ambassador, Wallet.ambassador_id == Ambassador.id
        ).filter(
            Ambassador.hub_id == hub_id,
            Transaction.type == "EARNING",
            Transaction.created_at >= month_start
        ).scalar() or 0

        # Top performers in hub (by total earned)
        top_performers = db.session.query(
            Ambassador, Wallet
        ).join(
            Wallet, Wallet.ambassador_id == Ambassador.id
        ).filter(
            Ambassador.hub_id == hub_id
        ).order_by(
            Wallet.total_earned.desc()
        ).limit(5).all()

        top_ambassadors = []
        for amb, w in top_performers:
            top_ambassadors.append({
                "ambassadorId": str(amb.id),
                "name": amb.user.name if amb.user else "Unknown",
                "referralCode": amb.referral_code,
                "tier": amb.tier,
                "status": amb.status,
                "totalEarned": float(w.total_earned or 0),
                "currentBalance": float(w.current_balance or 0),
                "lastActiveAt": amb.last_active_at.isoformat() if amb.last_active_at else None,
            })

        # Active sessions (checked in but not checked out)
        active_sessions = db.session.query(CheckIn).options(
            joinedload(CheckIn.ambassador).joinedload(Ambassador.user)
        ).filter(
            CheckIn.hub_id == hub_id,
            CheckIn.check_out_time.is_(None)
        ).order_by(CheckIn.check_in_time.desc()).all()

        active_session_list = []
        for ci in active_sessions:
            duration_minutes = None
            if ci.check_in_time:
                duration_minutes = round((now - ci.check_in_time.replace(tzinfo=timezone.utc)).total_seconds() / 60, 0)
            active_session_list.append({
                "checkInId": str(ci.id),
                "ambassadorName": ci.ambassador.user.name if ci.ambassador and ci.ambassador.user else "Unknown",
                "checkInTime": ci.check_in_time.isoformat() if ci.check_in_time else None,
                "durationMinutes": duration_minutes,
            })

        # Pending payout requests from hub ambassadors
        pending_status = db.session.query(PayoutStatusType).filter_by(name="PENDING").first()
        pending_payouts = 0
        if pending_status:
            pending_payouts = db.session.query(func.count(PayoutRequest.id)).join(
                Ambassador, PayoutRequest.ambassador_id == Ambassador.id
            ).filter(
                Ambassador.hub_id == hub_id,
                PayoutRequest.status_id == pending_status.id
            ).scalar() or 0

        return {
            "hub": {"id": str(hub.id), "name": hub.name, "location": hub.location},
            "overview": {
                "totalAmbassadors": int(total_ambassadors),
                "activeAmbassadors": int(active_ambassadors),
                "todayCheckins": int(today_checkins),
                "todayUniqueAmbassadors": int(today_unique),
                "pendingSubmissions": int(pending_submissions),
                "leadsThisWeek": int(leads_this_week),
                "conversionsThisMonth": int(conversions_this_month),
                "earningsThisMonth": float(earnings_this_month),
                "pendingPayouts": int(pending_payouts),
            },
            "topPerformers": top_ambassadors,
            "activeSessions": active_session_list,
        }
