from app.extensions import db


class TaskService:
    @staticmethod
    def create(db, payload: dict):
        from app.models import Task, Campaign
        required = ("description", "reward", "deadline", "campaignId", "typeId")
        if not all(k in payload for k in required):
            raise ValueError("description, reward, deadline, campaignId, typeId required")
        campaign = db.session.get(Campaign, payload["campaignId"])
        if not campaign:
            raise ValueError("campaign not found")
        platform_id = payload.get("platformId") or campaign.platform_id
        if not platform_id:
            raise ValueError("platform not found on campaign")
        t = Task(
            description=payload["description"],
            campaign_id=payload["campaignId"],
            type_id=payload["typeId"],
            reward=payload["reward"],
            deadline=payload["deadline"],
            platform_id=platform_id,
        )
        db.session.add(t)
        db.session.commit()
        return t

    @staticmethod
    def update(db, tid, payload: dict):
        from app.models import Task
        t = db.session.get(Task, tid)
        if not t:
            raise ValueError("not found")
        for field in ("description", "reward", "deadline", "platformId", "campaignId", "typeId"):
            if field in payload:
                setattr(t, field.lower().replace("Id", "_id"), payload[field])
        db.session.commit()
        return t

    @staticmethod
    def get_task(db, tid):
        from app.models import Task
        from app.utils.serializers import to_dict
        from sqlalchemy.orm import joinedload
        t = db.session.query(Task).options(
            joinedload(Task.platform),
            joinedload(Task.campaign),
            joinedload(Task.type),
        ).get(tid)
        if not t:
            raise ValueError("not found")
        return to_dict(t, with_relations=True)

    @staticmethod
    def submit_proof(db, payload: dict, ambassador_id=None):
        from app.models import TaskSubmission, Task, TaskStatusType, Ambassador, User
        required = ("taskId", "proofUrl")
        if not all(k in payload for k in required):
            raise ValueError("taskId, proofUrl required")
        amb = None
        if ambassador_id:
            user = db.session.get(User, ambassador_id)
            if user and user.role and user.role.name == "AMBASSADOR":
                amb = db.session.query(Ambassador).filter_by(user_id=ambassador_id).first()
            else:
                amb = db.session.get(Ambassador, ambassador_id)
        if not amb:
            raise ValueError("ambassador not found")
        task = db.session.get(Task, payload["taskId"])
        if not task:
            raise ValueError("task not found")
        # Check deadline
        from datetime import datetime
        if task.deadline and datetime.utcnow() > task.deadline:
            raise ValueError("submission deadline has passed")
        # Get SUBMITTED status
        submitted_status = db.session.query(TaskStatusType).filter_by(name="SUBMITTED").first()
        if not submitted_status:
            raise ValueError("SUBMITTED status not found")
        s = TaskSubmission(
            ambassador_id=str(amb.id),
            task_id=payload["taskId"],
            status_id=submitted_status.id,
            proof_url=payload["proofUrl"],
        )
        db.session.add(s)
        db.session.commit()
        return s

    @staticmethod
    def approve_submission(db, submission_id, reviewed_by_id=None):
        from app.models import TaskSubmission, TaskStatusType, Wallet, Transaction, Task, Ambassador, User, RoleType
        from app.utils.serializers import to_dict
        from datetime import datetime
        s = db.session.get(TaskSubmission, submission_id)
        if not s:
            raise ValueError("submission not found")
        # Check if reviewer is ambassador (self-review not allowed)
        if reviewed_by_id:
            rev_user = db.session.get(User, reviewed_by_id)
            if rev_user and rev_user.role:
                amb_role = (
                    db.session.query(RoleType)
                    .filter(RoleType.name == "AMBASSADOR")
                    .first()
                )
                if amb_role and str(rev_user.role_id) == str(amb_role.id):
                    # Check if the reviewer is the ambassador of this submission
                    ambassador = db.session.get(Ambassador, s.ambassador_id)
                    if ambassador and ambassador.user_id == rev_user.id:
                        raise ValueError("ambassadors cannot approve their own tasks")
        # Get APPROVED status
        approved_status = db.session.query(TaskStatusType).filter_by(name="APPROVED").first()
        if not approved_status:
            raise ValueError("APPROVED status not found")
        s.status_id = approved_status.id
        s.reviewed_by_id = reviewed_by_id
        s.reviewed_at = datetime.utcnow()
        # Credit wallet if ambassador and wallet exist
        if s.ambassador and s.ambassador.wallet:
            w = s.ambassador.wallet
            task = db.session.get(Task, s.task_id)
            if task:
                amount = task.reward
                # Apply hub operating fee if enabled
                from flask import current_app
                fee_percent = current_app.config.get("HUB_OPERATING_FEE_PERCENT", 0.0) if current_app.config.get("HUB_OPERATING_FEE_ENABLED", False) else 0.0
                fee_amount = amount * (fee_percent / 100)
                net_amount = amount - fee_amount
                w.current_balance = (w.current_balance or 0) + net_amount
                w.total_earned = (w.total_earned or 0) + amount
                # Create transaction
                t = Transaction(
                    wallet_id=w.id,
                    amount=net_amount,
                    type="EARNING",
                    description=f"Task {task.id}",
                    reference_id=s.id,
                    reference_type="TASK_SUBMISSION",
                    platform_id=task.platform_id,
                )
                db.session.add(t)
        db.session.commit()
        return to_dict(s)

    @staticmethod
    def reject_submission(db, submission_id, reason, reviewed_by_id=None):
        from app.models import TaskSubmission, TaskStatusType, Ambassador, User, RoleType
        from app.utils.serializers import to_dict
        from datetime import datetime
        s = db.session.get(TaskSubmission, submission_id)
        if not s:
            raise ValueError("submission not found")
        # Check if reviewer is ambassador (self-review not allowed)
        if reviewed_by_id:
            rev_user = db.session.get(User, reviewed_by_id)
            if rev_user and rev_user.role:
                amb_role = (
                    db.session.query(RoleType)
                    .filter(RoleType.name == "AMBASSADOR")
                    .first()
                )
                if amb_role and str(rev_user.role_id) == str(amb_role.id):
                    # Check if the reviewer is the ambassador of this submission
                    ambassador = db.session.get(Ambassador, s.ambassador_id)
                    if ambassador and ambassador.user_id == rev_user.id:
                        raise ValueError("ambassadors cannot reject their own tasks")
        # Get REJECTED status
        rejected_status = db.session.query(TaskStatusType).filter_by(name="REJECTED").first()
        if not rejected_status:
            raise ValueError("REJECTED status not found")
        s.status_id = rejected_status.id
        s.reviewed_by_id = reviewed_by_id
        s.reviewed_at = datetime.utcnow()
        s.rejection_reason = reason  # Store the rejection reason
        db.session.commit()
        return to_dict(s)

