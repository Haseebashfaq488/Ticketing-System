import { useState } from 'react';

function Footer({ onNavigate, onOpenAbout, isAdmin }) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setSubscribed(true);
    setTimeout(() => {
      setSubscribed(false);
      setNewsletterEmail('');
    }, 3000);
  };

  const scrollToSection = (id) => {
    onNavigate('home');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <div className="brand" style={{ marginBottom: '12px' }}>
              <span className="brand-dot" />
              NovaWare <span className="brand-muted">AI Support Platform</span>
            </div>
            <p className="footer-text">
              Enterprise AI support & ticket orchestration platform designed for modern, high-scale customer service teams.
            </p>
            <div className="footer-status-pill">
              <span className="status-dot-green" /> All Systems Operational
            </div>
          </div>

          {/* Product Column */}
          <div className="footer-links-col">
            <h4>Product</h4>
            <ul>
              {isAdmin && (
                <li><button onClick={() => onNavigate('dashboard')}>Support Dashboard</button></li>
              )}
              <li><button onClick={() => onNavigate('ticket')}>Submit Ticket</button></li>
              <li><button onClick={() => onNavigate('chat')}>Live Chat AI</button></li>
              <li><button onClick={() => scrollToSection('pricing-plans')}>Subscription Plans</button></li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="footer-links-col">
            <h4>Company</h4>
            <ul>
              <li><button onClick={onOpenAbout}>About Us</button></li>
              <li><button onClick={() => scrollToSection('enterprise-directory')}>Enterprise Directory</button></li>
              <li><button onClick={() => onNavigate('profile')}>User Profile Settings</button></li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="footer-newsletter-col">
            <h4>Stay Updated</h4>
            <p className="footer-text">
              Subscribe to our monthly engineering & AI product update newsletter.
            </p>
            {subscribed ? (
              <div className="banner green" style={{ marginTop: '10px' }}>
                ✓ Thank you for subscribing!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="footer-newsletter-form">
                <input
                  type="email"
                  className="input-field"
                  placeholder="Enter work email..."
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn primary small-btn">
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        <hr className="footer-divider" />

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <div className="footer-copyright">
            © {new Date().getFullYear()} NovaWare AI Ticketing System. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
