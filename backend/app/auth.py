"""Role-Based Access Control (RBAC) and authentication module."""
from enum import Enum
from typing import Optional, List
import os
import jwt
from pydantic import BaseModel
from fastapi import Header, HTTPException, Depends, status

from app.supabase_client import get_admin_client


class UserRole(str, Enum):
    CUSTOMER = "CUSTOMER"
    SUPPORT_AGENT = "SUPPORT_AGENT"
    ADMIN = "ADMIN"


class CurrentUser(BaseModel):
    email: str
    role: UserRole
    user_id: Optional[str] = None
    customer_id: Optional[int] = None
    full_name: Optional[str] = None


def resolve_user_from_email(email: str) -> CurrentUser:
    """Resolve user role and metadata from email using Supabase."""
    clean_email = (email or "").strip().lower()
    if not clean_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Email is missing",
        )

    sb = get_admin_client()

    # 1. Check `users` table (agents and admins)
    try:
        user_res = sb.table("users").select("*").ilike("email", clean_email).execute()
        if user_res.data and len(user_res.data) > 0:
            user_row = user_res.data[0]
            db_role = (user_row.get("role") or "").strip().lower()
            if db_role == "admin":
                return CurrentUser(
                    email=clean_email,
                    role=UserRole.ADMIN,
                    user_id=str(user_row.get("id")),
                    full_name=user_row.get("full_name") or "Admin User",
                )
            elif db_role in ("agent", "support_agent"):
                return CurrentUser(
                    email=clean_email,
                    role=UserRole.SUPPORT_AGENT,
                    user_id=str(user_row.get("id")),
                    full_name=user_row.get("full_name") or "Support Agent",
                )
    except Exception as e:
        print(f"[RBAC] Error querying users table: {e}")

    # 2. Check `customers` table
    try:
        cust_res = sb.table("customers").select("*").ilike("email", clean_email).execute()
        if cust_res.data and len(cust_res.data) > 0:
            cust_row = cust_res.data[0]
            return CurrentUser(
                email=clean_email,
                role=UserRole.CUSTOMER,
                customer_id=cust_row.get("id"),
                full_name=cust_row.get("name") or clean_email.split("@")[0].capitalize(),
            )
        else:
            # Auto-create customer profile row so every customer has a customer_id
            name = clean_email.split("@")[0].capitalize()
            ins = sb.table("customers").insert({"name": name, "email": clean_email, "role": "customer"}).execute()
            cust_id = ins.data[0].get("id") if ins.data else None
            return CurrentUser(
                email=clean_email,
                role=UserRole.CUSTOMER,
                customer_id=cust_id,
                full_name=name,
            )
    except Exception as e:
        print(f"[RBAC] Error querying customers table: {e}")

    # Fallback to customer
    return CurrentUser(
        email=clean_email,
        role=UserRole.CUSTOMER,
        full_name=clean_email.split("@")[0].capitalize(),
    )


def is_dev_header_auth_allowed() -> bool:
    """Determine if X-User-Email header bypass is allowed (strictly for local development/test)."""
    env = os.getenv("ENVIRONMENT", "development").strip().lower()
    allow_dev_headers = os.getenv("ALLOW_DEV_HEADER_AUTH", "false").strip().lower() in ("true", "1", "yes")
    return env != "production" and allow_dev_headers


def extract_email_from_token(token: str) -> Optional[str]:
    """Cryptographically verify Supabase JWT token via Supabase Auth and retrieve authenticated email.
    
    Insecure unverified decode fallbacks have been completely removed.
    """
    if not token or not token.strip():
        return None
    try:
        sb = get_admin_client()
        user_resp = sb.auth.get_user(token.strip())
        if user_resp and user_resp.user and user_resp.user.email:
            return user_resp.user.email.strip().lower()
    except Exception as e:
        print(f"[AUTH] Cryptographic token verification failed: {e}")
    return None


def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
) -> CurrentUser:
    """FastAPI dependency to authenticate caller and return CurrentUser with role.

    Security Policy:
    1. Production: Requires a cryptographically verified Supabase JWT in `Authorization: Bearer <token>`.
       The `X-User-Email` header is strictly ignored/rejected.
    2. Local Dev / Testing: `X-User-Email` is ONLY permitted when ENVIRONMENT != 'production' and
       ALLOW_DEV_HEADER_AUTH='true' is explicitly configured.
    """
    email = None

    # 1. Bearer Token Authentication (Cryptographically verified via Supabase Auth)
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        email = extract_email_from_token(token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid, expired, or untrusted authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # 2. Development / Test Bypass (Strictly gated behind dev flag)
    elif is_dev_header_auth_allowed() and x_user_email and x_user_email.strip():
        email = x_user_email.strip().lower()

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in or provide a valid authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return resolve_user_from_email(email)


def get_optional_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
) -> Optional[CurrentUser]:
    """Optional authentication dependency for endpoints that allow guest access."""
    try:
        return get_current_user(authorization, x_user_email)
    except HTTPException:
        return None


def require_role(allowed_roles: List[UserRole]):
    """FastAPI dependency factory to enforce specific roles."""
    def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            role_names = [r.value for r in allowed_roles]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Action requires one of {role_names} roles. Current role: {current_user.role.value}",
            )
        return current_user

    return role_checker


def verify_ticket_access(ticket_id: int, current_user: CurrentUser) -> dict:
    """Verify that current_user has permission to access or manage the ticket.

    Returns the ticket dictionary if permitted, otherwise raises 403 or 404.
    """
    sb = get_admin_client()
    try:
        res = sb.table("support_tickets").select("*, customers(*)").eq("id", ticket_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket #{ticket_id} not found.")
        ticket = res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # ADMIN and SUPPORT_AGENT have global ticket access
    if current_user.role in (UserRole.ADMIN, UserRole.SUPPORT_AGENT):
        return ticket

    # CUSTOMER can only access their own tickets
    ticket_cust_id = ticket.get("customer_id")
    customer_info = ticket.get("customers") or {}
    ticket_email = customer_info.get("email")

    is_owner = False
    if current_user.customer_id and ticket_cust_id == current_user.customer_id:
        is_owner = True
    elif ticket_email and ticket_email.strip().lower() == current_user.email.strip().lower():
        is_owner = True

    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: You can only view and manage your own tickets.",
        )

    return ticket
