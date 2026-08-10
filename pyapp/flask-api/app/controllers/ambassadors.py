import uuid
from app.extensions import db
from sqlalchemy.orm import joinedload


class AmbassadorController:
    @staticmethod
    def _generate_password(length=12):
        import string, secrets
        alphabet = string.ascii_letters + string.digits + "!@#$%"
        password = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.digits),
            secrets.choice("!@#$%"),
        ]
        password += [secrets.choice(alphabet) for _ in range(length - 4)]
        secrets.SystemRandom().shuffle(password)
        return "".join(password)

    @staticmethod
    def list_ambassadors(db, page=1, per_page=20, search=""):
        from app.models import Ambassador
        from app.utils.serializers import to_dict
        q = db.session.query(Ambassador).options(
            joinedload(Ambassador.user),  # type: ignore
            joinedload(Ambassador.hub),   # type: ignore
            joinedload(Ambassador.wallet) # type: ignore
        )
        if search:
            q = q.filter(Ambassador.referral_code.ilike(f"%{search}%"))
        paginated = q.paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(a, with_relations=True) for a in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def get_ambassador(db, amb_id):
        from app.models import Ambassador
        from app.utils.serializers import to_dict
        amb = db.session.get(Ambassador, amb_id)
        if not amb:
            raise ValueError("not found")
        return to_dict(amb)

    @staticmethod
    def get_ambassador_wallet(db, amb_id):
        from app.models import Ambassador
        from app.utils.serializers import to_dict
        amb = db.session.get(Ambassador, amb_id)
        if not amb:
            raise ValueError("not found")
        if not amb.wallet:
            raise ValueError("wallet not found")
        return to_dict(amb.wallet)

    @staticmethod
    def update_ambassador(db, amb_id, payload: dict):
        from app.models import Ambassador
        from app.utils.serializers import to_dict
        amb = db.session.get(Ambassador, amb_id)
        if not amb:
            raise ValueError("not found")
        if "hubId" in payload:
            amb.hub_id = payload["hubId"]
        if "referralCode" in payload:
            amb.referral_code = payload["referralCode"]
        db.session.commit()
        return to_dict(amb)

    @staticmethod
    def get_ambassador_submissions(db, amb_id, page=1, per_page=20):
        from app.models import Ambassador, TaskSubmission
        from app.utils.serializers import to_dict
        amb = db.session.get(Ambassador, amb_id)
        if not amb:
            raise ValueError("not found")
        paginated = db.session.query(TaskSubmission).filter(
            TaskSubmission.ambassador_id == amb_id
        ).order_by(TaskSubmission.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(s, with_relations=True) for s in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def get_hub_ambassadors(db, hub_id, page=1, per_page=20):
        from app.models import Ambassador, TaskSubmission, TaskStatusType, Lead, Referral, CheckIn
        from app.utils.serializers import to_dict
        paginated = db.session.query(Ambassador).options(
            joinedload(Ambassador.user),
            joinedload(Ambassador.hub),
            joinedload(Ambassador.wallet)
        ).filter_by(hub_id=hub_id).paginate(page=page, per_page=per_page, error_out=False)
        items_data = []
        for a in paginated.items:
            item = to_dict(a, with_relations=True)
            task_count = db.session.query(db.func.count(TaskSubmission.id)).filter_by(ambassador_id=a.id).scalar() or 0
            approved_count = db.session.query(db.func.count(TaskSubmission.id)).join(
                TaskStatusType, TaskSubmission.status_id == TaskStatusType.id
            ).filter(
                TaskSubmission.ambassador_id == a.id,
                TaskStatusType.name == "APPROVED"
            ).scalar() or 0
            lead_count = db.session.query(db.func.count(Lead.id)).filter_by(ambassador_id=a.id).scalar() or 0
            referral_count = db.session.query(db.func.count(Referral.id)).filter_by(ambassador_id=a.id).scalar() or 0
            from datetime import datetime, timezone, timedelta
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            last_checkin = db.session.query(CheckIn).filter_by(ambassador_id=a.id).order_by(
                CheckIn.check_in_time.desc()
            ).first()
            item["stats"] = {
                "totalTasks": int(task_count),
                "approvedTasks": int(approved_count),
                "totalLeads": int(lead_count),
                "totalReferrals": int(referral_count),
                "lastCheckIn": last_checkin.check_in_time.isoformat() if last_checkin else None,
            }
            items_data.append(item)
        return dict(
            items=items_data,
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def get_ambassador_detail(db, amb_id):
        from app.models import Ambassador, TaskSubmission, TaskStatusType, Lead, Referral, CheckIn, Transaction, Wallet
        from app.utils.serializers import to_dict
        from datetime import datetime, timezone, timedelta
        from sqlalchemy import func
        amb = db.session.query(Ambassador).options(
            joinedload(Ambassador.user),
            joinedload(Ambassador.hub),
            joinedload(Ambassador.wallet)
        ).get(amb_id)
        if not amb:
            raise ValueError("not found")
        item = to_dict(amb, with_relations=True)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        total_tasks = db.session.query(func.count(TaskSubmission.id)).filter_by(ambassador_id=amb_id).scalar() or 0
        approved_tasks = db.session.query(func.count(TaskSubmission.id)).join(
            TaskStatusType, TaskSubmission.status_id == TaskStatusType.id
        ).filter(
            TaskSubmission.ambassador_id == amb_id,
            TaskStatusType.name == "APPROVED"
        ).scalar() or 0
        pending_tasks = db.session.query(func.count(TaskSubmission.id)).join(
            TaskStatusType, TaskSubmission.status_id == TaskStatusType.id
        ).filter(
            TaskSubmission.ambassador_id == amb_id,
            TaskStatusType.name == "SUBMITTED"
        ).scalar() or 0
        rejected_tasks = db.session.query(func.count(TaskSubmission.id)).join(
            TaskStatusType, TaskSubmission.status_id == TaskStatusType.id
        ).filter(
            TaskSubmission.ambassador_id == amb_id,
            TaskStatusType.name == "REJECTED"
        ).scalar() or 0
        total_leads = db.session.query(func.count(Lead.id)).filter_by(ambassador_id=amb_id).scalar() or 0
        total_referrals = db.session.query(func.count(Referral.id)).filter_by(ambassador_id=amb_id).scalar() or 0
        converted_referrals = db.session.query(func.count(Referral.id)).filter_by(
            ambassador_id=amb_id, conversion_status="CONVERTED"
        ).scalar() or 0
        last_checkin = db.session.query(CheckIn).filter_by(ambassador_id=amb_id).order_by(
            CheckIn.check_in_time.desc()
        ).first()
        earnings_30d = db.session.query(func.coalesce(func.sum(Transaction.amount), 0)).join(
            Wallet, Transaction.wallet_id == Wallet.id
        ).filter(
            Wallet.ambassador_id == amb_id,
            Transaction.type == "EARNING",
            Transaction.created_at >= thirty_days_ago
        ).scalar() or 0
        item["performance"] = {
            "totalTasks": int(total_tasks),
            "approvedTasks": int(approved_tasks),
            "pendingTasks": int(pending_tasks),
            "rejectedTasks": int(rejected_tasks),
            "totalLeads": int(total_leads),
            "totalReferrals": int(total_referrals),
            "convertedReferrals": int(converted_referrals),
            "earningsLast30Days": float(earnings_30d),
            "lastCheckIn": last_checkin.check_in_time.isoformat() if last_checkin else None,
        }
        item["wallet"] = to_dict(amb.wallet) if amb.wallet else None
        recent_transactions = db.session.query(Transaction).filter_by(
            wallet_id=amb.wallet.id
        ).order_by(Transaction.created_at.desc()).limit(10).all() if amb.wallet else []
        item["recentTransactions"] = [to_dict(t) for t in recent_transactions]
        recent_submissions = db.session.query(TaskSubmission).options(
            joinedload(TaskSubmission.task),
            joinedload(TaskSubmission.status)
        ).filter_by(ambassador_id=amb_id).order_by(TaskSubmission.created_at.desc()).limit(5).all()
        item["recentSubmissions"] = [to_dict(s, with_relations=True) for s in recent_submissions]
        return item

    @staticmethod
    def flag_ambassador_fraud(db, amb_id, payload: dict):
        from app.models import Ambassador, FraudAlert
        from app.utils.serializers import to_dict
        amb = db.session.get(Ambassador, amb_id)
        if not amb:
            raise ValueError("not found")
        fraud_alert = FraudAlert(
            ambassador_id=amb_id,
            type=payload.get("type", "MANUAL_FLAG"),
            severity=payload.get("severity", "MEDIUM"),
            message=payload.get("message", ""),
            details=payload.get("details", {}),
        )
        db.session.add(fraud_alert)
        amb.fraud_strike_count = (amb.fraud_strike_count or 0) + 1
        if amb.fraud_strike_count >= 3:
            amb.status = "SUSPENDED"
            amb.suspension_reason = "Repeated fraud flags"
        db.session.commit()
        return to_dict(fraud_alert)

    @staticmethod
    def create_ambassador(db, payload: dict):
        from app.models import User, Ambassador, Wallet, RoleType, Hub
        from app.utils.auth import hash_password
        from app.utils.serializers import to_dict
        from app.services.email_service import EmailService
        import string, secrets

        required = ("email", "name", "hubId")
        missing = [k for k in required if k not in payload or not str(payload.get(k, "")).strip()]
        if missing:
            raise ValueError(f"email, name, hubId required. Missing: {missing}")

        hub_id = payload["hubId"]
        hub = db.session.get(Hub, hub_id)
        if not hub:
            raise ValueError("hub not found")

        amb_role = RoleType.query.filter_by(name="AMBASSADOR").first()
        if not amb_role:
            raise ValueError("AMBASSADOR role not found")

        email = payload["email"].strip().lower()
        phone = (payload.get("phoneNumber") or "").strip() or None
        existing_user = db.session.query(User).filter_by(email=email).first()
        if existing_user:
            if existing_user.ambassador_profile:
                raise ValueError("user already has an ambassador profile")
            user = existing_user
            user.role_id = amb_role.id
            user.name = payload["name"]
            if phone:
                user.phone_number = phone
        else:
            temp_password = AmbassadorController._generate_password()
            user = User(
                email=email,
                password=hash_password(temp_password),
                name=payload["name"],
                role_id=amb_role.id,
                phone_number=phone,
                is_user_active=True,
                must_change_password=True,
            )
            db.session.add(user)
            db.session.flush()

        referral_code = payload.get("referralCode") or (payload["name"].upper().replace(" ", "_")[:15] + "_REF")
        existing_code = db.session.query(Ambassador).filter_by(referral_code=referral_code).first()
        if existing_code:
            referral_code = referral_code + str(secrets.randbelow(1000))

        amb = Ambassador(
            user_id=str(user.id),
            hub_id=hub_id,
            referral_code=referral_code,
        )
        db.session.add(amb)
        db.session.flush()

        wallet = Wallet(ambassador_id=str(amb.id))
        db.session.add(wallet)

        db.session.commit()

        if not existing_user:
            try:
                EmailService.send_welcome_credentials(
                    user_email=email,
                    user_name=payload["name"],
                    temp_password=temp_password,
                )
            except Exception:
                pass

        result = to_dict(amb, with_relations=True)
        result["user"] = to_dict(user)
        return result
