import { useEffect, useRef, useState } from 'react';

const SUGGESTIONS = [
  'What are your support hours?',
  'What is included in the Premium plan?',
  'Is my payment done?',
  'I want a refund',
  'I think someone hacked my account',
];

function Trace({ steps }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="chat-trace">
      <button className="trace-toggle" onClick={() => setOpen(!open)}>
        agent trace ({steps.length} tool call{steps.length === 1 ? '' : 's'})
        {open ? ' ▲' : ' ▼'}
      </button>
      {open && (
        <ul className="trace small">
          {steps.map((s, i) => (
            <li key={i}>
              <code>{s.tool}</code> → {s.output}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChatPage({ onGoTicket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [convertState, setConvertState] = useState(null);
  const [convertSubject, setConvertSubject] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const startConversation = async (customerEmail) => {
    if (conversationId) return;
    try {
      const res = await fetch(`/api/chat/start?customer_email=${encodeURIComponent(customerEmail || 'guest')}`, { method: 'POST' });
      const body = await res.json();
      setConversationId(body.conversation_id);
    } catch {}
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput('');

    if (!conversationId) await startConversation(email);

    setBusy(true);
    const history = [...messages, { role: 'user', content }];
    setMessages(history);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          customer_email: email || null,
          conversation_id: conversationId,
        }),
      });
      const body = await res.json();
      if (body.conversation_id && !conversationId) setConversationId(body.conversation_id);
      setMessages([
        ...history,
        {
          role: 'ai',
          content: body.reply || `Error: ${body.detail || res.status}`,
          steps: body.agent_trace || [],
        },
      ]);
    } catch (err) {
      setMessages([
        ...history,
        { role: 'ai', content: `Network error: ${err.message}`, steps: [] },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const convertToTicket = async () => {
    if (!conversationId || !convertSubject.trim()) return;
    setConvertState('working');
    try {
      const res = await fetch('/api/chat/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          customer_email: email || 'guest',
          subject: convertSubject,
        }),
      });
      if (res.ok) {
        setConvertState('done');
      } else {
        setConvertState('error');
      }
    } catch {
      setConvertState('error');
    }
  };

  return (
    <div className="chat-wrap">
      <div className="chat-head card">
        <div>
          <h2>Live chat with SupportAgent</h2>
          <p className="muted">
            Answers come only from our company knowledge base. Sensitive
            requests are routed to human review.
          </p>
        </div>
        <label className="chat-email">
          Your email <span className="muted">(optional)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
          />
        </label>
      </div>

      <div className="chat-window card">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Say hello, or try one of these:</p>
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.content}</div>
            {m.role === 'ai' && m.steps?.length > 0 && <Trace steps={m.steps} />}
          </div>
        ))}

        {busy && (
          <div className="msg ai">
            <div className="bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="chat-input card"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          disabled={busy}
        />
        <button className="btn primary" type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>

      {messages.length > 2 && conversationId && convertState !== 'done' && (
        <div className="card convert-section">
          <p className="muted">Can't resolve in chat?</p>
          {convertState === 'edit' ? (
            <div className="convert-form">
              <input
                value={convertSubject}
                onChange={e => setConvertSubject(e.target.value)}
                placeholder="Subject for the ticket"
              />
              <button className="btn primary" onClick={convertToTicket} disabled={!convertSubject.trim()}>Create Ticket</button>
              <button className="btn ghost" onClick={() => setConvertState(null)}>Cancel</button>
            </div>
          ) : (
            <button className="btn ghost" onClick={() => setConvertState('edit')}>Create a ticket from this chat →</button>
          )}
          {convertState === 'working' && <p className="muted">Creating ticket…</p>}
          {convertState === 'error' && <p className="banner red">Failed to create ticket</p>}
        </div>
      )}
    </div>
  );
}

export default ChatPage;
