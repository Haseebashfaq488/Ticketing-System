import { useState, useEffect } from 'react';

const SUGGESTED_PROMPTS = [
  'What are your support hours?',
  'I want a refund for my subscription',
  'How do I generate an API key?',
  'Escalate to a human support agent',
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
    if (!conversationId) {
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
      const res = await fetch('/api/chat/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
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
          text: `✅ Your conversation has been converted to ticket #TCK-${data.ticket_id}. Our AI analyzed it (priority: ${data.analysis?.priority || '—'}) and a human agent will follow up. You are being taken to the ticket now.`,
          time: 'Just now',
        },
      ]);
      // Reset the chat session since the conversation is now a ticket
      setTimeout(() => {
        setMessages([{ ...WELCOME_MESSAGE, id: Date.now() }]);
        setConversationId(null);
        if (onConverted && data.ticket_id) onConverted(data.ticket_id);
      }, 1800);
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
      const res = await fetch('/api/chat', {
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
          text: 'Sorry, I could not reach the support server right now. Please make sure the backend is running on port 8000 and try again.',
          time: 'Just now',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 6px' }}>
          Live Support <span className="grad-text">Messaging Chat</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Real-time AI customer assistant connected to enterprise knowledge base.
        </p>
      </div>

      <div className="chat-container">
        {/* Left Sidebar: Active Conversations */}
        <div className="chat-sidebar">
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
            Active Session
          </div>

          <div className="chat-thread-list">
            <button className="chat-thread-item active">
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--accent-emerald)',
                }}
              />
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px' }}>AI Live Assistant</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Online 24/7</div>
              </div>
            </button>
          </div>
        </div>

        {/* Center: Main Chat Window */}
        <div className="chat-main">
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: '800',
                  fontSize: '12px',
                }}
              >
                AI
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>Nova Support Agent</div>
                <div style={{ fontSize: '12px', color: 'var(--accent-emerald)' }}>
                  ● Active & Connected
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn ghost small-btn"
                style={{ border: '1px solid var(--border-color)' }}
                onClick={startNewConversation}
                disabled={isTyping}
              >
                + New Conversation
              </button>
              <button
                className="btn secondary small-btn"
                onClick={handleConvertToTicket}
                disabled={isTyping || converting}
              >
                {converting ? 'Converting...' : 'Convert to Ticket'}
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="chat-messages">
            {messages.map((m) => (
              <div key={m.id} className={`message-bubble ${m.sender}`}>
                {m.text}
                <div
                  style={{
                    fontSize: '10px',
                    opacity: 0.7,
                    marginTop: '4px',
                    textAlign: m.sender === 'user' ? 'right' : 'left',
                  }}
                >
                  {m.time}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="message-bubble bot" style={{ fontStyle: 'italic', opacity: 0.8 }}>
                AI Assistant is typing a response...
              </div>
            )}
          </div>

          {/* Quick Prompts Drawer */}
          <div
            style={{
              padding: '8px 16px',
              background: 'var(--bg-input)',
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
            }}
          >
            {SUGGESTED_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                className="btn ghost small-btn"
                style={{ fontSize: '12px', whiteSpace: 'nowrap', border: '1px solid var(--border-color)' }}
                onClick={() => handleSend(p)}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Composer */}
          <div className="chat-input-bar">
            <input
              type="text"
              className="input-field"
              placeholder="Type your question or support issue..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="btn primary" onClick={() => handleSend()}>
              Send Message
            </button>
          </div>
        </div>

        {/* Right Sidebar: Context Panel */}
        <div className="chat-sidebar">
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
            Session Details
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            User Email: <br />
            <strong style={{ color: 'var(--text-primary)' }}>
              {user?.email || 'guest@example.com'}
            </strong>
          </div>
          <hr style={{ borderColor: 'var(--border-color)', width: '100%' }} />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            All live chat conversations are encrypted and audited for support compliance.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
