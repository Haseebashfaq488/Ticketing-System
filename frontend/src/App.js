import { useState } from 'react';
import './App.css';
import Home from './Home';
import TicketPage from './TicketPage';
import ChatPage from './ChatPage';
import Dashboard from './Dashboard';
import TicketDetail from './TicketDetail';

function App() {
  const [view, setView] = useState('home');
  const [selectedTicket, setSelectedTicket] = useState(null);

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
      </header>

      <main>
        {view === 'home' && <Home onSelect={setView} />}
        {view === 'ticket' && <TicketPage onGoChat={() => setView('chat')} />}
        {view === 'chat' && <ChatPage onGoTicket={() => setView('ticket')} />}
        {view === 'dashboard' && <Dashboard onSelectTicket={openTicket} />}
        {view === 'detail' && selectedTicket && (
          <TicketDetail ticketId={selectedTicket} onBack={() => setView('dashboard')} />
        )}
      </main>
    </div>
  );
}

export default App;
