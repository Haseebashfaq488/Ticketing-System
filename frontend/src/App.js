import { useState, useEffect } from 'react';
import './App.css';
import Home from './Home';
import TicketPage from './TicketPage';
import ChatPage from './ChatPage';
import Dashboard from './Dashboard';
import TicketDetail from './TicketDetail';
import AuthModal from './AuthModal';
import { supabase } from './supabaseClient';

function App() {
  const [view, setView] = useState('home');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Check initial auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      <header className="topbar">
        <button className="brand" onClick={() => { setView('home'); setSelectedTicket(null); }}>
          <span className="brand-dot" />
          NovaWare <span className="brand-muted">AI Support</span>
        </button>

        <nav>
          <button
            className={view === 'ticket' ? 'navlink active' : 'navlink'}
            onClick={() => setView('ticket')}
          >
            Submit Ticket
          </button>
          <button
            className={view === 'chat' ? 'navlink active' : 'navlink'}
            onClick={() => setView('chat')}
          >
            Live Chat
          </button>
          <button
            className={view === 'dashboard' || view === 'detail' ? 'navlink active' : 'navlink'}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
        </nav>

        <div className="auth-status">
          {user ? (
            <div className="user-badge">
              <span className="user-email">{user.email}</span>
              <button className="btn ghost small-btn" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          ) : (
            <button className="btn primary small-btn" onClick={() => setShowAuthModal(true)}>
              Sign In / Register
            </button>
          )}
        </div>
      </header>

      <main>
        {view === 'home' && <Home onSelect={setView} />}
        {view === 'ticket' && <TicketPage user={user} onGoChat={() => setView('chat')} />}
        {view === 'chat' && <ChatPage user={user} onGoTicket={() => setView('ticket')} onSelectTicket={openTicket} />}
        {view === 'dashboard' && <Dashboard user={user} onSelectTicket={openTicket} />}
        {view === 'detail' && selectedTicket && (
          <TicketDetail ticketId={selectedTicket} onBack={() => setView('dashboard')} />
        )}
      </main>

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
