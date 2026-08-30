import { useState, useEffect } from 'react';
import API_BASE from './api';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
];

// Values mirror the `customers` table schema (backend/schema.sql).
const PLAN_OPTIONS = ['free', 'gold', 'premium'];
const ACCOUNT_STATUS_OPTIONS = ['active', 'restricted'];
const PAYMENT_STATUS_OPTIONS = ['none', 'completed', 'failed'];

const planBadgeText = (plan) => {
  if (plan === 'premium') return 'Premium Plan Member';
  if (plan === 'gold') return 'Gold Plan Member';
  return 'Free Plan Member';
};

function ProfilePage({ user, planBadge, currentAvatar, onUpdateAvatar, onProfileSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fields persisted to the Supabase `customers` table.
  const [customer, setCustomer] = useState(null);
  const [fullName, setFullName] = useState('');
  const [plan, setPlan] = useState('free');
  const [accountStatus, setAccountStatus] = useState('active');
  const [paymentStatus, setPaymentStatus] = useState('none');

  // Change-password fields (POSTed to the backend, which updates Supabase Auth).
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Local-only preferences (not stored in the customers table).
  const [twoFactor, setTwoFactor] = useState(
    localStorage.getItem('prefTwoFactor') === 'true'
  );
  const [emailAlerts, setEmailAlerts] = useState(
    localStorage.getItem('prefEmailAlerts') !== 'false'
  );

  const email = user?.email || '';
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || PRESET_AVATARS[0]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Load the customer profile from the backend (backed by the Supabase customers table).
  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      if (!email) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/profile?email=${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setCustomer(data);
        setFullName(data.name || email.split('@')[0]);
        setPlan(data.plan || 'free');
        setAccountStatus(data.account_status || 'active');
        setPaymentStatus(data.payment_status || 'none');
      } catch (err) {
        if (!cancelled) setErrorMsg('Failed to load your profile from the server.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [email]);

  const handleAvatarSelect = (url) => {
    setSelectedAvatar(url);
    if (onUpdateAvatar) onUpdateAvatar(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleAvatarSelect(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSavedMessage(false);
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: fullName,
          plan,
          account_status: accountStatus,
          payment_status: paymentStatus,
          subscription_status: plan === 'free' ? 'free_plan' : 'active_premium',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Server responded with status ${res.status}`);

      setCustomer(data);
      if (onProfileSaved) onProfileSaved(data);

      // Persist local-only preferences.
      localStorage.setItem('prefTwoFactor', String(twoFactor));
      localStorage.setItem('prefEmailAlerts', String(emailAlerts));

      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMsg('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    setPasswordBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Server responded with status ${res.status}`);

      setPasswordMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setPasswordBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2 style={{ color: 'var(--text-secondary)' }}>Loading your profile…</h2>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 6px' }}>
          User <span className="grad-text">Profile & Settings</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Manage your account avatar, personal details, notifications, and security preferences.
        </p>
      </div>

      {savedMessage && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--accent-emerald)',
            color: 'var(--accent-emerald)',
            padding: '12px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          ✓ Profile saved to your account successfully!
        </div>
      )}

      {errorMsg && (
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
          {errorMsg}
        </div>
      )}

      <div className="profile-grid">
        {/* Sidebar Avatar Card */}
        <div className="profile-sidebar-card">
          <div className="profile-avatar-wrapper">
            <img src={selectedAvatar} alt="User Avatar" className="profile-avatar-img" />
            <button
              className="profile-avatar-btn"
              title="Change Profile Picture"
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            >
              <svg className="icon-svg" viewBox="0 0 24 24">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>

          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '8px 0 4px' }}>
              {fullName || email}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 12px' }}>
              {email}
            </p>
            <span
              style={{
                background:
                  paymentStatus === 'failed'
                    ? '#ef4444'
                    : 'var(--accent-gradient-gold)',
                color: '#ffffff',
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '800',
                textTransform: 'uppercase',
                boxShadow: 'var(--shadow-glow-gold)',
              }}
            >
              {customer ? planBadgeText(customer.plan) : planBadge || 'Free Plan Member'}
            </span>
          </div>

          {/* Profile Picture Selector Accordion */}
          {showAvatarPicker && (
            <div className="avatar-selector-box animate-fade-in">
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}
              >
                Choose an Avatar:
              </div>

              <div className="avatar-options-grid">
                {PRESET_AVATARS.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Avatar option ${idx + 1}`}
                    className={`avatar-option-item ${selectedAvatar === url ? 'selected' : ''}`}
                    onClick={() => handleAvatarSelect(url)}
                  />
                ))}
              </div>

              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                <label
                  className="btn secondary small-btn"
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  Upload Custom Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Main Settings Form */}
        <div className="profile-main-card">
          <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
            Account Details
          </h3>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Plan</label>
                <select
                  className="input-field"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Account Status</label>
                <select
                  className="input-field"
                  value={accountStatus}
                  onChange={(e) => setAccountStatus(e.target.value)}
                >
                  {ACCOUNT_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select
                  className="input-field"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  {PAYMENT_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address (account identifier — read only)</label>
              <input type="email" className="input-field" value={email} disabled />
            </div>

            <hr style={{ borderColor: 'var(--border-color)', margin: '8px 0' }} />

            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
              Preferences & Security
            </h3>

            <div className="toggle-switch">
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>Two-Factor Authentication (2FA)</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Add an extra layer of security to your support portal
                </div>
              </div>
              <input
                type="checkbox"
                checked={twoFactor}
                onChange={(e) => setTwoFactor(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)' }}
              />
            </div>

            <div className="toggle-switch">
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>Email Instant Notifications</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Receive email alerts when a ticket status changes
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Profile Changes'}
              </button>
            </div>
          </form>

          <hr style={{ borderColor: 'var(--border-color)', margin: '24px 0' }} />

          <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px' }}>
            Change Password
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 16px' }}>
            Update the password used to sign in to your NovaWare account.
          </p>

          {passwordMsg && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid var(--accent-emerald)',
                color: 'var(--accent-emerald)',
                padding: '10px 16px',
                borderRadius: '12px',
                marginBottom: '16px',
                fontWeight: '600',
              }}
            >
              {passwordMsg}
            </div>
          )}

          {passwordError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '10px 16px',
                borderRadius: '12px',
                marginBottom: '16px',
                fontWeight: '600',
              }}
            >
              {passwordError}
            </div>
          )}

          <form
            onSubmit={handleChangePassword}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="input-field"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat the new password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn secondary" disabled={passwordBusy}>
                {passwordBusy ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
