function Home({ onSelect }) {
  return (
    <div className="home">
      <div className="hero">
        <h1>
          How can we <span className="grad">help</span> you today?
        </h1>
        <p className="hero-sub">
          Our AI support agent can answer questions instantly and analyze your
          tickets. Sensitive issues are always escalated to a human.
        </p>
      </div>

      <div className="choices">
        <button className="choice" onClick={() => onSelect('ticket')}>
          <span className="choice-icon">🎫</span>
          <span className="choice-title">Create a Ticket</span>
          <span className="choice-desc">
            Submit a support request. The AI agent will analyze it, set a
            priority, draft a response, and route it to a human if needed.
          </span>
          <span className="choice-cta">Open ticket form →</span>
        </button>

        <button className="choice" onClick={() => onSelect('chat')}>
          <span className="choice-icon">💬</span>
          <span className="choice-title">Live Chat</span>
          <span className="choice-desc">
            Chat with the AI agent in real time. It uses our company knowledge
            base only — it never invents policies or prices.
          </span>
          <span className="choice-cta">Start chatting →</span>
        </button>

        <button className="choice" onClick={() => onSelect('dashboard')}>
          <span className="choice-icon">📊</span>
          <span className="choice-title">Support Dashboard</span>
          <span className="choice-desc">
            View all tickets, see AI analysis, approve or edit responses,
            and manage the support queue.
          </span>
          <span className="choice-cta">Open dashboard →</span>
        </button>
      </div>

      <p className="footnote">
        Demo tip: ask about "support hours" for an instant AI answer, say
        "I want a refund" to see human-review routing, or try
        john@example.com / alex@example.com as known customer emails.
      </p>
    </div>
  );
}

export default Home;
