import uuid
from app.extensions import db
from sqlalchemy.orm import joinedload


class TransactionController:
    @staticmethod
    def list_transactions(db, page=1, per_page=20, search="", wallet_id=None):
        from app.models import Transaction
        from app.utils.serializers import to_dict
        q = db.session.query(Transaction).options(
            joinedload(Transaction.wallet).joinedload(Wallet.ambassador).joinedload(Ambassador.user)
        )
        if wallet_id:
            q = q.filter(Transaction.wallet_id == str(wallet_id))
        if search:
            q = q.filter(Transaction.description.ilike(f"%{search}%"))
        paginated = q.order_by(Transaction.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(t) for t in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )
