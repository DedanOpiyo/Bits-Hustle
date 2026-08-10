from decimal import Decimal
from typing import Optional, List
from app.extensions import db


class WalletService:
    @staticmethod
    def credit(wallet_id, amount, description, reference_type, reference_id, fee_percent=0.0, platform_id=None):
        from app.models import Wallet, Transaction
        decimal_amount = Decimal(str(amount))
        w = Wallet.query.get(wallet_id)
        if not w:
            raise ValueError("wallet not found")

        fee_amount = Decimal("0")
        if fee_percent and fee_percent > 0:
            fee_amount = (decimal_amount * Decimal(str(fee_percent)) / Decimal("100")).quantize(Decimal("0.01"))

        net_amount = decimal_amount - fee_amount
        if net_amount < 0:
            raise ValueError("fee cannot exceed credit amount")

        w.current_balance = Decimal(str(w.current_balance or 0)) + net_amount
        w.pending_earnings = Decimal(str(w.pending_earnings or 0)) + net_amount
        w.total_earned = Decimal(str(w.total_earned or 0)) + net_amount

        t = Transaction(
            wallet_id=wallet_id,
            amount=float(net_amount),
            type="EARNING",
            description=description,
            reference_type=reference_type,
            reference_id=reference_id,
            platform_id=platform_id,
        )
        db.session.add(t)

        if fee_amount > 0:
            t_fee = Transaction(
                wallet_id=wallet_id,
                amount=-float(fee_amount),
                type="HUB_FEE",
                description=f"Hub operating fee ({fee_percent}%) for {description}",
                reference_type=reference_type,
                reference_id=reference_id,
            )
            db.session.add(t_fee)

        db.session.commit()
        # ── badge + tier promotion after wallet credit ──
        try:
            from app.controllers.badges import BadgeController
            from app.services.tier_service import AmbassadorTierService
            BadgeController.check_and_award(db, w.ambassador_id)
            AmbassadorTierService.evaluate(db, w.ambassador_id)
        except Exception:
            pass  # badge/tier promotion must not break earnings flow
        return w

    @staticmethod
    def settle_pending(wallet_id, amount):
        from app.models import Wallet
        decimal_amount = Decimal(str(amount))
        w = Wallet.query.get(wallet_id)
        if not w:
            raise ValueError("wallet not found")
        w.pending_earnings = max(
            Decimal("0"),
            Decimal(str(w.pending_earnings or 0)) - decimal_amount,
        )
        db.session.commit()
        return w

    @staticmethod
    def debit(wallet_id, amount, description, reference_type="PAYOUT", reference_id=None, platform_id=None):
        from app.models import Wallet, Transaction
        decimal_amount = Decimal(str(amount))
        w = Wallet.query.get(wallet_id)
        if not w:
            raise ValueError("wallet not found")
        if w.current_balance < decimal_amount:
            raise ValueError("insufficient balance")
        w.current_balance = Decimal(str(w.current_balance or 0)) - decimal_amount
        w.total_withdrawn = Decimal(str(w.total_withdrawn or 0)) + decimal_amount
        t = Transaction(
            wallet_id=wallet_id,
            amount=-float(decimal_amount),
            type="WITHDRAWAL",
            description=description,
            reference_type=reference_type,
            reference_id=reference_id or "",
            platform_id=platform_id,
        )
        db.session.add(t)
        db.session.commit()
        return w

    @staticmethod
    def get_balance_by_platform(wallet_id):
        """Get balance breakdown by platform"""
        from app.models import Transaction, PlatformType
        from app.utils.serializers import to_dict
        from sqlalchemy import func
        
        # Get sum of earnings by platform
        results = db.session.query(
            Transaction.platform_id,
            func.sum(Transaction.amount).label('total_amount')
        ).filter(
            Transaction.wallet_id == wallet_id,
            Transaction.type == 'EARNING'
        ).group_by(Transaction.platform_id).all()
        
        # Format results
        balance_by_platform = []
        for platform_id, total_amount in results:
            platform = None
            if platform_id:
                platform = db.session.get(PlatformType, platform_id)
            
            balance_by_platform.append({
                "platform_id": platform_id,
                "platform_name": platform.display_name if platform else "Unknown",
                "platform_type": platform.name if platform else None,
                "total_earned": float(total_amount) if total_amount else 0.0
            })
        
        return balance_by_platform

    @staticmethod
    def get_transaction_history(wallet_id, limit=50):
        """Get transaction history with platform information"""
        from app.models import Transaction, PlatformType
        from app.utils.serializers import to_dict
        
        transactions = db.session.query(Transaction).filter_by(
            wallet_id=wallet_id
        ).order_by(
            Transaction.created_at.desc()
        ).limit(limit).all()
        
        result = []
        for t in transactions:
            transaction_dict = to_dict(t)
            # Add platform information
            if t.platform_id:
                platform = db.session.get(PlatformType, t.platform_id)
                transaction_dict["platform"] = {
                    "id": t.platform_id,
                    "name": platform.name if platform else None,
                    "display_name": platform.display_name if platform else None
                } if platform else None
            else:
                transaction_dict["platform"] = None
            result.append(transaction_dict)
        
        return result
