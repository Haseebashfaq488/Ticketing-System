# NovaWare AI Support - Demo

A minimal demo of the AI-agent architecture from `AI-Agent-and-Model-Integration.md`:

- **Ticket** entry point -> SupportAgent pipeline with visible reasoning
- **Live Chat** entry point -> same agent in conversation mode
- Company knowledge base (the AI never invents policies/prices)
- Backend policy engine (refunds/security/low-confidence always go to human review)

## Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React (create-react-app), port 3000 |
| Backend  | FastAPI + uvicorn, port 8000  |
| LLM      | Google Gemini (`gemini-2.5-flash`) |
| Storage  | In-memory demo dicts (Supabase later) |

## Architecture (as implemented)

```
React UI (ticket form / live chat)
        |
FastAPI  /api/tickets   /api/chat
        |
SupportAgent (app/support_agent.py)
   1. tools.get_customer()          <- controlled read-only tool
   2. tools.get_customer_history()
   3. tools.search_knowledge()      <- company knowledge only
   4. Gemini LLM reasoning          <- structured JSON output
   5. validate_analysis()           <- retry once, else fail safe
   6. policy.apply_policy()         <- backend has final authority
        |
Response includes: analysis + agent_trace + decision
```

## Run it

### 1. Backend

```
cd backend
copy .env.example .env        # then paste your Gemini key inside
.\venv\Scripts\python.exe -m uvicorn main:app --port 8000 --reload
```

Get a free API key at https://aistudio.google.com/apikey

(First time only: `python -m venv venv` then `.\venv\Scripts\python.exe -m pip install -r requirements.txt`)

### 2. Frontend

```
cd frontend
npm start
```

Open http://localhost:3000

## Things to try

**Ticket form** (watch the agent trace + reasoning):
- `john@example.com` - "I paid for premium but my account still says free" -> BILLING/HIGH reasoning
- Any email - "I want a refund" -> REFUND -> forced HUMAN_REVIEW by policy
- Any email - "I think someone hacked my account" -> SECURITY/CRITICAL -> human review

**Live chat:**
- "What are your support hours?" -> instant knowledge-based answer
- "I want a refund" -> explains it needs a human, suggests creating a ticket
- Set email to `alex@example.com`, ask "Is my payment done?" -> real customer context via tools

## Demo customers (mock data in app/tools.py)

| Email              | Plan    | Payment status | Notes              |
|--------------------|---------|----------------|--------------------|
| john@example.com   | premium | completed      | active subscriber  |
| sarah@example.com  | free    | none           | never paid         |
| alex@example.com   | premium | FAILED         | restricted account |
