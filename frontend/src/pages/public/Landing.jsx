import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
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
  User,
  IdCard,
  Brain,
  Bone,
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
  Check,
  Zap,
  Award,
  Star
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Landing.css";

// Reusable Circular Progress Indicator Component
function CircularStat({ percentage, displayValue, label, subtext }) {
  const radius = 42;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="cb-circle-stat-card">
      <div className="cb-circle-gauge-wrap">
        <svg className="cb-circle-svg" width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
          <defs>
            <linearGradient id="cbTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
          </defs>
          <circle
            className="cb-circle-bg"
            cx="56"
            cy="56"
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="cb-circle-fill"
            cx="56"
            cy="56"
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="cb-circle-inner-text">
          <span className="cb-circle-val">{displayValue}</span>
        </div>
      </div>
      <div className="cb-circle-meta">
        <h4 className="cb-circle-title">{label}</h4>
        {subtext && <p className="cb-circle-desc">{subtext}</p>}
      </div>
    </div>
  );
}

// 4x2 Grid Specialties Data
const specialtiesList = [
  {
    id: "cardiology",
    name: "Cardiology",
    desc: "Heart & Vascular",
    icon: <HeartPulse size={26} strokeWidth={2.2} />
  },
  {
    id: "neurology",
    name: "Neurology",
    desc: "Brain & Nervous",
    icon: <Brain size={26} strokeWidth={2.2} />
  },
  {
    id: "orthopedic",
    name: "Orthopedic",
    desc: "Joints & Bones",
    icon: <Bone size={26} strokeWidth={2.2} />
  },
  {
    id: "nephrology",
    name: "Nephrology",
    desc: "Kidney & Renal",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.5 7A5.5 5.5 0 0 0 12 2C8.5 2 6 5 6 9c0 4 2.5 7 6 12 2-2.5 5.5-7 5.5-10.5 0-1-.5-2.5-1.5-3.5" />
        <path d="M10.5 8.5C9.5 9.5 9.5 11 11 12.5" />
      </svg>
    )
  },
  {
    id: "oncology",
    name: "Oncology",
    desc: "Targeted Cancer Care",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2a4.5 4.5 0 0 0-4.5 4.5c0 2 1.3 3.8 3 5.5L6 21h3.5l2.5-4 2.5 4H18l-4.5-9c1.7-1.7 3-3.5 3-5.5A4.5 4.5 0 0 0 12 2z" />
      </svg>
    )
  },
  {
    id: "gastro",
    name: "Gastro",
    desc: "Digestive & Liver",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 2v3c0 2-1 3.5-2.5 5C6 11.5 5 13.5 5 16c0 3.5 3 6 7 6s7-2.5 7-6c0-3-1.5-5-3-6.5-1-1-1.5-2-1.5-3.5V2" />
        <path d="M9 14c1 1.5 3 2 5 1" />
      </svg>
    )
  },
  {
    id: "urology",
    name: "Urology",
    desc: "Bladder & Urinary",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        <path d="M12 12v6" />
        <path d="M9 15h6" />
      </svg>
    )
  },
  {
    id: "surgery",
    name: "Surgery",
    desc: "Minimally Invasive",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 19l4-4" />
        <path d="M15 6l2.5-2.5a2.121 2.121 0 0 1 3 3L18 9" />
        <path d="M13 13l-4 4" />
        <circle cx="6" cy="19" r="2" />
        <circle cx="9" cy="15" r="2" />
        <path d="M14 4l6 6" />
      </svg>
    )
  }
];

// Doctors Team Dataset
const doctorsList = [
  {
    name: "Dr. Sarah Jenkins, MD",
    title: "Chief of Cardiology",
    qualification: "18+ Yrs Exp • Harvard Medical School",
    rating: "4.96",
    reviews: "540+ patients",
    image: "https://images.unsplash.com/photo-1594824813583-05c06497fef2?auto=format&fit=crop&w=600&q=80",
    specialtyBadge: "Cardiology"
  },
  {
    name: "Dr. Marcus Vance, MD, PhD",
    title: "Senior Consultant Neurologist",
    qualification: "15+ Yrs Exp • Johns Hopkins Medicine",
    rating: "4.94",
    reviews: "480+ patients",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80",
    specialtyBadge: "Neurology"
  },
  {
    name: "Dr. Priya Patel, MS",
    title: "Head of Orthopedics & Joint Care",
    qualification: "16+ Yrs Exp • AIIMS & Royal College",
    rating: "4.98",
    reviews: "620+ patients",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80",
    specialtyBadge: "Orthopedics"
  },
  {
    name: "Dr. David Chen, MD",
    title: "Director of Surgical Oncology",
    qualification: "14+ Yrs Exp • Stanford University Health",
    rating: "4.95",
    reviews: "390+ patients",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=600&q=80",
    specialtyBadge: "Oncology"
  }
];

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
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);

  // Animated counters
  const [yearsCount, triggerYears] = useCountUp(25, 1200);
  const [patientsCount, triggerPatients] = useCountUp(160, 1500);
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
            {/* Logo: CareBridge AI and CLINICAL badge on one line beside heart icon */}
            <Link to="/" className="cb-brand" aria-label="CareBridge AI Homepage">
              <div className="cb-brand-icon">
                <HeartPulse size={24} />
              </div>
              <div className="cb-brand-text">
                <span className="cb-brand-title">
                  CareBridge <span className="cb-brand-ai">AI</span>
                </span>
                <span className="cb-brand-badge">Clinical</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <ul className="cb-nav-links lg:gap-5 xl:gap-5">
              <li>
                <a href="#hero" className="cb-nav-link" onClick={(e) => scrollToSection(e, "hero")}>
                  Home
                </a>
              </li>
              <li>
                <a href="#specialties" className="cb-nav-link" onClick={(e) => scrollToSection(e, "specialties")}>
                  Specialties
                </a>
              </li>
              <li>
                <a href="#why-us" className="cb-nav-link" onClick={(e) => scrollToSection(e, "why-us")}>
                  Why Us
                </a>
              </li>
              <li>
                <a href="#services" className="cb-nav-link" onClick={(e) => scrollToSection(e, "services")}>
                  Services
                </a>
              </li>
              <li>
                <a href="#about" className="cb-nav-link" onClick={(e) => scrollToSection(e, "about")}>
                  About
                </a>
              </li>
              <li>
                <a href="#ai-platform" className="cb-nav-link cb-nav-link-ai" onClick={(e) => scrollToSection(e, "ai-platform")}>
                  AI Platform
                </a>
              </li>
              <li>
                <a href="#doctors" className="cb-nav-link" onClick={(e) => scrollToSection(e, "doctors")}>
                  Doctors
                </a>
              </li>
              <li>
                <a href="#contact" className="cb-nav-link" onClick={(e) => scrollToSection(e, "contact")}>
                  Contact
                </a>
              </li>
            </ul>

            {/* Header Right Actions */}
            <div className="cb-header-actions shrink-0">
              <a
                href="tel:+18004273274"
                className="cb-header-phone shrink-0"
                title="Call Clinical Support 24/7: +1 (800) 427-3274"
                aria-label="Call +1 (800) 427-3274"
              >
                <Phone size={15} className="cb-phone-icon shrink-0" />
                <span className="cb-phone-text whitespace-nowrap">+1 (800) 427-3274</span>
              </a>

              {isAuthenticated ? (
                <Link to={getDashboardLink()} className="cb-btn-book-header">
                  <Activity size={16} /> My Portal
                </Link>
              ) : (
                <>
                  <div className="cb-login-pill-group" role="group" aria-label="Portal logins">
                    <Link
                      to="/patient-login"
                      className="cb-login-pill-item"
                      title="Patient Portal"
                      aria-label="Patient Portal"
                    >
                      <User size={15} className="cb-login-pill-icon" />
                      <span className="cb-login-pill-label">Patient</span>
                    </Link>
                    <span className="cb-login-pill-divider" aria-hidden="true" />
                    <Link
                      to="/doctor-login"
                      className="cb-login-pill-item"
                      title="Doctor Portal"
                      aria-label="Doctor Portal"
                    >
                      <Stethoscope size={15} className="cb-login-pill-icon" />
                      <span className="cb-login-pill-label">Doctor</span>
                    </Link>
                    <span className="cb-login-pill-divider" aria-hidden="true" />
                    <Link
                      to="/staff-login"
                      className="cb-login-pill-item"
                      title="Staff Portal"
                      aria-label="Staff Portal"
                    >
                      <IdCard size={15} className="cb-login-pill-icon" />
                      <span className="cb-login-pill-label">Staff</span>
                    </Link>
                  </div>

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
              <a href="#specialties" onClick={(e) => scrollToSection(e, "specialties")}>
                Medical Specialties
              </a>
            </li>
            <li>
              <a href="#why-us" onClick={(e) => scrollToSection(e, "why-us")}>
                Why Patients Choose Us
              </a>
            </li>
            <li>
              <a href="#services" onClick={(e) => scrollToSection(e, "services")}>
                Healthcare Services
              </a>
            </li>
            <li>
              <a href="#about" onClick={(e) => scrollToSection(e, "about")}>
                About Us
              </a>
            </li>
            <li>
              <a href="#ai-platform" style={{ whiteSpace: "nowrap" }} onClick={(e) => scrollToSection(e, "ai-platform")}>
                CareBridge AI Platform
              </a>
            </li>
            <li>
              <a href="#doctors" onClick={(e) => scrollToSection(e, "doctors")}>
                Our Doctors
              </a>
            </li>
            <li>
              <a href="#contact" onClick={(e) => scrollToSection(e, "contact")}>
                Emergency & Contact
              </a>
            </li>
          </ul>

          <div className="cb-mobile-actions">
            <a href="tel:+18004273274" className="cb-header-phone cb-mobile-phone-link" style={{ display: "flex", justifyContent: "center" }}>
              <Phone size={16} className="cb-phone-icon shrink-0" />
              <span className="whitespace-nowrap">+1 (800) 427-3274</span>
            </a>

            {isAuthenticated ? (
              <Link to={getDashboardLink()} className="cb-btn-book-header" onClick={() => setMobileMenuOpen(false)}>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <div className="cb-mobile-logins-group" role="group" aria-label="Portal logins">
                  <Link
                    to="/patient-login"
                    className="cb-mobile-login-row"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User size={18} className="shrink-0" />
                    <span>Patient Login</span>
                  </Link>
                  <Link
                    to="/doctor-login"
                    className="cb-mobile-login-row"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Stethoscope size={18} className="shrink-0" />
                    <span>Doctor Login</span>
                  </Link>
                  <Link
                    to="/staff-login"
                    className="cb-mobile-login-row"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <IdCard size={18} className="shrink-0" />
                    <span>Staff Login</span>
                  </Link>
                </div>

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
            2. HERO SECTION — FULL-WIDTH PHOTO + SOFT LIGHT OVERLAY
           ============================================================ */}
        <section id="hero" className="cb-hero-section" aria-label="Hero Section">
          {/* Full-width background photo */}
          <div className="cb-hero-full-bg" aria-hidden="true">
            <img
              src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2000&q=80"
              alt=""
              className="cb-hero-bg-photo"
              loading="eager"
              fetchPriority="high"
            />
          </div>

          {/* Soft light overlay */}
          <div className="cb-hero-soft-overlay" aria-hidden="true" />

          {/* Centered content */}
          <div className="cb-container cb-hero-container">
            <div className="cb-hero-center-content cb-reveal cb-visible">
              <div className="cb-hero-pill-badge">
                <Sparkles size={15} /> CareBridge Clinical Intelligence
              </div>

              <h1 className="cb-hero-heading">
                Reliable healthcare at your fingertips
              </h1>

              <p className="cb-hero-description">
                Advanced multi-disciplinary clinical care, verified specialists, and 24/7 continuous patient telemetry designed for modern proactive living.
              </p>

              <div className="cb-hero-btn-group">
                <Link
                  to={isAuthenticated ? getDashboardLink() : "/register"}
                  className="cb-btn-hero-primary"
                  aria-label="Book Appointment"
                >
                  <Calendar size={18} />
                  <span>Book Appointment</span>
                  <ArrowRight size={17} className="cb-btn-icon-shift" />
                </Link>

                <a
                  href="#specialties"
                  onClick={(e) => scrollToSection(e, "specialties")}
                  className="cb-btn-hero-secondary"
                  aria-label="Explore Specialties"
                >
                  <span>Explore Specialties</span>
                  <ChevronRight size={18} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            3. OVERLAPPING BOTTOM EDGE SECTION (TEAL CARD + 4x2 GRID)
           ============================================================ */}
        <section id="specialties" className="cb-overlap-section" aria-label="Quick Care & Specialties">
          <div className="cb-container">
            <div className="cb-overlap-wrapper cb-reveal cb-visible">
              {/* Left: Teal Card */}
              <div className="cb-teal-promo-card">
                <div className="cb-teal-card-deco-circle" aria-hidden="true" />

                <div>
                  <div className="cb-teal-card-tag">
                    <Sparkles size={14} /> 24/7 Smart Health
                  </div>

                  <h3 className="cb-teal-card-title">
                    Trusted AI-powered care
                  </h3>

                  <p className="cb-teal-card-text">
                    Direct clinical triage, zero-wait digital OPD admission passes, and real-time vitals monitoring supervised by certified clinicians.
                  </p>

                  <div className="cb-teal-card-perks">
                    <div className="cb-teal-perk-item">
                      <CheckCircle2 size={16} />
                      <span>&lt; 60s Triage Response</span>
                    </div>
                    <div className="cb-teal-perk-item">
                      <CheckCircle2 size={16} />
                      <span>Zero Hospital Queue Waiting</span>
                    </div>
                    <div className="cb-teal-perk-item">
                      <CheckCircle2 size={16} />
                      <span>Continuous Vitals Telemetry</span>
                    </div>
                  </div>
                </div>

                <div className="cb-teal-card-btn-box">
                  <a
                    href="#ai-platform"
                    onClick={(e) => scrollToSection(e, "ai-platform")}
                    className="cb-btn-teal-card"
                  >
                    <span>Explore AI Platform</span>
                    <ArrowRight size={17} />
                  </a>
                </div>
              </div>

              {/* Right: White Panel with 4x2 Grid of Specialty Icon Tiles */}
              <div className="cb-specialties-white-panel">
                <div className="cb-panel-header">
                  <div className="cb-panel-header-left">
                    <h3 className="cb-panel-title">Medical Specialties</h3>
                    <span className="cb-panel-subtitle">Immediate consultant access across 8 core departments</span>
                  </div>
                  <Link
                    to={isAuthenticated ? "/patient/doctors" : "/register"}
                    className="cb-panel-view-all"
                  >
                    View All (15+) →
                  </Link>
                </div>

                <div className="cb-specialties-4x2-grid">
                  {specialtiesList.map((spec) => (
                    <Link
                      key={spec.id}
                      to={isAuthenticated ? "/patient/appointments" : "/register"}
                      className="cb-specialty-tile-item"
                      aria-label={`${spec.name} specialty`}
                    >
                      <div className="cb-specialty-tile-icon-box" aria-hidden="true">
                        {spec.icon}
                      </div>
                      <span className="cb-specialty-tile-name">{spec.name}</span>
                      <span className="cb-specialty-tile-desc">{spec.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            4. WHY PATIENTS CHOOSE US SECTION (TEXT LEFT + CIRCLES RIGHT)
           ============================================================ */}
        <section id="why-us" className="cb-why-us-section" aria-label="Why Patients Choose CareBridge">
          <div className="cb-container">
            <div className="cb-why-us-grid">
              {/* Left Column: Copy & Checklist */}
              <div className="cb-why-us-content cb-reveal">
                <div className="cb-section-badge">
                  <ShieldCheck size={16} /> Why Patients Choose Us
                </div>

                <h2 className="cb-why-us-heading">
                  Exceptional Clinical Outcomes Built on Compassion & AI
                </h2>

                <p className="cb-why-us-subtext">
                  CareBridge AI redefines healthcare delivery by linking board-certified department heads directly with continuous patient telemetry. We eliminate diagnostic delays, prevent acute physiological escalations, and provide zero-wait clinical access for your entire family.
                </p>

                <ul className="cb-why-us-checklist">
                  <li className="cb-why-us-item">
                    <span className="cb-why-check"><Check size={16} /></span>
                    <div>
                      <strong>Multi-Disciplinary Board of 120+ Specialists</strong>
                      <p>Top medical school alumni collaborating on complex diagnostic cases and tumor boards.</p>
                    </div>
                  </li>
                  <li className="cb-why-us-item">
                    <span className="cb-why-check"><Check size={16} /></span>
                    <div>
                      <strong>24/7 Real-Time Telemetry & Instant Alerts</strong>
                      <p>Continuous monitoring of blood pressure, SpO2, and cardiac rhythm with automated physician escalation.</p>
                    </div>
                  </li>
                  <li className="cb-why-us-item">
                    <span className="cb-why-check"><Check size={16} /></span>
                    <div>
                      <strong>Zero Hospital Waiting & Digital OPD Passes</strong>
                      <p>Verified QR admission tokens that guarantee immediate chamber check-in and automated triage.</p>
                    </div>
                  </li>
                </ul>

                <div className="cb-why-us-actions">
                  <Link
                    to={isAuthenticated ? getDashboardLink() : "/register"}
                    className="cb-btn-primary"
                  >
                    <span>Schedule an Appointment</span>
                    <ArrowRight size={18} />
                  </Link>

                  <a
                    href="#doctors"
                    onClick={(e) => scrollToSection(e, "doctors")}
                    className="cb-btn-secondary"
                  >
                    <span>Meet Our Doctors</span>
                  </a>
                </div>
              </div>

              {/* Right Column: Circular Progress Stats Grid */}
              <div className="cb-why-us-stats-side cb-reveal">
                <div className="cb-stats-card-shell">
                  <div className="cb-stats-shell-header">
                    <h4>Clinical Performance & Trust</h4>
                    <span>Audited annual quality metrics</span>
                  </div>

                  <div className="cb-circular-stats-grid">
                    <CircularStat
                      percentage={99}
                      displayValue="99%"
                      label="Treatment Success"
                      subtext="Documented clinical recovery"
                    />
                    <CircularStat
                      percentage={99}
                      displayValue="4.95"
                      label="Patient Satisfaction"
                      subtext="Across 160,000+ consults"
                    />
                    <CircularStat
                      percentage={98}
                      displayValue="98%"
                      label="Diagnostic Accuracy"
                      subtext="Early anomaly detection"
                    />
                    <CircularStat
                      percentage={100}
                      displayValue="24/7"
                      label="Continuous Telemetry"
                      subtext="Zero telemetry downtime"
                    />
                  </div>

                  <div className="cb-stats-shell-footer">
                    <CheckCircle2 size={16} className="text-teal" />
                    <span>All metrics verified according to NABH & ISO clinical quality standards.</span>
                  </div>
                </div>
              </div>
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

        {/* ============================================================
            8. TEAM OF DOCTORS IMAGE SECTION (BOTTOM SHOWCASE)
           ============================================================ */}
        <section id="doctors" className="cb-doctors-team-section" aria-label="Team of Doctors">
          <div className="cb-container">
            <div className="cb-section-header cb-reveal">
              <span className="cb-eyebrow">Medical Leadership</span>
              <h2 className="cb-section-title">
                Our Team of Board-Certified Specialists
              </h2>
              <p className="cb-section-subtext">
                World-class doctors, surgeons, and clinicians working collaboratively with AI telemetry to deliver holistic patient recovery.
              </p>
            </div>

            {/* Team Showcase Banner with Photo and Highlight Badges */}
            <div className="cb-team-photo-banner cb-reveal">
              <div className="cb-team-photo-wrapper">
                <img
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1600&q=80"
                  alt="CareBridge AI Medical Team of Doctors and Specialists"
                  className="cb-team-group-photo"
                  loading="lazy"
                />
                <div className="cb-team-photo-overlay" />
              </div>

              {/* Overlaid Highlight Cards */}
              <div className="cb-team-floating-stats">
                <div className="cb-team-float-pill">
                  <div className="cb-team-float-icon">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <strong>120+ Doctors</strong>
                    <span>Board Certified</span>
                  </div>
                </div>

                <div className="cb-team-float-pill">
                  <div className="cb-team-float-icon">
                    <Award size={20} />
                  </div>
                  <div>
                    <strong>15+ Specialties</strong>
                    <span>Full Outpatient Care</span>
                  </div>
                </div>

                <div className="cb-team-float-pill">
                  <div className="cb-team-float-icon">
                    <Users size={20} />
                  </div>
                  <div>
                    <strong>160k+ Patients</strong>
                    <span>Safely Treated</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Lead Specialists Cards */}
            <div className="cb-doctors-grid">
              {doctorsList.map((doc, idx) => (
                <div key={idx} className="cb-doctor-card cb-reveal">
                  <div className="cb-doctor-img-wrap">
                    <img
                      src={doc.image}
                      alt={doc.name}
                      className="cb-doctor-portrait"
                      loading="lazy"
                    />
                    <span className="cb-doctor-dept-tag">{doc.specialtyBadge}</span>
                  </div>

                  <div className="cb-doctor-info">
                    <div className="cb-doctor-rating-row">
                      <div className="cb-star-pill">
                        <Star size={13} fill="#f59e0b" color="#f59e0b" />
                        <span>{doc.rating}</span>
                      </div>
                      <span className="cb-reviews-count">({doc.reviews})</span>
                    </div>

                    <h3 className="cb-doctor-name">{doc.name}</h3>
                    <p className="cb-doctor-role">{doc.title}</p>
                    <span className="cb-doctor-qual">{doc.qualification}</span>

                    <div className="cb-doctor-cta-row">
                      <Link
                        to={isAuthenticated ? "/patient/appointments" : "/register"}
                        className="cb-btn-consult-doctor"
                      >
                        <Calendar size={15} />
                        <span>Consult Doctor</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Invitation Bar */}
            <div className="cb-doctors-action-bar cb-reveal">
              <div className="cb-doctors-bar-text">
                <Sparkles size={24} className="text-teal" />
                <div>
                  <strong>Need immediate consultation with a specific clinical department?</strong>
                  <span>Our medical directors and on-call physicians are available 24/7.</span>
                </div>
              </div>
              <Link
                to={isAuthenticated ? "/patient/doctors" : "/register"}
                className="cb-btn-primary"
              >
                <span>Browse All 120+ Doctors</span>
                <ArrowRight size={17} />
              </Link>
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