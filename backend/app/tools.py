"""Agent tools - controlled, read-only information access.

The agent NEVER gets database credentials or raw query access.
It can only call these narrow functions, and each function returns
only the minimum fields needed for support. Passwords, tokens and
secrets are never returned by any tool here.
"""

from . import knowledge


# --- Mock customer database (Supabase would replace this in production) ---

CUSTOMERS = {
    "john@example.com": {
        "name": "John Doe",
        "email": "john@example.com",
        "plan": "premium",
        "account_status": "active",
        "payment_status": "completed",
        "subscription_status": "active_premium",
        "last_payment_date": "2026-08-20",
    },
    "sarah@example.com": {
        "name": "Sarah Smith",
        "email": "sarah@example.com",
        "plan": "free",
        "account_status": "active",
        "payment_status": "none",
        "subscription_status": "free_plan",
        "last_payment_date": None,
    },
    "alex@example.com": {
        "name": "Alex Kim",
        "email": "alex@example.com",
        "plan": "premium",
        "account_status": "restricted",
        "payment_status": "failed",
        "subscription_status": "inactive_payment_failed",
        "last_payment_date": "2026-07-15",
    },
}

CUSTOMER_HISTORY = {
    "john@example.com": [
        {"ticket": "#0991", "subject": "Invoice download broken", "resolved": True},
        {"ticket": "#0954", "subject": "How to invite teammates", "resolved": True},
    ],
    "sarah@example.com": [],
    "alex@example.com": [
        {"ticket": "#0988", "subject": "Card declined", "resolved": False},
    ],
}


def get_customer(email: str) -> dict:
    """Support-relevant customer fields ONLY (no secrets ever)."""
    return CUSTOMERS.get(
        email.lower(),
        {
            "name": None,
            "email": email.lower(),
            "plan": "free",
            "account_status": "unknown",
            "payment_status": "unknown",
            "subscription_status": "unknown",
            "last_payment_date": None,
        },
    )


def get_customer_history(email: str) -> list:
    return CUSTOMER_HISTORY.get(email.lower(), [])


def search_knowledge(query: str) -> list:
    """Thin tool wrapper around the knowledge base search."""
    docs = knowledge.search_knowledge(query)
    return [
        {"id": d["id"], "title": d["title"], "content": d["content"]} for d in docs
    ]
