import { useState } from 'react';
import { supabase } from './supabaseClient';

function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;

        if (data?.session) {
          setSuccessMsg('Account created and signed in successfully!');
          onAuthSuccess(data.user);
          setTimeout(() => onClose(), 1200);
        } else {
          setSuccessMsg('Account created! Check your email to confirm your signup or sign in directly.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        setSuccessMsg('Signed in successfully!');
        onAuthSuccess(data.user);
        setTimeout(() => onClose(), 1000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    if (mode === 'signup') setFullName(demoEmail.split('@')[0]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="auth-header">
          <h2>{mode === 'signin' ? 'Sign In to NovaWare' : 'Create an Account'}</h2>
          <p className="muted">
            {mode === 'signin'
              ? 'Access your tickets and manage your support requests.'
              : 'Join NovaWare to track and create support tickets.'}
          </p>
        </div>

        {errorMsg && <div className="banner red">{errorMsg}</div>}
        {successMsg && <div className="banner green">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <label>
              Full Name
              <input
                type="text"
                required
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
          )}

          <label>
            Email Address
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button type="submit" className="btn primary block-btn" disabled={loading}>
            {loading ? 'Processing…' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="demo-accounts">
          <p className="small muted">Quick Fill Demo Accounts:</p>
          <div className="chips">
            <button className="chip" onClick={() => fillDemo('john@example.com')}>
              john@example.com
            </button>
            <button className="chip" onClick={() => fillDemo('admin@novaware.com')}>
              admin@novaware.com
            </button>
          </div>
        </div>

        <div className="auth-switch">
          {mode === 'signin' ? (
            <p>
              Don't have an account?{' '}
              <button className="btn-link" onClick={() => { setMode('signup'); setErrorMsg(''); }}>
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button className="btn-link" onClick={() => { setMode('signin'); setErrorMsg(''); }}>
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
