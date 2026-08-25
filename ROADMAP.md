# Phase B+ Roadmap — Remaining Features

> Start this AFTER the Supabase schema is finalized and the backend is connected to it.
> Use this as your working checklist during team coding sessions.

---

## Phase B — Missing Features

### 1. Support Dashboard (staff UI)

The human-in-the-loop system has no UI yet. Staff need to see and manage tickets.

Build a page that shows:

- All tickets in a table (ID, customer, subject, category, priority, status, created_at)
- Filters: by status (OPEN / PENDING_HUMAN_REVIEW / RESOLVED), by priority
- Click a ticket to open detail view:
  - Customer info + message
  - AI analysis panel (category, priority, confidence, reasoning summary)
  - Suggested response in a text area
  - **Approve & Send** button → triggers Resend email + marks ticket RESOLVED
  - **Edit** button → modify the response, then send
  - **Reject** button → marks ticket as ESCALATED, human writes their own reply

This is the core human-in-the-loop flow your teacher will ask about.

---

### 2. Resend Emails

Two emails are required by the spec. Implement both with duplicate-send protection.

**Email 1 — Ticket confirmation (on ticket submit):**
```
Subject: We received your support request - Ticket #1042
Body:
  Hi John,
  We've received your support request.
  Ticket ID: #1042
  Subject: I can't access my account
  Our support team will review it shortly.
```
Send this automatically when the customer submits a ticket. Never send it twice.

**Email 2 — Support response (on human approve or auto-send):**
```
Subject: Re: Your support request #1042
Body:
  Hi John,
  [response content]
  Regards,
  NovaWare Support Team
```
Send when a human approves/edits an AI response, or when the policy engine allows auto-send.

**Failure handling:**
- If Resend fails, mark the email as NOT_SENT in the database
- Record the failure in activity_logs
- Allow retry from the dashboard
- Prevent duplicate sends (check email_status before sending)

---

### 3. Live Chat → Ticket Conversion

Currently the chat is stateless. Build the conversion flow.

In the chat UI, add a **"Create Ticket"** button. When clicked:
- Collect subject (auto-generate from recent messages, or ask the user)
- Collect customer email (if not already set)
- Create a ticket in Supabase
- Attach the current conversation via conversation_id on the ticket
- Show confirmation: "Ticket #1042 created from this conversation"

The AI pipeline then runs on the ticket using the full conversation as context (not just the initial message).

---

### 4. Conversation Persistence

Chat messages are currently lost on page refresh. Store them.

Tables needed (from your schema):
- `conversations` — id, customer_email, created_at, ticket_id (nullable)
- `messages` — id, conversation_id, sender_type (customer/ai/agent/system), content, created_at

When a live chat message is sent:
- Create or reuse a conversation record
- Store the customer message
- Store the AI response

When a ticket is created from chat:
- Link conversation to ticket via conversation_id

When the AI analyzes a ticket, it reads messages from the conversation table as context.

---

### 5. Activity Logs

Record every significant action for traceability.

Table: `activity_logs` with:
- ticket_id
- actor (system / ai / human_agent / customer)
- action (ticket_created, ai_analyzed, response_approved, response_sent, email_failed, escalated, etc.)
- details (JSON — e.g., which tool was called, which email was sent, which decision was made)
- created_at

Example rows:
```
ticket 1042 | system    | ticket_created      | {"source": "form"}
ticket 1042 | ai        | ai_analyzed         | {"category":"BILLING","priority":"HIGH","confidence":0.95}
ticket 1042 | ai        | response_suggested  | {"word_count": 87}
ticket 1042 | human     | response_approved   | {"agent": "support@novaware.com"}
ticket 1042 | system    | email_sent          | {"email_type": "support_response", "to": "john@example.com"}
```

---

## Phase C — MCP Server

Expose at least 3 tools through an MCP server so external AI clients can query your system.

### Tools to expose (read-only first)

| Tool | Access | Description |
|------|--------|-------------|
| `get_ticket` | Read-only | Retrieve ticket by ID with analysis |
| `search_tickets` | Read-only | Filter by status, priority, category |
| `get_customer` | Read-only | Customer info (no secrets) |
| `update_ticket_status` | Write | Change status (OPEN → RESOLVED, etc.) |
| `get_customer_history` | Read-only | Previous tickets for a customer |

### Architecture

```
External AI Client (Claude, Cursor, etc.)
        ↓
   MCP Server (your FastAPI app or separate service)
        ↓
   Backend services (same ones tools.py uses)
        ↓
   Supabase
```

The MCP server reuses your existing backend services. It does NOT call Supabase directly.

### Test with an MCP client

Use Claude Desktop or the MCP inspector to connect to your server and verify:
- "Show me all urgent unresolved tickets" → search_tickets(status="open", priority="urgent")
- "Show me ticket #1042" → get_ticket(1042)

---

## Phase D — Agentic Upgrade (Optional but impressive)

Add Gemini function calling so the LLM can call tools mid-reasoning.

### How it works

1. Define available tools in the Gemini API request (function declarations)
2. LLM responds with `functionCall` (which tool, which arguments)
3. Your backend executes the tool via backend services → Supabase
4. Result sent back to LLM
5. LLM continues reasoning and returns final analysis

### When to use this

- **Ticket analysis:** pre-gather context, let LLM call ONE extra tool if needed (e.g., "I need payment status to verify this billing issue")
- **Live chat:** let LLM call tools freely since you don't know what the user will ask

### Latency expectation

| Round trips | Wall time |
|-------------|-----------|
| 0 extra (pre-gathered enough) | ~2-3s |
| 1 extra tool call | ~4-5s |
| 2 extra (parallel) | ~5-6s |

### Implementation

Add to `support_agent.py`:
- Define tool schemas matching your backend services
- Run a while loop: call Gemini → if functionCall → execute tool → feed result back → repeat
- Set a max of 3-5 iterations to prevent infinite loops
- Log every tool call in the agent_trace for transparency

---

## Phase E — Ship

### Deployment

| Component | Target | Notes |
|-----------|--------|-------|
| Frontend | Vercel | `npm run build`, deploy build/ folder |
| Backend | Render or Railway | Python runtime, set env vars |
| Database | Supabase (already cloud) | Schema + seed data |
| MCP | Same backend or separate service | Depends on architecture |
| Email | Resend | API key in env vars |

### GitHub Workflow

Set up branch strategy:
```
main
├── feature/ai-agent
├── feature/mcp-server
├── feature/support-dashboard
├── feature/resend-emails
└── feature/supabase-schema
```

Rules:
- No one merges their own PR without review
- Each team member commits meaningfully to multiple branches
- Meaningful commit messages (not "fix" or "update")

### AI_DECISIONS.md

Document at least 3 decisions where you critically evaluated AI-generated code:

```
AI Decision #1:
  AI suggested storing conversations inside the support_tickets table.
  We rejected this because conversations are naturally one-to-many and
  should be stored separately in ticket_messages.

AI Decision #2:
  AI suggested allowing the agent to automatically send refund responses.
  We rejected this because refund actions require human approval.

AI Decision #3:
  AI suggested exposing a send_email MCP tool without authorization.
  We rejected this because external clients could send unauthorized messages.
```

### Presentation Prep

Each team member should be able to explain:
- Architecture (why this flow, not another)
- Database schema (relationships, why separate tables)
- AI responsibilities (what it does vs what the backend does)
- Agent + Skill (what the agent orchestrates, what the skill constrains)
- MCP (what tools are exposed, why, what's read-only vs write)
- Security (why no raw DB access, why no password exposure)
- Failures (what happens when LLM fails, email fails, bad input)
- GitHub workflow (branch strategy, PR review process)

---

## Summary: Build Order

```
1. Supabase schema + connect tools.py ← you said this is next
2. Support dashboard (staff UI)
3. Resend emails (confirmation + response)
4. Conversation persistence
5. Live chat → ticket conversion
6. Activity logging
7. MCP server (3+ tools)
8. Gemini function calling (agentic upgrade)
9. Deploy
10. GitHub workflow + AI_DECISIONS.md
11. Presentation prep
```

Start from the top. Each item builds on the previous one.
