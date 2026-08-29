function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card animate-fade-in" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close Modal">
          ✕
        </button>

        <div className="auth-header" style={{ textAlign: 'left' }}>
          <div className="badge-pill" style={{ marginBottom: '12px' }}>
            About NovaWare AI
          </div>
          <h2>Enterprise Support Orchestration</h2>
          <p>
            NovaWare is an AI-native customer support and ticket management platform designed to automate Tier-1 support while providing complete traceability for human agents.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '14px' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
              🤖 AI Diagnostic Traceability
            </strong>
            Every support request is analyzed by our Gemini AI engine to detect intent, assign priority levels, and generate suggested responses before reaching human agents.
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '14px' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
              💬 Real-Time Live Support Messaging
            </strong>
            Integrated live chat sessions connected directly to custom enterprise knowledge bases with instant chat-to-ticket escalation.
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '14px' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
              📊 Complete Schema & Audit Logs
            </strong>
            Full PostgreSQL audit trails (`support_tickets`, `customers`, `ai_analyses`, `activity_logs`) ensuring compliance and SLA tracking.
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button className="btn primary" onClick={onClose}>
            Close & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default AboutModal;
