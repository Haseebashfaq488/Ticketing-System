"""SupportAgent - the orchestration layer around the LLM.

Responsibilities:
  1. Build context (via tools from Supabase)
  2. Retrieve relevant company knowledge
  3. Ask the LLM to reason over that context
  4. Validate the structured LLM output (retry once, else fail safe)
  5. Hand the recommendation to the backend policy engine
  6. Persist everything to Supabase for traceability
"""
import json

from . import knowledge, policy, tools
from .llm import LLMError, post_payload, llm_json, llm_text
from .models import validate_analysis
from .skill import CUSTOMER_SUPPORT_SKILL

CATEGORIES = "ACCOUNT, BILLING, TECHNICAL, REFUND, SECURITY, FEATURE_REQUEST, GENERAL, OTHER"

GEMINI_TOOLS = [
    {
        "functionDeclarations": [
            {
                "name": "get_customer",
                "description": "Retrieve customer details (plan, payment status, account status) by email.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "email": {"type": "STRING", "description": "Customer's email address"}
                    },
                    "required": ["email"],
                },
            },
            {
                "name": "get_customer_history",
                "description": "Retrieve previous support tickets and status history for a customer by email.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "email": {"type": "STRING", "description": "Customer's email address"}
                    },
                    "required": ["email"],
                },
            },
            {
                "name": "search_knowledge",
                "description": "Search company knowledge base for policy guidelines, pricing, plans, or FAQs.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "query": {"type": "STRING", "description": "Search query keywords"}
                    },
                    "required": ["query"],
                },
            },
        ]
    }
]


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


def _execute_tool(func_name: str, func_args: dict) -> tuple[dict, str]:
    if func_name == "get_customer":
        email = func_args.get("email", "")
        res = tools.get_customer(email)
        summary = f"Plan: {res.get('plan')}, payment: {res.get('payment_status')}"
        return res, summary
    elif func_name == "get_customer_history":
        email = func_args.get("email", "")
        res = tools.get_customer_history(email)
        summary = f"{len(res)} previous ticket(s)"
        return res, summary
    elif func_name == "search_knowledge":
        query = func_args.get("query", "")
        res = tools.search_knowledge(query)
        doc_ids = [d["id"] for d in res] if isinstance(res, list) else []
        summary = f"Found docs: {doc_ids}"
        return res, summary
    else:
        return {"error": f"Unknown tool: {func_name}"}, "Unknown tool"


def _run_agentic_loop(system_prompt: str, contents: list, max_iterations: int = 5, json_mode: bool = False) -> tuple[str, list]:
    steps = []
    current_contents = [dict(c) for c in contents]

    for iteration in range(max_iterations):
        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": current_contents,
            "tools": GEMINI_TOOLS,
            "generationConfig": {
                "temperature": 0.2 if json_mode else 0.4,
                "maxOutputTokens": 2048 if json_mode else 1024,
            },
        }
        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        raw_resp = post_payload(payload)
        candidate = raw_resp.get("candidates", [{}])[0]
        content_obj = candidate.get("content", {})
        parts = content_obj.get("parts", [])

        if not parts:
            raise LLMError("Gemini returned response with no content parts")

        # Check for function call
        func_call_part = next((p for p in parts if "functionCall" in p), None)
        if func_call_part:
            call_info = func_call_part["functionCall"]
            f_name = call_info.get("name")
            f_args = call_info.get("args", {})

            # Execute tool
            tool_data, tool_summary = _execute_tool(f_name, f_args)
            steps.append(_step(f_name, f_args, tool_summary))

            # Update contents history
            current_contents.append({"role": "model", "parts": parts})
            current_contents.append({
                "role": "user",
                "parts": [{
                    "functionResponse": {
                        "name": f_name,
                        "response": {"result": tool_data}
                    }
                }]
            })
            continue

        # Text response found
        text_part = next((p for p in parts if "text" in p), None)
        if text_part:
            return text_part["text"], steps

    raise LLMError("Agent loop reached max iterations without returning final text")


# ---------------------------------------------------------------- tickets --

def analyze_ticket(ticket_id: int, name: str, email: str, subject: str, message: str) -> dict:
    steps: list = []

    # 1) Pre-gather initial context via controlled tools
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

    # 3) Agentic LLM reasoning with function calling & retry
    system_prompt = (
        f"{CUSTOMER_SUPPORT_SKILL}\n\n"
        "You analyze support tickets. You can call tools if you need additional knowledge or customer history.\n"
        "Respond ONLY with a valid JSON object:\n"
        "{\n"
        '  "intent": "<short phrase describing what the customer wants>",\n'
        f'  "category": "<one of {CATEGORIES}>",\n'
        '  "priority": "<LOW | MEDIUM | HIGH | CRITICAL>",\n'
        '  "confidence": <float between 0 and 1>,\n'
        '  "reasoning_summary": "<2-3 sentences explaining your classification and priority decision>",\n'
        '  "recommended_action": "<AUTOMATIC_RESPONSE | HUMAN_REVIEW | ESCALATE>",\n'
        '  "suggested_response": "<professional customer-facing reply based ONLY on company knowledge>",\n'
        '  "knowledge_used": ["<ids of knowledge documents you relied on>"]\n'
        "}\n"
        "If the issue involves refunds or security, recommend HUMAN_REVIEW."
    )
    user_prompt = (
        f"COMPANY KNOWLEDGE (your source of company facts):\n"
        f"{_knowledge_block(docs)}\n\n"
        f"CUSTOMER CONTEXT: {json.dumps(customer)}\n"
        f"PREVIOUS TICKETS: {json.dumps(history)}\n\n"
        f"TICKET #{ticket_id}\n"
        f"From: {name} <{email}>\n"
        f"Subject: {subject}\n"
        f"Message: {message}\n\n"
        "Analyze this ticket now and return the JSON object."
    )

    contents = [{"role": "user", "parts": [{"text": user_prompt}]}]
    analysis = None
    ai_failed = False
    for attempt in range(2):
        try:
            raw_text, agent_tool_steps = _run_agentic_loop(system_prompt, contents, json_mode=True)
            steps.extend(agent_tool_steps)
            raw_json = raw_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
            analysis = validate_analysis(json.loads(raw_json))
            break
        except (LLMError, ValueError, KeyError, TypeError, json.JSONDecodeError):
            if attempt == 1:
                ai_failed = True
                break
    if not hasattr(analysis, "model_dump"):
        ai_failed = True

    if ai_failed:
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

    # 5) Persist to Supabase
    tools.update_ticket(ticket_id, {
        "status": verdict["status"],
        "priority": analysis["priority"],
        "category": analysis["category"],
    })
    tools.save_ai_analysis(ticket_id, {
        **analysis,
        "final_decision": verdict["decision"],
        "model_used": "gemini-3.6-flash",
        "ai_failed": ai_failed,
    })
    tools.log_activity(ticket_id, "system", "ai_analyzed", {
        "category": analysis["category"],
        "priority": analysis["priority"],
        "confidence": analysis["confidence"],
        "decision": verdict["decision"],
    })

    return {
        "ticket_id": ticket_id,
        "analysis": analysis,
        "ai_recommendation": analysis["recommended_action"],
        **verdict,
        "agent_trace": steps,
        "ai_failed": ai_failed,
        "status": "IN_PROGRESS" if verdict["decision"] == "HUMAN_REVIEW"
                  else "RESOLVED",
    }


# ------------------------------------------------------------- live chat --

def chat_reply(history: list, conversation_id: int = None,
               customer_email: str = None) -> tuple[str, list]:
    """Live chat uses the agentic loop with tool calls enabled."""
    steps: list = []

    customer = {}
    if customer_email:
        customer = tools.get_customer(customer_email)
        steps.append(_step("get_customer", {"customer_email": customer_email}, customer))

    last_user_msg = next(
        (m["content"] for m in reversed(history) if m["role"] == "user"), ""
    )

    system_prompt = (
        f"{CUSTOMER_SUPPORT_SKILL}\n\n"
        f"CUSTOMER CONTEXT: {json.dumps(customer) if customer else '(guest - not signed in)'}\n\n"
        "You have access to tools to search knowledge, fetch customer profile, or check history.\n"
        "Reply to the customer in plain text (no JSON, no markdown headers). "
        "Be concise. If the matter is refund/security related or you are unsure, "
        "explain that it needs human review and suggest creating a support ticket."
    )

    contents = []
    for m in history[-12:]:
        role = "user" if m["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})

    try:
        reply, tool_steps = _run_agentic_loop(system_prompt, contents, json_mode=False)
        steps.extend(tool_steps)
    except LLMError as exc:
        reply = (
            "Sorry - I'm having technical trouble right now. Please try again, "
            "or create a support ticket so a human agent can help you."
        )
        steps.append(_step("llm_error", "live chat generation failed", str(exc)[:200]))

    # Persist messages to Supabase if conversation exists
    if conversation_id:
        tools.save_message(conversation_id, "customer", last_user_msg)
        tools.save_message(conversation_id, "ai", reply)

    return reply, steps

