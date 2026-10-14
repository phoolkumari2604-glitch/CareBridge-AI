import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  Phone,
  Calendar,
  Clock,
  ShieldCheck,
  Activity,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Stethoscope,
  Brain,
  Smile,
  Baby,
  Users,
  Video,
  FileText,
  Sparkles,
  MapPin,
  Mail,
  Menu,
  X,
  Star,
  Check,
  Zap,
  Award
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Landing.css";

// Helper hook for smooth count-up animation
function useCountUp(targetNumber, duration = 1600, startImmediately = false) {
  const [count, setCount] = useState(0);
  const [hasTriggered, setHasTriggered] = useState(startImmediately);

  useEffect(() => {
    if (!hasTriggered) return;

    let startTimestamp = null;
    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease-out cubic calculation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * targetNumber));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(targetNumber);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [hasTriggered, targetNumber, duration]);

  return [count, () => setHasTriggered(true)];
}

const Landing = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Animated counters
  const [yearsCount, triggerYears] = useCountUp(25, 1200);
  const [patientsCount, triggerPatients] = useCountUp(160, 1500);
  const [successCount, triggerSuccess] = useCountUp(99, 1400, true);
  const [doctorsCount, triggerDoctors] = useCountUp(120, 1500);

  // References for scroll observer
  const statsSectionRef = useRef(null);

  // SEO & Open Graph Meta Tags
  useEffect(() => {
    document.title = "CareBridge AI | Reliable Healthcare at Your Fingertips";

    // Set or update standard meta tags
    const setMetaTag = (attrName, attrVal, content) => {
      let element = document.querySelector(`meta[${attrName}="${attrVal}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    setMetaTag("name", "description", "CareBridge AI connects you with verified medical specialists, intelligent triage, and 24/7 continuous health telemetry—designed for modern proactive living.");
    setMetaTag("property", "og:title", "CareBridge AI | Reliable Healthcare at Your Fingertips");
    setMetaTag("property", "og:description", "Comprehensive, connected clinical healthcare with AI triage, real-time vitals telemetry, and instant OPD passes.");
    setMetaTag("property", "og:type", "website");
    setMetaTag("property", "og:url", window.location.href);
    setMetaTag("name", "keywords", "CareBridge AI, medical appointment, online doctor, AI healthcare, patient portal, vitals telemetry, clinic triage");

    // Scroll listener for sticky header styling
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection Observer for scroll-reveal animations and counters
  useEffect(() => {
    const reveals = document.querySelectorAll(".cb-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("cb-visible");
            // If the about or stats section comes into view, trigger count-up
            if (entry.target.id === "about" || entry.target.contains(statsSectionRef.current)) {
              triggerYears();
              triggerPatients();
              triggerDoctors();
            }
          }
        });
      },
      { threshold: 0.15 }
    );

    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [triggerYears, triggerPatients, triggerDoctors]);

  // Smooth scroll handler for anchor links
  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 85;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  // Resolve target portal link if user is logged in
  const getDashboardLink = () => {
    if (!user) return "/register";
    const role = (user.role || "").toUpperCase();
    if (role === "DOCTOR") return "/doctor/dashboard";
    if (role === "STAFF") return "/staff/dashboard";
    if (role === "ADMIN") return "/admin/dashboard";
    return "/patient/dashboard";
  };

  return (
    <div className="cb-landing">
      {/* ============================================================
          1. STICKY HEADER
         ============================================================ */}
      <header className={`cb-header ${scrolled ? "cb-scrolled" : ""}`}>
        <div className="cb-container">
          <nav className="cb-nav-wrapper" aria-label="Main Navigation">
            {/* Logo */}
            <Link to="/" className="cb-brand" aria-label="CareBridge AI Homepage">
              <div className="cb-brand-icon">
                <HeartPulse size={24} />
              </div>
              <div className="cb-brand-text">
                CareBridge <span>AI</span>
                <span className="cb-brand-badge">Clinical</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <ul className="cb-nav-links">
              <li>
                <a href="#hero" className="cb-nav-link" onClick={(e) => scrollToSection(e, "hero")}>
                  Home
                </a>
              </li>
              <li>
                <a href="#services" className="cb-nav-link" onClick={(e) => scrollToSection(e, "services")}>
                  Services
                </a>
              </li>
              <li>
                <a href="#specialties" className="cb-nav-link" onClick={(e) => scrollToSection(e, "specialties")}>
                  Specialties
                </a>
              </li>
              <li>
                <a href="#about" className="cb-nav-link" onClick={(e) => scrollToSection(e, "about")}>
                  About
                </a>
              </li>
              <li>
                <a href="#ai-platform" className="cb-nav-link" onClick={(e) => scrollToSection(e, "ai-platform")}>
                  AI Platform
                </a>
              </li>
              <li>
                <a href="#contact" className="cb-nav-link" onClick={(e) => scrollToSection(e, "contact")}>
                  Contact
                </a>
              </li>
            </ul>

            {/* Header Right Actions */}
            <div className="cb-header-actions">
              <a href="tel:+18004273274" className="cb-header-phone" title="Call Clinical Support 24/7">
                <Phone size={16} className="cb-phone-icon" />
                <span>+1 (800) 427-3274</span>
              </a>

              {isAuthenticated ? (
                <Link to={getDashboardLink()} className="cb-btn-book-header">
                  <Activity size={16} /> My Portal
                </Link>
              ) : (
                <>
                  <Link to="/login" className="cb-btn-login-doctor" title="Clinician & Staff Sign In">
                    <Stethoscope size={16} /> Doctor Login
                  </Link>

                  <Link to="/register" className="cb-btn-book-header">
                    <Calendar size={16} /> Book Appointment
                  </Link>
                </>
              )}

              {/* Hamburger Toggle */}
              <button
                className="cb-mobile-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Dropdown Drawer */}
        <div className={`cb-mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
          <ul className="cb-mobile-nav-links">
            <li>
              <a href="#hero" onClick={(e) => scrollToSection(e, "hero")}>
                Home
              </a>
            </li>
            <li>
              <a href="#services" onClick={(e) => scrollToSection(e, "services")}>
                Healthcare Services
              </a>
            </li>
            <li>
              <a href="#specialties" onClick={(e) => scrollToSection(e, "specialties")}>
                Medical Specialties
              </a>
            </li>
            <li>
              <a href="#about" onClick={(e) => scrollToSection(e, "about")}>
                About Us
              </a>
            </li>
            <li>
              <a href="#ai-platform" onClick={(e) => scrollToSection(e, "ai-platform")}>
                CareBridge AI Platform
              </a>
            </li>
            <li>
              <a href="#contact" onClick={(e) => scrollToSection(e, "contact")}>
                Emergency & Contact
              </a>
            </li>
          </ul>

          <div className="cb-mobile-actions">
            <a href="tel:+18004273274" className="cb-header-phone" style={{ display: "flex", justifyContent: "center" }}>
              <Phone size={16} className="cb-phone-icon" />
              <span>Emergency: +1 (800) 427-3274</span>
            </a>

            {isAuthenticated ? (
              <Link to={getDashboardLink()} className="cb-btn-book-header" onClick={() => setMobileMenuOpen(false)}>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="cb-btn-login-doctor" onClick={() => setMobileMenuOpen(false)}>
                  <Stethoscope size={16} /> Doctor Login
                </Link>
                <Link to="/register" className="cb-btn-book-header" onClick={() => setMobileMenuOpen(false)}>
                  <Calendar size={16} /> Book Appointment
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ============================================================
            2. HERO SECTION
           ============================================================ */}
        <section id="hero" className="cb-hero-section">
          <div className="cb-container">
            <div className="cb-hero-grid">
              {/* Content Left */}
              <div className="cb-hero-content cb-reveal cb-visible">
                <div className="cb-pill-badge">
                  <ShieldCheck size={16} />
                  <span>NABH & HIPAA Accredited Clinical Network</span>
                </div>

                <h1 className="cb-hero-title">
                  Reliable healthcare at <span>your fingertips</span>
                </h1>

                <p className="cb-hero-subtext">
                  CareBridge AI connects you with verified specialists, instant clinical triage, and continuous vital telemetry. Experience modern healthcare built for your family's peace of mind.
                </p>

                <div className="cb-hero-cta-group">
                  <Link to="/register" className="cb-btn-primary">
                    Book Appointment <ArrowRight size={18} />
                  </Link>

                  <a href="#specialties" className="cb-btn-secondary" onClick={(e) => scrollToSection(e, "specialties")}>
                    Explore Specialties
                  </a>
                </div>

                {/* Patient Proof Stack */}
                <div className="cb-patient-proof">
                  <div className="cb-avatar-stack">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80"
                      alt="Verified patient review"
                      width="42"
                      height="42"
                      loading="eager"
                    />
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80"
                      alt="Verified patient review"
                      width="42"
                      height="42"
                      loading="eager"
                    />
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80"
                      alt="Verified patient review"
                      width="42"
                      height="42"
                      loading="eager"
                    />
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80"
                      alt="Verified patient review"
                      width="42"
                      height="42"
                      loading="eager"
                    />
                  </div>

                  <div className="cb-proof-text">
                    <strong>160K+ happy patients</strong>
                    <span>
                      <Star size={13} fill="#f59e0b" className="cb-star-filled" />
                      <Star size={13} fill="#f59e0b" className="cb-star-filled" />
                      <Star size={13} fill="#f59e0b" className="cb-star-filled" />
                      <Star size={13} fill="#f59e0b" className="cb-star-filled" />
                      <Star size={13} fill="#f59e0b" className="cb-star-filled" />
                      4.95 / 5 overall clinical satisfaction
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Right */}
              <div className="cb-hero-visual cb-reveal cb-visible">
                <div className="cb-hero-image-wrapper">
                  <img
                    src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80"
                    alt="Dr. Aris Thorne, Senior CareBridge AI Clinical Consultant"
                    width="440"
                    height="550"
                    loading="eager"
                    fetchpriority="high"
                  />
                </div>

                {/* Floating Glassmorphism Success Rate Card */}
                <div className="cb-float-success-card">
                  <div className="cb-float-icon-box">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="cb-float-info">
                    <strong>99%</strong>
                    <span>Treatment success rate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            3. SPECIALTY STRIP
           ============================================================ */}
        <section id="specialties" className="cb-specialty-section">
          <div className="cb-container">
            <div className="cb-section-header cb-reveal">
              <span className="cb-eyebrow">Medical Specialties</span>
              <h2 className="cb-section-title">Expertise Across Key Disciplines</h2>
              <p className="cb-section-subtext">
                Direct access to top-tier certified consultants equipped with modern diagnostics and personalized treatment protocols.
              </p>
            </div>

            <div className="cb-specialty-grid">
              {/* Card 1: Gynecology */}
              <Link to="/register" className="cb-specialty-card cb-reveal">
                <div>
                  <div className="cb-specialty-icon-wrap">
                    <Sparkles size={28} />
                  </div>
                  <h3>Gynecology & Obstetrics</h3>
                  <p>
                    Compassionate reproductive wellness, prenatal ultrasound screenings, and personalized hormonal health care.
                  </p>
                </div>
                <div className="cb-card-link-text">
                  <span>Consult Specialist</span>
                  <ChevronRight size={16} />
                </div>
              </Link>

              {/* Card 2: Dental Care */}
              <Link to="/register" className="cb-specialty-card cb-reveal">
                <div>
                  <div className="cb-specialty-icon-wrap">
                    <Smile size={28} />
                  </div>
                  <h3>Dental Care & Surgery</h3>
                  <p>
                    Preventive hygiene, advanced pain-free restorations, cosmetic dentistry, and pediatric dental diagnostics.
                  </p>
                </div>
                <div className="cb-card-link-text">
                  <span>Consult Specialist</span>
                  <ChevronRight size={16} />
                </div>
              </Link>

              {/* Card 3: Cardiology */}
              <Link to="/register" className="cb-specialty-card cb-reveal">
                <div>
                  <div className="cb-specialty-icon-wrap">
                    <HeartPulse size={28} />
                  </div>
                  <h3>Cardiology & Heart Care</h3>
                  <p>
                    Real-time ECG telemetry analysis, blood pressure monitoring, and preventive cardiovascular disease therapies.
                  </p>
                </div>
                <div className="cb-card-link-text">
                  <span>Consult Specialist</span>
                  <ChevronRight size={16} />
                </div>
              </Link>

              {/* Card 4: Neurology */}
              <Link to="/register" className="cb-specialty-card cb-reveal">
                <div>
                  <div className="cb-specialty-icon-wrap">
                    <Brain size={28} />
                  </div>
                  <h3>Neurology & Neuro-Health</h3>
                  <p>
                    Specialized therapeutic relief for chronic migraines, sleep disorders, neuropathies, and cognitive care.
                  </p>
                </div>
                <div className="cb-card-link-text">
                  <span>Consult Specialist</span>
                  <ChevronRight size={16} />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================
            4. ABOUT SECTION
           ============================================================ */}
        <section id="about" className="cb-about-section">
          <div className="cb-container">
            <div className="cb-about-grid">
              {/* Image & Opening Hours Frame */}
              <div className="cb-about-image-side cb-reveal">
                <div className="cb-about-image-frame">
                  <img
                    src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80"
                    alt="CareBridge AI Senior Physician consulting in clinical chamber"
                    width="480"
                    height="600"
                    loading="lazy"
                  />
                </div>

                {/* Opening Hours Card */}
                <div className="cb-hours-card">
                  <h4>
                    <Clock size={18} color="var(--cb-teal-600)" /> Opening Hours
                  </h4>
                  <ul className="cb-hours-list">
                    <li>
                      <span>Monday – Friday</span>
                      <strong>8:00 AM – 9:00 PM</strong>
                    </li>
                    <li>
                      <span>Saturday</span>
                      <strong>9:00 AM – 7:00 PM</strong>
                    </li>
                    <li>
                      <span>Sunday</span>
                      <strong>10:00 AM – 4:00 PM</strong>
                    </li>
                  </ul>
                  <div className="cb-emergency-notice">
                    <Zap size={14} /> Emergency Trauma & Triage: 24/7 Active
                  </div>
                </div>
              </div>

              {/* Text & Experience Counter */}
              <div className="cb-about-content cb-reveal">
                <span className="cb-eyebrow">About CareBridge AI</span>
                <h2 className="cb-section-title">
                  Caring for You Like Family Health
                </h2>

                <p className="cb-section-subtext">
                  For over two decades, our clinical teams have blended human medical compassion with pioneering health technology. We believe timely diagnostics, proactive guidance, and seamless doctor-patient communication form the foundation of lifelong wellbeing.
                </p>

                {/* Animated 25+ Years Experience Counter */}
                <div className="cb-about-highlight-box" ref={statsSectionRef}>
                  <div className="cb-experience-counter">
                    {yearsCount > 0 ? `${yearsCount}+` : "25+"}
                  </div>
                  <div className="cb-experience-label">
                    Years of Clinical Excellence & Patient Trust
                  </div>
                </div>

                {/* Value Propositions List */}
                <ul className="cb-about-features-list">
                  <li className="cb-about-feature-item">
                    <span className="cb-check-bullet"><Check size={14} /></span>
                    Board-Certified Physicians
                  </li>
                  <li className="cb-about-feature-item">
                    <span className="cb-check-bullet"><Check size={14} /></span>
                    Same-Day Diagnostic Results
                  </li>
                  <li className="cb-about-feature-item">
                    <span className="cb-check-bullet"><Check size={14} /></span>
                    Continuous Vital Telemetry
                  </li>
                  <li className="cb-about-feature-item">
                    <span className="cb-check-bullet"><Check size={14} /></span>
                    Zero Waiting OPD Passes
                  </li>
                </ul>

                <div>
                  <Link to="/register" className="cb-btn-primary">
                    Book Appointment <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            5. SERVICES SECTION
           ============================================================ */}
        <section id="services" className="cb-services-section">
          <div className="cb-container">
            <div className="cb-section-header cb-reveal">
              <span className="cb-eyebrow">Our Clinical Services</span>
              <h2 className="cb-section-title">
                Comprehensive Healthcare Services For Better Living
              </h2>
              <p className="cb-section-subtext">
                Tailored outpatient and preventive medical solutions designed to keep every family member active, healthy, and thriving.
              </p>
            </div>

            <div className="cb-services-grid">
              {/* Left Stack of 3 Cards */}
              <div className="cb-service-cards-stack">
                {/* 1. Pediatric Care */}
                <Link to="/register" className="cb-service-row-card cb-reveal">
                  <div className="cb-service-row-icon">
                    <Baby size={28} />
                  </div>
                  <div className="cb-service-row-content">
                    <h3>Pediatric Care</h3>
                    <p>
                      Gentle infant checkups, developmental milestone tracking, vaccination schedules, and round-the-clock pediatric triage.
                    </p>
                  </div>
                  <div className="cb-service-arrow-btn">
                    <ChevronRight size={18} />
                  </div>
                </Link>

                {/* 2. Family Medicine */}
                <Link to="/register" className="cb-service-row-card cb-reveal">
                  <div className="cb-service-row-icon">
                    <Users size={28} />
                  </div>
                  <div className="cb-service-row-content">
                    <h3>Family Medicine</h3>
                    <p>
                      Whole-family health management, chronic condition monitoring, routine annual physicals, and ongoing preventive care.
                    </p>
                  </div>
                  <div className="cb-service-arrow-btn">
                    <ChevronRight size={18} />
                  </div>
                </Link>

                {/* 3. Preventive Healthcare */}
                <Link to="/register" className="cb-service-row-card cb-reveal">
                  <div className="cb-service-row-icon">
                    <ShieldCheck size={28} />
                  </div>
                  <div className="cb-service-row-content">
                    <h3>Preventive Healthcare</h3>
                    <p>
                      Cardiovascular screening, comprehensive metabolic blood panels, cancer risk detection, and proactive longevity protocols.
                    </p>
                  </div>
                  <div className="cb-service-arrow-btn">
                    <ChevronRight size={18} />
                  </div>
                </Link>
              </div>

              {/* Right Side Nurse Image Showcase */}
              <div className="cb-services-visual-side cb-reveal">
                <div className="cb-nurse-frame">
                  <img
                    src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80"
                    alt="CareBridge AI Clinical Nurse with tablet review"
                    width="440"
                    height="550"
                    loading="lazy"
                  />
                </div>

                <div className="cb-nurse-highlight-badge">
                  <Award size={24} color="var(--cb-teal-600)" />
                  <div>
                    <strong>24/7 Clinical Support</strong>
                    <span>Certified Nursing & Triage Team</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            6. EXPERT CARE SECTION
           ============================================================ */}
        <section className="cb-expert-section">
          <div className="cb-container">
            <div className="cb-section-header cb-reveal">
              <span className="cb-eyebrow">Excellence in Practice</span>
              <h2 className="cb-section-title">
                Medical Services We Provide With Expert Care
              </h2>
              <p className="cb-section-subtext">
                Every consultation is backed by interdisciplinary clinical oversight, accurate testing, and modern digital telemetry.
              </p>
            </div>

            <div className="cb-expert-grid">
              {/* Card 1 */}
              <div className="cb-expert-card cb-reveal">
                <div className="cb-expert-icon-wrap">
                  <Activity size={26} />
                </div>
                <h3>Advanced Diagnostic Services</h3>
                <p>
                  Rapid in-house laboratory investigations, digital X-rays, ultrasound, and comprehensive biochemical profiling delivered in hours.
                </p>
                <ul className="cb-expert-list">
                  <li><CheckCircle2 size={15} /> Pathology & Bloodwork</li>
                  <li><CheckCircle2 size={15} /> Cardiac Stress Testing</li>
                  <li><CheckCircle2 size={15} /> Digital Radiology</li>
                </ul>
              </div>

              {/* Card 2 */}
              <div className="cb-expert-card cb-reveal">
                <div className="cb-expert-icon-wrap">
                  <ShieldCheck size={26} />
                </div>
                <h3>Preventive Health Programs</h3>
                <p>
                  Structured lifestyle audits, cardiovascular risk stratification, targeted nutrition counseling, and metabolic disease management.
                </p>
                <ul className="cb-expert-list">
                  <li><CheckCircle2 size={15} /> Annual Health Audits</li>
                  <li><CheckCircle2 size={15} /> Diabetes Reversal Care</li>
                  <li><CheckCircle2 size={15} /> Hypertension Control</li>
                </ul>
              </div>

              {/* Card 3 */}
              <div className="cb-expert-card cb-reveal">
                <div className="cb-expert-icon-wrap">
                  <Video size={26} />
                </div>
                <h3>Telemedicine & Virtual Care</h3>
                <p>
                  Encrypted HD video consults with accredited specialists, instant digital e-prescriptions, and remote physician follow-ups.
                </p>
                <ul className="cb-expert-list">
                  <li><CheckCircle2 size={15} /> 24/7 On-Call Doctors</li>
                  <li><CheckCircle2 size={15} /> Instant Digital Rx</li>
                  <li><CheckCircle2 size={15} /> Home Follow-Up Sessions</li>
                </ul>
              </div>

              {/* Card 4 */}
              <div className="cb-expert-card cb-reveal">
                <div className="cb-expert-icon-wrap">
                  <Sparkles size={26} />
                </div>
                <h3>AI Clinical Support</h3>
                <p>
                  Intelligent symptom triangulation, vital anomaly detection, automatic ICU escalation, and unified medical record synthesis.
                </p>
                <ul className="cb-expert-list">
                  <li><CheckCircle2 size={15} /> Intelligent Triage Bot</li>
                  <li><CheckCircle2 size={15} /> Vital Trend Anomaly Alerts</li>
                  <li><CheckCircle2 size={15} /> Zero-Wait Queue Pass</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            7. CAREBRIDGE AI SIGNATURE SECTION
           ============================================================ */}
        <section id="ai-platform" className="cb-ai-section">
          <div className="cb-container">
            <div className="cb-ai-grid">
              {/* Left Column: AI Highlights */}
              <div className="cb-reveal">
                <div className="cb-ai-badge">
                  <Sparkles size={16} /> CareBridge AI Engine
                </div>

                <h2 className="cb-ai-title">
                  Intelligent Clinical AI. <span>Instant Patient Healing.</span>
                </h2>

                <p className="cb-ai-subtext">
                  CareBridge AI bridges the gap between emergency triage, doctor oversight, and real-time patient telemetry to deliver proactive healthcare before symptoms escalate.
                </p>

                <div className="cb-ai-features-column">
                  {/* Feature 1 */}
                  <div className="cb-ai-feature-card">
                    <div className="cb-ai-feature-icon">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h4>Conversational AI Triage</h4>
                      <p>
                        Real-time clinical symptom analysis matching patients with the exact specialist and room allocation in under 60 seconds.
                      </p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="cb-ai-feature-card">
                    <div className="cb-ai-feature-icon">
                      <HeartPulse size={24} />
                    </div>
                    <div>
                      <h4>Live PulseView Telemetry</h4>
                      <p>
                        Continuous heart rate, SpO2, and blood pressure monitoring with instant alert detection sent to the on-duty physician.
                      </p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="cb-ai-feature-card">
                    <div className="cb-ai-feature-icon">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h4>Zero-Queue Digital OPD Pass</h4>
                      <p>
                        Instant QR-verified digital admission passes, real-time live queue tokens, and automatic schedule re-allocations.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Link to="/register" className="cb-btn-primary" style={{ padding: "16px 36px" }}>
                    Get Started With CareBridge AI <ArrowRight size={18} />
                  </Link>
                </div>
              </div>

              {/* Right Column: Interactive Live Telemetry Card Mockup */}
              <div className="cb-reveal">
                <div className="cb-ai-mockup-card">
                  <div className="cb-mockup-header">
                    <div className="cb-mockup-title">
                      <div className="cb-pulse-indicator" />
                      <strong style={{ color: "#ffffff", fontSize: "1.05rem" }}>
                        Live Telemetry Stream
                      </strong>
                    </div>
                    <span style={{ fontSize: "0.78rem", color: "#2dd4bf", fontWeight: 700, letterSpacing: "0.04em" }}>
                      STATUS: NORMAL
                    </span>
                  </div>

                  <div className="cb-mockup-grid">
                    <div className="cb-mockup-stat">
                      <span>Heart Rate</span>
                      <strong>72</strong> <small>BPM</small>
                    </div>

                    <div className="cb-mockup-stat">
                      <span>Oxygen (SpO2)</span>
                      <strong>99%</strong> <small>Optimal</small>
                    </div>

                    <div className="cb-mockup-stat">
                      <span>Blood Pressure</span>
                      <strong>118/76</strong> <small>mmHg</small>
                    </div>

                    <div className="cb-mockup-stat">
                      <span>Temperature</span>
                      <strong>36.6°C</strong> <small>Normal</small>
                    </div>
                  </div>

                  <div className="cb-ai-recommendation-box">
                    <strong>CareBridge AI Clinical Insight:</strong>
                    Vitals are stable over the past 24 hours. Rhythm shows regular sinus pattern with zero ventricular anomalies detected.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================
          8. FOOTER
         ============================================================ */}
      <footer id="contact" className="cb-footer">
        <div className="cb-container">
          <div className="cb-footer-top">
            {/* Column 1: Brand Info */}
            <div className="cb-footer-brand-col">
              <Link to="/" className="cb-footer-brand">
                <div className="cb-brand-icon" style={{ width: "36px", height: "36px" }}>
                  <HeartPulse size={20} />
                </div>
                <span>CareBridge AI</span>
              </Link>
              <p>
                Intelligent, compassionate clinical healthcare connecting patients, physicians, and medical teams through real-time technology.
              </p>
              <div className="cb-social-links">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="cb-social-btn" aria-label="Twitter">
                  𝕏
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="cb-social-btn" aria-label="LinkedIn">
                  in
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="cb-social-btn" aria-label="Facebook">
                  f
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="cb-social-btn" aria-label="Instagram">
                  📸
                </a>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="cb-footer-col">
              <h4>Quick Links</h4>
              <ul className="cb-footer-links">
                <li>
                  <a href="#hero" onClick={(e) => scrollToSection(e, "hero")}>
                    Home Overview
                  </a>
                </li>
                <li>
                  <a href="#services" onClick={(e) => scrollToSection(e, "services")}>
                    Clinical Services
                  </a>
                </li>
                <li>
                  <a href="#specialties" onClick={(e) => scrollToSection(e, "specialties")}>
                    Medical Specialties
                  </a>
                </li>
                <li>
                  <a href="#about" onClick={(e) => scrollToSection(e, "about")}>
                    About CareBridge AI
                  </a>
                </li>
                <li>
                  <a href="#ai-platform" onClick={(e) => scrollToSection(e, "ai-platform")}>
                    AI Diagnostics
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Portals & Access */}
            <div className="cb-footer-col">
              <h4>Portals & Care</h4>
              <ul className="cb-footer-links">
                <li>
                  <Link to="/login">Patient Portal</Link>
                </li>
                <li>
                  <Link to="/login">Doctor & Staff Login</Link>
                </li>
                <li>
                  <Link to="/register">Register New Patient</Link>
                </li>
                <li>
                  <Link to="/privacy">HIPAA Security Notice</Link>
                </li>
                <li>
                  <Link to="/terms">Clinical Terms of Service</Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Emergency */}
            <div className="cb-footer-col">
              <h4>Clinical Center</h4>
              <ul className="cb-footer-contact-list">
                <li>
                  <MapPin size={18} />
                  <span>CareBridge Health Center, Road No. 36, Medical Enclave, Hyderabad</span>
                </li>
                <li>
                  <Phone size={18} />
                  <span>24/7 Helpline: +1 (800) 427-3274</span>
                </li>
                <li>
                  <Mail size={18} />
                  <span>support@carebridge.ai</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="cb-footer-bottom">
            <div>© CareBridge AI. All rights reserved. Built with HIPAA & DPDP compliance principles.</div>
            <div className="cb-footer-legal-links">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <a href="#hero" onClick={(e) => scrollToSection(e, "hero")}>Back to Top ↑</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;