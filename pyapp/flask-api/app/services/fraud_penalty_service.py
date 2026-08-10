from datetime import datetime, timedelta
from decimal import Decimal


class FraudPenaltyService:
    """Implements fraud penalty escalation matrix and ambassador status workflows."""

    @staticmethod
    def get_penalty_level(strike_count):
        """
        Determine penalty level based on strike count.
        
        Returns dict with: action, suspension_days, clawback_enabled, description
        """
        from flask import current_app
        matrix = current_app.config.get("FRAUD_PENALTY_MATRIX", {})
        
        for level_name, level_config in matrix.items():
            if level_config["min_strikes"] <= strike_count <= level_config["max_strikes"]:
                return level_config
        
        # Default to permanent ban if strikes exceed all thresholds
        return matrix.get("permanent_ban", {
            "action": "PERMANENT_BAN",
            "suspension_days": 99999,
            "clawback_enabled": True,
            "description": "Permanent account ban"
        })

    @staticmethod
    def escalate_on_fraud_alert(db, ambassador_id, fraud_alert_id=None):
        """
        Escalate ambassador fraud strikes and apply penalties.
        
        Called when a new FraudAlert is created or when an existing one is confirmed.
        Updates Ambassador.fraud_strike_count and sets suspension if applicable.
        """
        from app.models import Ambassador, FraudAlert
        from app.controllers.notifications import NotificationController
        
        amb = db.session.get(Ambassador, ambassador_id)
        if not amb:
            return None
        
        # Increment strike count
        current_strikes = amb.fraud_strike_count or 0
        amb.fraud_strike_count = current_strikes + 1
        
        # Get penalty for new strike count
        penalty = FraudPenaltyService.get_penalty_level(amb.fraud_strike_count)
        
        # Apply suspension if applicable
        if penalty.get("suspension_days", 0) > 0:
            amb.status = "INACTIVE"
            amb.suspension_reason = penalty.get("action")
            amb.suspended_until = datetime.utcnow() + timedelta(days=penalty["suspension_days"])
        
        db.session.commit()
        
        # Notify ambassador
        if amb.user:
            NotificationController.create(
                db,
                user_id=amb.user.id,
                title="Fraud Alert on Your Account",
                message=f"Your account has been flagged for suspicious activity. {penalty.get('description', '')}",
                reference_type="FRAUD_ALERT",
                reference_id=fraud_alert_id
            )
        
        return penalty

    @staticmethod
    def apply_clawback(db, ambassador_id, reason="Fraud violation - account clawback"):
        """
        Apply wallet clawback (deduct pending earnings) for confirmed fraud.
        
        Only called for PERMANENT_BAN or after investigation confirms fraud.
        Creates a negative Transaction for audit trail.
        """
        from app.models import Ambassador, Transaction
        
        amb = db.session.get(Ambassador, ambassador_id)
        if not amb or not amb.wallet:
            return None
        
        wallet = amb.wallet
        clawed_amount = wallet.pending_earnings or Decimal("0")
        
        if clawed_amount > 0:
            # Deduct from pending earnings
            wallet.pending_earnings = Decimal("0")
            wallet.current_balance = max(
                Decimal("0"),
                (wallet.current_balance or Decimal("0")) - clawed_amount
            )
            
            # Record transaction
            t = Transaction(
                wallet_id=wallet.id,
                amount=-clawed_amount,
                type="CLAWBACK",
                description=reason,
                reference_type="FRAUD_PENALTY",
                reference_id=amb.id
            )
            db.session.add(t)
            db.session.commit()
        
        return clawed_amount

    @staticmethod
    def reactivate_after_suspension(db, ambassador_id):
        """
        Reactivate an ambassador after suspension expires.
        
        Called by inactivity_service on check-in or explicit admin action.
        Resets suspension_until; keeps fraud_strike_count and history.
        """
        from app.models import Ambassador
        
        amb = db.session.get(Ambassador, ambassador_id)
        if not amb:
            return False
        
        if amb.status == "INACTIVE" and amb.suspended_until:
            if datetime.utcnow() >= amb.suspended_until:
                amb.status = "ACTIVE"
                amb.suspended_until = None
                amb.suspension_reason = None
                db.session.commit()
                return True
        
        return False

