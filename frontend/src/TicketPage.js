import { useState } from 'react';
import API_BASE from './api';

function TicketPage({ user, onGoChat, onTicketCreated, isAdmin, onGoHome }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('TECHNICAL');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [attachedFile, setAttachedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // backend response with AI analysis

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const customerName =
        user?.user_metadata?.name ||
        user?.name ||
        email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_email: email,
          subject,
          message: description,
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Server responded with status ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
      if (onTicketCreated) onTicketCreated();
      // If user is a customer, redirect to homepage after ticket submission
      if (!isAdmin && onGoHome) {
        setTimeout(() => {
          onGoHome();
        }, 1500);
      }
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Could not reach the backend server. Is it running?'
          : err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setResult(null);
    setSubject('');
    setCategory('TECHNICAL');
    setDescription('');
    setAttachedFile(null);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 6px' }}>
          Submit a <span className="grad-text">Support Ticket</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Describe your issue below. Our AI engine will analyze urgency, log the ticket, and assign it to a specialist.
        </p>
      </div>

      {submitted ? (
        <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ marginBottom: '16px' }}>
            <svg className="icon-svg" style={{ width: '48px', height: '48px', color: 'var(--accent-emerald)' }} viewBox="0 0 24 24">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 10px' }}>
            Ticket Submitted &amp; AI Logged!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Ticket Reference ID <strong style={{ color: 'var(--accent-purple)' }}>#TCK-{result?.ticket_id || '—'}</strong> has been stored in the <code>support_tickets</code> database table.
          </p>
          {!isAdmin && (
            <p style={{ color: 'var(--accent-emerald)', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
              ✓ Redirecting you to the Homepage...
            </p>
          )}
          {result?.analysis && (
            <div
              style={{
                textAlign: 'left',
                background: 'var(--bg-input)',
                borderRadius: '10px',
                padding: '16px 20px',
                margin: '0 auto 24px',
                maxWidth: '560px',
                fontSize: '13px',
                lineHeight: 1.7,
              }}
            >
              <div style={{ fontWeight: '800', marginBottom: '6px', color: 'var(--accent-purple)' }}>
                AI Analysis ({result.analysis.model_used || 'AI engine'})
              </div>
              <div><strong>Priority:</strong> {result.analysis.priority}</div>
              <div><strong>Category:</strong> {result.analysis.category}</div>
              <div><strong>Intent:</strong> {result.analysis.intent} (confidence {(result.analysis.confidence * 100).toFixed(0)}%)</div>
              <div><strong>Reasoning:</strong> {result.analysis.reasoning_summary}</div>
              <div><strong>Recommended action:</strong> {result.analysis.recommended_action}</div>
            </div>
          )}
          {result?.email_sent?.error ? (
            <p style={{ color: 'var(--accent-amber)', marginBottom: '24px', fontSize: '13px' }}>
              Note: the confirmation email could not be sent ({String(result.email_sent.error).slice(0, 120)}).
            </p>
          ) : null}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={resetForm}>
              Submit Another Ticket
            </button>
            {isAdmin ? (
              <button className="btn secondary" onClick={() => onTicketCreated && onTicketCreated(result?.ticket_id)}>
                View Dashboard
              </button>
            ) : (
              <button className="btn secondary" onClick={onGoHome}>
                Return to Homepage
              </button>
            )}
            <button className="btn secondary" onClick={onGoChat}>
              Talk to Live AI Assistant
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Your Customer Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="TECHNICAL">TECHNICAL</option>
                <option value="BILLING">BILLING</option>
                <option value="ACCOUNT">ACCOUNT</option>
                <option value="REFUND">REFUND</option>
                <option value="SECURITY">SECURITY</option>
                <option value="FEATURE_REQUEST">FEATURE REQUEST</option>
                <option value="GENERAL">GENERAL</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ticket Subject</label>
              <input
                type="text"
                className="input-field"
                placeholder="Brief summary of the issue (e.g. API 401 Unauthorized Error)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Problem Description (Message)</label>
              <textarea
                className="input-field"
                rows="5"
                placeholder="Provide steps to reproduce, error logs, or account details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* File Attachment Simulator */}
            <div className="form-group">
              <label className="form-label">Attachments (Optional)</label>
              <label
                className="btn secondary"
                style={{ width: '100%', borderStyle: 'dashed', cursor: 'pointer' }}
              >
                {attachedFile ? attachedFile.name : 'Upload Screenshot / Log File'}
                <input
                  type="file"
                  style={{ display: 'none' }}
                  onChange={(e) => setAttachedFile(e.target.files[0])}
                />
              </label>
            </div>

            <button type="submit" className="btn primary" style={{ width: '100%', padding: '14px' }} disabled={submitting}>
              {submitting ? 'Analyzing with AI... (this can take up to a minute)' : 'Submit Ticket & Trigger AI Analysis'}
            </button>

            {error && (
              <p style={{ color: 'var(--accent-rose)', margin: 0, fontSize: '13px', textAlign: 'center' }}>{error}</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

export default TicketPage;
