import uuid
from app.extensions import db
from sqlalchemy.orm import joinedload


class WalletController:
    @staticmethod
    def list_wallets(db, page=1, per_page=20, search=""):
        from app.models import Wallet, Ambassador
        from app.utils.serializers import to_dict
        q = db.session.query(Wallet).options(
            joinedload(Wallet.ambassador)
        )
        if search:
            q = q.join(Ambassador).filter(Ambassador.referral_code.ilike(f"%{search}%"))
        paginated = q.order_by(Wallet.updated_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(w, with_relations=True) for w in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def get_wallet(db, wallet_id):
        from app.models import Wallet
        from app.utils.serializers import to_dict
        w = db.session.get(Wallet, wallet_id)
        if not w:
            raise ValueError("not found")
        return to_dict(w)

    @staticmethod
    def get_wallet_details(db, wallet_id):
        """Get detailed wallet information including balance breakdown and transaction history"""
        from app.models import Wallet
        from app.utils.serializers import to_dict
        from app.services.wallet_service import WalletService
        
        w = db.session.get(Wallet, wallet_id)
        if not w:
            raise ValueError("wallet not found")
        
        # Get basic wallet info
        wallet_dict = to_dict(w) or {}
        
        # Get balance by platform
        balance_by_platform = WalletService.get_balance_by_platform(wallet_id)
        
        # Get transaction history with platform info
        transaction_history = WalletService.get_transaction_history(wallet_id, limit=100)
        
        # Calculate pending earnings (approved tasks not yet paid out)
        # This would typically come from wallet.pending_earnings but we can also calculate from transactions
        pending_earnings = float(w.pending_earnings or 0)
        
        # Calculate lifetime stats
        total_earned = float(w.total_earned or 0)
        total_withdrawn = float(w.total_withdrawn or 0)
        current_balance = float(w.current_balance or 0)
        
        # Build result dictionary manually to avoid bytes issues
        result = {}
        for key, value in wallet_dict.items():
            result[key] = value
        
        result["balance_by_platform"] = balance_by_platform
        result["transaction_history"] = transaction_history
        result["pending_earnings"] = pending_earnings
        result["total_earned"] = total_earned
        result["total_withdrawn"] = total_withdrawn
        result["current_balance"] = current_balance
        result["available_balance"] = current_balance - pending_earnings  # What's immediately available for withdrawal
        
        return result

    @staticmethod
    def list_transactions(db, wallet_id):
        from app.models import Wallet, Transaction
        from app.utils.serializers import to_dict
        w = db.session.get(Wallet, wallet_id)
        if not w:
            raise ValueError("not found")
        items = db.session.query(Transaction).filter_by(wallet_id=str(wallet_id)).order_by(Transaction.created_at.desc()).all()
        return [to_dict(t) for t in items]

