import { useState } from 'react';

function TicketDetail({ ticketId, onBack }) {
  const [status, setStatus] = useState('ESCALATED');
  const [replyText, setReplyText] = useState('');
  const [activityLogs, setActivityLogs] = useState([
    {
      id: 1,
      actor: 'AI Analysis Engine (gemini-3.6-flash)',
      action: 'AI_DIAGNOSIS_LOGGED',
      time: '15 mins ago',
      details: 'Intent: API Access Failure | Confidence: 94% | Recommended Action: Refresh rate limit in customers table.',
    },
    {
      id: 2,
      actor: 'John Support Lead (agent@novaware.com)',
      action: 'TICKET_ESCALATED',
      time: '10 mins ago',
      details: 'Assigned ticket to Tier-2 Agent Support. Status updated to ESCALATED.',
    },
  ]);

  const handlePostReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setActivityLogs([
      ...activityLogs,
      {
        id: Date.now(),
        actor: 'Support Agent (You)',
        action: 'AGENT_REPLY_POSTED',
        time: 'Just now',
        details: replyText,
      },
    ]);
    setReplyText('');
  };

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
              {ticketId || 'TCK-8901'}
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0' }}>
              Cannot access API endpoint in production
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Customer: <strong>John Doe (john@example.com)</strong> • Category: <strong>TECHNICAL</strong> • Priority: <strong style={{ color: 'var(--accent-rose)' }}>HIGH</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`status-badge status-${status.toLowerCase().replace(/_/g, '-')}`}>
              {status.replace(/_/g, ' ')}
            </span>
            <select
              className="input-field"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="WAITING_FOR_CUSTOMER">WAITING FOR CUSTOMER</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-input)',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            lineHeight: 1.6,
          }}
        >
          <strong>Customer Message (support_tickets.message):</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>
            When attempting to make HTTP POST requests to <code>/api/v1/tickets/batch</code>, 
            the server responds with a 401 Unauthorized status despite passing the access token.
          </p>
        </div>
      </div>

      {/* AI Analyses Traceability Card (ai_analyses schema) */}
      <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--accent-purple)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 12px', color: 'var(--accent-purple)' }}>
          AI Analysis & Traceability Layer (ai_analyses table)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px', fontSize: '13px' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Detected Intent:</span><br />
            <strong>API Access Failure</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>AI Confidence:</span><br />
            <strong style={{ color: 'var(--accent-emerald)' }}>94%</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Model Used:</span><br />
            <strong>gemini-3.6-flash</strong>
          </div>
        </div>

        <div style={{ fontSize: '13px', background: 'var(--bg-input)', padding: '12px', borderRadius: '10px' }}>
          <strong>Reasoning Summary:</strong>
          <p style={{ margin: '4px 0 8px', color: 'var(--text-secondary)' }}>
            Suspected API key rate limit or missing Bearer authorization header. Verified customer plan is Active Premium.
          </p>
          <strong>Recommended Action:</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--accent-cyan)' }}>
            Refresh customer API rate limits in customers table and dispatch documentation links.
          </p>
        </div>
      </div>

      {/* Activity Logs (activity_logs schema) */}
      <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '14px' }}>
        Audit Trail & Activity Logs (activity_logs table)
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {activityLogs.map((log) => (
          <div key={log.id} className="card" style={{ padding: '16px 20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <div>
                <strong style={{ fontSize: '14px' }}>{log.actor}</strong>
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
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.time}</span>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{log.details}</div>
          </div>
        ))}
      </div>

      {/* Reply Box */}
      <form onSubmit={handlePostReply} className="card" style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          className="input-field"
          placeholder="Write an official agent response or log activity note..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
        />
        <button type="submit" className="btn primary">
          Post Reply
        </button>
      </form>
    </div>
  );
}

export default TicketDetail;
