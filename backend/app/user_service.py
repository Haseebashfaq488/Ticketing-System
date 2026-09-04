"""User and Role Management service.

Implements strict single role-resolution architecture:
- `users` table: stores elevated staff roles only ('admin' and 'agent').
- No active staff record in `users`: strictly resolves as 'CUSTOMER'.
- Single consistent DB values: 'agent' (mapped to SUPPORT_AGENT) and 'admin' (mapped to ADMIN).
- Ticket and conversation histories are preserved during demotions and deletions.
"""
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.supabase_client import get_admin_client
from app.auth import UserRole


def list_all_users() -> List[Dict[str, Any]]:
    """Aggregate and deduplicate all users across users, customers, and auth tables."""
    sb = get_admin_client()
    users_by_email: Dict[str, Dict[str, Any]] = {}

    # 1. Staff users from `users` table
    try:
        users_res = sb.table("users").select("id, email, full_name, role, created_at").execute()
        for r in (users_res.data or []):
            email = (r.get("email") or "").strip().lower()
            if not email:
                continue
            db_role = (r.get("role") or "").strip().lower()
            mapped_role = UserRole.ADMIN.value if db_role == "admin" else UserRole.SUPPORT_AGENT.value
            users_by_email[email] = {
                "id": str(r.get("id")),
                "email": email,
                "full_name": r.get("full_name") or ("Admin" if db_role == "admin" else "Agent"),
                "role": mapped_role,
                "is_staff": True,
                "created_at": r.get("created_at"),
            }
    except Exception as e:
        print(f"[UserService] Error loading users: {e}")

    # 2. Customers from `customers` table
    try:
        cust_res = sb.table("customers").select("id, name, email, plan, account_status, created_at").execute()
        for c in (cust_res.data or []):
            email = (c.get("email") or "").strip().lower()
            if not email:
                continue
            if email not in users_by_email:
                users_by_email[email] = {
                    "id": str(c.get("id")),
                    "customer_id": c.get("id"),
                    "email": email,
                    "full_name": c.get("name") or email.split("@")[0].capitalize(),
                    "role": UserRole.CUSTOMER.value,
                    "is_staff": False,
                    "plan": c.get("plan") or "free",
                    "created_at": c.get("created_at"),
                }
            else:
                # Attach customer metadata to existing staff entry
                users_by_email[email]["customer_id"] = c.get("id")
                if not users_by_email[email].get("full_name") and c.get("name"):
                    users_by_email[email]["full_name"] = c.get("name")
    except Exception as e:
        print(f"[UserService] Error loading customers: {e}")

    # 3. Supabase Auth users
    try:
        auth_users = sb.auth.admin.list_users() or []
        for u in auth_users:
            email = (getattr(u, "email", None) or "").strip().lower()
            if not email:
                continue
            if email not in users_by_email:
                meta = getattr(u, "user_metadata", {}) or {}
                name = meta.get("full_name") or meta.get("name") or email.split("@")[0].capitalize()
                users_by_email[email] = {
                    "id": str(getattr(u, "id", "")),
                    "auth_id": str(getattr(u, "id", "")),
                    "email": email,
                    "full_name": name,
                    "role": UserRole.CUSTOMER.value,
                    "is_staff": False,
                    "created_at": str(getattr(u, "created_at", "")),
                }
            else:
                users_by_email[email]["auth_id"] = str(getattr(u, "id", ""))
    except Exception as e:
        print(f"[UserService] Error loading auth users: {e}")

    # Sort: ADMIN first, then SUPPORT_AGENT, then CUSTOMER, then by email
    role_order = {UserRole.ADMIN.value: 1, UserRole.SUPPORT_AGENT.value: 2, UserRole.CUSTOMER.value: 3}
    user_list = list(users_by_email.values())
    user_list.sort(key=lambda x: (role_order.get(x["role"], 99), x["email"]))
    return user_list


def update_user_role(target_email: str, new_role: str, current_admin_email: str) -> Dict[str, Any]:
    """Promote or demote user with backend safety guardrails."""
    clean_target = (target_email or "").strip().lower()
    clean_admin = (current_admin_email or "").strip().lower()

    if not clean_target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target email is required.")

    valid_roles = (UserRole.CUSTOMER.value, UserRole.SUPPORT_AGENT.value, UserRole.ADMIN.value)
    if new_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{new_role}'. Allowed: {', '.join(valid_roles)}",
        )

    # 1. Self-role change protection
    if clean_target == clean_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Users cannot change their own role. Administrators cannot modify their own access.",
        )

    sb = get_admin_client()

    # Check existing staff record in `users`
    user_res = sb.table("users").select("*").ilike("email", clean_target).execute()
    is_staff = bool(user_res.data and len(user_res.data) > 0)
    current_db_role = (user_res.data[0].get("role") or "").strip().lower() if is_staff else None

    # 2. Last admin demotion protection
    if current_db_role == "admin" and new_role != UserRole.ADMIN.value:
        admin_count_res = sb.table("users").select("id").eq("role", "admin").execute()
        active_admins = admin_count_res.data or []
        if len(active_admins) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last remaining administrator. At least one admin must exist.",
            )

    # 3. Apply state transition based on single role-resolution architecture
    if new_role == UserRole.CUSTOMER.value:
        # Demote to CUSTOMER -> remove staff record from `users`
        # Tickets remain intact; `assigned_to` automatically resets to NULL (ON DELETE SET NULL)
        if is_staff:
            sb.table("users").delete().ilike("email", clean_target).execute()

        # Ensure a customer profile row exists in `customers`
        cust_check = sb.table("customers").select("id").ilike("email", clean_target).execute()
        if not cust_check.data:
            sb.table("customers").insert({
                "name": clean_target.split("@")[0].capitalize(),
                "email": clean_target,
            }).execute()

        return {
            "email": clean_target,
            "role": UserRole.CUSTOMER.value,
            "action": "demoted_to_customer",
            "message": f"Successfully demoted {clean_target} to Customer.",
        }

    elif new_role == UserRole.SUPPORT_AGENT.value:
        # Promote/set to SUPPORT_AGENT -> DB role is 'agent'
        if is_staff:
            sb.table("users").update({"role": "agent"}).ilike("email", clean_target).execute()
        else:
            # Look up name from customer profile if available
            cust = sb.table("customers").select("name").ilike("email", clean_target).execute()
            name = cust.data[0].get("name") if (cust.data and cust.data[0].get("name")) else clean_target.split("@")[0].capitalize()
            sb.table("users").insert({
                "email": clean_target,
                "full_name": name,
                "role": "agent",
            }).execute()

        return {
            "email": clean_target,
            "role": UserRole.SUPPORT_AGENT.value,
            "action": "updated_to_agent",
            "message": f"Successfully updated {clean_target} to Support Agent.",
        }

    elif new_role == UserRole.ADMIN.value:
        # Promote to ADMIN -> DB role is 'admin'
        if is_staff:
            sb.table("users").update({"role": "admin"}).ilike("email", clean_target).execute()
        else:
            cust = sb.table("customers").select("name").ilike("email", clean_target).execute()
            name = cust.data[0].get("name") if (cust.data and cust.data[0].get("name")) else clean_target.split("@")[0].capitalize()
            sb.table("users").insert({
                "email": clean_target,
                "full_name": name,
                "role": "admin",
            }).execute()

        return {
            "email": clean_target,
            "role": UserRole.ADMIN.value,
            "action": "promoted_to_admin",
            "message": f"Successfully promoted {clean_target} to Administrator.",
        }

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported role transition.")


def delete_user_account(target_email: str, current_admin_email: str) -> Dict[str, Any]:
    """Delete a user account with backend safety guardrails and ticket preservation."""
    clean_target = (target_email or "").strip().lower()
    clean_admin = (current_admin_email or "").strip().lower()

    if not clean_target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target email is required.")

    # 1. Self-deletion protection
    if clean_target == clean_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete their own account.",
        )

    sb = get_admin_client()

    # 2. Last admin protection
    user_res = sb.table("users").select("id, role").ilike("email", clean_target).execute()
    if user_res.data and (user_res.data[0].get("role") or "").strip().lower() == "admin":
        admin_count_res = sb.table("users").select("id").eq("role", "admin").execute()
        active_admins = admin_count_res.data or []
        if len(active_admins) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last remaining administrator. At least one admin must exist.",
            )

    # 3. Safely delete records while preserving tickets
    # Tickets referencing users.id will have `assigned_to` set to NULL
    sb.table("users").delete().ilike("email", clean_target).execute()

    # Tickets referencing customers.id will have `customer_id` set to NULL
    sb.table("customers").delete().ilike("email", clean_target).execute()

    # Supabase Auth user deletion (if present)
    try:
        auth_users = sb.auth.admin.list_users() or []
        for u in auth_users:
            if getattr(u, "email", "").strip().lower() == clean_target:
                sb.auth.admin.delete_user(u.id)
                break
    except Exception as e:
        print(f"[UserService] Warning during auth.admin.delete_user: {e}")

    return {
        "deleted": True,
        "email": clean_target,
        "message": f"User {clean_target} has been successfully deleted.",
    }
