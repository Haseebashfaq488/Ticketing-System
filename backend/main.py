"""FastAPI entrypoint for the AI support demo."""
import threading

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import ChatRequest, TicketCreate, ConvertChatRequest
from app.support_agent import analyze_ticket, chat_reply
from app import tools
from app.email_service import send_ticket_confirmation, send_support_response

app = FastAPI(title="AI Support Demo", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    conversation_id = None
    if payload.conversation_id:
        conversation_id = payload.conversation_id

    history = [{"role": m.role, "content": m.content} for m in payload.messages]

    reply, steps = chat_reply(
        history,
        conversation_id=conversation_id,
        customer_email=payload.customer_email,
    )

    return {"reply": reply, "agent_trace": steps, "conversation_id": conversation_id}


@app.post("/api/chat/convert")
def convert_chat(conversation_id: int, customer_email: str, subject: str):
    ticket = tools.convert_chat_to_ticket(conversation_id, customer_email, subject)
    ticket_id = ticket.get("id")
    if not ticket_id:
        raise HTTPException(status_code=500, detail="Failed to create ticket from chat")

    # Run AI analysis on the converted ticket
    messages = tools.get_conversation_messages(conversation_id)
    message_text = "\n".join(f"[{m['sender_type']}]: {m['content']}" for m in messages)

    result = analyze_ticket(
        ticket_id=ticket_id,
        name=customer_email.split("@")[0],
        email=customer_email,
        subject=subject,
        message=message_text,
    )

    tools.log_activity(ticket_id, "system", "ticket_created_from_chat", {
        "conversation_id": conversation_id,
    })

    result["customer_email"] = customer_email
    result["subject"] = subject
    return result


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
