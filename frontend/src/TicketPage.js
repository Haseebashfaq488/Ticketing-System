import { useState, useEffect } from 'react';

const PRIORITY_CLASS = {
  LOW: 'badge low',
  MEDIUM: 'badge medium',
  HIGH: 'badge high',
  CRITICAL: 'badge critical',
};

function TraceStep({ step, index }) {
  return (
    <li className="trace-step">
      <span className="trace-num">{index + 1}</span>
      <div className="trace-body">
        <code className="trace-tool">{step.tool}</code>
        <div className="trace-io">
          <span>
            <strong>in:</strong> {step.input}
          </span>
          <span>
            <strong>out:</strong> {step.output}
          </span>
        </div>
      </div>
    </li>
  );
}

function AnalysisResult({ result, onReset }) {
  const [reviewState, setReviewState] = useState(null);
  const a = result.analysis || {};
  const needsHuman = result.decision === 'HUMAN_REVIEW';

  return (
    <div className="result">
      <div className="result-head">
        <div>
          <h2>Ticket #{result.ticket_id} created</h2>
          <p className="muted">{result.subject}</p>
        </div>
        <button className="btn ghost" onClick={onReset}>
          New ticket
        </button>
      </div>

      <div className={`banner ${needsHuman ? 'amber' : 'green'}`}>
        {needsHuman ? (
          <>
            <strong>Pending human review</strong> — the AI analyzed this ticket
            but policy requires a human to approve the response before it is sent.
          </>
        ) : (
          <>
            <strong>Handled automatically</strong> — the AI agent answered this
            ticket with high confidence and no sensitive actions were required.
          </>
        )}
      </div>

      <div className="meta-grid">
        <div className="card stat">
          <span className="stat-label">Category</span>
          <span className="badge cat">{a.category || 'GENERAL'}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Priority</span>
          <span className={PRIORITY_CLASS[a.priority] || 'badge'}>{a.priority || 'MEDIUM'}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Confidence</span>
          <div className="conf">
            <div className="conf-bar">
              <div
                className="conf-fill"
                style={{ width: `${Math.round((a.confidence || 0.8) * 100)}%` }}
              />
            </div>
            <span>{Math.round((a.confidence || 0.8) * 100)}%</span>
          </div>
        </div>
      </div>

      <section className="card section">
        <h3>AI reasoning</h3>
        <p>{a.reasoning_summary}</p>
        <p className="muted small">
          Intent: {a.intent}
          {a.knowledge_used?.length > 0 &&
            ` · Knowledge used: ${a.knowledge_used.join(', ')}`}
        </p>
        <p className="muted small">
          AI recommendation: <code>{result.ai_recommendation}</code> → Backend
          decision: <code>{result.decision}</code>
          {result.policy_reasons?.length > 0 && (
            <> · because {result.policy_reasons.join('; ')}</>
          )}
        </p>
      </section>

      {result.agent_trace && result.agent_trace.length > 0 && (
        <section className="card section">
          <h3>Agent trace ({result.agent_trace.length} steps)</h3>
          <ul className="trace">
            {result.agent_trace.map((s, i) => (
              <TraceStep key={i} step={s} index={i} />
            ))}
          </ul>
        </section>
      )}

      {a.suggested_response && (
        <section className="card section">
          <h3>Suggested response</h3>
          <pre className="draft">{a.suggested_response}</pre>

          {needsHuman && !reviewState && (
            <div className="review-actions">
              <button
                className="btn primary"
                onClick={() => setReviewState('sent')}
              >
                Approve &amp; send
              </button>
              <button className="btn ghost" onClick={() => setReviewState('edit')}>
                Edit response
              </button>
              <button className="btn danger" onClick={() => setReviewState('rejected')}>
                Reject
              </button>
            </div>
          )}
          {reviewState === 'sent' && (
            <p className="banner green">Response approved and sent to the customer. ✓</p>
          )}
          {reviewState === 'rejected' && (
            <p className="banner amber">Rejected - a human agent will take over this ticket.</p>
          )}
        </section>
      )}
    </div>
  );
}

function TicketPage({ user }) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        customer_name: user.user_metadata?.full_name || prev.customer_name || user.email.split('@')[0],
        customer_email: user.email || prev.customer_email,
      }));
    }
  }, [user]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const update = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="analyzing">
        <div className="spinner" />
        <h2>SupportAgent is working…</h2>
        <ol className="analyze-steps">
          <li>Reading ticket &amp; customer context</li>
          <li>Searching company knowledge</li>
          <li>Reasoning with the LLM</li>
          <li>Validating output &amp; applying policy</li>
        </ol>
      </div>
    );

  if (error)
    return (
      <div className="center-col">
        <div className="banner red">
          <strong>Error:</strong> {error}
        </div>
        <button className="btn ghost" onClick={() => setError(null)}>
          Try again
        </button>
      </div>
    );

  if (result)
    return (
      <AnalysisResult result={result} onReset={() => { setResult(null); }} />
    );

  return (
    <form className="ticket-form card" onSubmit={submit}>
      <h1>Create a support ticket</h1>
      <p className="muted">
        Submit your issue and our AI agent will analyze it right away.
      </p>

      <label>
        Name
        <input
          required
          value={form.customer_name}
          onChange={update('customer_name')}
          placeholder="John Doe"
        />
      </label>
      <label>
        Email
        <input
          required
          type="email"
          value={form.customer_email}
          onChange={update('customer_email')}
          placeholder="john@example.com"
        />
      </label>
      <label>
        Subject
        <input
          required
          value={form.subject}
          onChange={update('subject')}
          placeholder="I paid for premium but my account still says free"
        />
      </label>
      <label>
        Message
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={update('message')}
          placeholder="Describe what happened…"
        />
      </label>

      <button className="btn primary big" type="submit">
        Submit ticket
      </button>
    </form>
  );
}

export default TicketPage;
