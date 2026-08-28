import { useState } from 'react';

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

function ProfilePage({ user, planBadge, currentAvatar, onUpdateAvatar }) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || PRESET_AVATARS[0]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [fullName, setFullName] = useState('Jane Cooper');
  const [jobTitle, setJobTitle] = useState('Senior Support Lead');
  const [email, setEmail] = useState(user?.email || 'jane.cooper@example.com');
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    chatSound: true,
    weeklyReport: false,
  });
  const [twoFactor, setTwoFactor] = useState(true);
  const [savedMessage, setSavedMessage] = useState(false);

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

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

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
          ✓ Profile and preferences saved successfully!
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
              {fullName}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 12px' }}>
              {jobTitle}
            </p>
            <span
              style={{
                background: 'var(--accent-gradient-gold)',
                color: '#ffffff',
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '800',
                textTransform: 'uppercase',
                boxShadow: 'var(--shadow-glow-gold)',
              }}
            >
              {planBadge || 'Gold Plan Member'}
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
                <label className="form-label">Job Title / Role</label>
                <input
                  type="text"
                  className="input-field"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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
                checked={notifications.emailAlerts}
                onChange={(e) =>
                  setNotifications({ ...notifications, emailAlerts: e.target.checked })
                }
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="submit" className="btn primary">
                Save Profile Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
