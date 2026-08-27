import { useState } from 'react';

const INITIAL_TICKETS = [
  {
    id: 'TCK-8901',
    customer: 'john@example.com',
    subject: 'Cannot access API endpoint in production',
    category: 'Technical',
    status: 'urgent',
    priority: 'High',
    created: '10 mins ago',
    aiDiagnosis: 'Suspected API key rate limit or missing header authorization.',
  },
  {
    id: 'TCK-8902',
    customer: 'alex@example.com',
    subject: 'Request for Gold Subscription Invoice',
    category: 'Billing',
    status: 'pending',
    priority: 'Medium',
    created: '25 mins ago',
    aiDiagnosis: 'Billing invoice request; requires account agent verification.',
  },
  {
    id: 'TCK-8903',
    customer: 'sarah@cloudscale.io',
    subject: 'Custom webhook payload configuration inquiry',
    category: 'Feature Request',
    status: 'open',
    priority: 'Low',
    created: '1 hour ago',
    aiDiagnosis: 'Documentation match found for Webhook v2 integration.',
  },
  {
    id: 'TCK-8904',
    customer: 'mike@techgroup.com',
    subject: 'Password reset email link expired',
    category: 'Account',
    status: 'resolved',
    priority: 'Medium',
    created: '3 hours ago',
    aiDiagnosis: 'Auto-resolved via magic link dispatch.',
  },
];

function Dashboard({ user, onSelectTicket }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = INITIAL_TICKETS.filter((t) => {
    const matchesFilter = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch =
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 6px' }}>
            Support <span className="grad-text">Dashboard & Queue</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Real-time analytics, automated AI diagnosis, and active ticket dispatch center.
          </p>
        </div>

        <button className="btn primary" onClick={() => onSelectTicket('TCK-8901')}>
          Inspect High Priority Ticket
        </button>
      </div>

      {/* Stats Widgets */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg className="icon-svg large" viewBox="0 0 24 24">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            </svg>
          </div>
          <div>
            <div className="stat-value">124</div>
            <div className="stat-label">Total Tickets Today</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg className="icon-svg large" viewBox="0 0 24 24">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>1.2 min</div>
            <div className="stat-label">Avg AI Response Time</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg className="icon-svg large" viewBox="0 0 24 24">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>94.8%</div>
            <div className="stat-label">Resolution Rate</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg className="icon-svg large" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>4.92 / 5</div>
            <div className="stat-label">CSAT Score</div>
          </div>
        </div>
      </div>

      {/* Queue Toolbar & Search */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="filter-bar">
          <div className="filter-pills">
            {['all', 'urgent', 'open', 'pending', 'resolved'].map((st) => (
              <button
                key={st}
                className={`filter-pill ${filterStatus === st ? 'active' : ''}`}
                onClick={() => setFilterStatus(st)}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>

          <input
            type="text"
            className="input-field"
            placeholder="Search tickets by subject or customer email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: '320px' }}
          />
        </div>

        {/* Tickets Data Table */}
        <table className="ticket-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Customer</th>
              <th>Subject & AI Summary</th>
              <th>Category</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((t) => (
              <tr key={t.id} onClick={() => onSelectTicket(t.id)}>
                <td style={{ fontWeight: '700', color: 'var(--accent-purple)' }}>{t.id}</td>
                <td>{t.customer}</td>
                <td>
                  <div style={{ fontWeight: '600' }}>{t.subject}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    AI Summary: {t.aiDiagnosis}
                  </div>
                </td>
                <td>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'var(--bg-input)',
                    }}
                  >
                    {t.category}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${t.status}`}>
                    {t.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
