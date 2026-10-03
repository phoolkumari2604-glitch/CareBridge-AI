import { Link } from "react-router-dom";
import {
  ShieldCheck,
  HeartPulse,
  CalendarDays,
  Activity,
  ArrowRight,
} from "lucide-react";

function Landing() {
  return (
    <div className="landing-page">

      {/* =========================
          NAVBAR
      ========================= */}

      <header className="landing-navbar">
        <div className="brand">
          <div className="brand-icon">
            <HeartPulse size={21} />
          </div>

          <div className="brand-text">
            CareBridge <span>AI</span>
          </div>
        </div>

        <div className="landing-nav-actions">
          <Link to="/login" className="btn btn-secondary">
            Login
          </Link>

          <Link to="/register" className="btn btn-primary">
            Get Started
          </Link>
        </div>
      </header>


      {/* =========================
          HERO
      ========================= */}

      <main>

        <section className="landing-hero">

          <div className="landing-hero-content">

            <div className="landing-badge">
              <ShieldCheck size={16} />
              Smart Healthcare Platform
            </div>

            <h1>
              Healthcare,
              <span> connected intelligently.</span>
            </h1>

            <p>
              CareBridge AI brings patients, doctors, and
              healthcare staff together through a secure
              digital healthcare platform.
            </p>

            <div className="landing-hero-actions">
              <Link to="/register" className="btn btn-primary">
                Get Started
                <ArrowRight size={18} />
              </Link>

              <Link to="/login" className="btn btn-secondary">
                Sign In
              </Link>
            </div>

          </div>


          {/* Hero visual */}

          <div className="landing-hero-visual">

            <div className="health-card">

              <div className="health-card-header">
                <div>
                  <span>Health Overview</span>
                  <h3>Patient Dashboard</h3>
                </div>

                <div className="health-status">
                  <Activity size={17} />
                </div>
              </div>

              <div className="health-stat">
                <div className="health-stat-icon">
                  <HeartPulse size={20} />
                </div>

                <div>
                  <small>Heart Rate</small>
                  <strong>72 BPM</strong>
                </div>
              </div>

              <div className="health-stat">
                <div className="health-stat-icon">
                  <Activity size={20} />
                </div>

                <div>
                  <small>Health Status</small>
                  <strong>Stable</strong>
                </div>
              </div>

              <div className="health-stat">
                <div className="health-stat-icon">
                  <CalendarDays size={20} />
                </div>

                <div>
                  <small>Appointments</small>
                  <strong>3 Upcoming</strong>
                </div>
              </div>

            </div>

          </div>

        </section>


        {/* =========================
            FEATURES
        ========================= */}

        <section className="landing-features">

          <div className="landing-section-heading">
            <span>CAREBRIDGE AI</span>

            <h2>
              One platform for connected healthcare
            </h2>

            <p>
              Manage healthcare information, appointments,
              health monitoring, and communication in one place.
            </p>
          </div>


          <div className="landing-feature-grid">

            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <HeartPulse size={23} />
              </div>

              <h3>Health Monitoring</h3>

              <p>
                Keep track of important health information
                and monitor patient wellness.
              </p>
            </div>


            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <CalendarDays size={23} />
              </div>

              <h3>Appointments</h3>

              <p>
                Manage appointments and connect patients
                with healthcare providers efficiently.
              </p>
            </div>


            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <ShieldCheck size={23} />
              </div>

              <h3>Secure Healthcare</h3>

              <p>
                Role-based access and protected healthcare
                information for authorized users.
              </p>
            </div>

          </div>

        </section>

      </main>


      {/* =========================
          FOOTER
      ========================= */}

      <footer className="landing-footer">
        <div className="brand">
          <div className="brand-icon">
            <HeartPulse size={18} />
          </div>

          <div className="brand-text">
            CareBridge <span>AI</span>
          </div>
        </div>

        <p>
          Smart healthcare, connected better.
        </p>
      </footer>

    </div>
  );
}

export default Landing;