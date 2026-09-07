import { useState, useEffect } from 'react';
import API_BASE from './api';
import SupportAnalytics from './SupportAnalytics';

function Dashboard({ user, onSelectTicket }) {
  const [dashboardTab, setDashboardTab] = useState('analytics'); // 'analytics' | 'queue'
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tickets`);
      if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Could not load tickets from the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = tickets.filter((t) => {
    const matchesFilter = filterStatus === 'ALL' || t.status === filterStatus;
    const haystack = `${t.subject || ''} ${t.customer_name || ''} ${t.ticket_id} ${t.category || ''}`.toLowerCase();
    return matchesFilter && haystack.includes(searchQuery.toLowerCase());
  });

  const openCount = tickets.filter((t) => ['OPEN', 'IN_PROGRESS'].includes(t.status)).length;
  const escalatedCount = tickets.filter((t) => t.status === 'ESCALATED').length;
  const resolvedCount = tickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length;

  const handleDelete = async (e, ticketId) => {
    e.stopPropagation(); // don't open the ticket detail page
    if (!window.confirm(`Permanently delete ticket TCK-${ticketId}? This cannot be undone.`)) return;
    setDeletingId(ticketId);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setTickets((prev) => prev.filter((t) => t.ticket_id !== ticketId));
    } catch (err) {
      setError('Could not delete the ticket. Is the backend running?');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Top Section / Subnavigation Header */}
      <div className="dashboard-top-nav-bar">
        <div className="dashboard-tab-pills">
          <button
            className={`dashboard-nav-pill ${dashboardTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setDashboardTab('analytics')}
          >
            <svg className="icon-svg" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Analytics & SLA Intelligence
          </button>
          <button
            className={`dashboard-nav-pill ${dashboardTab === 'queue' ? 'active' : ''}`}
            onClick={() => setDashboardTab('queue')}
          >
            <svg className="icon-svg" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            Live Ticket Queue ({tickets.length})
          </button>
        </div>

        <div className="dashboard-actions-right">
          <button className="btn secondary small-btn" onClick={loadTickets} disabled={loading}>
            {loading ? '↻ Syncing...' : '↻ Refresh Queue'}
          </button>
        </div>
      </div>

      {/* View 1: Analytics Dashboard */}
      {dashboardTab === 'analytics' && (
        <SupportAnalytics tickets={tickets} />
      )}

      {/* View 2: Live Queue & Database Table */}
      {dashboardTab === 'queue' && (
        <div className="animate-fade-in" style={{ marginTop: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px' }}>
                Support <span className="grad-text">Queue & Database</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
                Real-time support_tickets & ai_analyses database records with triage statuses.
              </p>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-icon">
                <svg className="icon-svg large" viewBox="0 0 24 24">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                </svg>
              </div>
              <div>
                <div className="stat-value">{tickets.length}</div>
                <div className="stat-label">Total Database Tickets</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <svg className="icon-svg large" viewBox="0 0 24 24">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div>
                <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{openCount}</div>
                <div className="stat-label">Open / In Progress</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <svg className="icon-svg large" viewBox="0 0 24 24">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <div className="stat-value" style={{ color: 'var(--accent-rose)' }}>{escalatedCount}</div>
                <div className="stat-label">Escalated</div>
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
                <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>{resolvedCount}</div>
                <div className="stat-label">Resolved / Closed</div>
              </div>
            </div>
          </div>

          {/* Queue Toolbar & Search */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="filter-bar">
              <div className="filter-pills" style={{ flexWrap: 'wrap' }}>
                {['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED'].map((st) => (
                  <button
                    key={st}
                    className={`filter-pill ${filterStatus === st ? 'active' : ''}`}
                    onClick={() => setFilterStatus(st)}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              <input
                type="text"
                className="input-field"
                placeholder="Search tickets, customers, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ maxWidth: '280px' }}
              />
            </div>

            {/* Responsive Table Wrapper */}
            <div className="table-responsive-wrapper">
              <table className="ticket-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Customer</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                        Loading tickets from database...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--accent-rose)' }}>
                        {error}
                      </td>
                    </tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                        No tickets found. Submit a ticket or convert a live chat to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t) => (
                      <tr key={t.ticket_id} onClick={() => onSelectTicket(t.ticket_id)}>
                        <td style={{ fontWeight: '700', color: 'var(--accent-purple)' }}>
                          TCK-{t.ticket_id}
                        </td>
                        <td style={{ fontSize: '13px' }}>{t.customer_name || 'Unknown'}</td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{t.subject}</div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg-input)',
                              fontWeight: '700',
                            }}
                          >
                            {t.category || '—'}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              color: t.priority === 'HIGH' || t.priority === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--accent-cyan)',
                            }}
                          >
                            {t.priority || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${(t.status || 'open').toLowerCase().replace(/_/g, '-')}`}>
                            {(t.status || 'OPEN').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <button
                            className="btn secondary small-btn"
                            disabled={deletingId === t.ticket_id}
                            onClick={(e) => handleDelete(e, t.ticket_id)}
                            style={{ color: 'var(--accent-rose)', borderColor: 'var(--accent-rose)', padding: '4px 10px', fontSize: '11px' }}
                            title={`Delete ticket TCK-${t.ticket_id}`}
                          >
                            {deletingId === t.ticket_id ? '...' : '🗑 Delete'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
