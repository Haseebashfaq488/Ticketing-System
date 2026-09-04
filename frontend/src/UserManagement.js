import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from './api';

function UserManagement({ user, actualRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'role'|'delete', userEmail, newRole, userName }
  const [submitting, setSubmitting] = useState(false);

  // Load Users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/users', { method: 'GET' }, user);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to fetch users (${res.status})`);
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[UserManagement] Error loading users:', err);
      setError(err.message || 'Error connecting to user management service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Handle Role Change Request
  const handleRoleChangeSelect = (targetUser, newRole) => {
    if (newRole === targetUser.role) return;
    setActionSuccess(null);
    setActionError(null);

    // Open confirmation modal
    setConfirmModal({
      type: 'role',
      targetEmail: targetUser.email,
      targetName: targetUser.full_name || targetUser.email,
      oldRole: targetUser.role,
      newRole: newRole,
    });
  };

  // Handle Delete Request
  const handleDeleteSelect = (targetUser) => {
    setActionSuccess(null);
    setActionError(null);

    setConfirmModal({
      type: 'delete',
      targetEmail: targetUser.email,
      targetName: targetUser.full_name || targetUser.email,
      currentRole: targetUser.role,
    });
  };

  // Confirm Modal Action Execution
  const executeModalAction = async () => {
    if (!confirmModal) return;
    setSubmitting(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      if (confirmModal.type === 'role') {
        const res = await apiFetch(
          `/api/users/${encodeURIComponent(confirmModal.targetEmail)}/role`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: confirmModal.newRole }),
          },
          user
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Failed to update user role.');
        }

        setActionSuccess(data.message || `Successfully updated ${confirmModal.targetName}'s role.`);
        setConfirmModal(null);
        await fetchUsers();
      } else if (confirmModal.type === 'delete') {
        const res = await apiFetch(
          `/api/users/${encodeURIComponent(confirmModal.targetEmail)}`,
          {
            method: 'DELETE',
          },
          user
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Failed to delete user.');
        }

        setActionSuccess(data.message || `User ${confirmModal.targetName} was deleted.`);
        setConfirmModal(null);
        await fetchUsers();
      }
    } catch (err) {
      console.error('[UserManagement] Action failed:', err);
      setActionError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Compute stats
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const agents = users.filter((u) => u.role === 'SUPPORT_AGENT').length;
    const customers = users.filter((u) => u.role === 'CUSTOMER').length;
    return { total, admins, agents, customers };
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const isCurrentUser = (email) => {
    return (user?.email || '').trim().toLowerCase() === (email || '').trim().toLowerCase();
  };

  return (
    <div className="user-management-container animate-fade-in">
      {/* Header Banner */}
      <div className="um-header">
        <div>
          <h1 className="um-title">User & Role Management</h1>
          <p className="um-subtitle">
            Administer system access, promote team members, and configure customer roles.
          </p>
        </div>
        <button className="btn secondary small-btn" onClick={fetchUsers} disabled={loading}>
          {loading ? 'Refreshing...' : '↻ Refresh Directory'}
        </button>
      </div>

      {/* Action Notification Banners */}
      {actionSuccess && (
        <div className="um-alert um-alert-success animate-fade-in">
          <span>✓ {actionSuccess}</span>
          <button className="um-alert-close" onClick={() => setActionSuccess(null)}>×</button>
        </div>
      )}
      {actionError && (
        <div className="um-alert um-alert-error animate-fade-in">
          <span>⚠ {actionError}</span>
          <button className="um-alert-close" onClick={() => setActionError(null)}>×</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="um-stats-grid">
        <div className="um-stat-card" onClick={() => setRoleFilter('ALL')}>
          <div className="um-stat-value">{stats.total}</div>
          <div className="um-stat-label">Total Accounts</div>
          <div className="um-stat-hint">Active identities in system</div>
        </div>
        <div className="um-stat-card card-admin" onClick={() => setRoleFilter('ADMIN')}>
          <div className="um-stat-value text-admin">{stats.admins}</div>
          <div className="um-stat-label">Administrators</div>
          <div className="um-stat-hint">Full role & security control</div>
        </div>
        <div className="um-stat-card card-agent" onClick={() => setRoleFilter('SUPPORT_AGENT')}>
          <div className="um-stat-value text-agent">{stats.agents}</div>
          <div className="um-stat-label">Support Agents</div>
          <div className="um-stat-hint">Global ticket triage & response</div>
        </div>
        <div className="um-stat-card card-customer" onClick={() => setRoleFilter('CUSTOMER')}>
          <div className="um-stat-value text-customer">{stats.customers}</div>
          <div className="um-stat-label">Customers</div>
          <div className="um-stat-hint">Restricted to own tickets</div>
        </div>
      </div>

      {/* Filters and Search Toolbar */}
      <div className="um-toolbar">
        <div className="um-search-wrap">
          <svg className="um-search-icon icon-svg" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="um-search-input"
            placeholder="Search by name or email address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="um-search-clear" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>

        <div className="um-role-tabs">
          <button
            className={`um-tab-btn ${roleFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setRoleFilter('ALL')}
          >
            All ({stats.total})
          </button>
          <button
            className={`um-tab-btn ${roleFilter === 'ADMIN' ? 'active' : ''}`}
            onClick={() => setRoleFilter('ADMIN')}
          >
            Admins ({stats.admins})
          </button>
          <button
            className={`um-tab-btn ${roleFilter === 'SUPPORT_AGENT' ? 'active' : ''}`}
            onClick={() => setRoleFilter('SUPPORT_AGENT')}
          >
            Agents ({stats.agents})
          </button>
          <button
            className={`um-tab-btn ${roleFilter === 'CUSTOMER' ? 'active' : ''}`}
            onClick={() => setRoleFilter('CUSTOMER')}
          >
            Customers ({stats.customers})
          </button>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="um-table-card">
        {loading ? (
          <div className="um-loading-state">
            <div className="spinner" />
            <p>Loading user directory and RBAC permissions...</p>
          </div>
        ) : error ? (
          <div className="um-error-state">
            <p className="error-text">{error}</p>
            <button className="btn primary small-btn" onClick={fetchUsers}>Retry</button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="um-empty-state">
            <p>No users found matching your search and filter criteria.</p>
            {(searchTerm || roleFilter !== 'ALL') && (
              <button
                className="btn secondary small-btn"
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('ALL');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="um-table-responsive">
            <table className="um-table">
              <thead>
                <tr>
                  <th>User / Email</th>
                  <th>Current Role</th>
                  <th>Account Scope</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const self = isCurrentUser(u.email);
                  return (
                    <tr key={u.email} className={self ? 'um-row-self' : ''}>
                      <td>
                        <div className="um-user-cell">
                          <div className={`um-avatar-mini ${u.role.toLowerCase()}`}>
                            {(u.full_name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="um-user-name">
                              {u.full_name || u.email.split('@')[0]}
                              {self && <span className="um-self-pill">You</span>}
                            </div>
                            <div className="um-user-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`role-badge ${
                            u.role === 'ADMIN'
                              ? 'role-admin'
                              : u.role === 'SUPPORT_AGENT'
                              ? 'role-agent'
                              : 'role-customer'
                          }`}
                        >
                          {u.role === 'ADMIN'
                            ? '⚡ Admin'
                            : u.role === 'SUPPORT_AGENT'
                            ? '🎧 Agent'
                            : '👤 Customer'}
                        </span>
                      </td>
                      <td>
                        <span className="um-scope-text">
                          {u.role === 'ADMIN'
                            ? 'Full System Administrator'
                            : u.role === 'SUPPORT_AGENT'
                            ? 'Global Ticket Support Agent'
                            : 'Standard Customer (Own Tickets)'}
                        </span>
                      </td>
                      <td>
                        <span className="um-date-text">
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="um-actions-cell">
                          {/* Role Selector */}
                          <div className="um-select-wrapper">
                            <select
                              className="um-role-select"
                              value={u.role}
                              disabled={self}
                              title={
                                self
                                  ? 'You cannot change your own role'
                                  : `Change role for ${u.email}`
                              }
                              onChange={(e) => handleRoleChangeSelect(u, e.target.value)}
                            >
                              <option value="ADMIN">Role: Admin</option>
                              <option value="SUPPORT_AGENT">Role: Support Agent</option>
                              <option value="CUSTOMER">Role: Customer</option>
                            </select>
                          </div>

                          {/* Delete Action Button */}
                          <button
                            className="um-delete-btn"
                            disabled={self}
                            title={
                              self
                                ? 'You cannot delete your own account'
                                : `Delete user ${u.email}`
                            }
                            onClick={() => handleDeleteSelect(u)}
                          >
                            <svg className="icon-svg" viewBox="0 0 24 24">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => !submitting && setConfirmModal(null)}>
          <div className="modal-content um-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {confirmModal.type === 'role' ? 'Confirm Role Change' : 'Confirm User Deletion'}
              </h3>
              <button
                className="close-btn"
                disabled={submitting}
                onClick={() => setConfirmModal(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {confirmModal.type === 'role' ? (
                <div>
                  <p>
                    Are you sure you want to update the role for <strong>{confirmModal.targetName}</strong> ({confirmModal.targetEmail})?
                  </p>
                  <div className="um-modal-transition">
                    <span className="um-modal-badge old">{confirmModal.oldRole}</span>
                    <span className="um-modal-arrow">➔</span>
                    <span className="um-modal-badge new">{confirmModal.newRole}</span>
                  </div>
                  {confirmModal.newRole === 'ADMIN' && (
                    <div className="um-modal-warning">
                      ⚠️ <strong>Security Notice:</strong> Administrators have full control over user roles, ticket deletion, and policy settings.
                    </div>
                  )}
                  {confirmModal.newRole === 'CUSTOMER' && (
                    <div className="um-modal-info">
                      ℹ️ This demotes the user to customer status and safely revokes staff privileges while preserving their history.
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p>
                    Are you sure you want to permanently delete the account for <strong>{confirmModal.targetName}</strong> ({confirmModal.targetEmail})?
                  </p>
                  <div className="um-modal-warning">
                    ⚠️ <strong>Data Safety Guarantee:</strong> All past support tickets and conversations will be preserved with author links set to <code>NULL</code>.
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn secondary"
                disabled={submitting}
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
              <button
                className={`btn ${confirmModal.type === 'delete' ? 'danger' : 'primary'}`}
                disabled={submitting}
                onClick={executeModalAction}
              >
                {submitting
                  ? 'Processing...'
                  : confirmModal.type === 'role'
                  ? 'Confirm Role Change'
                  : 'Permanently Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
