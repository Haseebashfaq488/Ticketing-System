import { useEffect, useState } from 'react';

function Dashboard({ onSelectTicket }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <div className="analyzing"><div className="spinner" /><p>Loading dashboard…</p></div>;
  if (!data) return <div className="banner red">Failed to load dashboard</div>;

  return (
    <div className="dashboard">
      <h1>Support Dashboard</h1>

      <div className="stats">
        <div className="card stat">
          <span className="stat-label">Total</span>
          <span className="stat-value">{data.total}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Open</span>
          <span className="stat-value blue">{data.open}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Needs Review</span>
          <span className="stat-value amber">{data.pending_review}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Resolved</span>
          <span className="stat-value green">{data.resolved}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Escalated</span>
          <span className="stat-value red">{data.escalated}</span>
        </div>
      </div>

      <div className="card ticket-table">
        <h3>All Tickets</h3>
        {data.tickets.length === 0 ? (
          <p className="muted">No tickets yet. Submit one from the Ticket page.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.tickets.map(t => (
                <tr key={t.ticket_id} onClick={() => onSelectTicket(t.ticket_id)} className="clickable">
                  <td>{t.ticket_id}</td>
                  <td>{t.customer_name}</td>
                  <td>{t.subject}</td>
                  <td><span className={`badge ${t.priority?.toLowerCase()}`}>{t.priority}</span></td>
                  <td><span className="badge cat">{t.category}</span></td>
                  <td><span className={`badge status ${t.status?.toLowerCase()?.replace('_', '-')}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
