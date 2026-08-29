"""FastAPI entrypoint for the AI support demo."""
import threading

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import ChatRequest, TicketCreate, ConvertChatRequest, ProfileUpdate, TicketStatusUpdate, PolicyCreate, PolicyUpdate
from app.support_agent import analyze_ticket, chat_reply
from app import tools, policy_repository
from app.email_service import send_ticket_confirmation, send_support_response

app = FastAPI(title="AI Support Demo", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # old web frontend
        "http://localhost:8081",   # Expo web dev server
        "http://127.0.0.1:8081",   # Expo web via 127.0.0.1
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}



# ------------------------- TICKETS -------------------------

@app.post("/api/tickets", status_code=201)
def create_ticket(payload: TicketCreate):
    # 1) Find or note customer
    customer = tools.get_customer(payload.customer_email)
    customer_id = customer.get("id")

    # 2) Create ticket in Supabase
    ticket = tools.create_ticket(
        customer_id=customer_id,
        subject=payload.subject,
        message=payload.message,
    )
    ticket_id = ticket.get("id")
    if not ticket_id:
        raise HTTPException(status_code=500, detail=f"Failed to create ticket: {ticket}")

    tools.log_activity(ticket_id, "system", "ticket_created", {
        "customer_email": payload.customer_email,
        "source": "form",
    })

    # 3) Run AI analysis pipeline
    result = analyze_ticket(
        ticket_id=ticket_id,
        name=payload.customer_name,
        email=payload.customer_email,
        subject=payload.subject,
        message=payload.message,
    )

    # 4) Send confirmation email
    email_result = send_ticket_confirmation(
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        ticket_id=ticket_id,
        subject=payload.subject,
    )
    tools.log_activity(ticket_id, "system", "email_sent", email_result)

    result["customer_name"] = payload.customer_name
    result["customer_email"] = payload.customer_email
    result["subject"] = payload.subject
    return result


@app.get("/api/tickets")
def list_tickets(status: str = None, priority: str = None, category: str = None):
    return tools.search_tickets(status=status, priority=priority, category=category)


@app.get("/api/tickets/{ticket_id}")
def get_ticket(ticket_id: int):
    result = tools.get_ticket(ticket_id)
    if not result or not result.get("ticket"):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return result


@app.post("/api/tickets/{ticket_id}/approve")
def approve_ticket(ticket_id: int):
    ticket = tools.get_ticket(ticket_id)
    if not ticket or not ticket.get("ticket"):
        raise HTTPException(status_code=404, detail="Ticket not found")

    analysis = ticket.get("analysis") or {}
    response_text = analysis.get("suggested_response", "")
    customer = ticket.get("customer") or {}

    tools.update_ticket(ticket_id, {"status": "RESOLVED"})
    tools.log_activity(ticket_id, "human", "response_approved", {"response_preview": response_text[:100]})

    email_result = send_support_response(
        customer_name=customer.get("name", "Customer"),
        customer_email=customer.get("email", ""),
        ticket_id=ticket_id,
        response_text=response_text,
    )
    tools.log_activity(ticket_id, "system", "email_sent", email_result)

    return {"status": "RESOLVED", "email": email_result}


@app.post("/api/tickets/{ticket_id}/reject")
def reject_ticket(ticket_id: int):
    tools.update_ticket(ticket_id, {"status": "ESCALATED"})
    tools.log_activity(ticket_id, "human", "response_rejected", {})
    return {"status": "ESCALATED"}


@app.post("/api/tickets/{ticket_id}/respond")
def custom_respond(ticket_id: int, response_text: str = ""):
    ticket = tools.get_ticket(ticket_id)
    if not ticket or not ticket.get("ticket"):
        raise HTTPException(status_code=404, detail="Ticket not found")
    customer = ticket.get("customer") or {}

    tools.update_ticket(ticket_id, {"status": "RESOLVED"})
    tools.log_activity(ticket_id, "human", "custom_response_sent", {"response_preview": response_text[:100]})

    email_result = send_support_response(
        customer_name=customer.get("name", "Customer"),
        customer_email=customer.get("email", ""),
        ticket_id=ticket_id,
        response_text=response_text,
    )
    tools.log_activity(ticket_id, "system", "email_sent", email_result)

    return {"status": "RESOLVED", "email": email_result}


VALID_TICKET_STATUSES = ("OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "ESCALATED", "RESOLVED", "CLOSED")


@app.put("/api/tickets/{ticket_id}/status")
def set_ticket_status(ticket_id: int, payload: TicketStatusUpdate):
    """Manually set the status of a ticket."""
    status = payload.status.strip().upper()
    if status not in VALID_TICKET_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {', '.join(VALID_TICKET_STATUSES)}")
    updated = tools.update_ticket(ticket_id, {"status": status})
    if updated.get("error"):
        raise HTTPException(status_code=500, detail=updated["error"])
    if not updated:
        raise HTTPException(status_code=404, detail="Ticket not found")
    tools.log_activity(ticket_id, "human", "status_changed", {"new_status": status})
    return {"status": status}


@app.delete("/api/tickets/{ticket_id}")
def delete_ticket(ticket_id: int):
    """Permanently delete a ticket and its related rows."""
    result = tools.delete_ticket(ticket_id)
    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])
    if not result.get("deleted"):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"deleted": True, "ticket_id": ticket_id}


# ------------------------- DASHBOARD -------------------------

@app.get("/api/dashboard")
def dashboard_stats():
    all_tickets = tools.search_tickets()
    open_count = len([t for t in all_tickets if t.get("status") == "OPEN"])
    review_count = len([t for t in all_tickets if t.get("status") == "PENDING_HUMAN_REVIEW" or t.get("status") == "HUMAN_REVIEW"])
    resolved_count = len([t for t in all_tickets if t.get("status") == "RESOLVED" or t.get("status") == "AUTO_RESPONDED"])
    escalated_count = len([t for t in all_tickets if t.get("status") == "ESCALATED"])
    return {
        "total": len(all_tickets),
        "open": open_count,
        "pending_review": review_count,
        "resolved": resolved_count,
        "escalated": escalated_count,
        "tickets": all_tickets,
    }


# ------------------------- LIVE CHAT -------------------------

@app.post("/api/chat/start")
def start_chat(customer_email: str = "guest"):
    conv = tools.create_conversation(customer_email)
    conv_id = conv.get("id")
    if not conv_id:
        raise HTTPException(status_code=500, detail="Failed to create conversation")
    tools.log_activity(None, "system", "chat_started", {"conversation_id": conv_id, "customer_email": customer_email})
    return {"conversation_id": conv_id, "customer_email": customer_email}


@app.post("/api/chat")
def chat(payload: ChatRequest):
    # Find or create conversation
    conversation_id = payload.conversation_id
    if not conversation_id:
        conv = tools.create_conversation(payload.customer_email or "guest")
        conversation_id = conv.get("id")

    history = [{"role": m.role, "content": m.content} for m in payload.messages]

    reply, steps = chat_reply(
        history,
        conversation_id=conversation_id,
        customer_email=payload.customer_email,
    )

    return {"reply": reply, "agent_trace": steps, "conversation_id": conversation_id}


@app.post("/api/chat/convert")
def convert_chat(payload: ConvertChatRequest):
    ticket = tools.convert_chat_to_ticket(
        payload.conversation_id, payload.customer_email, payload.subject
    )
    ticket_id = ticket.get("id")
    if not ticket_id:
        detail = ticket.get("error") or "Failed to create ticket from chat"
        raise HTTPException(status_code=500, detail=detail)

    # Run AI analysis on the converted ticket
    messages = tools.get_conversation_messages(payload.conversation_id)
    message_text = "\n".join(f"[{m['sender_type']}]: {m['content']}" for m in messages) if messages else payload.subject

    result = analyze_ticket(
        ticket_id=ticket_id,
        name=payload.customer_email.split("@")[0],
        email=payload.customer_email,
        subject=payload.subject,
        message=message_text,
    )

    tools.log_activity(ticket_id, "system", "ticket_created_from_chat", {
        "conversation_id": payload.conversation_id,
    })

    result["customer_email"] = payload.customer_email
    result["subject"] = payload.subject
    return result


# ------------------------- PROFILE -------------------------

@app.get("/api/profile")
def get_profile(email: str):
    """Return the full customers row for an email (auto-creates a default row)."""
    if not email or not email.strip():
        raise HTTPException(status_code=400, detail="email is required")
    profile = tools.get_or_create_customer_profile(email)
    if not profile or not profile.get("email"):
        raise HTTPException(status_code=500, detail="Failed to load profile")
    return profile


@app.put("/api/profile")
def update_profile(payload: ProfileUpdate):
    """Update the customers table with the profile page fields."""
    updated = tools.update_customer_profile(
        payload.email,
        {
            "name": payload.name,
            "plan": payload.plan,
            "account_status": payload.account_status,
            "payment_status": payload.payment_status,
            # Derived automatically from the plan so the customers table stays consistent.
            "subscription_status": "free_plan" if payload.plan == "free" else "active_premium",
        },
    )
    if updated.get("error"):
        raise HTTPException(status_code=500, detail=updated["error"])
    return updated


# ------------------------- COMPANY POLICIES -------------------------

@app.get("/api/policies")
def list_policies(active: bool = None, category: str = None):
    """List company policies. active/true filters archives; category filters."""
    return policy_repository.list_policies(active_only=active, category=category)


@app.get("/api/policies/search")
def search_policies_endpoint(q: str, top_k: int = 3):
    """Full-text search over active policies (agent-facing)."""
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="q is required")
    return policy_repository.search_policies(q, top_k=max(1, min(top_k, 10)))


@app.get("/api/policies/{policy_id}")
def get_policy(policy_id):
    """Get a single policy by numeric id or slug."""
    policy = policy_repository.get_policy(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@app.post("/api/policies", status_code=201)
def create_policy(payload: PolicyCreate):
    result = policy_repository.create_policy(payload.model_dump())
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.patch("/api/policies/{policy_id}")
def update_policy(policy_id, payload: PolicyUpdate):
    result = policy_repository.update_policy(policy_id, payload.model_dump(exclude_unset=True))
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.delete("/api/policies/{policy_id}")
def archive_policy(policy_id):
    """Archive (soft-delete) a policy so it stops being retrieved."""
    result = policy_repository.set_policy_active(policy_id, False)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return {"archived": True, "policy": result}


@app.post("/api/policies/seed")
def seed_policies():
    """Idempotently seed DB from the bundled local defaults."""
    return policy_repository.seed_defaults()


# ------------------------- ACTIVITY LOGS -------------------------

@app.get("/api/tickets/{ticket_id}/activity")
def get_activity(ticket_id: int):
    try:
        from app.supabase_client import get_admin_client
        sb = get_admin_client()
        res = (
            sb.table("activity_logs")
            .select("*")
            .eq("ticket_id", ticket_id)
            .order("created_at")
            .execute()
        )
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
