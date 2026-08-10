"""Seed script — mirrors backend/src/seed.ts."""

import uuid, os
from flask import current_app
from app.extensions import db
from app.models import (
    RoleType, PlatformType, TaskTypeType, TaskStatusType, LeadStatusType,
    PayoutStatusType, TierType, ActionType, Permission, RolePermission, User, Hub, Ambassador, Wallet,
    Transaction, Campaign, Task, TaskSubmission, Lead, Referral, CheckIn,
    Announcement, Notification, SupportTicket, LearningResource, Badge,
    AmbassadorBadge, Appeal, AuditLog, PayoutRequest, FraudAlert, UserSetting,
)
from app.utils.auth import hash_password
from app.utils.serializers import to_dict


def _id(name="id"):
    return str(uuid.uuid4())


def seed():
    with current_app.app_context():
        db.create_all()

        print("Seeding roles...")
        roles = {}
        role_data = [
            ("SUPER_ADMIN", "Super Admin", "Full system access"),
            ("HUB_MANAGER", "Hub Manager", "Manages a hub and its ambassadors"),
            ("AMBASSADOR", "Ambassador", "Earn rewards via campaigns"),
            ("FINANCE_OFFICER", "Finance Officer", "Manages payouts & finance"),
            ("SUPPORT_OFFICER", "Support Officer", "Handles support tickets"),
            ("PARTNER_ADVERTISER", "Partner Advertiser", "Creates and manages campaigns"),
            ("CLIENT", "Client", "Submits managed gig assignments"),
            ("ADMIN", "Gig Admin", "Reviews and assigns managed gig assignments"),
            ("GIG_WORKER", "Gig Worker", "Completes assigned gig work"),
        ]
        for name, display, desc in role_data:
            r = RoleType.query.filter_by(name=name).first()
            if not r:
                r = RoleType(name=name, display_name=display, description=desc)
                db.session.add(r)
            roles[name] = r
        db.session.commit()

        admin_role_id = str(roles["SUPER_ADMIN"].id)
        hub_role_id = str(roles["HUB_MANAGER"].id)
        amb_role_id = str(roles["AMBASSADOR"].id)
        fin_role_id = str(roles["FINANCE_OFFICER"].id)
        sup_role_id = str(roles["SUPPORT_OFFICER"].id)
        par_role_id = str(roles["PARTNER_ADVERTISER"].id)
        client_role_id = str(roles["CLIENT"].id)
        gig_admin_role_id = str(roles["ADMIN"].id)
        gig_worker_role_id = str(roles["GIG_WORKER"].id)

        print("Seeding users...")
        seeds = [
            ("stevenmuriuki15@gmail.com", "Steve@2019", "Steven Muriuki", admin_role_id),
            ("hub.manager@bits.com", "HubManager@2024", "Hub Manager", hub_role_id),
            ("ambassador.john@bits.com", "Ambassador@2024", "John Ambassador", amb_role_id),
            ("ambassador.sarah@bits.com", "Ambassador@2024", "Sarah Ambassador", amb_role_id),
            ("finance@bitshustlehubs.co.ke", "!8?zhyS2mj[JxUW?", "Finance Officer", fin_role_id),
            ("support@bitshustlehubs.co.ke", "Support@2024", "Support Officer", sup_role_id),
            ("info@bitshustlehubs.co.ke", "v6yO%WY.#&lWcSw+", "Info Officer", par_role_id),
            ("partner@paydebt.com", "Partner@2024", "Partner Advertiser", par_role_id),
            ("client.demo@bits.com", "Client@2024", "Demo Client", client_role_id),
            ("gig.admin@bits.com", "GigAdmin@2024", "Gig Administrator", gig_admin_role_id),
            ("worker.design@bits.com", "Worker@2024", "Design Gig Worker", gig_worker_role_id),
            ("worker.writer@bits.com", "Worker@2024", "Writing Gig Worker", gig_worker_role_id),
        ]
        for email, pw, name, rid in seeds:
            if not User.query.filter_by(email=email).first():
                u = User(email=email, password=hash_password(pw), name=name, role_id=rid)
                db.session.add(u)
        db.session.commit()

        print("Seeding hub...")
        hub_admin = User.query.filter_by(email="hub.manager@bits.com").first()
        hub = Hub.query.first()
        if not hub:
            hub = Hub(name="Main Hub", location="Nairobi, Kenya", manager_id=str(hub_admin.id))
            db.session.add(hub)
            db.session.commit()

        # Multi-hub seeding for pilot (BRD Section 17: 1-3 campuses)
        print("Seeding additional hubs for pilot...")
        additional_hubs = [
            ("University of Nairobi Hub", "Nairobi, UoN Campus"),
            ("Kenyatta University Hub", "Nairobi, KU Main Campus"),
            ("Strathmore University Hub", "Nairobi, Strathmore Campus"),
        ]
        for hub_name, hub_location in additional_hubs:
            existing = Hub.query.filter_by(name=hub_name).first()
            if not existing:
                new_hub = Hub(name=hub_name, location=hub_location, manager_id=str(hub_admin.id))
                db.session.add(new_hub)
        db.session.commit()
        print(f"  {Hub.query.count()} hubs seeded")

        print("Seeding ambassadors...")
        for email in ("ambassador.john@bits.com", "ambassador.sarah@bits.com"):
            user = User.query.filter_by(email=email).first()
            if user and not user.ambassador_profile:
                amb = Ambassador(
                    user_id=str(user.id),
                    hub_id=str(hub.id),
                    referral_code=email.split("@")[0].replace(".", "").upper() + "_REF",
                )
                db.session.add(amb)
                db.session.flush()

        # Seed additional ambassadors across hubs for pilot
        print("Seeding additional ambassadors across hubs...")
        all_hubs = Hub.query.all()
        amb_names = [
            ("Grace Wanjiku", "grace.wanjiku@bits.com"),
            ("Brian Ochieng", "brian.ochieng@bits.com"),
            ("Faith Njeri", "faith.njeri@bits.com"),
            ("Kevin Mutua", "kevin.mutua@bits.com"),
            ("Amina Hassan", "amina.hassan@bits.com"),
            ("David Kimani", "david.kimani@bits.com"),
            ("Mercy Akinyi", "mercy.akinyi@bits.com"),
            ("Samuel Otieno", "samuel.otieno@bits.com"),
            ("Esther Wambui", "esther.wambui@bits.com"),
            ("Peter Mwangi", "peter.mwangi@bits.com"),
        ]
        amb_role = RoleType.query.filter_by(name="AMBASSADOR").first()
        for i, (name, email) in enumerate(amb_names):
            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(email=email, password=hash_password("Ambassador@2024"), name=name, role_id=amb_role.id)
                db.session.add(user)
                db.session.flush()
            if not user.ambassador_profile:
                hub_assignment = all_hubs[i % len(all_hubs)]
                amb = Ambassador(
                    user_id=str(user.id),
                    hub_id=str(hub_assignment.id),
                    referral_code=name.upper().replace(" ", "_")[:15] + "_REF",
                )
                db.session.add(amb)
                db.session.flush()
                if not Wallet.query.filter_by(ambassador_id=str(amb.id)).first():
                    db.session.add(Wallet(ambassador_id=str(amb.id)))
        db.session.commit()

        # ── task_type_types ─────────────────────────────────────────
        print("Seeding task_type_types...")
        existing_ttype = {t.name for t in TaskTypeType.query.all()}
        # BRD-required task types
        brd_task_types = [
            ("LEAD_CAPTURE", "Lead Capture", "Collect names, emails, and phone numbers of potential customers"),
            ("REFERRAL_DRIVE", "Referral Drive", "Share referral codes to bring in new signups"),
            ("EVENT_PROMOTION", "Event Promotion", "Invite peers to Bits events or demos"),
            ("PRODUCT_DEMO", "Product Demo", "Show classmates how to use Bits platforms"),
            ("SOCIAL_MEDIA_SHARE", "Social Media Share", "Post campaign content online"),
            ("CUSTOMER_ONBOARDING", "Customer Onboarding", "Help new users register and start using services"),
            ("FLYER_DISTRIBUTION", "Flyer Distribution", "Physically distribute marketing materials"),
            ("SURVEY_COLLECTION", "Survey Collection", "Gather feedback from peers"),
        ]
        # Additional task types (beyond BRD examples)
        bonus_task_types = [
            ("CONTENT_CREATION", "Content Creation", "Create blogs, videos, or social media posts"),
            ("FOCUS_GROUP", "Focus Group", "Participate in surveys or feedback sessions"),
            ("CUSTOMER_SUPPORT", "Customer Support", "Assist with customer inquiries"),
        ]
        for name, display, desc in brd_task_types + bonus_task_types:
            if name not in existing_ttype:
                db.session.add(TaskTypeType(name=name, display_name=display, description=desc))
        db.session.commit()
        print(f"  {TaskTypeType.query.count()} rows")

        # ── tier_types ─────────────────────────────────────────────
        print("Seeding tier_types...")
        existing_tiers = {t.name for t in TierType.query.all()}
        for name, display, desc in [
            ("DEFAULT", "Default", "Default tier for all referrals"),
            ("TIER_1", "Tier 1", "First level referral tier"),
            ("TIER_2", "Tier 2", "Second level referral tier"),
            ("TIER_3", "Tier 3", "Third level referral tier"),
        ]:
            if name not in existing_tiers:
                db.session.add(TierType(name=name, display_name=display, description=desc))
        db.session.commit()
        print(f"  {TierType.query.count()} rows")

        # ── action_types ───────────────────────────────────────────
        print("Seeding action_types...")
        existing_actions = {t.name for t in ActionType.query.all()}
        for name, display, desc in [
            ("SIGNUP", "Sign Up", "User signs up through referral"),
            ("PURCHASE", "Purchase", "User makes a purchase"),
            ("LIBRARY", "Library", "User accesses library content"),
            ("CONVERSION", "Conversion", "User completes conversion action"),
        ]:
            if name not in existing_actions:
                db.session.add(ActionType(name=name, display_name=display, description=desc))
        db.session.commit()
        print(f"  {ActionType.query.count()} rows")

        # ── task_status_types ───────────────────────────────────────
        print("Seeding task_status_types...")
        existing_tstat = {t.name for t in TaskStatusType.query.all()}
        for name, display, desc in [
            ("PENDING", "Pending", "Awaiting ambassador action"),
            ("IN_PROGRESS", "In Progress", "Ambassador is working on the task"),
            ("SUBMITTED", "Submitted", "Proof submitted for review"),
            ("APPROVED", "Approved", "Submission approved"),
            ("REJECTED", "Rejected", "Submission rejected"),
            ("EXPIRED", "Expired", "Deadline passed without submission"),
            ("CANCELLED", "Cancelled", "Task cancelled before completion"),
        ]:
            if name not in existing_tstat:
                db.session.add(TaskStatusType(name=name, display_name=display, description=desc))
        db.session.commit()
        print(f"  {TaskStatusType.query.count()} rows")

        # ── payout_status_types ─────────────────────────────────────
        print("Seeding payout_status_types...")
        existing_pstat = {t.name for t in PayoutStatusType.query.all()}
        for name, display, desc in [
            ("PENDING", "Pending", "Awaiting finance review"),
            ("APPROVED", "Approved", "Approved; queued for processing"),
            ("PROCESSING", "Processing", "Payment transfer in progress"),
            ("COMPLETED", "Completed", "Payment transferred successfully"),
            ("REJECTED", "Rejected", "Rejected by finance"),
            ("CANCELLED", "Cancelled", "Cancelled by ambassador or admin"),
            ("FAILED", "Failed", "Transfer failed; requires review"),
        ]:
            if name not in existing_pstat:
                db.session.add(PayoutStatusType(name=name, display_name=display, description=desc))
        db.session.commit()
        print(f"  {PayoutStatusType.query.count()} rows")

        # ── user_settings ──────────────────────────────────────────
        print("Seeding user_settings...")
        new_settings = 0
        for user in User.query.all():
            if not user.profile:
                db.session.add(UserSetting(user_id=str(user.id), email_notifications=True, sms_notifications=False))
                new_settings += 1
        db.session.commit()
        print(f"  {UserSetting.query.count()} rows  (new: {new_settings})")

        # ── badges ─────────────────────────────────────────────────
        print("Seeding badges...")
        existing_badges = {b.name for b in Badge.query.all()}
        # BRD-required badges
        brd_badges = [
            ("LEAD_HUNTER", "Captured 50+ leads", "🎯", {"metric": "leads", "threshold": 50}, "GOLD"),
            ("CAMPUS_CLOSER", "Converted 20+ leads to sales", "🏆", {"metric": "converted_leads", "threshold": 20}, "GOLD"),
            ("TOP_RECRUITER", "Brought in 30+ referrals", "🤝", {"metric": "referrals", "threshold": 30}, "GOLD"),
            ("DIGITAL_HUSTLER", "Completed 100+ tasks", "🔥", {"metric": "task_submissions", "threshold": 100}, "PLATINUM"),
            ("HUB_CHAMPION", "Ranked #1 in hub for the month", "👑", {"metric": "hub_rank_1", "threshold": 1}, "PLATINUM"),
            ("CONVERSION_KING", "Highest conversion rate in campaign", "💎", {"metric": "conversion_rate", "threshold": 50}, "PLATINUM"),
        ]
        # Bonus badges (beyond BRD)
        bonus_badges = [
            ("FIRST_LEAD", "Submit your first qualified lead", "🌟", {"metric": "leads", "threshold": 1}, "BRONZE"),
            ("LEAD_GENERATOR", "Submit 10 qualified leads", "🚀", {"metric": "leads", "threshold": 10}, "SILVER"),
            ("LEAD_MASTER", "Submit 50 qualified leads", "💎", {"metric": "leads", "threshold": 50}, "GOLD"),
            ("EARLY_BIRD", "Be among the first 9 ambassadors", "🌅", {"type": "early_adopter", "threshold": 9}, "BRONZE"),
            ("PERFECT_SCORE", "Complete 5 tasks with 100% approval", "⭐", {"type": "approval_rate", "threshold": 100, "tasks_required": 5}, "SILVER"),
            ("UNSTOPPABLE", "3-week streak of on-time submissions", "🔥", {"type": "streak_weeks", "threshold": 3}, "GOLD"),
            ("SOCIAL_BUTTERFLY", "50 social engagement referrals", "🦋", {"metric": "referrals", "threshold": 50}, "SILVER"),
            ("TRUSTED_AMBASSADOR", "6 months with zero fraud alerts", "🛡️", {"type": "tenure_months", "threshold": 6, "fraud_free": True}, "GOLD"),
            ("TOP_EARNER", "Earn KES 50,000 in one month", "💰", {"type": "monthly_earnings", "threshold": 50000}, "GOLD"),
        ]
        for name, desc, icon, criteria, tier in brd_badges + bonus_badges:
            if name not in existing_badges:
                db.session.add(Badge(name=name, description=desc, icon=icon, criteria=criteria, tier=tier))
        db.session.commit()
        print(f"  {Badge.query.count()} rows")

        # ── platforms + campaigns ───────────────────────────────────
        print("Seeding platforms + campaigns...")
        platforms = {}
        plat_data = [
            ("BITS_TUTORCONNECT", "Bits TutorConnect"),
            ("BITS_PAYDEBT", "PayDebt Technologies"),
            ("BITS_PHOTOMART", "Bits PhotoMart"),
            ("BITS_VIRTUAL_ASSISTANCE", "Virtual Assistance"),
            ("BITS_HOME_AWAY_SERVICES", "Bits Home & Away Services"),
            ("BITS_DADS_BOOKSHELVES", "Dad's BookShelves"),
            ("BITS_LINKPAL_BITS_ONLINE", "LinkPal Bits Online"),
            ("BITS_BOOKING_SERVICES", "Bits Booking Services"),
            ("BITS_BUSINESS_HUB", "Bits Business Hub"),
            ("BITS_CAMPUS_CONNECT", "Bits Campus Connect"),
        ]
        for name, disp in plat_data:
            pt = PlatformType.query.filter_by(name=name).first()
            if not pt:
                pt = PlatformType(name=name, display_name=disp)
                db.session.add(pt)
            platforms[name] = pt
        db.session.commit()

        admin_user = User.query.filter_by(email="stevenmuriuki15@gmail.com").first()
        for plat_key, name, desc in [
            ("BITS_TUTORCONNECT", "TutorConnect", "Connect students with tutors"),
            ("BITS_PAYDEBT", "PayDebt", "Debt repayment campaign"),
            ("BITS_PHOTOMART", "PhotoMart", "Photo marketplace campaign"),
        ]:
            pt = platforms[plat_key]
            c = Campaign.query.filter_by(name=name, platform_id=str(pt.id)).first()
            if not c:
                from datetime import datetime, timedelta
                c = Campaign(
                    name=name,
                    description=desc,
                    platform_id=str(pt.id),
                    created_by_id=str(admin_user.id),
                    start_date=datetime.utcnow(),
                    end_date=datetime.utcnow() + timedelta(days=90),
                    budget=50000,
                    reward_structure={"amount": 500},
                )
                db.session.add(c)
        db.session.commit()

        print("Seeding complete.")

        # ── seed role permissions ───────────────────────────────────────
        print("Seeding role permissions...")
        from app.services.role_permission_service import RolePermissionService
        result = RolePermissionService.seed_permissions()
        print(f"  {result['permissions']} permissions, {result['role_permissions']} role-permission links")


if __name__ == "__main__":
    from app.factory import create_app
    app = create_app()
    with app.app_context():
        seed()
