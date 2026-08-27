import { useState } from 'react';

function TicketDetail({ ticketId, onBack }) {
  const [status, setStatus] = useState('open');
  const [replyText, setReplyText] = useState('');
  const [comments, setComments] = useState([
    {
      id: 1,
      author: 'AI Diagnostic Engine',
      role: 'System Bot',
      time: '15 mins ago',
      text: 'Diagnostic completed: Recommended resolution is to verify authorization headers in environment config.',
    },
    {
      id: 2,
      author: 'John Support Lead',
      role: 'Human Agent',
      time: '5 mins ago',
      text: 'Checked customer account. Rate limit refreshed.',
    },
  ]);

  const handlePostReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setComments([
      ...comments,
      {
        id: Date.now(),
        author: 'You (Agent)',
        role: 'Support Specialist',
        time: 'Just now',
        text: replyText,
      },
    ]);
    setReplyText('');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <button className="btn secondary small-btn" onClick={onBack} style={{ marginBottom: '20px' }}>
        ← Back to Support Dashboard
      </button>

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
              Submitted by <strong>john@example.com</strong> • Category: <strong>Technical</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`status-badge status-${status}`}>{status.toUpperCase()}</span>
            <select
              className="input-field"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <option value="open">Mark Open</option>
              <option value="pending">Mark Pending</option>
              <option value="resolved">Mark Resolved</option>
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
          <strong>Initial Problem Description:</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>
            When attempting to make HTTP POST requests to <code>/api/v1/tickets/batch</code>, 
            the server responds with a 401 Unauthorized status despite passing the access token.
          </p>
        </div>
      </div>

      {/* Discussion Timeline */}
      <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '14px' }}>
        💬 Activity & Discussion Thread
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {comments.map((c) => (
          <div key={c.id} className="card" style={{ padding: '16px 20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <div>
                <strong style={{ fontSize: '14px' }}>{c.author}</strong>
                <span
                  style={{
                    fontSize: '11px',
                    marginLeft: '8px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'var(--bg-input)',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  {c.role}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.time}</span>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{c.text}</div>
          </div>
        ))}
      </div>

      {/* Reply Box */}
      <form onSubmit={handlePostReply} className="card" style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          className="input-field"
          placeholder="Write an official response or internal note..."
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
