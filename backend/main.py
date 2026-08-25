"""FastAPI entrypoint for the AI support demo."""
import threading

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import ChatRequest, TicketCreate
from app.support_agent import analyze_ticket, chat_reply

app = FastAPI(title="AI Support Demo", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for the demo (Supabase replaces this later)
_tickets: dict[int, dict] = {}
_ticket_lock = threading.Lock()
_next_id = 1001


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/tickets", status_code=201)
def create_ticket(payload: TicketCreate):
    global _next_id
    with _ticket_lock:
        ticket_id = _next_id
        _next_id += 1

    # The ticket is stored immediately - it exists even if AI processing fails
    result = analyze_ticket(
        ticket_id=ticket_id,
        name=payload.customer_name,
        email=payload.customer_email,
        subject=payload.subject,
        message=payload.message,
    )
    result["customer_name"] = payload.customer_name
    result["customer_email"] = payload.customer_email
    result["subject"] = payload.subject
    _tickets[ticket_id] = result
    return result


@app.get("/api/tickets")
def list_tickets():
    return sorted(_tickets.values(), key=lambda t: t["ticket_id"], reverse=True)


@app.get("/api/tickets/{ticket_id}")
def get_ticket(ticket_id: int):
    if ticket_id not in _tickets:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _tickets[ticket_id]


@app.post("/api/chat")
def chat(payload: ChatRequest):
    history = [{"role": m.role, "content": m.content} for m in payload.messages]
    reply, steps = chat_reply(history, payload.customer_email)
    return {"reply": reply, "agent_trace": steps}
