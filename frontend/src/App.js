import { useState, useEffect } from 'react';
import './App.css';
import Home from './Home';
import TicketPage from './TicketPage';
import ChatPage from './ChatPage';
import Dashboard from './Dashboard';
import TicketDetail from './TicketDetail';
import ProfilePage from './ProfilePage';
import AuthModal from './AuthModal';
import Footer from './Footer';
import { supabase } from './supabaseClient';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

function App() {
  const [view, setView] = useState('home');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [avatarUrl, setAvatarUrl] = useState(
    localStorage.getItem('userAvatar') || DEFAULT_AVATAR
  );

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const openTicket = (id) => {
    setSelectedTicket(id);
    setView('detail');
  };

  return (
    <div className="app">
      {/* Topbar */}
      <header className="topbar">
        <button
          className="brand"
          onClick={() => {
            setView('home');
            setSelectedTicket(null);
          }}
        >
          <span className="brand-dot" />
          NovaWare <span className="brand-muted">AI Support Platform</span>
        </button>

        <nav>
          <button
            className={`navlink ${view === 'home' ? 'active' : ''}`}
            onClick={() => setView('home')}
          >
            Home
          </button>
          <button
            className={`navlink ${view === 'dashboard' || view === 'detail' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`navlink ${view === 'ticket' ? 'active' : ''}`}
            onClick={() => setView('ticket')}
          >
            Submit Ticket
          </button>
          <button
            className={`navlink ${view === 'chat' ? 'active' : ''}`}
            onClick={() => setView('chat')}
          >
            Live Chat
          </button>
          <button
            className={`navlink ${view === 'profile' ? 'active' : ''}`}
            onClick={() => setView('profile')}
          >
            Profile
          </button>
        </nav>

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
          <div className="user-profile-badge" onClick={() => setView('profile')}>
            <img src={avatarUrl} alt="Avatar" className="avatar-mini" />
            <span className="user-email-text">
              {user ? user.email.split('@')[0] : 'Jane Cooper'}
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
        </div>
      </header>

      {/* Main View Router */}
      <main>
        {view === 'home' && <Home onSelect={setView} />}
        {view === 'dashboard' && <Dashboard user={user} onSelectTicket={openTicket} />}
        {view === 'ticket' && <TicketPage user={user} onGoChat={() => setView('chat')} />}
        {view === 'chat' && (
          <ChatPage
            user={user}
            onGoTicket={() => setView('ticket')}
            onSelectTicket={openTicket}
          />
        )}
        {view === 'profile' && (
          <ProfilePage
            user={user}
            currentAvatar={avatarUrl}
            onUpdateAvatar={handleUpdateAvatar}
          />
        )}
        {view === 'detail' && selectedTicket && (
          <TicketDetail ticketId={selectedTicket} onBack={() => setView('dashboard')} />
        )}
      </main>

      {/* Enterprise Footer */}
      <Footer onNavigate={setView} />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(authUser) => {
          setUser(authUser);
          setShowAuthModal(false);
        }}
      />
    </div>
  );
}

export default App;
