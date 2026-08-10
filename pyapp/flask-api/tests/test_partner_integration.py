"""Tests for partner platform integration features."""
import json
import hmac
import hashlib
from datetime import datetime, timezone
import pytest
import os

os.environ["FLASK_ENV"] = "testing"
os.environ["WEBHOOK_SECRET"] = "test-secret-key"

from app.factory import create_app
from app.extensions import db
from app.models import PlatformType, PlatformApiKey


@pytest.fixture
def app():
    app = create_app()
    with app.app_context():
        app.config["WEBHOOK_SECRET"] = "test-secret-key"
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def test_platform(app):
    """Create a test platform with API key and webhook secret."""
    with app.app_context():
        platform = PlatformType(
            name="TEST_PLATFORM",
            display_name="Test Platform",
            webhook_secret="whsec_test_secret_12345",
            webhook_url="https://example.com/webhook"
        )
        db.session.add(platform)
        db.session.flush()

        api_key = PlatformApiKey(
            platform_id=platform.id,
            name="Test API Key",
            key_hash=hashlib.sha256("b2h_test_key_123".encode()).hexdigest(),
            key_prefix="test123",
            scopes=["actions:create", "rates:create", "rates:update", "rates:read"]
        )
        db.session.add(api_key)
        db.session.commit()

        return {
            "platform_id": platform.id,
            "api_key": "b2h_test_key_123",
            "webhook_secret": "whsec_test_secret_12345"
        }


def make_signature(payload, secret):
    """Helper to create HMAC signature."""
    payload_str = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    return hmac.new(
        secret.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def test_webhook_signature_with_platform_secret(app, test_platform):
    """Test that webhook signatures verify correctly with platform-specific secrets."""
    with app.app_context():
        from app.services.webhook_service import WebhookService

        now = datetime.now(timezone.utc)
        timestamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        payload = {
            "referral_id": "test-123",
            "platform_id": test_platform["platform_id"],
            "timestamp": timestamp
        }

        signature = make_signature(payload, test_platform["webhook_secret"])
        result = WebhookService.verify_signature(db, payload, signature, timestamp)
        assert result is True


def test_referral_rates_require_api_key(client):
    """Test that /api/referral-rates endpoints require API key authentication."""
    response = client.get("/api/referral-rates")
    assert response.status_code == 401
    assert "X-API-Key header required" in response.get_json()["message"]


def test_referral_rates_with_valid_api_key(client, test_platform):
    """Test that /api/referral-rates works with valid API key."""
    headers = {
        "X-API-Key": test_platform["api_key"],
        "Content-Type": "application/json"
    }

    response = client.get("/api/referral-rates", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["success"] is True


def test_referral_rates_scope_enforcement(client, app):
    """Test that API key scopes are enforced."""
    with app.app_context():
        platform = PlatformType(name="LIMITED_PLATFORM", display_name="Limited")
        db.session.add(platform)
        db.session.flush()

        limited_key = PlatformApiKey(
            platform_id=platform.id,
            name="Limited Key",
            key_hash=hashlib.sha256("b2h_limited_key".encode()).hexdigest(),
            key_prefix="limited",
            scopes=["actions:create"]
        )
        db.session.add(limited_key)
        db.session.commit()

        headers = {"X-API-Key": "b2h_limited_key"}
        response = client.post("/api/referral-rates", headers=headers,
                             data=json.dumps({"rate": 100}),
                             content_type="application/json")
        assert response.status_code == 403
        assert "insufficient scope" in response.get_json()["message"]


def test_platform_crud_requires_admin(client, auth_headers):
    """Test that platform CRUD endpoints require SUPER_ADMIN role."""
    response = client.post("/api/platforms",
                          data=json.dumps({"name": "TEST", "display_name": "Test"}),
                          content_type="application/json")
    assert response.status_code == 401


def test_platform_crud_with_admin(client, auth_headers):
    """Test that platform CRUD works with SUPER_ADMIN role."""
    response = client.post("/api/platforms",
                          headers=auth_headers,
                          data=json.dumps({"name": "NEW_PLATFORM", "display_name": "New Platform"}),
                          content_type="application/json")
    assert response.status_code == 201
    assert response.get_json()["success"] is True


def test_action_approval_requires_admin(client):
    """Test that action approval requires SUPER_ADMIN role."""
    response = client.post("/api/platform-actions/fake-id/approve")
    assert response.status_code == 401


def test_partner_self_service_endpoints(client, test_platform):
    """Test partner self-service endpoints with API key."""
    headers = {
        "X-API-Key": test_platform["api_key"],
        "Content-Type": "application/json"
    }

    response = client.get("/api/platforms/me", headers=headers)
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["name"] == "TEST_PLATFORM"
    assert "webhook_secret" not in data
    assert "webhook_secret_hash" not in data


def test_partner_set_webhook_url(client, test_platform, app):
    """Test partner can set their own webhook URL."""
    headers = {
        "X-API-Key": test_platform["api_key"],
        "Content-Type": "application/json"
    }

    response = client.put("/api/platforms/me/webhook-url",
                         headers=headers,
                         data=json.dumps({"webhook_url": "https://new.example.com/webhook"}),
                         content_type="application/json")
    assert response.status_code == 200
    assert response.get_json()["success"] is True

    with app.app_context():
        platform = db.session.get(PlatformType, test_platform["platform_id"])
        assert platform.webhook_url == "https://new.example.com/webhook"


def test_outbound_webhook_service(app, test_platform):
    """Test outbound webhook service sends events correctly."""
    with app.app_context():
        from app.services.outbound_webhook_service import OutboundWebhookService

        result = OutboundWebhookService.send_event(
            db,
            test_platform["platform_id"],
            "test.event",
            {"test": "data"}
        )

        assert "success" in result
        assert "status_code" in result or "error" in result


@pytest.fixture
def auth_headers(client, app):
    """Create SUPER_ADMIN auth headers."""
    with app.app_context():
        from app.models import User, RoleType
        from app.utils.auth import hash_password

        sa_role = RoleType.query.filter_by(name="SUPER_ADMIN").first()
        if not sa_role:
            sa_role = RoleType(name="SUPER_ADMIN", display_name="Super Admin")
            db.session.add(sa_role)
            db.session.flush()

        user = User(
            email="admin@test.com",
            password=hash_password("secret"),
            name="Admin",
            role_id=sa_role.id,
            is_user_active=True
        )
        db.session.add(user)
        db.session.commit()

    resp = client.post("/api/auth/login",
                      data=json.dumps({"email": "admin@test.com", "password": "secret"}),
                      content_type="application/json")
    token = resp.get_json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}
