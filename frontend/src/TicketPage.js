import { useState } from 'react';

function TicketPage({ user, onGoChat }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('TECHNICAL');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [attachedFile, setAttachedFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
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
            Ticket Submitted & AI Logged!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Ticket Reference ID <strong style={{ color: 'var(--accent-purple)' }}>#TCK-8905</strong> has been stored in <code>support_tickets</code> database table.
            An automated AI analysis has been triggered.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button className="btn primary" onClick={() => setSubmitted(false)}>
              Submit Another Ticket
            </button>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Category (schema.sql)</label>
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
                <label className="form-label">Priority Level (schema.sql)</label>
                <select
                  className="input-field"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
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

            <button type="submit" className="btn primary" style={{ width: '100%', padding: '14px' }}>
              Submit Ticket & Trigger AI Analysis
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default TicketPage;
