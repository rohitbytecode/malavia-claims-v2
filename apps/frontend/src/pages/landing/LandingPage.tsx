import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { Button } from "../../components/ui/Button";
import "./LandingPage.css";

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-logo">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="logo-icon"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="logo-text">Claims Management SaaS</span>
        </div>
        <nav className="landing-nav">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="https://github.com" target="_blank" rel="noreferrer">
            Docs
          </a>
        </nav>
        <div className="landing-auth-buttons">
          {user ? (
            <Button onClick={() => navigate("/dashboard")} variant="primary">
              Console Dashboard
            </Button>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-login">
                Sign In
              </Link>
              <Button onClick={() => navigate("/register")} variant="primary">
                Get Started
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">Next-Gen SaaS Multi-Tenancy</div>
          <h1 className="hero-title">
            Enterprise Claims Management{" "}
            <span className="gradient-text">Scaled for SaaS</span>
          </h1>
          <p className="hero-subtitle">
            Secure, audited, real-time insurance claims processing with robust
            logical tenant isolation, custom contracts, and instant department
            allocation. Built for modern clinics and enterprise hospital networks.
          </p>
          <div className="hero-actions">
            {user ? (
              <Button
                onClick={() => navigate("/dashboard")}
                variant="primary"
                className="hero-btn-primary"
              >
                Go to Operations Console
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => navigate("/register")}
                  variant="primary"
                  className="hero-btn-primary"
                >
                  Start Free Trial
                </Button>
                <Button
                  onClick={() => navigate("/login")}
                  variant="ghost"
                  className="hero-btn-secondary"
                >
                  Operator Sign In
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="hero-visual">
          <div className="dashboard-mockup">
            <div className="mockup-header">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
              <div className="mockup-title">Claims Dashboard (Tenant isolated)</div>
            </div>
            <div className="mockup-body">
              <div className="mockup-sidebar"></div>
              <div className="mockup-main">
                <div className="mockup-widgets">
                  <div className="mockup-widget widget-lg"></div>
                  <div className="mockup-widget"></div>
                  <div className="mockup-widget"></div>
                </div>
                <div className="mockup-table"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Everything you need for seamless operations</h2>
          <p>
            Avoid cross-tenant data leaks and boost claims processing efficiency
            with state-of-the-art SaaS plumbing.
          </p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Logical Tenant Isolation</h3>
            <p>
              Strictly enforced organization scoping at the repository layer.
              Every query is automatically scoped with your organizationId.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-Time Sync & Events</h3>
            <p>
              Collaborate smoothly across teams with instant Socket.io updates
              isolated strictly by organization rooms.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Smart Allocation</h3>
            <p>
              Instant department breakdown and automatic settlement payouts.
              Track your hospital revenue automatically.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Enterprise Audit Trail</h3>
            <p>
              Fully compliant, immutable audit logging tracking every state
              transition, operator action, and claim update.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="section-header">
          <h2>Flexible plans for operations of any size</h2>
          <p>Choose the plan that fits your healthcare facility network.</p>
        </div>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="plan-tier">FREE</div>
            <div className="plan-price">
              $0<span className="price-period">/mo</span>
            </div>
            <ul className="plan-features">
              <li>Up to 100 Claims/mo</li>
              <li>1 Department</li>
              <li>Basic Insurance tracking</li>
              <li>Single user login</li>
            </ul>
            <Button
              onClick={() => navigate("/register?plan=FREE")}
              variant="ghost"
              className="pricing-btn"
            >
              Get Started
            </Button>
          </div>

          <div className="pricing-card featured">
            <div className="featured-badge">MOST POPULAR</div>
            <div className="plan-tier">PRO</div>
            <div className="plan-price">
              $99<span className="price-period">/mo</span>
            </div>
            <ul className="plan-features">
              <li>Unlimited Claims</li>
              <li>Unlimited Departments</li>
              <li>Custom Payer Contracts</li>
              <li>Up to 15 Operators</li>
              <li>Real-time Webhook notifications</li>
            </ul>
            <Button
              onClick={() => navigate("/register?plan=PRO")}
              variant="primary"
              className="pricing-btn"
            >
              Start 14-Day Trial
            </Button>
          </div>

          <div className="pricing-card">
            <div className="plan-tier">ENTERPRISE</div>
            <div className="plan-price">
              Custom<span className="price-period">/mo</span>
            </div>
            <ul className="plan-features">
              <li>Dedicated cluster deployment</li>
              <li>Custom S3 bucket configuration</li>
              <li>Unlimited Operators & Admins</li>
              <li>SLA-backed priority support</li>
              <li>SSO / SAML authentication</li>
            </ul>
            <Button
              onClick={() => navigate("/register?plan=ENTERPRISE")}
              variant="ghost"
              className="pricing-btn"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 Claims Management SaaS. All rights reserved.</p>
        <div className="footer-links">
          <a href="#features">Privacy Policy</a>
          <a href="#features">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
