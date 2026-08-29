import { useState } from 'react';

function UpgradeModal({ isOpen, onClose, targetPlan, onConfirmPlan }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const planDetails = {
    Free: { name: 'Free Starter', price: '$0 / month', badge: 'Free Plan' },
    Gold: { name: 'Gold Pro', price: '$29 / month', badge: 'Gold Member' },
    Premium: { name: 'Premium Enterprise', price: '$99 / month', badge: 'Premium Tier' },
  }[targetPlan || 'Gold'];

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      if (onConfirmPlan) onConfirmPlan(targetPlan, planDetails.badge);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    }, 1000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card animate-fade-in" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close Modal">
          ✕
        </button>

        <div className="auth-header">
          <div className="badge-pill" style={{ marginBottom: '12px' }}>
            Subscription Management
          </div>
          <h2>Upgrade to {planDetails.name}</h2>
          <p>
            Confirm your subscription plan. This updates your customer record in the database.
          </p>
        </div>

        {success ? (
          <div className="banner green" style={{ textAlign: 'center', padding: '16px' }}>
            ✓ Successfully subscribed to <strong>{planDetails.name}</strong>! Profile badge updated.
          </div>
        ) : (
          <div>
            <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '16px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Selected Plan:</div>
              <div style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0', color: 'var(--text-primary)' }}>
                {planDetails.name}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--accent-purple)' }}>
                {planDetails.price}
              </div>
            </div>

            <button
              className="btn primary block-btn"
              onClick={handleConfirm}
              disabled={loading}
              style={{ padding: '14px' }}
            >
              {loading ? 'Processing Subscription...' : `Confirm & Activate ${planDetails.name}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UpgradeModal;
