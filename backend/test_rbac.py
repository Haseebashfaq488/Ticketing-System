"""Automated unit and integration test suite for Role-Based Access Control (RBAC).

Tests:
1. CUSTOMER:
   - Can only view their own tickets
   - Cannot view other customers' tickets (403)
   - Cannot delete tickets (403)
   - Cannot approve or reject responses (403)
2. SUPPORT_AGENT:
   - Can view all tickets
   - Can approve and reject responses
   - CANNOT delete tickets (403)
3. ADMIN:
   - Can view all tickets
   - Can approve and reject responses
   - Can delete tickets (only ADMIN is authorized)
4. Unauthenticated:
   - Restricted endpoints return 401 Unauthorized
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from app.auth import UserRole

client = TestClient(app)

CUSTOMER_EMAIL = "smoke.test@novaware.dev"
OTHER_CUSTOMER_EMAIL = "aamir.jailbreak@gmail.com"
AGENT_EMAIL = "agent@novaware.com"
ADMIN_EMAIL = "admin@novaware.com"

@pytest.fixture(autouse=True)
def setup_test_auth_env(monkeypatch):
    """Enable dev header auth for local unit tests while testing production isolation separately."""
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("ALLOW_DEV_HEADER_AUTH", "true")


def test_unauthenticated_requests():
    """Unauthenticated access to protected endpoints returns 401."""
    res = client.get("/api/tickets")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"

    res = client.get("/api/auth/me")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"

    res = client.delete("/api/tickets/999999")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"


def test_auth_me_roles():
    """Verify role resolution for Customer, Support Agent, and Admin."""
    # Customer
    res = client.get("/api/auth/me", headers={"X-User-Email": CUSTOMER_EMAIL})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == UserRole.CUSTOMER.value
    assert data["email"] == CUSTOMER_EMAIL

    # Support Agent
    res = client.get("/api/auth/me", headers={"X-User-Email": AGENT_EMAIL})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == UserRole.SUPPORT_AGENT.value

    # Admin
    res = client.get("/api/auth/me", headers={"X-User-Email": ADMIN_EMAIL})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == UserRole.ADMIN.value


def test_customer_cannot_delete_tickets():
    """Customers must receive 403 Forbidden when attempting to delete a ticket."""
    res = client.delete("/api/tickets/27", headers={"X-User-Email": CUSTOMER_EMAIL})
    assert res.status_code == 403
    assert "Permission denied" in res.json().get("detail", "")


def test_agent_cannot_delete_tickets():
    """Support agents must receive 403 Forbidden when attempting to delete a ticket."""
    res = client.delete("/api/tickets/27", headers={"X-User-Email": AGENT_EMAIL})
    assert res.status_code == 403
    assert "Permission denied" in res.json().get("detail", "")


def test_customer_cannot_approve_or_reject():
    """Customers must receive 403 Forbidden on triage actions."""
    res = client.post("/api/tickets/27/approve", headers={"X-User-Email": CUSTOMER_EMAIL})
    assert res.status_code == 403
    assert "Permission denied" in res.json().get("detail", "")

    res = client.post("/api/tickets/27/reject", headers={"X-User-Email": CUSTOMER_EMAIL})
    assert res.status_code == 403
    assert "Permission denied" in res.json().get("detail", "")


def test_customer_ticket_scoping():
    """Customer listing only returns their own tickets."""
    res = client.get("/api/tickets", headers={"X-User-Email": OTHER_CUSTOMER_EMAIL})
    assert res.status_code == 200
    tickets = res.json()
    assert isinstance(tickets, list)
    # Every returned ticket must belong to this customer
    for t in tickets:
        if t.get("customer_email"):
            assert t["customer_email"].lower() == OTHER_CUSTOMER_EMAIL.lower()


def test_customer_access_other_ticket_forbidden():
    """Customer attempting to view another customer's ticket gets 403."""
    # Ticket 27 belongs to aamir.jailbreak@gmail.com (Customer ID 12)
    # smoke.test@novaware.dev should get 403 Forbidden
    res = client.get("/api/tickets/27", headers={"X-User-Email": CUSTOMER_EMAIL})
    assert res.status_code == 403
    assert "Permission denied" in res.json().get("detail", "")


def test_agent_and_admin_view_all_tickets():
    """Agents and Admins can view tickets across customers."""
    # Agent
    res = client.get("/api/tickets/27", headers={"X-User-Email": AGENT_EMAIL})
    assert res.status_code == 200
    assert res.json().get("ticket", {}).get("id") == 27

    # Admin
    res = client.get("/api/tickets/27", headers={"X-User-Email": ADMIN_EMAIL})
    assert res.status_code == 200
    assert res.json().get("ticket", {}).get("id") == 27


def test_admin_delete_permission_check():
    """Admin is authorized to invoke delete (fails with 404 for non-existent ticket, not 403)."""
    # 999999 does not exist, so if role check passes it will return 404 Not Found (or 200 if deleted)
    res = client.delete("/api/tickets/999999", headers={"X-User-Email": ADMIN_EMAIL})
    assert res.status_code in (200, 404), f"Admin should pass RBAC, got {res.status_code}: {res.text}"


def test_forged_jwt_token_rejected():
    """Forged or unverified JWT tokens must be rejected with 401 Unauthorized."""
    # Attempt with random garbage token
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_garbage_token"})
    assert res.status_code == 401
    assert "untrusted" in res.json().get("detail", "").lower() or "invalid" in res.json().get("detail", "").lower()

    # Attempt with self-signed/unsigned JWT claim
    import jwt
    fake_token = jwt.encode({"email": "admin@novaware.com", "role": "admin"}, "attacker-secret", algorithm="HS256")
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {fake_token}"})
    assert res.status_code == 401


def test_production_mode_blocks_header_spoofing(monkeypatch):
    """In production mode, X-User-Email header must be strictly ignored/blocked."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("ALLOW_DEV_HEADER_AUTH", "false")

    # Attacker tries to impersonate admin using X-User-Email in production
    res = client.get("/api/tickets", headers={"X-User-Email": ADMIN_EMAIL})
    assert res.status_code == 401, f"Production must reject header impersonation, got: {res.status_code}"

    res = client.delete("/api/tickets/27", headers={"X-User-Email": ADMIN_EMAIL})
    assert res.status_code == 401, f"Production must reject header impersonation on delete, got: {res.status_code}"


def test_dev_flag_false_blocks_header_spoofing(monkeypatch):
    """When ALLOW_DEV_HEADER_AUTH is false, header spoofing is blocked even in dev."""
    monkeypatch.setenv("ALLOW_DEV_HEADER_AUTH", "false")

    res = client.get("/api/auth/me", headers={"X-User-Email": CUSTOMER_EMAIL})
    assert res.status_code == 401, f"Expected 401 when dev header flag is false, got {res.status_code}"
