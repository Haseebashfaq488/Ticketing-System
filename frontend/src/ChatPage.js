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

function ChatPage({ user, onGoTicket, onSelectTicket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [convertState, setConvertState] = useState(null);
  const [convertSubject, setConvertSubject] = useState('');
  const [createdTicketId, setCreatedTicketId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const startConversation = async (customerEmail) => {
    if (conversationId) return conversationId;
    try {
      const activeEmail = customerEmail || email || (user ? user.email : 'guest@novaware.dev');
      const res = await fetch(`/api/chat/start?customer_email=${encodeURIComponent(activeEmail)}`, { method: 'POST' });
      const body = await res.json();
      if (body.conversation_id) {
        setConversationId(body.conversation_id);
        return body.conversation_id;
      }
    } catch (e) {
      console.error('Failed to start chat session', e);
    }
    return null;
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput('');

    let activeConvId = conversationId;
    if (!activeConvId) {
      activeConvId = await startConversation(email);
    }

    setBusy(true);
    const history = [...messages, { role: 'user', content }];
    setMessages(history);

    try {
      const activeEmail = email || (user ? user.email : 'guest@novaware.dev');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          customer_email: activeEmail,
          conversation_id: activeConvId,
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
    let activeConvId = conversationId;
    if (!activeConvId) {
      activeConvId = await startConversation(email);
    }

    if (!activeConvId || !convertSubject.trim()) {
      setErrorMsg('Please enter a subject for the ticket.');
      return;
    }

    setConvertState('working');
    setErrorMsg('');

    try {
      const activeEmail = email || (user ? user.email : 'guest@novaware.dev');
      const res = await fetch('/api/chat/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvId,
          customer_email: activeEmail,
          subject: convertSubject,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ticket_id) {
        setConvertState('done');
        setCreatedTicketId(data.ticket_id);
      } else {
        setConvertState('error');
        setErrorMsg(data.detail || 'Failed to create ticket from live chat');
      }
    } catch (err) {
      setConvertState('error');
      setErrorMsg(err.message || 'Network error while converting chat');
    }
  };

  return (
    <div className="chat-wrap">
      <div className="chat-head card">
        <div>
          <h2>Live Chat with SupportAgent</h2>
          <p className="muted">
            Answers come only from our company knowledge base. Complex requests can be converted into support tickets.
          </p>
        </div>
        <label className="chat-email">
          Your email {user ? <span className="green">(Logged In)</span> : <span className="muted">(optional)</span>}
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
            <p>Say hello, or try one of these common questions:</p>
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

      {/* Convert to Ticket Section */}
      <div className="card convert-section">
        {convertState === 'done' ? (
          <div className="convert-success">
            <p className="banner green">
              🎉 Ticket <strong>#{createdTicketId}</strong> successfully created from this chat!
            </p>
            {onSelectTicket && (
              <button className="btn primary" onClick={() => onSelectTicket(createdTicketId)}>
                View Ticket #{createdTicketId} in Dashboard →
              </button>
            )}
          </div>
        ) : convertState === 'edit' ? (
          <div className="convert-form">
            <p className="bold-label">Create a Support Ticket from Chat</p>
            {errorMsg && <p className="banner red">{errorMsg}</p>}
            <input
              value={convertSubject}
              onChange={(e) => setConvertSubject(e.target.value)}
              placeholder="Enter subject for the ticket (e.g. Account access issue)"
              disabled={convertState === 'working'}
            />
            <div className="actions-row">
              <button
                className="btn primary"
                onClick={convertToTicket}
                disabled={convertState === 'working' || !convertSubject.trim()}
              >
                {convertState === 'working' ? 'Creating Ticket…' : 'Submit Ticket'}
              </button>
              <button className="btn ghost" onClick={() => { setConvertState(null); setErrorMsg(''); }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="convert-prompt">
            <p className="muted">Can't resolve your issue in chat?</p>
            <button className="btn ghost" onClick={() => setConvertState('edit')}>
              Create a support ticket from this conversation →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatPage;
