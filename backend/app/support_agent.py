"""SupportAgent - the orchestration layer around the LLM.

Responsibilities:
  1. Build context (via tools, never raw DB access)
  2. Retrieve relevant company knowledge
  3. Ask the LLM to reason over that context
  4. Validate the structured LLM output (retry once, else fail safe)
  5. Hand the recommendation to the backend policy engine

Every step is recorded as a trace entry so the UI can show exactly
what the agent did and why (AI transparency requirement).
"""
import json

from . import knowledge, policy, tools
from .llm import LLMError, llm_json, llm_text
from .models import validate_analysis
from .skill import CUSTOMER_SUPPORT_SKILL

CATEGORIES = "ACCOUNT, BILLING, TECHNICAL, REFUND, SECURITY, FEATURE_REQUEST, GENERAL, OTHER"


def _step(tool: str, input_data, output_summary) -> dict:
    return {
        "tool": tool,
        "input": input_data if isinstance(input_data, str) else json.dumps(input_data)[:200],
        "output": output_summary if isinstance(output_summary, str) else json.dumps(output_summary)[:300],
    }


def _knowledge_block(docs: list) -> str:
    if not docs:
        return "(no relevant company knowledge found - do NOT invent any)"
    return "\n\n".join(
        f"[{d['id']}] {d['title']}\n{d['content']}" for d in docs
    )


# ---------------------------------------------------------------- tickets --

def analyze_ticket(ticket_id: int, name: str, email: str, subject: str, message: str) -> dict:
    steps: list = []

    # 1) Context building via controlled tools
    customer = tools.get_customer(email)
    steps.append(_step("get_customer", {"customer_email": email}, customer))

    history = tools.get_customer_history(email)
    steps.append(_step("get_customer_history", {"customer_email": email},
                       f"{len(history)} previous ticket(s)"))

    # 2) Knowledge retrieval
    query = f"{subject} {message}"
    docs = tools.search_knowledge(query)
    doc_ids = [d["id"] for d in docs]
    steps.append(_step("search_knowledge", {"query": query}, {"found": doc_ids}))

    # 3) LLM reasoning with validation + one retry
    system_prompt = (
        f"{CUSTOMER_SUPPORT_SKILL}\n\n"
        "You analyze support tickets. Respond ONLY with a valid JSON object:\n"
        "{\n"
        '  "intent": "<short phrase describing what the customer wants>",\n'
        f'  "category": "<one of {CATEGORIES}>",\n'
        '  "priority": "<LOW | MEDIUM | HIGH | CRITICAL>",\n'
        '  "confidence": <float between 0 and 1>,\n'
        '  "reasoning_summary": "<2-3 sentences explaining your classification '
        'and priority decision>",\n'
        '  "recommended_action": "<AUTOMATIC_RESPONSE | HUMAN_REVIEW | ESCALATE>",\n'
        '  "suggested_response": "<professional customer-facing reply based ONLY '
        'on the provided knowledge>",\n'
        '  "knowledge_used": ["<ids of knowledge documents you relied on>"]\n'
        "}\n"
        "If the issue involves refunds or security, recommend HUMAN_REVIEW."
    )
    user_prompt = (
        f"COMPANY KNOWLEDGE (your only source of company facts):\n"
        f"{_knowledge_block(docs)}\n\n"
        f"CUSTOMER CONTEXT: {json.dumps(customer)}\n"
        f"PREVIOUS TICKETS: {json.dumps(history)}\n\n"
        f"TICKET #{ticket_id}\n"
        f"From: {name} <{email}>\n"
        f"Subject: {subject}\n"
        f"Message: {message}\n\n"
        "Analyze this ticket now and return the JSON object."
    )

    analysis = None
    ai_failed = False
    for attempt in range(2):
        try:
            analysis = validate_analysis(llm_json(system_prompt, user_prompt))
            break
        except (LLMError, ValueError, KeyError, TypeError):
            if attempt == 1:
                ai_failed = True
                break
    if not hasattr(analysis, "model_dump"):
        ai_failed = True

    if ai_failed:
        # Fail-safe path: malformed/failed AI output never corrupts state.
        analysis = {
            "intent": "unknown",
            "category": "OTHER",
            "priority": "HIGH",
            "confidence": 0.0,
            "reasoning_summary": "AI processing failed or returned invalid "
                                 "output after retry. Routed to human review.",
            "recommended_action": "ESCALATE",
            "suggested_response": "",
            "knowledge_used": [],
        }
    else:
        analysis = analysis.model_dump()
    steps.append(_step("llm_analysis", {"model_attempts": 2 if ai_failed else attempt + 1},
                       {k: analysis[k] for k in ("category", "priority", "confidence")}))

    # 4) Backend policy enforcement (the real authority)
    verdict = policy.apply_policy(analysis)
    steps.append(_step("policy_engine", {"ai_recommendation": analysis["recommended_action"]},
                       verdict))

    return {
        "ticket_id": ticket_id,
        "analysis": analysis,
        "ai_recommendation": analysis["recommended_action"],
        **verdict,
        "agent_trace": steps,
        "ai_failed": ai_failed,
        "status": "PENDING_HUMAN_REVIEW" if verdict["decision"] == "HUMAN_REVIEW"
                  else "AUTO_RESPONDED",
    }


# ------------------------------------------------------------- live chat --

def chat_reply(history: list, customer_email: str = None) -> tuple[str, list]:
    """Live chat uses the SAME agent, just conversation-shaped context."""
    steps: list = []

    customer = {}
    if customer_email:
        customer = tools.get_customer(customer_email)
        steps.append(_step("get_customer", {"customer_email": customer_email}, customer))

    last_user_msg = next(
        (m["content"] for m in reversed(history) if m["role"] == "user"), ""
    )
    docs = tools.search_knowledge(last_user_msg)
    doc_ids = [d["id"] for d in docs]
    steps.append(_step("search_knowledge", {"query": last_user_msg[:150]}, {"found": doc_ids}))

    system_prompt = (
        f"{CUSTOMER_SUPPORT_SKILL}\n\n"
        f"COMPANY KNOWLEDGE relevant to the latest message:\n{_knowledge_block(docs)}\n\n"
        f"CUSTOMER CONTEXT: {json.dumps(customer) if customer else '(guest - not signed in)'}\n\n"
        "Reply to the customer in plain text (no JSON, no markdown headers). "
        "Be concise. If the matter is refund/security related or you are unsure, "
        "explain that it needs human review and suggest creating a support ticket."
    )

    contents = []
    for m in history[-12:]:
        role = "user" if m["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})

    try:
        reply = llm_text(system_prompt, contents)
    except LLMError as exc:
        reply = (
            "Sorry - I'm having technical trouble right now. Please try again, "
            "or create a support ticket so a human agent can help you."
        )
        steps.append(_step("llm_error", "live chat generation failed", str(exc)[:200]))

    return reply, steps
