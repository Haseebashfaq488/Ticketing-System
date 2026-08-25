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
        ⚙ agent trace ({steps.length} tool call{steps.length === 1 ? '' : 's'})
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

function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput('');
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
        }),
      });
      const body = await res.json();
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
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
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
    </div>
  );
}

export default ChatPage;
