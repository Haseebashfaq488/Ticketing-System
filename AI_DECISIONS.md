# AI Architectural & Security Decisions

This document outlines key technical decisions where AI suggestions were evaluated, modified, or rejected to ensure security, data integrity, and strict business rule compliance.

---

### Decision #1: Separate Conversation & Message Persistence vs. Single Ticket Text Column
- **AI Proposal:** Store live chat messages directly inside a JSON array column within the `support_tickets` table.
- **Evaluation & Choice:** Rejected. Conversations naturally have a one-to-many relationship with messages, and live chat sessions often occur *before* a ticket is created.
- **Implementation:** Created distinct `conversations` and `messages` tables linked via `conversation_id`. When a customer converts a live chat into a ticket, the ticket references the existing `conversation_id`, maintaining clean relational boundaries.

---

### Decision #2: Backend Policy Engine Override vs. Pure LLM Autonomy
- **AI Proposal:** Allow the Gemini LLM to autonomously determine final ticket resolution and directly execute customer-facing actions (e.g., automatically issuing refund approvals or resetting account credentials).
- **Evaluation & Choice:** Rejected due to hallucination risks and compliance rules.
- **Implementation:** Built a deterministic backend Policy Engine (`app/policy.py`). The LLM's `recommended_action` is treated as a proposal. The backend Policy Engine has final authority and automatically forces `HUMAN_REVIEW` or `ESCALATE` for sensitive intents (refunds, security alerts) or low-confidence ratings (< 0.70).

---

### Decision #3: Controlled Tool Access vs. Raw Database Access
- **AI Proposal:** Expose generic SQL query tools (e.g., `execute_sql` or raw `query_table`) to the LLM for flexible context retrieval.
- **Evaluation & Choice:** Rejected due to SQL injection and data leak vulnerabilities (passwords, tokens).
- **Implementation:** Created narrow, read-only wrapper functions (`app/tools.py`) that strictly strip sensitive credentials, passwords, and tokens before sending context to the LLM.

---

### Decision #4: Dynamic Gemini Function Calling (Agentic Loop)
- **AI Proposal:** Static pre-prompt context injection for every single request regardless of need.
- **Evaluation & Choice:** Upgraded to native Gemini Function Calling (`GEMINI_TOOLS`).
- **Implementation:** Implemented a multi-turn agentic loop in `app/support_agent.py`. The LLM can dynamically call `get_customer`, `get_customer_history`, or `search_knowledge` mid-reasoning when additional context is required, logging every tool call step to `agent_trace` for human transparency.
