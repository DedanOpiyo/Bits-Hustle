"""Pytest tests for Flask MVC — confirms routes, auth, and model wiring."""

import pytest, json
from app.factory import create_app
from app.extensions import db
from app.utils.serializers import to_dict


@pytest.fixture
def app():
    import os
    os.environ["FLASK_ENV"] = "testing"
    app = create_app()
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(client, app):
    with app.app_context():
        from app.models import User, RoleType
        from app.utils.auth import hash_password

        def _get_or_create_role(name, display):
            r = RoleType.query.filter_by(name=name).first()
            if not r:
                r = RoleType(name=name, display_name=display)
                db.session.add(r); db.session.flush()
            return r

        sa_role = _get_or_create_role("SUPER_ADMIN", "Super Admin")
        db.session.add(
            User(email="admin@test.com", password=hash_password("secret"), name="Admin", role_id=sa_role.id, is_user_active=True)
        )
        db.session.commit()
    resp = client.post("/api/auth/login",
                       data=json.dumps({"email": "admin@test.com", "password": "secret"}),
                       content_type="application/json")
    token = resp.get_json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


# ── health ──────────────────────────────────────────────────────────────────
def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


# ── auth ────────────────────────────────────────────────────────────────────
def test_login_missing_password(client):
    r = client.post("/api/auth/login",
                    data=json.dumps({"email": "x@test.com"}),
                    content_type="application/json")
    assert r.status_code == 400
    assert "success" in r.get_json()


def test_login(client, app):
    with app.app_context():
        from app.models import User, RoleType
        from app.utils.auth import hash_password

        def _role(name):
            r = RoleType.query.filter_by(name=name).first()
            if not r:
                r = RoleType(name=name, display_name=name.title())
                db.session.add(r); db.session.flush()
            return r

        role = _role("ADMIN")
        db.session.add(User(email="login@test.com", password=hash_password("p"), name="Login", role_id=role.id, is_user_active=True))
        db.session.commit()
    r = client.post("/api/auth/login",
                    data=json.dumps({"email": "login@test.com", "password": "p"}),
                    content_type="application/json")
    assert r.status_code == 200
    body = r.get_json()
    assert body["success"] is True
    assert "token" in body["data"]


def test_login_form_urlencoded(client, app):
    with app.app_context():
        from app.models import User, RoleType
        from app.utils.auth import hash_password

        def _role(name):
            r = RoleType.query.filter_by(name=name).first()
            if not r:
                r = RoleType(name=name, display_name=name.title())
                db.session.add(r); db.session.flush()
            return r

        role = _role("ADMIN")
        db.session.add(User(email="formlogin@test.com", password=hash_password("p2"), name="FormLogin", role_id=role.id, is_user_active=True))
        db.session.commit()

    r = client.post("/api/auth/login",
                    data={"email": "formlogin@test.com", "password": "p2"},
                    content_type="application/x-www-form-urlencoded")
    assert r.status_code == 200
    body = r.get_json()
    assert body["success"] is True
    assert "token" in body["data"]


# ── users ───────────────────────────────────────────────────────────────────
def test_list_unauthorized(client):
    r = client.get("/api/users")
    assert r.status_code == 401


def test_list_forbidden_by_role(client, auth_headers):
    r = client.get("/api/users", headers=auth_headers)
    assert r.status_code == 200
    assert "items" in r.get_json()["data"]


def test_check_in_unauthenticated(client):
    r = client.post("/api/check-ins",
                    data=json.dumps({"hubId": "00000000-0000-0000-0000-000000000000"}),
                    content_type="application/json")
    assert r.status_code == 401


def test_check_in_creates_record(client, auth_headers, app):
    import uuid
    with app.app_context():
        from app.models import Hub, Ambassador, User, RoleType
        from app.utils.auth import hash_password

        def _hub():
            h = Hub(name="Test Hub", location="Campus")
            db.session.add(h)
            db.session.flush()
            return h

        def _role(name):
            r = RoleType.query.filter_by(name=name).first()
            if not r:
                r = RoleType(name=name, display_name=name.title())
                db.session.add(r)
                db.session.flush()
            return r

        hub = _hub()
        role = _role("AMBASSADOR")
        user = User(email="amb@test.com", password=hash_password("p"), name="Amb", role_id=role.id, is_user_active=True)
        db.session.add(user)
        db.session.flush()
        amb = Ambassador(user_id=user.id, hub_id=hub.id, referral_code="AMB-TEST")
        db.session.add(amb)
        db.session.commit()
        amb_id = amb.id
        hub_id = str(hub.id)

    r = client.post("/api/check-ins",
                    data=json.dumps({"hubId": hub_id}),
                    content_type="application/json",
                    headers=auth_headers)
    assert r.status_code == 201
    body = r.get_json()
    assert body["success"] is True
    assert "id" in body["data"]


def test_check_in_duplicate_without_override_fails(client, auth_headers, app):
    import uuid
    with app.app_context():
        from app.models import Hub, Ambassador, User, RoleType
        from app.utils.auth import hash_password

        def _hub():
            h = Hub(name="Test Hub 2", location="Campus")
            db.session.add(h)
            db.session.flush()
            return h

        def _role(name):
            r = RoleType.query.filter_by(name=name).first()
            if not r:
                r = RoleType(name=name, display_name=name.title())
                db.session.add(r)
                db.session.flush()
            return r

        hub = _hub()
        role = _role("AMBASSADOR")
        user = User(email="amb2@test.com", password=hash_password("p"), name="Amb2", role_id=role.id, is_user_active=True)
        db.session.add(user)
        db.session.flush()
        amb = Ambassador(user_id=user.id, hub_id=hub.id, referral_code="AMB-TEST2")
        db.session.add(amb)
        db.session.commit()
        hub_id = str(hub.id)

    client.post("/api/check-ins",
                data=json.dumps({"hubId": hub_id}),
                content_type="application/json",
                headers=auth_headers)
    r = client.post("/api/check-ins",
                    data=json.dumps({"hubId": hub_id}),
                    content_type="application/json",
                    headers=auth_headers)
    assert r.status_code == 400


def test_check_in_duplicate_with_override_succeeds(client, auth_headers, app):
    with app.app_context():
        from app.models import Hub, Ambassador, User, RoleType
        from app.utils.auth import hash_password

        def _hub():
            h = Hub(name="Test Hub 3", location="Campus")
            db.session.add(h)
            db.session.flush()
            return h

        def _role(name):
            r = RoleType.query.filter_by(name=name).first()
            if not r:
                r = RoleType(name=name, display_name=name.title())
                db.session.add(r)
                db.session.flush()
            return r

        hub = _hub()
        role = _role("AMBASSADOR")
        user = User(email="amb3@test.com", password=hash_password("p"), name="Amb3", role_id=role.id, is_user_active=True)
        db.session.add(user)
        db.session.flush()
        amb = Ambassador(user_id=user.id, hub_id=hub.id, referral_code="AMB-TEST3")
        db.session.add(amb)
        db.session.commit()
        hub_id = str(hub.id)

    client.post("/api/check-ins",
                data=json.dumps({"hubId": hub_id}),
                content_type="application/json",
                headers=auth_headers)
    r = client.post("/api/check-ins",
                    data=json.dumps({"hubId": hub_id, "override": True}),
                    content_type="application/json",
                    headers=auth_headers)
    assert r.status_code == 201


# ── leaderboard ─────────────────────────────────────────────────────────────
def test_leaderboard(client, auth_headers):
    r = client.get("/api/leaderboard", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.get_json()["data"], list)
