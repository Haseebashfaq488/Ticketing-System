import { useState, useEffect } from 'react';
import API_BASE from './api';

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'ESCALATED', label: 'Escalated' },
];

const normalize = (s) => String(s || '').trim().toLowerCase();

// Build a set of identifiers (email + display names) that the signed-in
// customer may appear as in the `support_tickets.customer_name` column.
const buildCustomerIds = (email, profileName, user) => {
  const ids = new Set();
  const add = (v) => {
    const n = normalize(v);
    if (n) ids.add(n);
  };
  if (email) {
    add(email);
    add(email.split('@')[0]);
  }
  add(profileName);
  add(user?.name);
  add(user?.user_metadata?.name);
  add(user?.user_metadata?.full_name);
  add(user?.user_metadata?.fullName);
  (user?.identities || []).forEach((id) => add(id?.identity_data?.name));
  return ids;
};

// Decide if a ticket row belongs to the signed-in customer.
const isMine = (ticket, ids) => {
  if (!ids || ids.size === 0) return false;
  const cn = normalize(ticket.customer_name);
  if (!cn) return false;
  // Exact name match (e.g. profile name "Haseeb ashfaq").
  if (ids.has(cn)) return true;
  const cnFlat = cn.replace(/\s+/g, '');
  for (const id of ids) {
    if (id.includes('@')) continue; // emails handled by the exact match above
    if (cnFlat === id.replace(/\s+/g, '')) return true; // "haseeb ashfaq" === "haseebashfaq"
    if (cn.split(/\s+/).includes(id)) return true; // first-name === email local part
  }
  return false;
};

// The backend may return a plain array or the paginated envelope
// `{ value: [...], Count }` — normalize both into a flat ticket list.
const extractTickets = (raw) =>
  Array.isArray(raw) ? raw : Array.isArray(raw?.value) ? raw.value : [];

function MyTicketsPage({ user, onGoSubmitTicket, onGoChat }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const email = user?.email || '';

  const loadMyTickets = async () => {
    if (!email) {
      setTickets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Best-effort: resolve the customer display name from the profile so we
      // can match tickets that are stored under `customer_name`.
      let profileName = '';
      try {
        const profileRes = await fetch(
          `${API_BASE}/api/profile?email=${encodeURIComponent(email)}`
        );
        if (profileRes.ok) {
          const p = await profileRes.json();
          profileName = p?.name || '';
        }
      } catch {
        /* profile lookup is optional — fall back to email-based matching */
      }

      const res = await fetch(`${API_BASE}/api/tickets`);
      if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
      const raw = await res.json();
      const allTickets = extractTickets(raw);
      const ids = buildCustomerIds(email, profileName, user);
      setTickets(allTickets.filter((t) => isMine(t, ids)));
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Could not reach the server. Is the backend running?'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const handleToggleExpand = (ticketId) => {
    setExpandedId(expandedId === ticketId ? null : ticketId);
  };

  const priorityColor = (p) => {
    if (p === 'CRITICAL' || p === 'HIGH') return 'var(--accent-rose)';
    if (p === 'MEDIUM') return 'var(--accent-amber)';
    return 'var(--accent-cyan)';
  };

  const statusIcon = (s) => {
    const st = (s || 'OPEN').toUpperCase();
    if (st === 'RESOLVED' || st === 'CLOSED') return '✓';
    if (st === 'ESCALATED') return '⚠';
    if (st === 'IN_PROGRESS') return '⏳';
    if (st === 'WAITING_FOR_CUSTOMER') return '📩';
    return '●';
  };

  // Apply the active status filter + text search (without mutating `tickets`).
  const filteredTickets = [...tickets]
    .filter((t) => statusFilter === 'ALL' || (t.status || 'OPEN') === statusFilter)
    .filter((t) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const hay = `${t.ticket_id} ${t.subject || ''} ${t.category || ''} ${t.priority || ''} ${t.status || ''}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (loading) {
    return (
      <div className="animate-fade-in">
        <h2 style={{ color: 'var(--text-secondary)', margin: '0 0 16px' }}>Loading your tickets…</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="card" style={{ pointerEvents: 'none' }}>
              <div style={{ height: '18px', width: '35%', background: 'var(--bg-input)', borderRadius: '6px', marginBottom: '12px' }} />
              <div style={{ height: '13px', width: '75%', background: 'var(--bg-input)', borderRadius: '6px', marginBottom: '8px' }} />
              <div style={{ height: '13px', width: '50%', background: 'var(--bg-input)', borderRadius: '6px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 6px' }}>
          My <span className="grad-text">Support Tickets</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px' }}>
          View and track all your submitted support tickets and their current status.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn primary small-btn" onClick={onGoSubmitTicket}>
            + Submit New Ticket
          </button>
          <button className="btn secondary small-btn" onClick={onGoChat}>
            💬 Start Live Chat
          </button>
          <button className="btn secondary small-btn" onClick={loadMyTickets} disabled={loading}>
            ↻ Refresh
          </button>
        </div>

        {/* Filter + Search toolbar */}
        <div className="filter-pills" style={{ marginTop: '18px', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-pill ${statusFilter === f.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="input-field"
          placeholder="Search by subject, ID, category, or priority…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginTop: '12px' }}
        />
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '12px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            fontWeight: '600',
          }}
        >
          {error}
        </div>
      )}

      {/* Stats Summary */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon">
            <svg className="icon-svg large" viewBox="0 0 24 24">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            </svg>
          </div>
          <div>
            <div className="stat-value">{tickets.length}</div>
            <div className="stat-label">Total Tickets</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg className="icon-svg large" viewBox="0 0 24 24">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
              {tickets.filter((t) => ['OPEN', 'IN_PROGRESS'].includes(t.status)).length}
            </div>
            <div className="stat-label">Active</div>
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
            <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
              {tickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length}
            </div>
            <div className="stat-label">Resolved</div>
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
            <div className="stat-value" style={{ color: 'var(--accent-rose)' }}>
              {tickets.filter((t) => t.status === 'ESCALATED').length}
            </div>
            <div className="stat-label">Escalated</div>
          </div>
        </div>
      </div>

      {/* Ticket Cards */}
      {filteredTickets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ marginBottom: '16px' }}>
            <svg
              className="icon-svg"
              style={{ width: '48px', height: '48px', color: 'var(--text-secondary)' }}
              viewBox="0 0 24 24"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            </svg>
          </div>
          {tickets.length === 0 ? (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 10px' }}>
                No Tickets Yet
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                You haven't submitted any support tickets yet. Create one to get started!
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn primary" onClick={onGoSubmitTicket}>
                  Submit Your First Ticket
                </button>
                <button className="btn secondary" onClick={onGoChat}>
                  Start a Live Chat Instead
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 10px' }}>
                No Matching Tickets
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                No tickets match your current filter or search.
              </p>
              <button
                className="btn secondary"
                onClick={() => {
                  setStatusFilter('ALL');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {filteredTickets.length !== tickets.length && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              Showing <strong>{filteredTickets.length}</strong> of {tickets.length} tickets
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredTickets.map((t) => {
              const isExpanded = expandedId === t.ticket_id;

              return (
                <div
                  key={t.ticket_id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderLeft: `4px solid ${priorityColor(t.priority)}`,
                  }}
                  onClick={() => handleToggleExpand(t.ticket_id)}
                >
                  {/* Ticket Header Row */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '6px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '13px',
                            color: 'var(--accent-purple)',
                            fontWeight: '700',
                          }}
                        >
                          TCK-{t.ticket_id}
                        </span>
                        <span
                          className={`status-badge status-${(t.status || 'open')
                            .toLowerCase()
                            .replace(/_/g, '-')}`}
                        >
                          {statusIcon(t.status)} {(t.status || 'OPEN').replace(/_/g, ' ')}
                        </span>
                        {t.priority && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              color: priorityColor(t.priority),
                            }}
                          >
                            {t.priority}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px' }}>
                        {t.subject || 'Untitled Ticket'}
                      </h3>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          gap: '16px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {t.category && <span>Category: <strong>{t.category}</strong></span>}
                        {t.created_at && (
                          <span>Submitted: <strong>{new Date(t.created_at).toLocaleDateString()}</strong></span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '18px',
                        transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      ▼
                    </div>
                  </div>

                  {/* Expanded Detail Section */}
                  {isExpanded && (
                    <div
                      className="animate-fade-in"
                      style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h4
                        style={{
                          fontSize: '12px',
                          fontWeight: '800',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          margin: '0 0 10px',
                        }}
                      >
                        Ticket Summary
                      </h4>

                      {/* Basic Ticket Metadata */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                          gap: '10px',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                            <div>
                              <span style={{ fontWeight: '700' }}>Status</span>
                              <br />
                              <span className={`status-badge status-${(t.status || 'open').toLowerCase().replace(/_/g, '-')}`}>
                                {(t.status || 'OPEN').replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div>
                              <span style={{ fontWeight: '700' }}>Priority</span>
                              <br />
                              <strong style={{ color: priorityColor(t.priority) }}>
                                {t.priority || '—'}
                              </strong>
                            </div>
                            <div>
                              <span style={{ fontWeight: '700' }}>Category</span>
                              <br />
                              <strong>{t.category || '—'}</strong>
                            </div>
                            <div>
                              <span style={{ fontWeight: '700' }}>Created</span>
                              <br />
                              <strong>
                                {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                              </strong>
                            </div>
                          </div>
                        </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default MyTicketsPage;
