import { useState } from 'react';
import './App.css';
import Home from './Home';
import TicketPage from './TicketPage';
import ChatPage from './ChatPage';

function App() {
  const [view, setView] = useState('home');

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')}>
          <span className="brand-dot" />
          NovaWare <span className="brand-muted">AI Support</span>
        </button>
        <nav>
          <button
            className={view === 'ticket' ? 'navlink active' : 'navlink'}
            onClick={() => setView('ticket')}
          >
            Ticket
          </button>
          <button
            className={view === 'chat' ? 'navlink active' : 'navlink'}
            onClick={() => setView('chat')}
          >
            Live Chat
          </button>
        </nav>
      </header>

      <main>
        {view === 'home' && <Home onSelect={setView} />}
        {view === 'ticket' && <TicketPage onGoChat={() => setView('chat')} />}
        {view === 'chat' && <ChatPage onGoTicket={() => setView('ticket')} />}
      </main>
    </div>
  );
}

export default App;
