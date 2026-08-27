import { useEffect, useState } from 'react';

function TicketDetail({ ticketId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null);
  const [editText, setEditText] = useState('');

  const load = () => {
    setLoading(true);
    fetch(`/api/tickets/${ticketId}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(d => { setData(d); setEditText(d.analysis?.suggested_response || ''); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [ticketId]);

  const doAction = async (endpoint) => {
    setAction('working');
    try {
      const res = await fetch(`/api/tickets/${ticketId}/${endpoint}`, { method: 'POST' });
      if (res.ok) { load(); } else { setAction('error'); }
    } catch { setAction('error'); }
  };

  const doCustomRespond = async () => {
    setAction('working');
    try {
      const res = await fetch(`/api/tickets/${ticketId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editText),
      });
      if (res.ok) { load(); } else { setAction('error'); }
    } catch { setAction('error'); }
  };

  if (loading) return <div className="analyzing"><div className="spinner" /><p>Loading ticket…</p></div>;
  if (!data || !data.ticket) return <div className="banner red">Ticket not found</div>;

  const t = data.ticket;
  const c = data.customer || {};
  const a = data.analysis || {};
  const needsHuman = t.status === 'IN_PROGRESS' || t.status === 'PENDING_HUMAN_REVIEW' || t.status === 'HUMAN_REVIEW';

  return (
    <div className="result">
      <div className="result-head">
        <div>
          <button className="btn ghost small" onClick={onBack}>← Back to Dashboard</button>
          <h2>Ticket #{t.id}</h2>
          <p className="muted">{t.subject}</p>
        </div>
        <span className={`badge status ${t.status?.toLowerCase()?.replace('_', '-')}`}>{t.status}</span>
      </div>

      <div className="meta-grid">
        <div className="card stat">
          <span className="stat-label">Customer</span>
          <span>{c.name || 'Unknown'}</span>
          <span className="muted small">{c.email}</span>
          <span className="muted small">Plan: {c.plan}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Category</span>
          <span className="badge cat">{a.category}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Priority</span>
          <span className={`badge ${a.priority?.toLowerCase()}`}>{a.priority}</span>
        </div>
      </div>

      <div className="card stat">
        <span className="stat-label">Confidence</span>
        <div className="conf">
          <div className="conf-bar">
            <div className="conf-fill" style={{ width: `${Math.round((a.confidence || 0) * 100)}%` }} />
          </div>
          <span>{Math.round((a.confidence || 0) * 100)}%</span>
        </div>
      </div>

      <section className="card section">
        <h3>Customer message</h3>
        <pre className="draft">{t.message}</pre>
      </section>

      {a.reasoning_summary && (
        <section className="card section">
          <h3>AI reasoning</h3>
          <p>{a.reasoning_summary}</p>
          <p className="muted small">
            Intent: {a.intent}
            {a.knowledge_used?.length > 0 && ` · Knowledge used: ${a.knowledge_used.join(', ')}`}
          </p>
          <p className="muted small">
            AI recommendation: <code>{a.recommended_action}</code> → Decision: <code>{a.final_decision}</code>
          </p>
        </section>
      )}

      {a.suggested_response && (
        <section className="card section">
          <h3>Suggested response</h3>
          <pre className="draft">{a.suggested_response}</pre>

          {needsHuman && action !== 'done' && (
            <div className="review-actions">
              <button className="btn primary" onClick={() => doAction('approve')}>Approve &amp; Send</button>
              <button className="btn ghost" onClick={() => setAction('edit')}>Edit Response</button>
              <button className="btn danger" onClick={() => doAction('reject')}>Reject</button>
            </div>
          )}
          {action === 'edit' && (
            <div className="edit-area">
              <textarea rows={6} value={editText} onChange={e => setEditText(e.target.value)} />
              <div className="review-actions">
                <button className="btn primary" onClick={doCustomRespond}>Send Edited Response</button>
                <button className="btn ghost" onClick={() => setAction(null)}>Cancel</button>
              </div>
            </div>
          )}
        </section>
      )}

      {t.status === 'RESOLVED' && (
        <div className="banner green">This ticket has been resolved. Response sent to customer.</div>
      )}
      {t.status === 'ESCALATED' && (
        <div className="banner amber">This ticket has been escalated. A human agent is handling it.</div>
      )}
    </div>
  );
}

export default TicketDetail;
