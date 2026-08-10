"""M-Pesa integrations via Safaricom Daraja API."""
import os
import base64
import time
from datetime import datetime

try:
    import requests
except ModuleNotFoundError:
    requests = None


class MpesaService:
    ENVIRONMENT = os.getenv("MPESA_ENVIRONMENT", "sandbox").lower()
    BASE_URL = os.getenv(
        "MPESA_BASE_URL",
        "https://api.safaricom.co.ke" if ENVIRONMENT == "production" else "https://sandbox.safaricom.co.ke",
    )
    CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "")
    CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "")
    SHORTCODE = os.getenv("MPESA_BUSINESS_SHORTCODE", os.getenv("MPESA_SHORTCODE", "174379"))
    PASSKEY = os.getenv("MPESA_PASSKEY", "")
    B2C_SHORTCODE = os.getenv("MPESA_B2C_SHORTCODE", os.getenv("MPESA_BUSINESS_SHORTCODE", os.getenv("MPESA_SHORTCODE", "")))
    B2C_INITIATOR_NAME = os.getenv("MPESA_B2C_INITIATOR_NAME", "")
    B2C_SECURITY_CREDENTIAL = os.getenv(
        "MPESA_B2C_SECURITY_CREDENTIAL",
        os.getenv("MPesa-security", os.getenv("MPESA_SECURITY_CREDENTIAL", "")),
    )
    B2C_RESULT_URL = os.getenv("MPESA_B2C_RESULT_URL", os.getenv("MPESA_CALLBACK_URL", ""))
    B2C_TIMEOUT_URL = os.getenv("MPESA_B2C_TIMEOUT_URL", os.getenv("MPESA_CALLBACK_URL", ""))
    B2C_COMMAND_ID = os.getenv("MPESA_B2C_COMMAND_ID", "BusinessPayment")

    _cached_token = None
    _token_expires_at = 0.0

    @staticmethod
    def _get_access_token():
        if requests is None:
            raise RuntimeError("The 'requests' package is required for M-Pesa integration")
        now = time.time()
        if MpesaService._cached_token and now < MpesaService._token_expires_at:
            return MpesaService._cached_token
        url = f"{MpesaService.BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
        resp = requests.get(url, auth=(MpesaService.CONSUMER_KEY, MpesaService.CONSUMER_SECRET), timeout=10)
        resp.raise_for_status()
        data = resp.json()
        token = data.get("access_token")
        expires_in = int(data.get("expires_in", 3599))
        MpesaService._cached_token = token
        MpesaService._token_expires_at = now + expires_in - 60
        return token

    @staticmethod
    def stk_push(phone_number, amount, callback_url, account_reference="Payout"):
        if requests is None:
            raise RuntimeError("The 'requests' package is required for M-Pesa integration")
        token = MpesaService._get_access_token()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password_str = f"{MpesaService.SHORTCODE}{MpesaService.PASSKEY}{timestamp}"
        password = base64.b64encode(password_str.encode()).decode()
        payload = {
            "BusinessShortCode": MpesaService.SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone_number,
            "PartyB": MpesaService.SHORTCODE,
            "PhoneNumber": phone_number,
            "CallBackURL": callback_url,
            "AccountReference": account_reference,
        }
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        resp = requests.post(
            f"{MpesaService.BASE_URL}/mpesa/stkpush/v1/processrequest",
            json=payload, headers=headers, timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    @staticmethod
    def b2c_payment(phone_number, amount, remarks="Payout", occasion="Payout", result_url=None, timeout_url=None):
        """Initiate an M-Pesa B2C payment from the shortcode to a customer phone."""
        if requests is None:
            raise RuntimeError("The 'requests' package is required for M-Pesa integration")
        if not phone_number:
            raise ValueError("phone_number is required")
        if not amount or int(float(amount)) <= 0:
            raise ValueError("amount must be greater than zero")
        if not MpesaService.B2C_SHORTCODE:
            raise ValueError("MPESA_B2C_SHORTCODE is not configured")
        if not MpesaService.B2C_INITIATOR_NAME:
            raise ValueError("MPESA_B2C_INITIATOR_NAME is not configured")
        if not MpesaService.B2C_SECURITY_CREDENTIAL:
            raise ValueError("MPESA_B2C_SECURITY_CREDENTIAL is not configured")

        resolved_result_url = result_url or MpesaService.B2C_RESULT_URL
        resolved_timeout_url = timeout_url or MpesaService.B2C_TIMEOUT_URL
        if not resolved_result_url:
            raise ValueError("MPESA_B2C_RESULT_URL is not configured")
        if not resolved_timeout_url:
            raise ValueError("MPESA_B2C_TIMEOUT_URL is not configured")

        token = MpesaService._get_access_token()
        payload = {
            "InitiatorName": MpesaService.B2C_INITIATOR_NAME,
            "SecurityCredential": MpesaService.B2C_SECURITY_CREDENTIAL,
            "CommandID": MpesaService.B2C_COMMAND_ID,
            "Amount": int(float(amount)),
            "PartyA": MpesaService.B2C_SHORTCODE,
            "PartyB": phone_number,
            "Remarks": remarks,
            "QueueTimeOutURL": resolved_timeout_url,
            "ResultURL": resolved_result_url,
            "Occasion": occasion,
        }
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        resp = requests.post(
            f"{MpesaService.BASE_URL}/mpesa/b2c/v1/paymentrequest",
            json=payload, headers=headers, timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    @staticmethod
    def b2c_transaction_status_query(conversation_id=None, originator_conversation_id=None, transaction_id=None):
        """Query the status of a B2C transaction."""
        if requests is None:
            raise RuntimeError("The 'requests' package is required for M-Pesa integration")
        if not any([conversation_id, originator_conversation_id, transaction_id]):
            raise ValueError("At least one of conversation_id, originator_conversation_id, or transaction_id is required")
        if not MpesaService.B2C_INITIATOR_NAME:
            raise ValueError("MPESA_B2C_INITIATOR_NAME is not configured")
        if not MpesaService.B2C_SECURITY_CREDENTIAL:
            raise ValueError("MPESA_B2C_SECURITY_CREDENTIAL is not configured")

        token = MpesaService._get_access_token()
        payload = {
            "Initiator": MpesaService.B2C_INITIATOR_NAME,
            "SecurityCredential": MpesaService.B2C_SECURITY_CREDENTIAL,
            "CommandID": "TransactionStatusQuery",
            "PartyA": MpesaService.B2C_SHORTCODE,
            "IdentifierType": "4",
            "Remarks": "Transaction status query",
            "Occasion": "StatusQuery",
            "QueueTimeOutURL": MpesaService.B2C_TIMEOUT_URL,
            "ResultURL": MpesaService.B2C_RESULT_URL,
        }
        if transaction_id:
            payload["TransactionID"] = transaction_id
        if originator_conversation_id:
            payload["OriginatorConversationID"] = originator_conversation_id
        if conversation_id:
            payload["ConversationID"] = conversation_id

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        resp = requests.post(
            f"{MpesaService.BASE_URL}/mpesa/transactionstatus/v1/query",
            json=payload, headers=headers, timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    @staticmethod
    def b2c_reversal(transaction_id, amount, remarks="Reversal"):
        """Reverse a completed B2C transaction."""
        if requests is None:
            raise RuntimeError("The 'requests' package is required for M-Pesa integration")
        if not transaction_id:
            raise ValueError("transaction_id is required")
        if not amount or int(float(amount)) <= 0:
            raise ValueError("amount must be greater than zero")
        if not MpesaService.B2C_INITIATOR_NAME:
            raise ValueError("MPESA_B2C_INITIATOR_NAME is not configured")
        if not MpesaService.B2C_SECURITY_CREDENTIAL:
            raise ValueError("MPESA_B2C_SECURITY_CREDENTIAL is not configured")

        token = MpesaService._get_access_token()
        payload = {
            "Initiator": MpesaService.B2C_INITIATOR_NAME,
            "SecurityCredential": MpesaService.B2C_SECURITY_CREDENTIAL,
            "CommandID": "TransactionReversal",
            "ReceiverParty": MpesaService.B2C_SHORTCODE,
            "RecieverIdentifierType": "4",
            "TransactionID": transaction_id,
            "Amount": int(float(amount)),
            "Remarks": remarks,
            "Occasion": "Reversal",
            "QueueTimeOutURL": MpesaService.B2C_TIMEOUT_URL,
            "ResultURL": MpesaService.B2C_RESULT_URL,
        }
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        resp = requests.post(
            f"{MpesaService.BASE_URL}/mpesa/reversal/v1/request",
            json=payload, headers=headers, timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
