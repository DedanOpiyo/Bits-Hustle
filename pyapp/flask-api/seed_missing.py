"""Seed lookup tables: task_type_types, task_status_types, payout_status_types, user_settings, badges."""

import uuid
from app.factory import create_app

app = create_app()

with app.app_context():
    from app.extensions import db
    from app.models import (
        TaskTypeType, TaskStatusType, PayoutStatusType,
        UserSetting, Badge, User,
    )

    db.create_all()

    # ── task_type_types ──────────────────────────────────────────────
    print('Seeding task_type_types...')
    existing_ttype = {t.name for t in TaskTypeType.query.all()}
    ttype_data = [
        ("CONTENT_CREATION", "Content Creation", "Create posts, videos, or graphics for a campaign"),
        ("REFERRAL", "Referral", "Refer a new user to a platform or service"),
        ("LEAD_GENERATION", "Lead Generation", "Generate qualified leads for a campaign"),
        ("SOCIAL_ENGAGEMENT", "Social Engagement", "Likes, shares, comments, and follows"),
        ("FOCUS_GROUP", "Focus Group", "Participate in surveys or feedback sessions"),
        ("EVENT_HOSTING", "Event Hosting", "Host or organise community/outreach events"),
        ("TUTORING", "Tutoring", "Provide academic or skills-based tutoring sessions"),
        ("DATA_ENTRY", "Data Entry", "Enter or verify data for campaigns"),
        ("CUSTOMER_SUPPORT", "Customer Support", "Assist with customer inquiries via chat or phone"),
        ("TRANSLATION", "Translation", "Translate written or spoken content"),
    ]
    for name, display, desc in ttype_data:
        if name not in existing_ttype:
            t = TaskTypeType(name=name, display_name=display, description=desc, sort_order=0, is_active=True)
            db.session.add(t)
    db.session.commit()
    print(f'  {TaskTypeType.query.count()} rows')

    # ── task_status_types ────────────────────────────────────────────
    print('Seeding task_status_types...')
    existing_tstat = {t.name for t in TaskStatusType.query.all()}
    tstat_data = [
        ("PENDING", "Pending", "Task assigned, awaiting ambassador action"),
        ("IN_PROGRESS", "In Progress", "Ambassador is actively working on the task"),
        ("SUBMITTED", "Submitted", "Task proof has been submitted for review"),
        ("APPROVED", "Approved", "Task submission has been approved"),
        ("REJECTED", "Rejected", "Task submission was rejected; feedback provided"),
        ("EXPIRED", "Expired", "Task deadline passed without submission"),
        ("CANCELLED", "Cancelled", "Task was cancelled before completion"),
    ]
    for name, display, desc in tstat_data:
        if name not in existing_tstat:
            t = TaskStatusType(name=name, display_name=display, description=desc, sort_order=0, is_active=True)
            db.session.add(t)
    db.session.commit()
    print(f'  {TaskStatusType.query.count()} rows')

    # ── payout_status_types ──────────────────────────────────────────
    print('Seeding payout_status_types...')
    existing_pstat = {t.name for t in PayoutStatusType.query.all()}
    pstat_data = [
        ("PENDING", "Pending", "Payout request submitted, awaiting finance review"),
        ("APPROVED", "Approved", "Payout request approved; queued for processing"),
        ("PROCESSING", "Processing", "Payment transfer is in progress"),
        ("COMPLETED", "Completed", "Payment has been successfully transferred"),
        ("REJECTED", "Rejected", "Payout request rejected by finance"),
        ("CANCELLED", "Cancelled", "Payout request cancelled by ambassador or admin"),
        ("FAILED", "Failed", "Payment transfer failed; requires review"),
    ]
    for name, display, desc in pstat_data:
        if name not in existing_pstat:
            t = PayoutStatusType(name=name, display_name=display, description=desc, sort_order=0, is_active=True)
            db.session.add(t)
    db.session.commit()
    print(f'  {PayoutStatusType.query.count()} rows')

    # ── user_settings ────────────────────────────────────────────────
    print('Seeding user_settings...')
    seeded = 0
    for user in User.query.all():
        if not user.profile:
            us = UserSetting(user_id=str(user.id), email_notifications=True, sms_notifications=False)
            db.session.add(us)
            seeded += 1
    db.session.commit()
    print(f'  {UserSetting.query.count()} rows  (newly created: {seeded})')

    # ── badges ──────────────────────────────────────────────────────
    print('Seeding badges...')
    existing_badges = {b.name for b in Badge.query.all()}
    badge_data = [
        ("FIRST_LEAD", "First Lead", "Submit your first qualified lead", "🎯", {"type": "lead_count", "threshold": 1}, "BRONZE"),
        ("LEAD_GENERATOR", "Lead Generator", "Submit 10 qualified leads", "🚀", {"type": "lead_count", "threshold": 10}, "SILVER"),
        ("LEAD_MASTER", "Lead Master", "Submit 50 qualified leads", "💎", {"type": "lead_count", "threshold": 50}, "GOLD"),
        ("LEAD_CHAMPION", "Lead Champion", "Submit 100 qualified leads", "👑", {"type": "lead_count", "threshold": 100}, "PLATINUM"),
        ("EARLY_BIRD", "Early Bird", "Be among the first 9 ambassadors to join", "🌅", {"type": "early_adopter", "threshold": 9}, "BRONZE"),
        ("PERFECT_SCORE", "Perfect Score", "Complete 5 tasks with 100% approval rate", "⭐", {"type": "approval_rate", "threshold": 100, "tasks_required": 5}, "SILVER"),
        ("UNSTOPPABLE", "Unstoppable", "Submit tasks 3 weeks in a row without a missed deadline", "🔥", {"type": "streak_weeks", "threshold": 3}, "GOLD"),
        ("SOCIAL_BUTTERFLY", "Social Butterfly", "Generate 50 social engagement referrals", "🦋", {"type": "referral_count", "threshold": 50}, "SILVER"),
        ("TRUSTED_AMBASSADOR", "Trusted Ambassador", "Ambassador for 6 months with zero fraud alerts", "🛡️", {"type": "tenure_months", "threshold": 6, "fraud_free": True}, "GOLD"),
        ("TOP_EARNER", "Top Earner", "Earn KES 50,000 in a single month", "💰", {"type": "monthly_earnings", "threshold": 50000}, "GOLD"),
    ]
    for name, display, desc, icon, criteria, tier in badge_data:
        if name not in existing_badges:
            b = Badge(name=name, description=desc, icon=icon, criteria=criteria, tier=tier)
            db.session.add(b)
    db.session.commit()
    print(f'  {Badge.query.count()} rows')

    # ── Summary ─────────────────────────────────────────────────────
    print('\nSeed complete.')
    print(f'  TaskTypeTypes:     {TaskTypeType.query.count()} rows')
    print(f'  TaskStatusTypes:   {TaskStatusType.query.count()} rows')
    print(f'  PayoutStatusTypes: {PayoutStatusType.query.count()} rows')
    print(f'  UserSettings:      {UserSetting.query.count()} rows')
    print(f'  Badges:            {Badge.query.count()} rows')
