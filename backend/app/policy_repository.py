"""Policy repository — DB-backed company knowledge base with local fallback.

This is the ONLY place that knows how to retrieve company policies:

1. Try Supabase (`company_policies` table, full-text search).
2. If the DB is unreachable/fails, fall back to the local defaults in
   `app/knowledge.py` so the AI never loses its source of truth.

Every result is tagged with a `source` field ("database" | "fallback")
so the agent trace shows exactly where the facts came from.
"""
import re

from . import knowledge

# Category → what the policy rules, used by the guardrail / routing.
POLICY_CATEGORIES = {
    "REFUND",
    "SECURITY",
    "BILLING",
    "ACCOUNT",
    "TECHNICAL",
    "FEATURE_REQUEST",
    "GENERAL",
    "OTHER",
}


def _sb():
    from app.supabase_client import get_admin_client

    return get_admin_client()


def _map_row(row: dict, source: str = "database") -> dict:
    return {
        "id": row.get("id"),
        "slug": row.get("slug"),
        "category": row.get("category") or "GENERAL",
        "title": row.get("title"),
        "content": row.get("content"),
        "tags": row.get("tags") or [],
        "is_active": row.get("is_active", True),
        "source": source,
    }


def _local_defaults() -> list:
    """Return the bundled knowledge.py policies as repository-shaped rows."""
    return [
        {
            "id": d["id"],
            "slug": d["id"],
            "category": _category_for_doc(d),
            "title": d["title"],
            "content": d["content"],
            "tags": d.get("tags", []),
            "is_active": True,
            "source": "fallback",
        }
        for d in knowledge.KNOWLEDGE_BASE
    ]


def _category_for_doc(doc: dict) -> str:
    """Best-effort category guess from tags (used only for the local fallback)."""
    tag_text = " ".join(doc.get("tags", [])).lower()
    for cat, words in (
        ("SECURITY", ("hack", "security", "breach")),
        ("REFUND", ("refund", "money back", "cancel")),
        ("BILLING", ("price", "billing", "payment", "subscription")),
        ("ACCOUNT", ("password", "account", "login", "access")),
        ("FEATURE_REQUEST", ("feature", "roadmap")),
    ):
        if any(w in tag_text for w in words):
            return cat
    return "GENERAL"


# ---------------------------------------------------------------- reads --

def list_policies(active_only: bool = True, category: str = None) -> list:
    """List policies. Falls back to the local defaults if the DB is offline."""
    try:
        query = _sb().table("company_policies").select("*")
        if active_only is not None:
            if active_only:
                query = query.eq("is_active", True)
            else:
                query = query.neq("is_active", True)
        if category:
            query = query.eq("category", category.upper())
        res = query.order("title").execute()
        if res.data:
            return [_map_row(r) for r in res.data]
    except Exception:
        pass

    defaults = _local_defaults()
    if active_only:
        defaults = [d for d in defaults if d.get("is_active")]
    if category:
        defaults = [d for d in defaults if d.get("category") == category.upper()]
    return defaults


def get_policy(policy_id) -> dict:
    """Fetch a single policy by id (or slug). Falls back to local defaults."""
    is_numeric = str(policy_id).isdigit()
    try:
        if is_numeric:
            res = _sb().table("company_policies").select("*").eq("id", int(policy_id)).execute()
        else:
            res = _sb().table("company_policies").select("*").eq("slug", str(policy_id)).execute()
        if res.data:
            return _map_row(res.data[0])
    except Exception:
        pass

    for d in _local_defaults():
        if (is_numeric and str(d["id"]) == str(policy_id)) or d["slug"] == str(policy_id):
            return d
    return {}


def search_policies(query: str, top_k: int = 3) -> list:
    """Search active policies using Postgres full-text search.

    Falls back to the naive keyword matcher in knowledge.py when the
    database is unreachable. Every row carries a `source` tag.
    """
    query = (query or "").strip()
    if not query:
        return []

    try:
        res = _sb().rpc("search_policies", {"p_query": query, "p_limit": top_k}).execute()
        if res.data:
            return [_map_row(r) for r in res.data]
    except Exception:
        pass

    return [
        {
            "id": d["id"],
            "slug": d["id"],
            "category": _category_for_doc(d),
            "title": d["title"],
            "content": d["content"],
            "tags": d.get("tags", []),
            "is_active": True,
            "source": "fallback",
        }
        for d in knowledge.search_knowledge(query, top_k=top_k)
    ]


# --------------------------------------------------------------- writes --

def create_policy(data: dict) -> dict:
    """Insert a new policy. Returns the created row or an error dict."""
    row = {
        "slug": (data.get("slug") or "").strip(),
        "category": (data.get("category") or "GENERAL").strip().upper() or "GENERAL",
        "title": (data.get("title") or "").strip(),
        "content": (data.get("content") or "").strip(),
        "tags": data.get("tags") or [],
        "is_active": bool(data.get("is_active", True)),
    }
    if not row["slug"]:
        row["slug"] = re.sub(r"[^a-z0-9]+", "_", row["title"].lower()).strip("_")
    if not row["title"] or not row["content"]:
        return {"error": "title and content are required"}

    try:
        res = _sb().table("company_policies").insert(row).execute()
        if res.data:
            return _map_row(res.data[0])
        return {"error": "insert returned no row"}
    except Exception as e:
        return {"error": str(e)}


def update_policy(policy_id, data: dict) -> dict:
    """Update selectable fields on a policy. Returns updated row or error."""
    allowed = {"slug", "category", "title", "content", "tags", "is_active"}
    payload = {}
    for key in allowed:
        if key in data and data[key] is not None:
            value = data[key]
            if key == "category":
                value = str(value).strip().upper()
            payload[key] = value
    if not payload:
        return {"error": "no valid fields to update"}

    is_numeric = str(policy_id).isdigit()
    try:
        if is_numeric:
            res = _sb().table("company_policies").update(payload).eq("id", int(policy_id)).execute()
        else:
            res = _sb().table("company_policies").update(payload).eq("slug", str(policy_id)).execute()
        if res.data:
            return _map_row(res.data[0])
        return {"error": "policy not found"}
    except Exception as e:
        return {"error": str(e)}


def set_policy_active(policy_id, is_active: bool) -> dict:
    """Archive (soft-delete) or restore a policy."""
    return update_policy(policy_id, {"is_active": bool(is_active)})


def seed_defaults() -> dict:
    """Upsert the bundled knowledge.py defaults into the DB (by slug).

    Idempotent: editing an existing slug afterwards is never overwritten.
    """
    seeded, existing_count, errors = 0, 0, []
    existing_slugs = set()
    try:
        res = _sb().table("company_policies").select("slug").execute()
        if res.data:
            existing_slugs = {r["slug"] for r in res.data if "slug" in r}
    except Exception as e:
        errors.append(f"Failed to fetch existing slugs: {e}")

    for d in _local_defaults():
        if d["slug"] in existing_slugs:
            existing_count += 1
            continue

        row = {
            "slug": d["slug"],
            "category": d["category"],
            "title": d["title"],
            "content": d["content"],
            "tags": d["tags"],
            "is_active": True,
        }
        try:
            _sb().table("company_policies").insert(row).execute()
            seeded += 1
        except Exception as e:
            errors.append(f"{d['slug']}: {e}")

    return {"seeded": seeded, "existing_count": existing_count, "errors": errors}