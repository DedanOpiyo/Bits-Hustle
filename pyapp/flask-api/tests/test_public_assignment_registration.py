"""Tests for public assignment client auto-registration and email notifications."""

import json
import os
from datetime import datetime, timedelta
from unittest.mock import patch

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


def _seed_roles():
    from app.models import RoleType

    for name, display in [("CLIENT", "Client"), ("ADMIN", "Administrator"), ("SUPER_ADMIN", "Super Admin")]:
        if not RoleType.query.filter_by(name=name).first():
            db.session.add(RoleType(name=name, display_name=display))
    db.session.commit()


def _public_assignment_payload(**overrides):
    payload = {
        "title": "Landing Page Design",
        "category": "Design",
        "description": "Need a landing page",
        "budget": 5000,
        "deadline": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "client_name": "Jane Doe",
        "client_email": "jane.doe@example.com",
    }
    payload.update(overrides)
    return payload


def test_public_assignment_registers_new_client_and_sends_credentials(app, client):
    with app.app_context():
        _seed_roles()

    with patch("app.routes.assignments.EmailService.send_welcome_credentials") as mock_send:
        response = client.post(
            "/api/public/assignments",
            data=json.dumps(_public_assignment_payload(client_phone="0712345678")),
            content_type="application/json",
        )
        assert response.status_code == 201
        body = response.get_json()
        assert body["success"] is True
        assert body["data"]["client_email"] == "jane.doe@example.com"
        assert body["data"]["client_id"] is not None

        mock_send.assert_called_once()
        _, kwargs = mock_send.call_args
        assert kwargs["user_email"] == "jane.doe@example.com"
        assert kwargs["user_name"] == "Jane Doe"
        assert kwargs["temp_password"]
        assert kwargs["login_url"].endswith("/login")

    with app.app_context():
        from app.models import User

        user = User.query.filter_by(email="jane.doe@example.com").first()
        assert user is not None
        assert user.role.name == "CLIENT"
        assert user.is_user_active is True
        assert user.must_change_password is True
        assert user.phone_number == "0712345678"


def test_public_assignment_reuses_existing_client_without_new_credentials(app, client):
    with app.app_context():
        _seed_roles()

    with patch("app.routes.assignments.EmailService.send_welcome_credentials") as mock_send:
        first = client.post(
            "/api/public/assignments",
            data=json.dumps(_public_assignment_payload()),
            content_type="application/json",
        )
        assert first.status_code == 201
        mock_send.assert_called_once()

    with app.app_context():
        from app.models import User

        assert User.query.filter_by(email="jane.doe@example.com").count() == 1

    with patch("app.routes.assignments.EmailService.send_welcome_credentials") as mock_send_second:
        second = client.post(
            "/api/public/assignments",
            data=json.dumps(_public_assignment_payload(title="Another Gig")),
            content_type="application/json",
        )
        assert second.status_code == 201
        # No new credentials email for a returning client
        mock_send_second.assert_not_called()

    with app.app_context():
        from app.models import User, Assignment

        assert User.query.filter_by(email="jane.doe@example.com").count() == 1
        user = User.query.filter_by(email="jane.doe@example.com").first()
        assignments = Assignment.query.filter_by(client_email="jane.doe@example.com").all()
        assert len(assignments) == 2
        assert all(a.client_id == user.id for a in assignments)


def test_public_assignment_missing_role_returns_error(app, client):
    # No CLIENT role seeded
    response = client.post(
        "/api/public/assignments",
        data=json.dumps(_public_assignment_payload()),
        content_type="application/json",
    )
    assert response.status_code == 400
    body = response.get_json()
    assert body["success"] is False
    assert "CLIENT role" in body["message"]


def test_public_assignment_duplicate_phone_number_ignored(app, client):
    """If the phone number is already taken by another user, the new client account still gets created."""
    with app.app_context():
        _seed_roles()
        from app.models import User, RoleType
        from app.utils.auth import hash_password

        client_role = RoleType.query.filter_by(name="CLIENT").first()
        existing = User(
            email="other@example.com",
            password=hash_password("secret"),
            name="Other User",
            role_id=client_role.id,
            phone_number="0712345678",
            is_user_active=True,
        )
        db.session.add(existing)
        db.session.commit()

    with patch("app.routes.assignments.EmailService.send_welcome_credentials"):
        response = client.post(
            "/api/public/assignments",
            data=json.dumps(_public_assignment_payload(client_phone="0712345678")),
            content_type="application/json",
        )
        assert response.status_code == 201

    with app.app_context():
        from app.models import User

        new_user = User.query.filter_by(email="jane.doe@example.com").first()
        assert new_user is not None
        assert new_user.phone_number is None
