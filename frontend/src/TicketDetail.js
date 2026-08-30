import { useState, useEffect } from 'react';
import API_BASE from './api';

function TicketDetail({ ticketId, onBack }) {
  const [data, setData] = useState(null); // { ticket, customer, analysis }
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const loadTicket = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}`);
      if (res.status === 404) throw new Error(`Ticket #${ticketId} was not found in the database.`);
      if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
      setData(await res.json());

      const logRes = await fetch(`${API_BASE}/api/tickets/${ticketId}/activity`);
      if (logRes.ok) {
        const logs = await logRes.json();
        setActivityLogs(Array.isArray(logs) ? logs : []);
      }
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Could not reach the backend server. Is it running?'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) loadTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const runAction = async (action, body, method = 'POST') => {
    setActionBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/${action}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Server responded with status ${res.status}`);
      }
      await loadTicket(); // refresh ticket status + audit trail
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Could not reach the backend server.' : err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleStatusChange = (newStatus) => {
    if (!newStatus || newStatus === status) return;
    runAction('status', { status: newStatus }, 'PUT');
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete ticket #${ticketId}? This cannot be undone.`)) return;
    setActionBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}`, { method: 'DELETE' });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Server responded with status ${res.status}`);
      }
      onBack(); // ticket is gone — return to the dashboard
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Could not reach the backend server.' : err.message);
      setActionBusy(false);
    }
  };

  const handlePostReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || actionBusy) return;
    const text = replyText.trim();
    setReplyText('');
    runAction('respond', { response_text: text });
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <button className="btn secondary small-btn" onClick={onBack} style={{ marginBottom: '20px' }}>
          ← Back to Support Dashboard
        </button>
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          Loading ticket #{ticketId} from database...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <button className="btn secondary small-btn" onClick={onBack} style={{ marginBottom: '20px' }}>
          ← Back to Support Dashboard
        </button>
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--accent-rose)' }}>
          {error}
        </div>
      </div>
    );
  }

  const ticket = data?.ticket || {};
  const customer = data?.customer || {};
  const analysis = data?.analysis || {};
  const status = ticket.status || 'OPEN';

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <button className="btn secondary small-btn" onClick={onBack} style={{ marginBottom: '20px' }}>
        ← Back to Support Dashboard
      </button>

      {/* Ticket Overview Card (support_tickets & customers schema) */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: 'var(--accent-purple)', fontWeight: '700' }}>
              TCK-{ticket.id || ticketId}
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0' }}>
              {ticket.subject}
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Customer: <strong>{customer.name || 'Unknown'} ({customer.email || '—'})</strong> • Plan: <strong>{(customer.plan || '—').toUpperCase()}</strong> • Category: <strong>{ticket.category || '—'}</strong> • Priority: <strong style={{ color: ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--accent-cyan)' }}>{ticket.priority || '—'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className={`status-badge status-${status.toLowerCase().replace(/_/g, '-')}`}>
              {status.replace(/_/g, ' ')}
            </span>
            <select
              className="input-field"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={actionBusy}
              style={{ padding: '6px 12px', fontSize: '12px' }}
              title="Set ticket status"
            >
              {['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED'].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <button
              className="btn secondary"
              disabled={actionBusy}
              onClick={handleDelete}
              style={{ color: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
              title="Permanently delete this ticket"
            >
              {actionBusy ? 'Working...' : '🗑 Delete Ticket'}
            </button>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-input)',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
          }}
        >
          <strong>Customer Message:</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>{ticket.message}</p>
        </div>
      </div>

      {/* AI Analyses Traceability Card (ai_analyses schema) */}
      <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--accent-purple)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 12px', color: 'var(--accent-purple)' }}>
          AI Analysis & Traceability Layer (ai_analyses table)
        </h3>

        {analysis.intent ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '14px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Detected Intent:</span><br />
                <strong>{analysis.intent}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>AI Confidence:</span><br />
                <strong style={{ color: 'var(--accent-emerald)' }}>{analysis.confidence != null ? `${(analysis.confidence * 100).toFixed(0)}%` : '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Final Decision:</span><br />
                <strong>{analysis.final_decision || analysis.recommended_action || '—'}</strong>
              </div>
            </div>

            <div style={{ fontSize: '13px', background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', marginBottom: '14px' }}>
              <strong>Reasoning Summary:</strong>
              <p style={{ margin: '4px 0 8px', color: 'var(--text-secondary)' }}>
                {analysis.reasoning_summary || '—'}
              </p>
              <strong>Suggested Response:</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--accent-cyan)' }}>
                {analysis.suggested_response || '—'}
              </p>
            </div>

            {/* Human-in-the-loop actions */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button className="btn primary" disabled={actionBusy} onClick={() => runAction('approve')}>
                {actionBusy ? 'Working...' : '✓ Approve & Send Suggested Response'}
              </button>
              <button className="btn secondary" disabled={actionBusy} onClick={() => runAction('reject')}>
                ✗ Reject & Escalate
              </button>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
            No AI analysis has been recorded for this ticket yet.
          </p>
        )}
      </div>

      {/* Activity Logs (activity_logs schema) */}
      <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '14px' }}>
        Audit Trail & Activity Logs (activity_logs table)
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {activityLogs.length === 0 ? (
          <div className="card" style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            No activity recorded for this ticket yet.
          </div>
        ) : (
          activityLogs.map((log) => (
            <div key={log.id} className="card" style={{ padding: '16px 20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <strong style={{ fontSize: '14px', textTransform: 'capitalize' }}>{log.actor || 'system'}</strong>
                  <span
                    style={{
                      fontSize: '11px',
                      marginLeft: '8px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: 'var(--bg-input)',
                      color: 'var(--accent-cyan)',
                      fontWeight: '700',
                    }}
                  >
                    {log.action}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                </span>
              </div>
              {log.details && Object.keys(log.details).length > 0 && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                  {JSON.stringify(log.details)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reply Box */}
      <form onSubmit={handlePostReply} className="card" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="input-field"
          style={{ flex: '1 1 300px' }}
          placeholder="Write an official agent response (sent to the customer by email)..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          disabled={actionBusy}
        />
        <button type="submit" className="btn primary" disabled={actionBusy || !replyText.trim()}>
          {actionBusy ? 'Working...' : 'Send Reply & Resolve'}
        </button>
      </form>

      {error && (
        <p style={{ color: 'var(--accent-rose)', fontSize: '13px', marginTop: '12px' }}>{error}</p>
      )}
    </div>
  );
}

export default TicketDetail;
