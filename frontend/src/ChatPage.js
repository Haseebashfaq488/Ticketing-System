import { useState, useEffect } from 'react';
import API_BASE from './api';

const SUGGESTED_PROMPTS = [
  'What are your support hours?',
  'I want a refund for my subscription',
  'How do I generate an API key?',
  'Escalate to a human support agent',
];

const DEFAULT_POLICIES = [
  {
    id: 'refund-policy',
    title: 'Refund & Billing Policy',
    summary: 'Full refunds are granted within 14 days of purchase. Annual subscriptions are prorated upon cancellation.',
  },
  {
    id: 'sla-response',
    title: 'SLA Response Times',
    summary: 'Tier 1 Critical: < 1 hour. Gold/Premium members receive priority queue routing 24/7.',
  },
  {
    id: 'security-escalation',
    title: 'Security & Auth Escalation',
    summary: 'Account breach or credential leak queries trigger mandatory human review and security lockdown.',
  },
  {
    id: 'api-access',
    title: 'API Rate Limits & Tokens',
    summary: 'Enterprise users can generate up to 5 API keys with 10,000 req/min from the developer portal.',
  },
];

const CHAT_STORAGE_KEY = 'novaware_live_chat';
const WELCOME_MESSAGE = {
  id: 1,
  sender: 'bot',
  text: 'Hello! I am your AI Support Assistant powered by NovaWare. How can I assist you with your account, billing, or technical tickets today?',
  time: 'Just now',
};

function loadStoredChat() {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        return parsed;
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

function ChatPage({ user, onGoTicket, onSelectTicket, onConverted }) {
  const stored = loadStoredChat();
  const [messages, setMessages] = useState(
    stored ? stored.messages : [WELCOME_MESSAGE]
  );
  const [conversationId, setConversationId] = useState(
    stored ? stored.conversationId : null
  );
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [converting, setConverting] = useState(false);

  // Stitch Hub Navigation States
  const [activeHubTab, setActiveHubTab] = useState('queue'); // 'all', 'queue', 'resolved'
  const [selectedQueueThread, setSelectedQueueThread] = useState('ai-bot'); // 'ai-bot', 'acme', 'john', null
  const [queueFilter, setQueueFilter] = useState('open'); // 'open', 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  const [policies, setPolicies] = useState(DEFAULT_POLICIES);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Fetch live company policies if available
  useEffect(() => {
    fetch(`${API_BASE}/api/policies`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPolicies(data);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_POLICIES on offline/error
      });
  }, []);

  // Keep chat alive across page reloads within the browser session
  useEffect(() => {
    try {
      sessionStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify({ messages, conversationId })
      );
    } catch {
      /* storage full / unavailable */
    }
  }, [messages, conversationId]);

  const startNewConversation = () => {
    if (isTyping) return;
    setMessages([{ ...WELCOME_MESSAGE, id: Date.now() }]);
    setConversationId(null);
    setInputText('');
    setSelectedQueueThread('ai-bot');
  };

  const handleConvertToTicket = async () => {
    if (isTyping || converting) return;

    let convId = conversationId;
    if (!convId) {
      try {
        const startRes = await fetch(
          `${API_BASE}/api/chat/start?customer_email=${encodeURIComponent(user?.email || 'guest@example.com')}`
        );
        if (startRes.ok) {
          const startData = await startRes.json();
          if (startData.conversation_id) {
            convId = startData.conversation_id;
            setConversationId(convId);
          }
        }
      } catch {
        /* fall through */
      }
    }

    if (!convId) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          text: 'There is no conversation to convert yet — send a message first, then try again.',
          time: 'Just now',
        },
      ]);
      return;
    }

    const firstUserMsg = messages.find((m) => m.sender === 'user');
    const subject = firstUserMsg
      ? firstUserMsg.text.slice(0, 150)
      : 'Support request from live chat';

    setConverting(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: convId,
          customer_email: user?.email || 'guest@example.com',
          subject,
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Server responded with status ${res.status}`);
      }
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          text: `✅ Your conversation has been converted to ticket #TCK-${data.ticket_id}. Our AI analyzed it (priority: ${data.analysis?.priority || '—'}) and assigned it to specialist queue.`,
          time: 'Just now',
        },
      ]);
      setTimeout(() => {
        setMessages([{ ...WELCOME_MESSAGE, id: Date.now() }]);
        setConversationId(null);
        if (onConverted && data.ticket_id) onConverted(data.ticket_id);
      }, 1600);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          text: `❌ Could not convert this conversation to a ticket: ${err.message}`,
          time: 'Just now',
        },
      ]);
    } finally {
      setConverting(false);
    }
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim() || isTyping) return;

    const userMsg = { id: Date.now(), sender: 'user', text: query, time: 'Just now' };
    const history = [...messages, userMsg]
      .filter((m) => m.sender === 'user' || m.sender === 'bot')
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'ai', content: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);
    setSelectedQueueThread('ai-bot');

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          customer_email: user?.email || 'guest@example.com',
          conversation_id: conversationId,
        }),
      });
      if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
      const data = await res.json();
      if (data.conversation_id) setConversationId(data.conversation_id);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: data.reply, time: 'Just now' },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Sorry, I could not reach the support server right now. Please check your network and try again in a moment.',
          time: 'Just now',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const lastUserMessage = [...messages].reverse().find((m) => m.sender === 'user');
  const lastBotMessage = [...messages].reverse().find((m) => m.sender === 'bot');
  const previewSnippet = lastUserMessage?.text || lastBotMessage?.text || 'Active AI session ready';

  return (
    <div className="hub-container animate-fade-in">
      {/* Top App Hub Bar */}
      <header className="hub-header">
        <div className="hub-header-left">
          <h2 className="hub-title">
            <svg className="icon-svg" style={{ color: 'var(--accent-purple)' }} viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Conversation Hub
          </h2>

          <nav className="hub-tabs">
            <button
              className={`hub-tab-btn ${activeHubTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveHubTab('all')}
            >
              All Chats
            </button>
            <button
              className={`hub-tab-btn ${activeHubTab === 'queue' ? 'active' : ''}`}
              onClick={() => {
                setActiveHubTab('queue');
                setSelectedQueueThread('ai-bot');
              }}
            >
              My Queue
            </button>
            <button
              className={`hub-tab-btn ${activeHubTab === 'resolved' ? 'active' : ''}`}
              onClick={() => {
                setActiveHubTab('resolved');
                setSelectedQueueThread(null);
              }}
            >
              Resolved
            </button>
          </nav>
        </div>

        <div className="hub-header-right">
          <div className="hub-search-wrapper">
            <svg className="hub-search-icon" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="hub-search-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            className="hub-icon-btn"
            title="Notifications"
            onClick={() => alert('All AI support channels connected and operational.')}
          >
            <svg className="icon-svg" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="hub-badge-dot" />
          </button>

          <button
            className="hub-icon-btn"
            title="Session Options"
            onClick={startNewConversation}
          >
            <svg className="icon-svg" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>
      </header>

      {/* 3-Pane Conversation Layout */}
      <div className="hub-layout">
        {/* Left Pane: Inbox / Queue List */}
        <aside className="hub-inbox-panel">
          <div className="hub-inbox-topbar">
            <div className="hub-filter-pills">
              <button
                className={`hub-pill-btn ${queueFilter === 'open' ? 'active' : ''}`}
                onClick={() => setQueueFilter('open')}
              >
                Open (12)
              </button>
              <button
                className={`hub-pill-btn ${queueFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setQueueFilter('pending')}
              >
                Pending (3)
              </button>
            </div>
            <button
              className="hub-icon-btn"
              style={{ width: '28px', height: '28px' }}
              title="Filter list"
              onClick={() => setQueueFilter(queueFilter === 'open' ? 'pending' : 'open')}
            >
              <svg className="icon-svg" style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
              </svg>
            </button>
          </div>

          <div className="hub-thread-list">
            {/* Active AI Bot Live Session Thread */}
            <div
              className={`hub-thread-item ${selectedQueueThread === 'ai-bot' ? 'active' : ''}`}
              onClick={() => setSelectedQueueThread('ai-bot')}
            >
              <div className="hub-avatar-wrapper">
                <div
                  className="hub-avatar-circle"
                  style={{ background: 'var(--accent-gradient)' }}
                >
                  AI
                </div>
                <div className="hub-status-dot" />
              </div>
              <div className="hub-thread-content">
                <div className="hub-thread-row">
                  <span className="hub-thread-name">Live AI Assistant</span>
                  <span className="hub-thread-time">Just now</span>
                </div>
                <p className="hub-thread-snippet">{previewSnippet}</p>
              </div>
              <div className="hub-unread-dot" />
            </div>

            {/* Simulated Queue Thread 1: Acme Corp Billing */}
            <div
              className={`hub-thread-item ${selectedQueueThread === 'acme' ? 'active' : ''}`}
              onClick={() => setSelectedQueueThread('acme')}
            >
              <div className="hub-avatar-wrapper">
                <div
                  className="hub-avatar-circle"
                  style={{ background: '#006a61' }}
                >
                  AC
                </div>
                <div className="hub-status-dot" />
              </div>
              <div className="hub-thread-content">
                <div className="hub-thread-row">
                  <span className="hub-thread-name">Acme Corp Billing</span>
                  <span className="hub-thread-time">2m</span>
                </div>
                <p className="hub-thread-snippet">Can you help me update my credit card?</p>
              </div>
            </div>

            {/* Simulated Queue Thread 2: John Doe */}
            <div
              className={`hub-thread-item ${selectedQueueThread === 'john' ? 'active' : ''}`}
              onClick={() => setSelectedQueueThread('john')}
            >
              <div className="hub-avatar-wrapper">
                <div
                  className="hub-avatar-circle"
                  style={{ background: '#943700' }}
                >
                  JD
                </div>
              </div>
              <div className="hub-thread-content">
                <div className="hub-thread-row">
                  <span className="hub-thread-name">John Doe</span>
                  <span className="hub-thread-time">1h</span>
                </div>
                <p className="hub-thread-snippet">Thanks for the quick resolution!</p>
              </div>
            </div>
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
            <button
              className="btn primary"
              style={{ width: '100%', fontSize: '13px', padding: '10px' }}
              onClick={onGoTicket}
            >
              + New Ticket Form
            </button>
          </div>
        </aside>

        {/* Center Pane: Active Live Chat or Stitch Empty State */}
        <main className="hub-main-panel">
          {selectedQueueThread === 'ai-bot' ? (
            /* Active Live Chat View */
            <>
              <div className="hub-chat-header">
                <div className="hub-chat-agent-info">
                  <div
                    className="hub-avatar-circle"
                    style={{ width: '36px', height: '36px', background: 'var(--accent-gradient)', fontSize: '12px' }}
                  >
                    AI
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                      Nova Support Assistant
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block' }} />
                      Active &amp; Connected
                    </div>
                  </div>
                </div>

                <div className="hub-chat-actions">
                  <button
                    className="btn ghost small-btn"
                    style={{ border: '1px solid var(--border-color)', fontSize: '12px' }}
                    onClick={startNewConversation}
                    disabled={isTyping}
                  >
                    + New Session
                  </button>
                  <button
                    className="btn secondary small-btn"
                    style={{ fontSize: '12px' }}
                    onClick={handleConvertToTicket}
                    disabled={isTyping || converting}
                  >
                    {converting ? 'Converting...' : 'Convert to Ticket'}
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="hub-messages-feed">
                {messages.map((m) => (
                  <div key={m.id} className={`hub-message-row ${m.sender}`}>
                    <div
                      className="hub-msg-avatar"
                      style={{
                        background: m.sender === 'user' ? 'var(--accent-purple)' : 'var(--accent-cyan)',
                      }}
                    >
                      {m.sender === 'user' ? (user?.email ? user.email.slice(0, 2).toUpperCase() : 'ME') : 'AI'}
                    </div>
                    <div className="hub-msg-bubble">
                      {m.text}
                      <div className="hub-msg-time">{m.time}</div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="hub-message-row bot">
                    <div className="hub-msg-avatar" style={{ background: 'var(--accent-cyan)' }}>
                      AI
                    </div>
                    <div className="hub-msg-bubble">
                      <div className="hub-typing-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Prompts Suggestions */}
              <div className="hub-prompts-bar">
                {SUGGESTED_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    className="hub-prompt-chip"
                    onClick={() => handleSend(p)}
                  >
                    <svg className="icon-svg" style={{ width: '12px', height: '12px', color: 'var(--accent-cyan)' }} viewBox="0 0 24 24">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    {p}
                  </button>
                ))}
              </div>

              {/* Input Composer */}
              <div className="hub-composer">
                <button
                  className="hub-icon-btn"
                  title="Attach screenshot or file"
                  onClick={() => alert('File attachments are automatically linked to generated support tickets.')}
                >
                  <svg className="icon-svg" viewBox="0 0 24 24">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <input
                  type="text"
                  className="hub-composer-input"
                  placeholder="Type your question or support issue..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                  className="btn primary"
                  style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleSend()}
                  disabled={isTyping || !inputText.trim()}
                >
                  <span>Send</span>
                  <svg className="icon-svg" style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            /* Stitch Empty State View */
            <div className="hub-empty-state animate-fade-in">
              <div className="hub-empty-icon-wrap">
                <svg style={{ width: '42px', height: '42px' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                </svg>
                <div className="hub-empty-badge">
                  <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
              </div>

              <h3 className="hub-empty-title">
                {selectedQueueThread === 'acme' ? 'Acme Corp Billing' : selectedQueueThread === 'john' ? 'John Doe Ticket' : 'No Conversation Selected'}
              </h3>
              <p className="hub-empty-desc">
                {selectedQueueThread === 'acme'
                  ? 'Customer #CUST-104 is requesting assistance updating payment credentials on file.'
                  : selectedQueueThread === 'john'
                  ? 'Customer #CUST-102 confirmed resolution of billing inquiry.'
                  : 'Select an open conversation from the queue on the left to start responding, or create a new chat context.'}
              </p>

              <button
                className="btn primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
                onClick={() => setSelectedQueueThread('ai-bot')}
              >
                <svg className="icon-svg" style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Start Live Support Chat
              </button>

              <div className="hub-empty-footer-icons">
                <button
                  title="Keyboard Shortcuts"
                  onClick={() => setShowShortcutsModal(true)}
                >
                  <svg className="icon-svg" viewBox="0 0 24 24">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="6" y1="8" x2="6" y2="8" />
                    <line x1="10" y1="8" x2="10" y2="8" />
                    <line x1="14" y1="8" x2="14" y2="8" />
                    <line x1="18" y1="8" x2="18" y2="8" />
                    <line x1="6" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="18" y2="12" />
                    <line x1="7" y1="16" x2="17" y2="16" />
                  </svg>
                </button>
                <button
                  title="Quick Prompt Ideas"
                  onClick={() => {
                    setSelectedQueueThread('ai-bot');
                    handleSend(SUGGESTED_PROMPTS[0]);
                  }}
                >
                  <svg className="icon-svg" viewBox="0 0 24 24">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </button>
                <button
                  title="Settings & Knowledge"
                  onClick={() => alert('SupportAI Knowledge Base synchronized with company policy engine.')}
                >
                  <svg className="icon-svg" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Right Pane: Context & Policy Panel */}
        <aside className="hub-context-panel">
          <div>
            <h4 className="hub-context-section-title">
              <svg className="icon-svg" style={{ width: '15px', height: '15px', color: 'var(--accent-purple)' }} viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Customer Context
            </h4>
            <div className="hub-context-card">
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                  User Account
                </span>
                <div style={{ fontWeight: '700', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {user?.email || 'guest@example.com'}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tier:</span>
                <span className="badge-pill" style={{ padding: '2px 8px', fontSize: '11px' }}>
                  {localStorage.getItem('userPlanBadge') || 'Gold Member'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status:</span>
                <span style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: '600' }}>
                  ● Active
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="hub-context-section-title">
              <svg className="icon-svg" style={{ width: '15px', height: '15px', color: 'var(--accent-cyan)' }} viewBox="0 0 24 24">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              Policy Knowledge Reference
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {policies.slice(0, 3).map((pol, idx) => (
                <div
                  key={pol.id || idx}
                  className="hub-policy-item"
                  onClick={() => handleSend(`What is your policy regarding ${pol.title || pol.name}?`)}
                >
                  <div className="hub-policy-title">{pol.title || pol.name}</div>
                  <p className="hub-policy-desc">{pol.summary || pol.content || pol.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              🛡️ Live chat responses follow verified company policies. Zero-hallucination guardrail active.
            </div>
          </div>
        </aside>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="modal-overlay" onClick={() => setShowShortcutsModal(false)}>
          <div
            className="modal-content card animate-fade-in"
            style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setShowShortcutsModal(false)}>
              ✕
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 14px' }}>
              ⌨️ Keyboard Shortcuts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Send message</span>
                <code>Enter</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>New line in chat</span>
                <code>Shift + Enter</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Close modal / blur</span>
                <code>Esc</code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;
