import { useState } from 'react';

function TicketPage({ user, onGoChat }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Technical');
  const [priority, setPriority] = useState('Medium');
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
          Describe your issue below. Our AI engine will analyze urgency and assign it to the correct specialist.
        </p>
      </div>

      {submitted ? (
        <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 10px' }}>
            Ticket Submitted Successfully!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Your Ticket Reference ID is <strong style={{ color: 'var(--accent-purple)' }}>#TCK-8905</strong>. 
            An AI initial assessment has been dispatched to your email.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button className="btn primary" onClick={() => setSubmitted(false)}>
              Submit Another Ticket
            </button>
            <button className="btn secondary" onClick={onGoChat}>
              💬 Talk to Live AI Assistant
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Your Email Address</label>
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
                <label className="form-label">Category</label>
                <select
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>Technical</option>
                  <option>Billing & Subscriptions</option>
                  <option>Account & Access</option>
                  <option>Feature Request</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Urgency Priority</label>
                <select
                  className="input-field"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical / Urgent</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ticket Subject</label>
              <input
                type="text"
                className="input-field"
                placeholder="Brief summary of the issue (e.g. Cannot process credit card payment)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Description</label>
              <textarea
                className="input-field"
                rows="5"
                placeholder="Provide steps to reproduce, error codes, or relevant details..."
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
                📎 {attachedFile ? attachedFile.name : 'Upload Screenshot / Log File'}
                <input
                  type="file"
                  style={{ display: 'none' }}
                  onChange={(e) => setAttachedFile(e.target.files[0])}
                />
              </label>
            </div>

            <button type="submit" className="btn primary" style={{ width: '100%', padding: '14px' }}>
              🚀 Submit Ticket & Run AI Analysis
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default TicketPage;
