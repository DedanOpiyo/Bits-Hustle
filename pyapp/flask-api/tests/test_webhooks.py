"""Tests for webhook endpoint."""
import json
import hmac
import hashlib
from datetime import datetime, timezone
import pytest
import os

# Set these before importing create_app
os.environ["FLASK_ENV"] = "testing"
os.environ["WEBHOOK_SECRET"] = "test-secret-key"

from app.factory import create_app
from app.extensions import db

SECRET = "test-secret-key"


@pytest.fixture
def app():
    app = create_app()
    with app.app_context():
        app.config["WEBHOOK_SECRET"] = SECRET
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def make_sig(payload, secret=SECRET):
    payload_str = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    return hmac.new(secret.encode("utf-8"), payload_str.encode("utf-8"), hashlib.sha256).hexdigest()


def test_webhook_signature_verification(app):
    """Test that valid signatures are accepted."""
    with app.app_context():
        from app.services.webhook_service import WebhookService
        now = datetime.now(timezone.utc)
        timestamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        payload = {"referral_id": "test-123", "timestamp": timestamp}
        expected_sig = make_sig(payload)
        result = WebhookService.verify_signature(db, payload, expected_sig, timestamp)
        assert result is True


def test_webhook_missing_signature(client):
    """Test that missing signature returns 401."""
    r = client.post(
        "/api/webhooks/external-conversion",
        data=json.dumps({"referral_id": "test-123"}),
        content_type="application/json"
    )
    assert r.status_code == 401


def test_webhook_expired_timestamp(app):
    """Test that expired timestamps are rejected."""
    with app.app_context():
        from app.services.webhook_service import WebhookService
        payload = {"referral_id": "test-123", "timestamp": "2020-01-01T00:00:00Z"}
        sig = make_sig(payload)
        result = WebhookService.verify_signature(db, payload, sig, "2020-01-01T00:00:00Z")
        assert result is False


def test_webhook_missing_referral_id(client):
    """Test that missing referral_id or referral_code returns 400."""
    now = datetime.now(timezone.utc)
    timestamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {"conversion_status": "CONVERTED", "timestamp": timestamp}
    sig = make_sig(payload)
    r = client.post(
        "/api/webhooks/external-conversion",
        data=json.dumps(payload),
        content_type="application/json",
        headers={"X-Webhook-Signature": sig}
    )
    assert r.status_code == 400


def test_webhook_referral_not_found(client):
    """Test that non-existent referral returns 404."""
    now = datetime.now(timezone.utc)
    timestamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {
        "referral_id": "00000000-0000-0000-0000-000000000000",
        "timestamp": timestamp,
        "external_user_id": "ext-user-1",
        "email": "test@example.com",
        "email_verified": True,
    }
    sig = make_sig(payload)
    r = client.post(
        "/api/webhooks/external-conversion",
        data=json.dumps(payload),
        content_type="application/json",
        headers={"X-Webhook-Signature": sig}
    )
    assert r.status_code == 404


def test_webhook_notification_sent_on_conversion(app):
    """Test that notification is created when referral converts."""
    with app.app_context():
        from app.models import User, RoleType, Ambassador, Referral, PlatformType, Wallet, Notification
        from app.services.webhook_service import WebhookService

        # Create test data
        role = RoleType(name="AMBASSADOR", display_name="Ambassador")
        db.session.add(role)
        db.session.flush()

        user = User(email="test@example.com", password="hash", name="Test User", role_id=role.id)
        db.session.add(user)
        db.session.flush()

        platform = PlatformType(name="BITS_PLATFORM", display_name="Bits Platform")
        db.session.add(platform)
        db.session.flush()

        ambassador = Ambassador(
            user_id=user.id,
            hub_id="hub-1",
            referral_code="TEST-CODE"
        )
        db.session.add(ambassador)
        db.session.flush()

        wallet = Wallet(ambassador_id=ambassador.id, current_balance=0.0)
        db.session.add(wallet)
        db.session.flush()

        referral = Referral(
            ambassador_id=ambassador.id,
            platform_id=platform.id,
            referred_user_id="user-1",
            conversion_status="PENDING"
        )
        db.session.add(referral)
        db.session.commit()

        # Process conversion
        payload = {
            "referral_id": referral.id,
            "conversion_status": "CONVERTED",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "external_user_id": "ext-user-1",
            "email": "test@example.com",
            "email_verified": True,
        }
        WebhookService.process_conversion(db, payload)

        # Check notification was created
        notification = db.session.query(Notification).filter_by(
            user_id=user.id,
            reference_type="REFERRAL",
            reference_id=referral.id
        ).first()

        assert notification is not None
        assert notification.title == "Referral Converted"
        assert "earned" in notification.message.lower()


def test_webhook_platform_attribution_in_transaction(app):
    """Test that platform attribution is recorded in transaction."""
    with app.app_context():
        from app.models import User, RoleType, Ambassador, Referral, PlatformType, Wallet, Transaction
        from app.services.webhook_service import WebhookService

        # Create test data
        role = RoleType(name="AMBASSADOR", display_name="Ambassador")
        db.session.add(role)
        db.session.flush()

        user = User(email="test2@example.com", password="hash", name="Test User 2", role_id=role.id)
        db.session.add(user)
        db.session.flush()

        platform = PlatformType(name="BITS_PLATFORM", display_name="Bits Platform")
        db.session.add(platform)
        db.session.flush()

        ambassador = Ambassador(
            user_id=user.id,
            hub_id="hub-1",
            referral_code="TEST-CODE-2"
        )
        db.session.add(ambassador)
        db.session.flush()

        wallet = Wallet(ambassador_id=ambassador.id, current_balance=0.0)
        db.session.add(wallet)
        db.session.flush()

        referral = Referral(
            ambassador_id=ambassador.id,
            platform_id=platform.id,
            referred_user_id="user-2",
            conversion_status="PENDING"
        )
        db.session.add(referral)
        db.session.commit()

        # Process conversion
        payload = {
            "referral_id": referral.id,
            "conversion_status": "CONVERTED",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "external_user_id": "ext-user-2",
            "email": "test2@example.com",
            "email_verified": True,
        }
        WebhookService.process_conversion(db, payload)

        # Check transaction has platform attribution
        transaction = db.session.query(Transaction).filter_by(
            reference_type="REFERRAL_CONVERSION",
            reference_id=referral.id
        ).first()

        assert transaction is not None
        assert transaction.platform_id == platform.id
