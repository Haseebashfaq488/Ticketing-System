import { useState, useEffect } from 'react';
import './App.css';
import Home from './Home';
import TicketPage from './TicketPage';
import ChatPage from './ChatPage';
import Dashboard from './Dashboard';
import TicketDetail from './TicketDetail';
import ProfilePage from './ProfilePage';
import AuthModal from './AuthModal';
import AboutModal from './AboutModal';
import UpgradeModal from './UpgradeModal';
import Footer from './Footer';
import { supabase } from './supabaseClient';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

function App() {
  const [view, setView] = useState(
    () => sessionStorage.getItem('appView') || 'home'
  );
  const [selectedTicket, setSelectedTicket] = useState(() => {
    const stored = sessionStorage.getItem('selectedTicket');
    return stored ? Number(stored) : null;
  });
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTargetPlan, setUpgradeTargetPlan] = useState('Gold');
  const [userPlanBadge, setUserPlanBadge] = useState(
    localStorage.getItem('userPlanBadge') || 'Gold Plan Member'
  );
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [avatarUrl, setAvatarUrl] = useState(
    localStorage.getItem('userAvatar') || DEFAULT_AVATAR
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Smooth scroll to top whenever page view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileMenuOpen(false);
  }, [view]);

  // Restore the current page (and open ticket) after a browser reload
  useEffect(() => {
    sessionStorage.setItem('appView', view);
    if (selectedTicket != null) {
      sessionStorage.setItem('selectedTicket', String(selectedTicket));
    } else {
      sessionStorage.removeItem('selectedTicket');
    }
  }, [view, selectedTicket]);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleUpdateAvatar = (newUrl) => {
    setAvatarUrl(newUrl);
    localStorage.setItem('userAvatar', newUrl);
  };

  const openUpgradeModal = (planName) => {
    setUpgradeTargetPlan(planName);
    setShowUpgradeModal(true);
  };

  const handleConfirmPlan = (planKey, badgeText) => {
    setUserPlanBadge(badgeText);
    localStorage.setItem('userPlanBadge', badgeText);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    sessionStorage.removeItem('appView');
    sessionStorage.removeItem('selectedTicket');
    setView('home');
    setSelectedTicket(null);
  };

  const openTicket = (id) => {
    setSelectedTicket(id);
    setView('detail');
  };

  const handleNavClick = (targetView) => {
    // Profile is only accessible when signed in — open the auth modal instead.
    if (targetView === 'profile' && !user) {
      setShowAuthModal(true);
      setMobileMenuOpen(false);
      return;
    }
    setView(targetView);
    setMobileMenuOpen(false);
  };

  // Keep the plan badge in sync when the customer saves profile changes.
  const handleProfileSaved = (customer) => {
    if (!customer || !customer.plan) return;
    const badge =
      customer.plan === 'premium'
        ? 'Premium Plan Member'
        : customer.plan === 'gold'
        ? 'Gold Plan Member'
        : 'Free Plan Member';
    setUserPlanBadge(badge);
    localStorage.setItem('userPlanBadge', badge);
  };

  // Wait for the Supabase session to restore before rendering, so a reload
  // on a protected page (e.g. Profile) doesn't briefly show "Sign in Required".
  if (!authReady) {
    return (
      <div
        className="app"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Loading NovaWare Support…
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Topbar Header */}
      <header className="topbar">
        {/* Left Side: Brand */}
        <button
          className="brand"
          onClick={() => {
            setView('home');
            setSelectedTicket(null);
            setMobileMenuOpen(false);
          }}
        >
          <span className="brand-dot" />
          NovaWare <span className="brand-muted">AI Support</span>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav">
          <button
            className={`navlink ${view === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            Home
          </button>
          <button
            className={`navlink ${view === 'dashboard' || view === 'detail' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`navlink ${view === 'ticket' ? 'active' : ''}`}
            onClick={() => handleNavClick('ticket')}
          >
            Submit Ticket
          </button>
          <button
            className={`navlink ${view === 'chat' ? 'active' : ''}`}
            onClick={() => handleNavClick('chat')}
          >
            Live Chat
          </button>
          <button
            className={`navlink ${view === 'profile' ? 'active' : ''}`}
            onClick={() => handleNavClick('profile')}
          >
            Profile
          </button>
        </nav>

        {/* Right Side: Theme Toggle, Avatar, Sign In, and Mobile Hamburger */}
        <div className="topbar-actions">
          {/* Theme Toggle Button */}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <svg className="icon-svg" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg className="icon-svg" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          {/* User Profile Badge */}
          <div
            className="user-profile-badge"
            onClick={() => handleNavClick('profile')}
            title="Open Profile"
          >
            <img src={avatarUrl} alt="Avatar" className="avatar-mini" />
            <span className="user-email-text">
              {user ? user.email.split('@')[0] : 'Jane'}
            </span>
          </div>

          {user ? (
            <button className="btn ghost small-btn" onClick={handleSignOut}>
              Sign Out
            </button>
          ) : (
            <button className="btn primary small-btn" onClick={() => setShowAuthModal(true)}>
              Sign In
            </button>
          )}

          {/* Mobile 3-Lines Hamburger Button */}
          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <svg className="icon-svg" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg className="icon-svg" viewBox="0 0 24 24">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer animate-fade-in">
          <button
            className={`mobile-nav-item ${view === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            <svg className="icon-svg" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home Overview
          </button>

          <button
            className={`mobile-nav-item ${view === 'dashboard' || view === 'detail' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            <svg className="icon-svg" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            Support Dashboard
          </button>

          <button
            className={`mobile-nav-item ${view === 'ticket' ? 'active' : ''}`}
            onClick={() => handleNavClick('ticket')}
          >
            <svg className="icon-svg" viewBox="0 0 24 24">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            </svg>
            Submit Ticket
          </button>

          <button
            className={`mobile-nav-item ${view === 'chat' ? 'active' : ''}`}
            onClick={() => handleNavClick('chat')}
          >
            <svg className="icon-svg" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Live Support Chat
          </button>

          <button
            className={`mobile-nav-item ${view === 'profile' ? 'active' : ''}`}
            onClick={() => handleNavClick('profile')}
          >
            <svg className="icon-svg" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            User Profile Settings
          </button>
        </div>
      )}

      {/* Main View Router */}
      <main>
        {view === 'home' && <Home onSelect={handleNavClick} onOpenUpgrade={openUpgradeModal} />}
        {view === 'dashboard' && <Dashboard user={user} onSelectTicket={openTicket} />}
        {view === 'ticket' && (
          <TicketPage
            user={user}
            onGoChat={() => handleNavClick('chat')}
            onTicketCreated={() => handleNavClick('dashboard')}
          />
        )}
        {view === 'chat' && (
          <ChatPage
            user={user}
            onGoTicket={() => handleNavClick('ticket')}
            onSelectTicket={openTicket}
            onConverted={openTicket}
          />
        )}
        {view === 'profile' && (
          user ? (
            <ProfilePage
              user={user}
              planBadge={userPlanBadge}
              currentAvatar={avatarUrl}
              onUpdateAvatar={handleUpdateAvatar}
              onProfileSaved={handleProfileSaved}
            />
          ) : (
            <div className="animate-fade-in" style={{ textAlign: 'center', padding: '80px 20px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 10px' }}>
                Sign in <span className="grad-text">Required</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                You must be signed in to view and manage your profile settings.
              </p>
              <button className="btn primary" onClick={() => setShowAuthModal(true)}>
                Sign In to Continue
              </button>
            </div>
          )
        )}
        {view === 'detail' && selectedTicket && (
          <TicketDetail ticketId={selectedTicket} onBack={() => handleNavClick('dashboard')} />
        )}
      </main>

      {/* Enterprise Footer */}
      <Footer onNavigate={handleNavClick} onOpenAbout={() => setShowAboutModal(true)} />

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(authUser) => {
          setUser(authUser);
          setShowAuthModal(false);
        }}
      />

      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        targetPlan={upgradeTargetPlan}
        onConfirmPlan={handleConfirmPlan}
      />
    </div>
  );
}

export default App;
