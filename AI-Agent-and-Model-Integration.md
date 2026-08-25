# AI Agent, Workflow, Context, and Tool Access Design

## Project: AI Customer Support & Ticketing System

> **Status:** Design decision document  
> **Scope:** AI agent architecture, context gathering, live chat, ticket analysis, tools, permissions, human-in-the-loop, and AI dataflow.

---

# 1. Purpose

This document defines how the AI component of the customer-support system will work with the backend.

The goal is **not** to build a simple chatbot that sends a ticket directly to an LLM and returns a response.

The AI should be a controlled support agent that:

1. Understands customer requests.
2. Classifies tickets.
3. Determines priority.
4. Retrieves relevant company knowledge.
5. Generates support responses.
6. Decides whether a request can be handled automatically or requires human review.
7. Uses controlled tools to retrieve customer, ticket, conversation, payment, subscription, and knowledge information.
8. Can request certain backend actions without receiving unrestricted database or security access.
9. Maintains traceability through structured AI results and audit information.

The central architectural principle is:

> **The backend gathers and controls the context. The LLM reasons over that context. The backend validates the LLM's structured output and enforces business/security rules.**

---

# 2. Core AI Architecture

The AI system consists of several distinct parts:

```text
                    AI SYSTEM
                       |
       +---------------+----------------+
       |               |                |
       v               v                v
      LLM             Agent            Skill
       |               |                |
       |               +-- Tools        +-- Rules
       |               +-- Context     +-- Behavior
       |               +-- Workflow
       |
       +-- Reasoning
       +-- Classification
       +-- Response generation
```

These concepts must remain separate.

## 2.1 LLM

The LLM is the reasoning and language-generation component.

It receives the relevant context and produces a structured result.

The project does not require us to build our own NLP classifier or reasoning engine.

We should therefore avoid unnecessary custom algorithms for:

- Natural-language understanding
- Intent classification
- Priority reasoning
- Response generation
- General conversational reasoning

The LLM should perform these tasks.

## 2.2 Agent

The agent is the orchestration layer around the LLM.

It determines:

- What context is needed.
- Which tools should be called.
- What knowledge should be retrieved.
- When reasoning should occur.
- What result should be returned.
- Whether a human-review path is appropriate.

The agent does not receive direct database credentials.

## 2.3 Agent Skill

The Skill defines how the support agent behaves.

A useful distinction is:

```text
Company Knowledge = WHAT is true
Agent Skill        = HOW the agent should behave
LLM                = REASONS over the information
Backend            = ENFORCES authority and permissions
```

Example Skill rules:

- Never invent company policies.
- Search company knowledge before answering policy-related questions.
- Use only information supplied by the system when making company-specific claims.
- Refund-related actions require human approval.
- Security-related cases require human review where appropriate.
- Low-confidence analysis should be escalated.
- Do not expose passwords, authentication secrets, or tokens.
- Do not bypass backend authorization.
- Explain uncertainty when relevant.
- Keep customer-facing responses professional and concise.
- Preserve traceability of important AI decisions.

---

# 3. Sources of AI Context

The agent should reason using five main sources of context.

```text
                    AI CONTEXT
                        |
      +-----------------+-----------------+
      |                 |                 |
      v                 v                 v
    Ticket          Customer         Conversation
      |                 |                 |
      +-----------------+-----------------+
                        |
              +---------+---------+
              |                   |
              v                   v
        Company Knowledge     Agent Skill
```

## 3.1 Ticket

The ticket is the primary object being analyzed.

It provides information such as:

- Subject
- Customer message
- Customer identity/reference
- Current status
- Existing conversation reference
- Other relevant ticket context

## 3.2 Customer Context

The agent can retrieve relevant customer information through controlled tools.

Examples:

- Customer identity
- Account status
- Subscription status
- Relevant account information
- Relevant customer history

The agent should not automatically receive every customer field.

Tools should expose only information needed for support.

## 3.3 Conversation Context

A conversation contains messages from:

- Customer
- AI
- Human support agent
- System

During live chat, the conversation is the primary context.

When a live conversation becomes a ticket, the conversation remains separate and becomes associated with the ticket.

## 3.4 Company Knowledge

Company knowledge is the controlled source of truth for company-specific information.

Conceptually:

```text
Company Knowledge
|
+-- Policies
|   +-- Refund policy
|   +-- Subscription policy
|   +-- Cancellation policy
|   +-- Account policy
|
+-- Product information
|   +-- Features
|   +-- Plans
|   +-- Limitations
|
+-- Support information
|   +-- Troubleshooting
|   +-- FAQs
|   +-- Procedures
|
+-- Rules
    +-- Allowed actions
    +-- Approval requirements
    +-- Escalation rules
```

The agent should retrieve relevant knowledge instead of receiving the entire knowledge base for every request.

For example:

```text
Customer:
"I want a refund."

        |
        v

Agent identifies:
Billing / Refund

        |
        v

search_knowledge(
    "refund policy"
)

        |
        v

Relevant refund policy

        |
        v

LLM reasoning
```

The LLM must not invent company policies, prices, refund rules, or other company-specific facts.

## 3.5 Agent Skill

The Skill is supplied as behavioral guidance to the agent.

It is not the same as company knowledge.

For example:

```text
Knowledge:
"Refunds are allowed under these conditions."

Skill:
"Refund requests require human approval."
```

---

# 4. Context Builder

The Context Builder is one of the most important backend components.

Its responsibility is to gather the relevant information before the LLM performs analysis.

```text
Ticket
  |
  v
Context Builder
  |
  +-- Fetch ticket
  +-- Fetch customer context
  +-- Fetch conversation
  +-- Fetch relevant customer history
  +-- Search relevant company knowledge
  +-- Load Agent Skill
  |
  v
AI Context
  |
  v
LLM
```

The Context Builder should not blindly fetch everything.

For each request, it should determine what information is relevant.

For example:

### Simple support-hours question

The agent may only need:

```text
Ticket
+
Support-hours knowledge
+
Skill
```

It does not need the customer's entire history.

### Payment issue

It may need:

```text
Ticket
+
Customer
+
Payment status
+
Subscription status
+
Relevant conversation
+
Billing knowledge
+
Skill
```

### Password-reset problem

It may need:

```text
Ticket / conversation
+
Customer
+
Account state
+
Password-reset procedure
+
Security rules
+
Skill
```

---

# 5. AI Responsibilities

The AI agent's responsibilities are locked as follows.

## 5.1 Understand

Determine what the customer is actually asking.

Example:

```text
"I paid for premium but my account still shows free."

Intent:
Subscription access / billing issue
```

## 5.2 Classify

Assign the request to a controlled category.

Example categories:

```text
ACCOUNT
BILLING
TECHNICAL
REFUND
SECURITY
FEATURE_REQUEST
GENERAL
OTHER
```

The exact final category set can be refined later.

## 5.3 Prioritize

Determine urgency.

Example:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

The AI should also provide a reason.

Example:

```text
Priority: HIGH

Reason:
Customer reports that a completed payment has not
resulted in access to the purchased service.
```

## 5.4 Retrieve and use knowledge

The agent should retrieve relevant company knowledge and use it during reasoning.

The LLM should not rely on its general knowledge for company-specific policy.

## 5.5 Generate a response

The LLM generates a customer-facing response based on:

- Ticket
- Conversation
- Customer context
- Relevant company knowledge
- Agent Skill
- Business/security rules

## 5.6 Decide / escalate

The AI recommends what should happen next.

Possible outcomes:

```text
AUTOMATIC_RESPONSE
HUMAN_REVIEW
ESCALATE
```

The AI recommendation is not final authority.

The backend must enforce the actual policy.

---

# 6. Confidence and AI Transparency

Confidence is a cross-cutting property of the analysis.

Example:

```text
Category: BILLING
Priority: HIGH
Confidence: 0.94
```

The AI should also provide a concise reason/explanation.

Example:

```text
Reason:
The customer reports a completed payment but their
account still indicates a free subscription.
```

The system should preserve enough information to answer:

> Why did the AI make this decision?

Useful traceability information includes:

- AI decision
- Category
- Priority
- Confidence
- Reason
- Recommended action
- Model/version information where available
- Timestamp
- Relevant knowledge references
- Tool calls/actions where appropriate

Low confidence should generally result in human review.

Example policy:

```text
High confidence
    |
    v
Potentially automatic

Low confidence
    |
    v
Human review
```

Exact confidence thresholds should be configurable rather than permanently embedded in the LLM prompt.

---

# 7. The AI Does Not Directly Control the Database

This is a major security principle.

We do NOT want:

```text
LLM
 |
 +-- Supabase credentials
       |
       +-- SELECT
       +-- UPDATE
       +-- DELETE
       +-- arbitrary SQL
```

Instead:

```text
LLM
 |
 v
Agent Tool
 |
 v
Backend Service
 |
 v
Supabase
```

The LLM receives controlled capabilities rather than database access.

## Bad design

```text
query_database(
    table="customers",
    filter="id=123"
)
```

## Preferred design

```text
get_customer(customer_id)
```

The second approach lets the backend determine:

- What fields are returned.
- What validation is performed.
- What authorization is required.
- What database operations happen internally.
- What information is hidden from the model.

---

# 8. Agent Tool Access Model

The agent's access is divided into four categories.

```text
TOOLS
|
+-- Information tools
|
+-- Knowledge tools
|
+-- Support tools
|
+-- Sensitive/customer-action tools
```

---

# 9. Information Tools

These are mostly read-only and can normally be used by the agent without human approval.

## 9.1 get_customer

Purpose:

Retrieve relevant customer information.

Conceptual interface:

```text
get_customer(customer_id)
```

Should return only support-relevant information.

It should NOT return:

- Passwords
- Password hashes
- Authentication tokens
- API secrets
- Other sensitive security credentials

## 9.2 get_customer_history

Purpose:

Retrieve relevant previous support interactions.

```text
get_customer_history(customer_id)
```

This may include:

- Previous tickets
- Relevant support interactions
- Previous resolutions
- Relevant status/history

The returned information should be limited to what the agent needs.

## 9.3 get_ticket

Purpose:

Retrieve the ticket being processed.

```text
get_ticket(ticket_id)
```

## 9.4 get_conversation

Purpose:

Retrieve the conversation associated with a live chat or ticket.

```text
get_conversation(conversation_id)
```

## 9.5 get_payment_status

Purpose:

Answer questions such as:

> "Is my payment done?"

```text
get_payment_status(customer_id)
```

The tool should return a controlled representation such as:

```text
{
    status: "completed",
    amount: ...,
    date: ...,
    subscription: "premium"
}
```

It should not expose unnecessary payment credentials or secrets.

## 9.6 get_subscription_status

Purpose:

Retrieve the customer's current subscription state.

```text
get_subscription_status(customer_id)
```

This is useful for questions such as:

- Is my premium plan active?
- Did my subscription upgrade?
- What plan am I currently on?

---

# 10. Knowledge Tool

## 10.1 search_knowledge

Purpose:

Retrieve relevant company knowledge.

```text
search_knowledge(query)
```

Example:

```text
search_knowledge(
    "refund policy for premium subscription"
)
```

The tool should return relevant knowledge rather than the entire knowledge base.

This makes the context:

- Smaller
- More relevant
- Easier for the LLM to reason over
- Less likely to contain unrelated information

---

# 11. Support Tools

Support tools can change support-system state but should not have unrestricted customer/security authority.

## 11.1 update_ticket_status

```text
update_ticket_status(
    ticket_id,
    status
)
```

Possible statuses may include:

```text
OPEN
IN_PROGRESS
WAITING_FOR_CUSTOMER
RESOLVED
```

The final status model will be defined with the backend/domain design.

## 11.2 add_internal_note

```text
add_internal_note(
    ticket_id,
    note
)
```

Used for internal support context.

Internal notes should never accidentally be sent to the customer.

## 11.3 request_human_review

```text
request_human_review(
    ticket_id,
    reason
)
```

This is an important agent capability.

For example:

```text
Security issue detected.
Human review required.
```

---

# 12. Sensitive / Customer-Action Tools

These tools require stronger authorization and policy enforcement.

## 12.1 initiate_password_reset

A password problem is a good example of an action the agent can potentially initiate.

We should NOT expose:

```text
change_password(user_id, new_password)
```

Instead, expose a controlled operation such as:

```text
initiate_password_reset(customer_id)
```

The backend then performs the actual secure password-reset workflow.

The LLM never receives:

- Passwords
- Password hashes
- Reset tokens
- Authentication secrets

Flow:

```text
Customer:
"I cannot reset my password."

        |
        v

AI Agent
        |
        +-- get_customer()
        +-- get_customer_history()
        +-- search_knowledge()
        |
        v
Reasoning
        |
        v
initiate_password_reset()
        |
        v
Backend security checks
        |
        v
Secure reset workflow
        |
        v
Customer
```

Whether this can happen automatically depends on the final security design.

---

# 13. Response Sending

Sending a normal support response should be treated as a controlled action.

Conceptually:

```text
send_support_response(
    ticket_id,
    response
)
```

But the backend must determine whether the response is actually allowed to be sent automatically.

The LLM should not be able to bypass:

- Human approval requirements
- Ticket state
- Security rules
- Business policies
- Duplicate-send protection

---

# 14. Financial and High-Risk Actions

The AI should not have unrestricted access to operations such as:

```text
refund_payment()
change_payment_details()
change_password()
delete_customer()
delete_data()
```

For example, a refund should follow:

```text
LLM
 |
 v
request_refund()
 |
 v
Backend policy
 |
 v
Human approval
 |
 v
Backend/payment service
 |
 v
Result
```

The agent may recommend or request the action, but the backend and human approval system retain authority.

---

# 15. Final Tool Access Matrix

| Tool / capability | Agent access | Human approval | Notes |
|---|---:|---:|---|
| get_customer | Yes | No | Read-only, filtered fields |
| get_customer_history | Yes | No | Relevant support history only |
| get_ticket | Yes | No | Read-only |
| get_conversation | Yes | No | Read-only |
| get_payment_status | Yes | No | Read-only |
| get_subscription_status | Yes | No | Read-only |
| search_knowledge | Yes | No | Read-only |
| update_ticket_status | Yes | Usually no | Restricted to allowed states |
| add_internal_note | Yes | No | Internal only |
| request_human_review | Yes | No | Creates/escalates review |
| send_support_response | Conditional | Policy-dependent | Backend must enforce approval |
| initiate_password_reset | Conditional | Security-dependent | Never expose password/token |
| refund payment | No direct authority | Yes | Backend/payment system executes |
| change password directly | No | Yes / secure flow | Never expose password |
| change payment details | No | Yes | Sensitive financial action |
| delete customer | No | Yes | Never direct agent capability |
| delete data | No | Yes | Never direct agent capability |
| read passwords | Never | Never | Never exposed |
| read authentication tokens | Never | Never | Never exposed |
| raw SQL | Never | Never | No arbitrary DB access |
| raw Supabase access | Never | Never | Agent uses tools only |

---

# 16. MCP Architecture

The project requires MCP capabilities.

MCP should expose **business capabilities**, not raw database access.

Recommended conceptual MCP tools:

```text
MCP SERVER
|
+-- get_customer
+-- get_ticket
+-- get_conversation
+-- get_payment_status
+-- search_knowledge
+-- update_ticket_status
+-- request_human_review
```

Additional tools can be added when justified.

The MCP server should internally call backend services.

```text
External AI Client / Agent
          |
          v
      MCP Server
          |
          v
    Backend Services
          |
          v
       Supabase
```

We should not expose:

```text
MCP
 |
 +-- execute_sql()
 +-- query_any_table()
 +-- delete_anything()
```

The principle is:

> **Expose controlled domain operations, not database operations.**

---

# 17. Live Chat Architecture

Live chat is one entry point into the AI system.

Initially, there is no ticket.

```text
Customer
   |
   v
Live Chat
   |
   v
Conversation
   |
   +-- Customer message
   +-- AI response
   +-- Customer message
   +-- AI response
   +-- ...
```

The same Support Agent is used.

For each message:

```text
Customer message
       |
       v
Context Builder
       |
       +-- Conversation
       +-- Customer context
       +-- Relevant knowledge
       +-- Agent Skill
       |
       v
LLM
       |
       v
AI response
       |
       v
Conversation
```

The conversation can continue without a ticket.

---

# 18. Live Chat to Ticket Conversion

The UI should provide a clear action such as:

```text
[ Create Ticket ]
```

When the customer chooses it:

```text
Conversation
     |
     v
Create Ticket
     |
     v
Associate Conversation
     |
     v
Ticket AI Pipeline
```

The conversation should not be copied into the ticket as duplicated data.

Instead:

```text
Ticket
   |
   +-- conversation_id
             |
             v
       Conversation
             |
             v
          Messages
```

This allows the agent to retrieve the entire relevant conversation when analyzing the ticket.

---

# 19. Ticket AI Workflow

The complete normal-ticket flow is:

```text
Customer
   |
   v
Submit Ticket
   |
   v
Backend
   |
   +-- Create Ticket
   |
   +-- Start/Queue AI Processing
   |
   v
Context Builder
   |
   +-- Ticket
   +-- Customer
   +-- Conversation (if attached)
   +-- Relevant customer history
   +-- Relevant company knowledge
   +-- Agent Skill
   |
   v
Support Agent
   |
   v
LLM
   |
   v
Structured AI Result
   |
   v
Validate Output
   |
   v
Backend Policy / Authorization
   |
   +-------------------+
   |                   |
   v                   v
Automatic           Human Review
Response                |
   |               +----+----+
   |               |         |
   |             Approve   Edit/Reject
   |               |
   +-------+-------+
           |
           v
      Final Response
           |
           v
         Resend
           |
           v
        Customer
```

---

# 20. Live Chat Payment Example

Customer asks:

> "Is my payment done?"

The agent should not guess.

It determines that payment information is needed.

```text
Customer
   |
   v
"Is my payment done?"
   |
   v
Support Agent
   |
   v
get_payment_status(customer_id)
   |
   v
Backend
   |
   v
Supabase / payment information
   |
   v
Controlled payment result
   |
   v
LLM
   |
   v
Customer response
```

For example, if the returned status is completed:

```text
Payment:
Completed
Subscription:
Premium
```

The LLM can respond appropriately.

The important point is:

> The LLM reasons about the payment status; it does not invent or directly modify the payment state.

---

# 21. Live Chat Password-Reset Example

Customer:

> "The normal password reset isn't working."

The agent can:

```text
1. Understand the problem.
2. Retrieve customer/account context.
3. Search the password-reset support procedure.
4. Determine whether the supported recovery workflow applies.
5. Request initiate_password_reset().
6. Let the backend perform security checks.
7. Return the result to the customer.
```

The LLM never receives the password or security token.

```text
Customer
   |
   v
Live Chat
   |
   v
Support Agent
   |
   +-- get_customer()
   +-- search_knowledge()
   |
   v
Reasoning
   |
   v
initiate_password_reset()
   |
   v
Backend security checks
   |
   v
Secure reset mechanism
   |
   v
Customer
```

---

# 22. Human-in-the-Loop

The agent should not automatically handle every situation.

Examples:

## Automatic

```text
"What are your support hours?"
```

Possible flow:

```text
Knowledge
   |
   v
LLM
   |
   v
High confidence
   |
   v
Automatic response
```

## Human review

```text
"I want a refund."
```

Possible flow:

```text
Knowledge
   |
   v
LLM
   |
   v
Refund detected
   |
   v
Human review
```

## Security escalation

```text
"I think someone hacked my account."
```

Possible flow:

```text
LLM
   |
   v
Security issue
   |
   v
High priority
   |
   v
Human review / escalation
```

The backend policy layer should enforce these boundaries.

---

# 23. LLM Output

The LLM should return a structured result rather than uncontrolled prose.

Conceptually:

```json
{
  "intent": "subscription_access",
  "category": "BILLING",
  "priority": "HIGH",
  "confidence": 0.94,
  "reasoning_summary": "Customer reports a completed payment but the account remains on the free plan.",
  "recommended_action": "HUMAN_REVIEW",
  "suggested_response": "..."
}
```

The exact schema will be finalized during backend implementation.

The backend should validate:

- Required fields
- Allowed category values
- Allowed priority values
- Allowed action values
- Confidence range
- Response format

If the LLM returns malformed output:

```text
LLM
 |
 v
Malformed output
 |
 v
Validation failure
 |
 +-- Retry if appropriate
 |
 +-- Otherwise mark AI processing as failed
 |
 v
Human review / fallback
```

The AI should never be allowed to corrupt backend state because of malformed output.

---

# 24. Context Gathering vs Reasoning

This distinction is a core design decision.

## Context Gathering

Performed by our application/agent tools.

```text
What does the AI need to know?
```

Examples:

- Customer
- Payment status
- Subscription status
- Conversation
- Previous tickets
- Relevant policy
- Product information
- Support rules

## Reasoning

Performed by the LLM.

```text
Given this information, what does it mean?
What is the likely category?
How urgent is it?
What should we tell the customer?
Should this require review?
```

## Authorization

Performed by the backend.

```text
Is the recommended action actually allowed?
```

Therefore:

```text
Context Builder
      |
      v
      LLM
      |
      v
AI Recommendation
      |
      v
Backend Policy
      |
      v
Actual Action
```

This is the central architecture.

---

# 25. Why We Should Not Over-Engineer the Agent

The reasoning itself is relatively straightforward once the context is correct.

We do not need to create:

- A custom NLP engine
- A custom classification model
- A custom priority algorithm
- A separate AI model for every support category
- An unnecessarily complex agent framework

The initial architecture can be:

```text
Backend
   |
   v
SupportAgent
   |
   v
LLM API
   |
   +-- Structured output
   +-- Tool calling
```

The agent can be implemented as an application-level orchestration layer.

A separate agent framework can be evaluated later if it provides a clear benefit.

The architecture should not depend on a particular framework.

---

# 26. Security Principles

The AI system should follow these principles.

## Principle 1 — No direct database credentials

The LLM never receives Supabase credentials.

## Principle 2 — No arbitrary SQL

No generic database query tool.

## Principle 3 — Least privilege

Each tool exposes only the minimum information/action required.

## Principle 4 — Backend authority

The LLM recommends; the backend authorizes.

## Principle 5 — Sensitive information isolation

Never expose:

- Passwords
- Password hashes
- Authentication tokens
- API keys
- Secrets

## Principle 6 — Sensitive actions require stronger controls

Examples:

- Refund
- Password operations
- Payment changes
- Account security changes
- Deletion

## Principle 7 — Audit important actions

Record meaningful AI decisions and tool/action activity.

## Principle 8 — Human escalation

Uncertain or sensitive situations should be routed to human support.

---

# 27. Final AI Architecture

The complete design can be represented as:

```text
                         CUSTOMER
                            |
               +------------+------------+
               |                         |
               v                         v
           LIVE CHAT                  TICKET
               |                         |
               v                         v
         CONVERSATION                 TICKET
               |                         |
               | Create Ticket           |
               +------------+------------+
                            |
                            v
                    CONTEXT BUILDER
                            |
          +-----------------+------------------+
          |                 |                  |
          v                 v                  v
      CUSTOMER         CONVERSATION       KNOWLEDGE
       CONTEXT             CONTEXT          CONTEXT
          |                 |                  |
          +-----------------+------------------+
                            |
                            +
                          SKILL
                            |
                            v
                       SUPPORT AGENT
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
           Tools         Context         LLM
              |                           |
              |                           v
              |                    Structured Result
              |                           |
              +---------------------------+
                            |
                            v
                    BACKEND VALIDATION
                            |
                            v
                     POLICY / AUTHORIZATION
                            |
                 +----------+----------+
                 |                     |
                 v                     v
            AUTOMATIC              HUMAN
             ACTION                REVIEW
                 |                     |
                 |              +------+------+
                 |              |             |
                 |           Approve        Reject/Edit
                 |              |
                 +--------------+
                        |
                        v
                     RESPONSE
                        |
                        v
                      RESEND
                        |
                        v
                     CUSTOMER
```

---

# 28. Final Access Philosophy

The AI should be **powerful enough to solve support problems but constrained enough that it cannot damage the system**.

The intended hierarchy is:

```text
                 AGENT AUTHORITY
                       |
        +--------------+--------------+
        |              |              |
        v              v              v
       READ          SUPPORT        SENSITIVE
     INFORMATION     ACTIONS         ACTIONS
        |              |              |
        v              v              v
      Broad          Limited        Restricted
      access         authority      authority
        |              |              |
        v              v              v
     Automatic      Backend       Human/security
                    controls        controls
```

In practical terms:

```text
READ:
    Agent can retrieve useful support information.

SUPPORT WRITE:
    Agent can perform limited support operations.

SENSITIVE WRITE:
    Agent can request an operation, but backend
    authorization and/or human approval controls it.

NEVER:
    Raw SQL
    Raw Supabase access
    Passwords
    Authentication secrets
    Unrestricted deletion
    Unrestricted financial operations
```

---

# 29. Locked Decisions

The following decisions are considered locked for the current architecture:

### AI responsibilities

- Understand customer intent.
- Classify requests.
- Determine priority.
- Retrieve/use relevant company knowledge.
- Generate responses.
- Recommend automatic handling or escalation.

### AI context

- Ticket
- Customer context
- Conversation context
- Relevant customer history
- Company knowledge
- Agent Skill

### Reasoning

- The LLM performs the natural-language reasoning.
- The application does not implement unnecessary custom NLP logic.

### Context

- The backend/agent gathers relevant context.
- The entire database should not be dumped into the prompt.

### Database access

- No direct LLM/Supabase credentials.
- No raw SQL tool.
- No arbitrary table access.
- Agent uses controlled domain tools.

### Security

- Backend remains the authority.
- Sensitive operations require additional authorization.
- Passwords/tokens/secrets are never exposed to the LLM.

### Live chat

- Live chat uses the same Support Agent.
- Conversation exists independently before ticket creation.
- Customer can create a ticket from live chat.
- Existing conversation is associated with the ticket.
- Ticket then enters the normal AI ticket pipeline.

### MCP

- MCP exposes controlled business capabilities.
- MCP does not expose arbitrary database operations.

### Agent implementation

- Do not prematurely lock into a complicated agent framework.
- A backend SupportAgent orchestration layer plus an LLM API is sufficient for the initial architecture.
- A free/open-source agent framework can be evaluated separately if it provides a concrete benefit.

---

# 30. Next Design Stage

With the AI responsibilities and access model defined, the next stage is the **detailed dataflow**.

We should trace two complete scenarios:

## Scenario A — Normal Ticket

```text
Customer
  ↓
Ticket API
  ↓
Create Ticket
  ↓
AI Job
  ↓
Context Builder
  ↓
Tool Calls
  ↓
Knowledge Retrieval
  ↓
LLM
  ↓
Structured Analysis
  ↓
Validation
  ↓
Policy Decision
  ↓
Auto Response / Human Review
  ↓
Resend
  ↓
Customer
```

## Scenario B — Live Chat

```text
Customer
  ↓
Conversation
  ↓
Customer Message
  ↓
Support Agent
  ↓
Context + Tools + Knowledge
  ↓
LLM
  ↓
AI Response
  ↓
Conversation
  ↓
...
  ↓
Create Ticket
  ↓
Associate Conversation
  ↓
Ticket AI Pipeline
```

The next design should specify **the exact order of these operations, which tool is called at each stage, what data each tool returns, what the LLM receives, what it returns, and what happens when a tool or LLM call fails.**
