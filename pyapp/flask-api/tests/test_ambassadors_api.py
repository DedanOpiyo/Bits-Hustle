"""Focused ambassador API contract tests."""

import json
import os
from datetime import datetime, timedelta

import pytest

from app.factory import create_app
from app.extensions import db


@pytest.fixture
def app(monkeypatch):
    os.environ["FLASK_ENV"] = "testing"
    import app.factory as factory
    monkeypatch.setattr(factory, "_ensure_roles", lambda _app: None)
    app = create_app()
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def _seed_role(name: str, display_name: str):
    from app.models import RoleType

    role = RoleType.query.filter_by(name=name).first()
    if not role:
        role = RoleType(name=name, display_name=display_name)
        db.session.add(role)
        db.session.flush()
    return role


def _seed_ambassador():
    from app.models import User, Hub, Ambassador, Wallet, PlatformType, Campaign, TaskTypeType, Task, TaskStatusType
    from app.utils.auth import hash_password

    super_admin_role = _seed_role("SUPER_ADMIN", "Super Admin")
    ambassador_role = _seed_role("AMBASSADOR", "Ambassador")
    manager = User(
        email="manager@test.com",
        password=hash_password("secret"),
        name="Manager",
        role_id=super_admin_role.id,
        is_user_active=True,
    )
    db.session.add(manager)
    db.session.flush()

    hub = Hub(
        name="Central Hub",
        location="Nairobi",
        manager_id=manager.id,
    )
    db.session.add(hub)
    db.session.flush()

    ambassador_user = User(
        email="ambassador@test.com",
        password=hash_password("secret"),
        name="Ambassador One",
        role_id=ambassador_role.id,
        is_user_active=True,
    )
    db.session.add(ambassador_user)
    db.session.flush()

    ambassador = Ambassador(
        user_id=ambassador_user.id,
        hub_id=hub.id,
        referral_code="B2H-TEST123",
        tier="JUNIOR",
        status="ACTIVE",
    )
    db.session.add(ambassador)
    db.session.flush()

    wallet = Wallet(
        ambassador_id=ambassador.id,
        current_balance=1250.0,
        pending_earnings=250.0,
        total_earned=1500.0,
        total_withdrawn=0.0,
    )
    db.session.add(wallet)

    platform = PlatformType(
        name="tutorconnect",
        display_name="Bits TutorConnect",
        referral_url_template="https://example.com/?ref={referral_code}",
    )
    db.session.add(platform)
    db.session.flush()

    campaign = Campaign(
        name="Campus Growth",
        description="Test campaign",
        platform_id=platform.id,
        created_by_id=manager.id,
        start_date=datetime.utcnow() - timedelta(days=1),
        end_date=datetime.utcnow() + timedelta(days=30),
        budget=10000.0,
        is_active=True,
    )
    db.session.add(campaign)
    db.session.flush()

    task_type = TaskTypeType(
        name="OUTREACH",
        display_name="Outreach",
    )
    db.session.add(task_type)
    db.session.flush()

    submitted_status = TaskStatusType(
        name="SUBMITTED",
        display_name="Submitted",
    )
    db.session.add(submitted_status)
    db.session.flush()

    task = Task(
        campaign_id=campaign.id,
        type_id=task_type.id,
        description="Test task",
        reward=100.0,
        deadline=datetime.utcnow() + timedelta(days=7),
        platform_id=platform.id,
    )
    db.session.add(task)
    db.session.commit()

    return {
        "email": ambassador_user.email,
        "ambassador_id": ambassador.id,
        "wallet_id": wallet.id,
        "user_id": ambassador_user.id,
        "task_id": task.id,
    }


def _login(client, email, password):
    response = client.post(
        "/api/auth/login",
        data=json.dumps({"email": email, "password": password}),
        content_type="application/json",
    )
    assert response.status_code == 200
    body = response.get_json()
    return {"Authorization": f"Bearer {body['data']['token']}"}


def test_ambassador_profile_route_resolves_to_authenticated_profile(client, app):
    with app.app_context():
        seed = _seed_ambassador()

    headers = _login(client, seed["email"], "secret")
    wrong_ambassador_id = "00000000-0000-0000-0000-000000000999"

    response = client.get(f"/api/ambassadors/{wrong_ambassador_id}", headers=headers)
    assert response.status_code == 200

    body = response.get_json()
    assert body["success"] is True
    data = body["data"]
    assert data["id"] == seed["ambassador_id"]
    assert data["user_id"] == seed["user_id"]
    assert data["referral_code"] == "B2H-TEST123"


def test_ambassador_wallet_route_resolves_to_authenticated_wallet(client, app):
    with app.app_context():
        seed = _seed_ambassador()

    headers = _login(client, seed["email"], "secret")
    wrong_ambassador_id = "00000000-0000-0000-0000-000000000998"

    response = client.get(f"/api/ambassadors/{wrong_ambassador_id}/wallet", headers=headers)
    assert response.status_code == 200

    body = response.get_json()
    assert body["success"] is True
    data = body["data"]
    assert data["id"] == seed["wallet_id"]
    assert data["ambassador_id"] == seed["ambassador_id"]
    assert data["current_balance"] == 1250.0


def test_auth_me_includes_ambassador_profile_and_id(client, app):
    with app.app_context():
        seed = _seed_ambassador()

    headers = _login(client, seed["email"], "secret")
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200

    body = response.get_json()
    assert body["success"] is True
    data = body["data"]
    assert data["ambassador_id"] == seed["ambassador_id"]
    assert data["ambassador_profile"]["id"] == seed["ambassador_id"]


def test_task_submissions_list_uses_authenticated_ambassador_profile(client, app):
    with app.app_context():
        seed = _seed_ambassador()

    headers = _login(client, seed["email"], "secret")

    submit_response = client.post(
        "/api/task-submissions",
        data=json.dumps({"taskId": seed["task_id"], "proofUrl": "https://example.com/proof.png"}),
        content_type="application/json",
        headers=headers,
    )
    assert submit_response.status_code == 201

    submit_body = submit_response.get_json()
    assert submit_body["success"] is True
    assert submit_body["message"] == "created"
    assert submit_body["data"]["task_id"] == seed["task_id"]
    assert submit_body["data"]["ambassador_id"] == seed["ambassador_id"]
    assert submit_body["data"]["proof_url"] == "https://example.com/proof.png"
    assert submit_body["data"]["id"]

    list_response = client.get("/api/task-submissions", headers=headers)
    assert list_response.status_code == 200

    body = list_response.get_json()
    assert body["success"] is True
    items = body["data"]["items"]
    assert len(items) == 1
    assert items[0]["ambassador_id"] == seed["ambassador_id"]
    assert items[0]["task_id"] == seed["task_id"]
