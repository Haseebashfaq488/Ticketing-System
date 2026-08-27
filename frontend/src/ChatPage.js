import { useState } from 'react';

const SUGGESTED_PROMPTS = [
  'What are your support hours?',
  'I want a refund for my subscription',
  'How do I generate an API key?',
  'Escalate to a human support agent',
];

function ChatPage({ user, onGoTicket, onSelectTicket }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hello! I am your AI Support Assistant powered by NovaWare. How can I assist you with your account, billing, or technical tickets today?',
      time: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const newMsg = { id: Date.now(), sender: 'user', text: query, time: 'Just now' };
    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let botReply = 'I have received your request. Let me check our knowledge base for you...';
      const lower = query.toLowerCase();

      if (lower.includes('hours') || lower.includes('support hours')) {
        botReply = 'Our support team is available 24/7! AI support resolves tickets instantly, while human agents are active Mon-Fri 9AM-6PM EST.';
      } else if (lower.includes('refund')) {
        botReply = 'Refund requests require human verification. I have flagged your account for review. Would you like me to open a formal ticket?';
      } else if (lower.includes('api') || lower.includes('key')) {
        botReply = 'You can generate your API key under User Profile -> API Tokens. Ensure you keep your bearer secret secure!';
      } else if (lower.includes('human') || lower.includes('escalate')) {
        botReply = 'I am transferring this chat session to an active human agent. Estimated wait time: ~2 minutes.';
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: botReply, time: 'Just now' },
      ]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 6px' }}>
          Live Support <span className="grad-text">Messaging Chat</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Real-time AI customer assistant connected to company knowledge base.
        </p>
      </div>

      <div className="chat-container">
        {/* Left Sidebar: Active Conversations */}
        <div className="chat-sidebar">
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
            💬 Active Sessions
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

            <button className="chat-thread-item">
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--accent-amber)',
                }}
              />
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px' }}>Tier-2 Agent Support</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Standby</div>
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
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>Nova Support Agent</div>
                <div style={{ fontSize: '12px', color: 'var(--accent-emerald)' }}>
                  ● Active & Connected
                </div>
              </div>
            </div>

            <button className="btn secondary small-btn" onClick={onGoTicket}>
              🎫 Convert to Ticket
            </button>
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
                🤖 AI Assistant is typing a response...
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
                💡 {p}
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
              Send 🚀
            </button>
          </div>
        </div>

        {/* Right Sidebar: Context Panel */}
        <div className="chat-sidebar">
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
            ℹ️ Session Info
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            User Email: <br />
            <strong style={{ color: 'var(--text-primary)' }}>
              {user?.email || 'guest@example.com'}
            </strong>
          </div>
          <hr style={{ borderColor: 'var(--border-color)', width: '100%' }} />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            🔒 All live chat conversations are encrypted and audited for support compliance.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
