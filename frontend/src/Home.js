function Home({ onSelect }) {
  const listedBusinesses = [
    {
      name: 'ApexTech Solutions',
      category: 'Cloud Infrastructure',
      rating: '4.9 ★',
      ticketsResolved: '1,420+',
      icon: '⚡',
    },
    {
      name: 'Global Logistics Hub',
      category: 'Supply Chain & Freight',
      rating: '4.8 ★',
      ticketsResolved: '3,890+',
      icon: '📦',
    },
    {
      name: 'Nova Retail Group',
      category: 'E-Commerce Platform',
      rating: '5.0 ★',
      ticketsResolved: '850+',
      icon: '🛍️',
    },
    {
      name: 'CloudScale AI',
      category: 'Enterprise SaaS',
      rating: '4.9 ★',
      ticketsResolved: '2,100+',
      icon: '🤖',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="badge-pill">
          ✨ Next-Gen AI Support & Ticket Orchestration
        </div>

        <h1 className="hero-title">
          Smart Customer Support for <span className="grad-text">Modern Businesses</span>
        </h1>

        <p className="hero-subtext">
          Instant AI answers, real-time customer messaging, automated ticket priority routing, 
          and enterprise support workflow analytics.
        </p>

        <div className="hero-ctas">
          <button className="btn primary" onClick={() => onSelect('ticket')}>
            🎫 Create Support Ticket
          </button>
          <button className="btn secondary" onClick={() => onSelect('chat')}>
            💬 Start Live Chat
          </button>
          <button className="btn secondary" onClick={() => onSelect('dashboard')}>
            📊 Support Dashboard
          </button>
        </div>
      </div>

      {/* Featured Listed Businesses Section */}
      <div style={{ marginTop: '56px' }}>
        <h2 className="section-title">
          🏢 Listed Enterprise Businesses
        </h2>
        <p className="section-desc">
          Top platforms utilizing our unified AI ticketing & resolution platform.
        </p>

        <div className="business-grid">
          {listedBusinesses.map((biz, idx) => (
            <div key={idx} className="business-card">
              <div className="business-icon">{biz.icon}</div>
              <div>
                <h3 className="business-name">{biz.name}</h3>
                <span className="business-tag">{biz.category}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  marginTop: '8px',
                }}
              >
                <span>Rating: <strong style={{ color: 'var(--accent-amber)' }}>{biz.rating}</strong></span>
                <span>{biz.ticketsResolved} Resolved</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Pricing Panel */}
      <div style={{ marginTop: '72px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span className="badge-pill">💎 Flexible Plans</span>
          <h2 style={{ fontSize: '36px', fontWeight: '900', margin: '10px 0' }}>
            Choose Your <span className="grad-text">Subscription Tier</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
            Scale customer support seamlessly with flexible monthly or annual billing.
          </p>
        </div>

        <div className="pricing-grid">
          {/* Free Tier */}
          <div className="pricing-card">
            <div>
              <h3 className="plan-name">Free Starter</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Ideal for individuals & small side projects.
              </p>
            </div>
            <div className="plan-price">$0 <span>/ month</span></div>

            <ul className="plan-features">
              <li>Up to 50 tickets / month</li>
              <li>Basic AI auto-responder</li>
              <li>Community support access</li>
              <li>Single user seat</li>
            </ul>

            <button className="btn secondary" onClick={() => onSelect('ticket')}>
              Get Started Free
            </button>
          </div>

          {/* Gold Tier (Featured) */}
          <div className="pricing-card featured">
            <div className="popular-badge">🔥 Most Popular</div>
            <div>
              <h3 className="plan-name" style={{ color: 'var(--accent-amber)' }}>Gold Pro</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                For growing businesses & active support teams.
              </p>
            </div>
            <div className="plan-price">$29 <span>/ month</span></div>

            <ul className="plan-features">
              <li>Unlimited monthly tickets</li>
              <li>Real-Time Live Chat AI bot</li>
              <li>Automated priority routing</li>
              <li>Up to 10 Agent seats</li>
              <li>Analytics & response SLA reports</li>
            </ul>

            <button className="btn primary" onClick={() => onSelect('profile')}>
              Subscribe to Gold ⭐
            </button>
          </div>

          {/* Premium Tier */}
          <div className="pricing-card">
            <div>
              <h3 className="plan-name">Premium Enterprise</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Dedicated SLA, high volume & custom AI models.
              </p>
            </div>
            <div className="plan-price">$99 <span>/ month</span></div>

            <ul className="plan-features">
              <li>Unlimited tickets & chat sessions</li>
              <li>Custom fine-tuned AI support model</li>
              <li>Dedicated 24/7 account manager</li>
              <li>Unlimited team agent seats</li>
              <li>Custom API & webhook integrations</li>
            </ul>

            <button className="btn secondary" onClick={() => onSelect('profile')}>
              Contact Enterprise Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
