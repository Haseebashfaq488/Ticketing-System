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
  const [policies, setPolicies] = useState(DEFAULT_POLICIES);
  const [expandedPolicyId, setExpandedPolicyId] = useState(null);

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

  return (
    <div className="hub-container animate-fade-in">
      {/* Top App Hub Bar */}
      <header className="hub-header">
        <div className="hub-header-left">
          <h2 className="hub-title">
            <svg className="icon-svg" style={{ color: 'var(--accent-purple)' }} viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Live Chat
          </h2>
        </div>

        <div className="hub-header-right">
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

      {/* 2-Pane Conversation Layout */}
      <div className="hub-layout">
        {/* Center Pane: Active Live Chat */}
            <main className="hub-main-panel">
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
              {policies.map((pol, idx) => {
                const fullText =
                  pol.full_text ||
                  pol.content ||
                  pol.details ||
                  pol.body ||
                  pol.text ||
                  pol.summary ||
                  pol.description;
                const isOpen = expandedPolicyId === (pol.id || idx);
                return (
                  <div
                    key={pol.id || idx}
                    className="hub-policy-item"
                    onClick={() => setExpandedPolicyId(isOpen ? null : pol.id || idx)}
                    role="button"
                    tabIndex={0}
                    title={isOpen ? 'Collapse policy' : 'Read full policy'}
                  >
                    <div className="hub-policy-title">{pol.title || pol.name}</div>
                    {!isOpen && pol.summary && (
                      <p className="hub-policy-desc">{pol.summary}</p>
                    )}
                    {isOpen && fullText && (
                      <div className="hub-policy-body">{fullText}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              🛡️ Live chat responses follow verified company policies. Zero-hallucination guardrail active.
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
}

export default ChatPage;
