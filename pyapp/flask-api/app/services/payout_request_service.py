from app.extensions import db
from sqlalchemy.orm import joinedload
from app.models import Ambassador, User, RoleType
from app.services.role_permission_service import RolePermissionService
import json
import os


class PayoutRequestService:
    @staticmethod
    def _parse_details(details):
        if isinstance(details, str):
            try:
                return json.loads(details)
            except (TypeError, ValueError):
                return {"account": details}
        if isinstance(details, dict):
            return details
        return {}

    @staticmethod
    def _get_payout_phone(details):
        parsed = PayoutRequestService._parse_details(details)
        phone = parsed.get("phone") or parsed.get("account") or parsed.get("phoneNumber")
        return str(phone).strip() if phone else ""

    @staticmethod
    def _normalize_mpesa_phone(phone):
        digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
        if digits.startswith("0") and len(digits) == 10:
            return "254" + digits[1:]
        if digits.startswith("7") and len(digits) == 9:
            return "254" + digits
        if digits.startswith("254") and len(digits) == 12:
            return digits
        return digits

    @staticmethod
    def _is_mpesa_b2c_method(method):
        return str(method or "").lower() in {"mpesa", "mpesa_b2c", "b2c"}

    @staticmethod
    def _send_b2c_payout(payout_request):
        from app.services.mpesa_service import MpesaService

        phone = PayoutRequestService._normalize_mpesa_phone(
            PayoutRequestService._get_payout_phone(payout_request.details)
        )
        if not phone:
            raise ValueError("M-Pesa payout phone number is required")

        response = MpesaService.b2c_payment(
            phone_number=phone,
            amount=payout_request.amount,
            remarks=f"Payout-{str(payout_request.id)[:8]}",
            occasion="Payout",
            result_url=os.getenv("MPESA_B2C_RESULT_URL"),
            timeout_url=os.getenv("MPESA_B2C_TIMEOUT_URL"),
        )
        response_code = str(response.get("ResponseCode", "")) if isinstance(response, dict) else ""
        if response_code and response_code != "0":
            error_message = response.get("errorMessage") or response.get("ResponseDescription") or "B2C payout was rejected by M-Pesa"
            raise ValueError(error_message)
        return response

    @staticmethod
    def _status_by_name(db, name):
        from app.models import PayoutStatusType
        return db.session.query(PayoutStatusType).filter_by(name=name).first()

    @staticmethod
    def _resolve_status(db, primary_name, fallback_name=None):
        status = PayoutRequestService._status_by_name(db, primary_name)
        if not status and fallback_name:
            status = PayoutRequestService._status_by_name(db, fallback_name)
        if not status:
            raise ValueError(f"{primary_name} payout status not configured")
        return status

    @staticmethod
    def _wallet_available_balance(wallet):
        current_balance = float(wallet.current_balance or 0)
        pending_earnings = float(wallet.pending_earnings or 0)
        return current_balance - pending_earnings

    @staticmethod
    def can_review(user: User) -> bool:
        """Check if user can review/approve payouts."""
        return RolePermissionService.can_approve_payout(user)

    @staticmethod
    def list(db, page=1, per_page=20, search="", platform_id=None):
        from app.models import PayoutRequest, PayoutStatusType, Ambassador, PlatformType
        from app.utils.serializers import to_dict
        from sqlalchemy import or_
        q = db.session.query(PayoutRequest).options(
            joinedload(PayoutRequest.ambassador).joinedload(Ambassador.user),
            joinedload(PayoutRequest.status),
            joinedload(PayoutRequest.platform)
        )
        if search:
            q = q.join(PayoutStatusType, PayoutRequest.status_id == PayoutStatusType.id).filter(
                or_(
                    PayoutStatusType.name.ilike(f"%{search}%"),
                    PayoutStatusType.display_name.ilike(f"%{search}%"),
                )
            )
        if platform_id is not None:
            q = q.filter(PayoutRequest.platform_id == platform_id)
        paginated = q.order_by(PayoutRequest.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        items = []
        for payout in paginated.items:
            payout_dict = to_dict(payout, with_relations=True)
            platform = None
            if payout.platform_id:
                platform = db.session.get(PlatformType, payout.platform_id)
            if platform:
                payout_dict["platform"] = to_dict(platform)
            items.append(payout_dict)
        return dict(
            items=items,
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def list_for_templates(db, page=1, per_page=20, search="", platform_id=None):
        from app.models import PayoutRequest, PayoutStatusType, Ambassador, PlatformType
        from app.utils.serializers import to_dict
        from sqlalchemy import or_
        q = db.session.query(PayoutRequest).options(
            joinedload(PayoutRequest.ambassador).joinedload(Ambassador.user),
            joinedload(PayoutRequest.status),
            joinedload(PayoutRequest.platform)
        )
        if search:
            q = q.join(PayoutStatusType, PayoutRequest.status_id == PayoutStatusType.id).filter(
                or_(
                    PayoutStatusType.name.ilike(f"%{search}%"),
                    PayoutStatusType.display_name.ilike(f"%{search}%"),
                )
            )
        if platform_id is not None:
            q = q.filter(PayoutRequest.platform_id == platform_id)
        paginated = q.order_by(PayoutRequest.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        items = []
        for payout in paginated.items:
            payout_dict = to_dict(payout, with_relations=True)
            platform = None
            if payout.platform_id:
                platform = db.session.get(PlatformType, payout.platform_id)
            if platform:
                payout_dict["platform"] = to_dict(platform)
            items.append(payout_dict)
        return dict(
            items=items,
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def create(db, payload: dict, ambassador_id=None):
        from app.models import PayoutRequest, Ambassador, PayoutStatusType
        from app.utils.serializers import to_dict
        required = ("amount", "method", "details")
        if not all(k in payload for k in required):
            if "account" in payload:
                payload = dict(payload)
                payload["details"] = {"account": payload["account"]}
            else:
                raise ValueError("amount, method, details required")
        amb = None
        if ambassador_id:
            amb = db.session.get(Ambassador, ambassador_id)
        if not amb:
            raise ValueError("ambassador not found")
        from flask import current_app
        MIN_PAYOUT = current_app.config.get("MIN_PAYOUT_AMOUNT", 500.0)
        if float(payload["amount"]) < MIN_PAYOUT:
            raise ValueError(f"payout amount {payload['amount']} below minimum threshold {MIN_PAYOUT}")

        wallet = amb.wallet
        if not wallet:
            raise ValueError("wallet not found")
        available_balance = PayoutRequestService._wallet_available_balance(wallet)
        if available_balance < float(payload["amount"]):
            raise ValueError(
                f"insufficient wallet balance. Available: {available_balance:.2f}, requested: {float(payload['amount']):.2f}"
            )

        status = db.session.query(PayoutStatusType).filter_by(name="PENDING").first()
        if not status:
            raise ValueError("PENDING payout status not configured")
        details = payload["details"]
        if isinstance(details, (dict, list)):
            details = json.dumps(details)
        p = PayoutRequest(
            ambassador_id=str(amb.id),
            platform_id=payload.get("platformId"),
            amount=payload["amount"],
            status_id=str(status.id) if status else None,
            method=payload["method"],
            details=details,
        )
        db.session.add(p)
        db.session.commit()
        return to_dict(p)

    @staticmethod
    def review(db, pid, payload: dict, reviewed_by_id=None):
        from app.models import PayoutRequest, PayoutStatusType
        from app.utils.serializers import to_dict
        from decimal import Decimal
        from datetime import datetime
        p = db.session.get(PayoutRequest, pid)
        if not p:
            raise ValueError("not found")
        previous_status_name = p.status.name if p.status else None
        status_id = payload.get("statusId")
        target_status_name = None
        if not status_id:
            status_name = payload.get("statusName")
            action = payload.get("action")
            if not status_name and action:
                status_name = "APPROVED" if action in ("approve", "authorize", "pay") else "REJECTED" if action == "reject" else None
            if status_name:
                resolved_status = db.session.query(PayoutStatusType).filter_by(name=str(status_name).upper()).first()
                if not resolved_status:
                    raise ValueError(f"payout status '{status_name}' not found")
                status_id = resolved_status.id
                target_status_name = resolved_status.name
        if not status_id:
            raise ValueError("statusId or action required")
        if not target_status_name:
            resolved_status = db.session.get(PayoutStatusType, status_id)
            if not resolved_status:
                raise ValueError("payout status not found")
            target_status_name = resolved_status.name
        if status_id:
            p.status_id = status_id
        p.method = payload.get("method", p.method)
        p.details = payload.get("details", p.details)
        p.admin_notes = payload.get("adminNotes")
        rejection_reason = payload.get("rejectionReason") or payload.get("rejection_reason")
        if rejection_reason:
            p.rejection_reason = rejection_reason
        if reviewed_by_id:
            p.reviewed_by_id = reviewed_by_id

        if target_status_name == "APPROVED" and previous_status_name != "APPROVED":
            from app.models import Wallet, Transaction
            from app.controllers.notifications import NotificationController
            if previous_status_name not in ("PENDING", "APPROVED"):
                raise ValueError(f"Only pending payout requests can be approved. Current status: {previous_status_name}")
            wallet = p.ambassador.wallet if p.ambassador else None
            if not wallet:
                raise ValueError("wallet not found")
            available_balance = PayoutRequestService._wallet_available_balance(wallet)
            if available_balance < float(p.amount):
                raise ValueError(
                    f"insufficient wallet balance. Available: {available_balance:.2f}, requested: {float(p.amount):.2f}"
                )

            payout_details = PayoutRequestService._parse_details(p.details)
            b2c_response = None
            if PayoutRequestService._is_mpesa_b2c_method(p.method):
                if payout_details.get("b2c"):
                    raise ValueError("M-Pesa payout has already been authorized")
                b2c_response = PayoutRequestService._send_b2c_payout(p)
                if not b2c_response:
                    raise ValueError("B2C payout did not return a response")
                payout_details["b2c"] = b2c_response
                payout_details["b2c_status"] = "AWAITING_CALLBACK"
                processing_status = PayoutRequestService._status_by_name(db, "PROCESSING")
                if processing_status:
                    p.status_id = processing_status.id

            w = p.ambassador.wallet
            if not w:
                raise ValueError("wallet not found")
            w.current_balance = max(
                Decimal("0"),
                Decimal(str(w.current_balance or 0)) - Decimal(str(p.amount)),
            )
            w.total_withdrawn = Decimal(str(w.total_withdrawn or 0)) + Decimal(str(p.amount))
            t = Transaction(
                wallet_id=w.id,
                amount=-p.amount,
                type="WITHDRAWAL",
                description=f"Payout {p.id}" + (" authorized via M-Pesa B2C" if b2c_response else ""),
                reference_type="PAYOUT_REQUEST",
                reference_id=p.id,
            )
            payout_details["account"] = PayoutRequestService._get_payout_phone(payout_details) or payout_details.get("account")
            p.details = json.dumps(payout_details)
            p.reviewed_at = datetime.utcnow()
            db.session.add(t)

            amb_user = p.ambassador.user if p.ambassador and p.ambassador.user else None
            if amb_user:
                from app.models import PlatformType
                platform_name = ""
                if p.platform_id:
                    platform = db.session.get(PlatformType, p.platform_id)
                    platform_name = f" on {platform.display_name}" if platform else ""
                NotificationController.create(
                    db,
                    user_id=amb_user.id,
                    title="Payout Approved",
                    message=f"Your payout of KES {p.amount}{platform_name} has been approved.",
                    reference_type="PAYOUT_REQUEST",
                    reference_id=p.id,
                    platform_id=p.platform_id
                )
        elif target_status_name == "REJECTED" and previous_status_name != "REJECTED":
                from app.controllers.notifications import NotificationController
                amb_user = p.ambassador.user if p.ambassador and p.ambassador.user else None
                if amb_user:
                    from app.models import PlatformType
                    platform_name = ""
                    if p.platform_id:
                        platform = db.session.get(PlatformType, p.platform_id)
                        platform_name = f" on {platform.display_name}" if platform else ""
                    NotificationController.create(
                        db,
                        user_id=amb_user.id,
                        title="Payout Rejected",
                        message=f"Your payout of KES {p.amount}{platform_name} has been rejected. Reason: {p.rejection_reason}",
                        reference_type="PAYOUT_REQUEST",
                        reference_id=p.id,
                        platform_id=p.platform_id
                    )
        db.session.commit()
        return to_dict(p)

    @staticmethod
    def authorize(db, pid, payload=None, reviewed_by_id=None):
        payload = dict(payload or {})
        payload["action"] = "authorize"
        return PayoutRequestService.review(db, pid, payload, reviewed_by_id=reviewed_by_id)

    @staticmethod
    def appeal(db, pid, payload: dict, ambassador_id=None):
        """Appeal a rejected payout request (once only per BRD 15.3)"""
        from app.models import PayoutRequest, Appeal
        from app.utils.serializers import to_dict
        from datetime import datetime
        if not ambassador_id:
            raise ValueError("ambassador not found")
        p = db.session.get(PayoutRequest, pid)
        if not p:
            raise ValueError("payout request not found")
        
        if not p.status:
            raise ValueError("payout request has no status")
        if p.status.name != "REJECTED":
            raise ValueError("Only rejected payout requests can be appealed")
        
        existing_appeal = db.session.query(Appeal).filter_by(
            ambassador_id=str(ambassador_id),
            payout_request_id=str(pid),
        ).first()
        if existing_appeal:
            raise ValueError("You have already appealed this payout request")
        
        if not payload.get("reason"):
            raise ValueError("Appeal reason is required")
        
        appeal = Appeal(
            ambassador_id=str(ambassador_id),
            task_submission_id=None,
            payout_request_id=str(pid),
            reason=payload["reason"],
            status="PENDING",
        )
        db.session.add(appeal)
        db.session.commit()
        
        try:
            from app.controllers.notifications import NotificationController
            amb_user = p.ambassador.user if p.ambassador and p.ambassador.user else None
            if amb_user:
                NotificationController.create(
                    db,
                    user_id=amb_user.id,
                    title="Payout Appeal Submitted",
                    message=f"Your appeal for payout of KES {p.amount} has been submitted and is under review.",
                    reference_type="APPEAL",
                    reference_id=appeal.id,
                )
        except Exception:
            pass
        
        return to_dict(appeal)

    @staticmethod
    def update(db, pid, payload: dict, edited_by_id=None):
        """Update a payout request (only Super Admins can edit)"""
        from app.models import PayoutRequest, PayoutStatusType, Ambassador
        from app.utils.serializers import to_dict
        from datetime import datetime
        
        p = db.session.get(PayoutRequest, pid)
        if not p:
            raise ValueError("payout request not found")
        
        if p.status.name != "PENDING":
            raise ValueError("Only pending payout requests can be edited")
        
        if "amount" in payload:
            amount = float(payload["amount"])
            if amount <= 0:
                raise ValueError("Amount must be greater than zero")
            p.amount = amount
            
        if "method" in payload:
            p.method = payload["method"]
            
        if "details" in payload:
            details = payload["details"]
            if isinstance(details, dict):
                p.details = json.dumps(details)
            else:
                p.details = str(details)
                
        if "platform_id" in payload:
            p.platform_id = payload["platform_id"] if payload["platform_id"] else None
            
        if "admin_notes" in payload:
            p.admin_notes = payload["admin_notes"]
            
        if edited_by_id:
            p.reviewed_by_id = edited_by_id
        p.updated_at = datetime.utcnow()
        
        db.session.commit()
        return to_dict(p)

    @staticmethod
    def process_b2c_result_callback(db, callback_data):
        """Process M-Pesa B2C result callback and update payout status."""
        from app.models import PayoutRequest, Transaction
        from app.controllers.notifications import NotificationController
        from decimal import Decimal

        result = callback_data.get("Result", {})
        result_code = int(result.get("ResultCode", -1))
        result_desc = result.get("ResultDesc", "")
        conversation_id = result.get("ConversationID", "")
        originator_conversation_id = result.get("OriginatorConversationID", "")
        transaction_id = result.get("TransactionID", "")

        result_params = {}
        for param in result.get("ResultParameters", {}).get("ResultParameter", []):
            result_params[param.get("Key", "")] = param.get("Value", "")

        payout = None
        if originator_conversation_id:
            payout = db.session.query(PayoutRequest).filter(
                PayoutRequest.details.ilike(f'%{originator_conversation_id}%')
            ).first()

        if not payout and conversation_id:
            payout = db.session.query(PayoutRequest).filter(
                PayoutRequest.details.ilike(f'%{conversation_id}%')
            ).first()

        if not payout:
            return {"status": "not_found", "message": "No matching payout request found"}

        payout_details = PayoutRequestService._parse_details(payout.details)
        if payout_details.get("b2c_callback_processed"):
            return {"status": "already_processed", "message": "Callback already processed"}

        callback_info = {
            "ResultCode": result_code,
            "ResultDesc": result_desc,
            "TransactionID": transaction_id,
            "ConversationID": conversation_id,
            "OriginatorConversationID": originator_conversation_id,
            "TransactionReceipt": result_params.get("TransactionReceipt", ""),
            "TransactionAmount": result_params.get("TransactionAmount", ""),
            "ReceiverPartyPublicName": result_params.get("ReceiverPartyPublicName", ""),
        }
        payout_details["b2c_callback"] = callback_info
        payout_details["b2c_callback_processed"] = True

        if result_code == 0:
            completed_status = PayoutRequestService._status_by_name(db, "COMPLETED")
            if completed_status:
                payout.status_id = completed_status.id
            payout_details["b2c_status"] = "COMPLETED"
            payout_details["b2c_transaction_id"] = transaction_id
        else:
            failed_status = PayoutRequestService._status_by_name(db, "FAILED")
            if failed_status:
                payout.status_id = failed_status.id
            payout_details["b2c_status"] = "FAILED"

            w = payout.ambassador.wallet if payout.ambassador else None
            if w:
                w.current_balance = Decimal(str(w.current_balance or 0)) + Decimal(str(payout.amount))
                w.total_withdrawn = max(
                    Decimal("0"),
                    Decimal(str(w.total_withdrawn or 0)) - Decimal(str(payout.amount)),
                )
                refund_tx = Transaction(
                    wallet_id=w.id,
                    amount=payout.amount,
                    type="REFUND",
                    description=f"Payout {payout.id} refunded (B2C failed: {result_desc})",
                    reference_type="PAYOUT_REQUEST",
                    reference_id=payout.id,
                )
                db.session.add(refund_tx)

        payout.details = json.dumps(payout_details)
        db.session.commit()

        amb_user = payout.ambassador.user if payout.ambassador and payout.ambassador.user else None
        if amb_user:
            if result_code == 0:
                NotificationController.create(
                    db,
                    user_id=amb_user.id,
                    title="Payout Completed",
                    message=f"Your payout of KES {payout.amount} has been sent to your M-Pesa. Transaction ID: {transaction_id}",
                    reference_type="PAYOUT_REQUEST",
                    reference_id=payout.id,
                )
            else:
                NotificationController.create(
                    db,
                    user_id=amb_user.id,
                    title="Payout Failed",
                    message=f"Your payout of KES {payout.amount} failed: {result_desc}. The amount has been refunded to your wallet.",
                    reference_type="PAYOUT_REQUEST",
                    reference_id=payout.id,
                )

        return {"status": "processed", "result_code": result_code}

    @staticmethod
    def process_b2c_timeout_callback(db, callback_data):
        """Process M-Pesa B2C timeout callback."""
        from app.models import PayoutRequest, Transaction
        from app.controllers.notifications import NotificationController
        from decimal import Decimal

        result = callback_data.get("Result", {})
        result_code = int(result.get("ResultCode", -1))
        result_desc = result.get("ResultDesc", "")
        conversation_id = result.get("ConversationID", "")
        originator_conversation_id = result.get("OriginatorConversationID", "")

        payout = None
        if originator_conversation_id:
            payout = db.session.query(PayoutRequest).filter(
                PayoutRequest.details.ilike(f'%{originator_conversation_id}%')
            ).first()

        if not payout and conversation_id:
            payout = db.session.query(PayoutRequest).filter(
                PayoutRequest.details.ilike(f'%{conversation_id}%')
            ).first()

        if not payout:
            return {"status": "not_found", "message": "No matching payout request found"}

        payout_details = PayoutRequestService._parse_details(payout.details)
        if payout_details.get("b2c_callback_processed"):
            return {"status": "already_processed", "message": "Callback already processed"}

        payout_details["b2c_timeout_callback"] = {
            "ResultCode": result_code,
            "ResultDesc": result_desc,
            "ConversationID": conversation_id,
            "OriginatorConversationID": originator_conversation_id,
        }
        payout_details["b2c_status"] = "TIMEOUT"
        payout_details["b2c_callback_processed"] = True

        failed_status = PayoutRequestService._status_by_name(db, "FAILED")
        if failed_status:
            payout.status_id = failed_status.id

        w = payout.ambassador.wallet if payout.ambassador else None
        if w:
            w.current_balance = Decimal(str(w.current_balance or 0)) + Decimal(str(payout.amount))
            w.total_withdrawn = max(
                Decimal("0"),
                Decimal(str(w.total_withdrawn or 0)) - Decimal(str(payout.amount)),
            )
            refund_tx = Transaction(
                wallet_id=w.id,
                amount=payout.amount,
                type="REFUND",
                description=f"Payout {payout.id} refunded (B2C timed out: {result_desc})",
                reference_type="PAYOUT_REQUEST",
                reference_id=payout.id,
            )
            db.session.add(refund_tx)

        payout.details = json.dumps(payout_details)
        db.session.commit()

        amb_user = payout.ambassador.user if payout.ambassador and payout.ambassador.user else None
        if amb_user:
            NotificationController.create(
                db,
                user_id=amb_user.id,
                title="Payout Timed Out",
                message=f"Your payout of KES {payout.amount} timed out: {result_desc}. The amount has been refunded to your wallet.",
                reference_type="PAYOUT_REQUEST",
                reference_id=payout.id,
            )

        return {"status": "processed", "result_code": result_code}
