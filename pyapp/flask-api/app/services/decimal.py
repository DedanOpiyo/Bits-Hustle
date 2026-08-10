from decimal import Decimal
from typing import Optional
from app.extensions import db


class WalletService:
    """Pure-state wallet mutation methods.

    Every call commits a Transaction row so the frontend wallet timeline
    can reconstruct the complete earning / withdrawal history without
    having to diff two separate database queries.
    """

    @staticmethod
    def credit(
        wallet_id: str,
        amount,
        description: str,
        reference_type: str,
        reference_id: str,
    ) -> "Wallet":
        from app.models import Wallet, Transaction
        decimal_amount = Decimal(str(amount))
        w = Wallet.query.get(wallet_id)
        if not w:
            raise ValueError("wallet not found")
        w.current_balance = Decimal(str(w.current_balance or 0)) + decimal_amount
        w.pending_earnings = Decimal(str(w.pending_earnings or 0)) + decimal_amount
        w.total_earned = Decimal(str(w.total_earned or 0)) + decimal_amount
        t = Transaction(
            wallet_id=wallet_id,
            amount=float(decimal_amount),
            type="EARNING",
            description=description,
            reference_type=reference_type,
            reference_id=reference_id,
        )
        db.session.add(t)
        db.session.commit()
        return w

    @staticmethod
    def settle_pending(wallet_id: str, amount) -> "Wallet":
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
    def debit(
        wallet_id: str,
        amount,
        description: str,
        reference_type: str = "PAYOUT",
        reference_id: Optional[str] = None,
    ) -> "Wallet":
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
        )
        db.session.add(t)
        db.session.commit()
        return w

