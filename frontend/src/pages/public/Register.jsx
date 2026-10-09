import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authAPI from "../../services/auth";
import "./Register.css";

const Icon = ({ type }) => {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  switch (type) {
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c.8-3.5 3.2-5.5 7-5.5s6.2 2 7 5.5" />
        </svg>
      );

    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );

    case "phone":
      return (
        <svg {...common}>
          <path d="M6.6 3.5 9 3l2 4.5-2.1 1.7a14.5 14.5 0 0 0 5.9 5.9l1.7-2.1L21 15l-.5 2.4c-.3 1.5-1.7 2.6-3.2 2.5C10 19.4 4.6 14 4.1 6.7 4 5.2 5.1 3.8 6.6 3.5Z" />
        </svg>
      );

    case "lock":
      return (
        <svg {...common}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );

    case "eye":
      return (
        <svg {...common}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );

    case "eyeOff":
      return (
        <svg {...common}>
          <path d="m3 3 18 18" />
          <path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.8" />
          <path d="M6.7 6.7C3.8 8.7 2.5 12 2.5 12s3.5 6 9.5 6c1.3 0 2.5-.3 3.5-.7" />
        </svg>
      );

    case "heart":
      return (
        <svg {...common}>
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      );

    case "activity":
      return (
        <svg {...common}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    default:
      return null;
  }
};

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    // Optional Baseline Vitals & Health Profile
    age: "",
    gender: "Other",
    blood_group: "O+",
    heart_rate: "",
    systolic_bp: "",
    diastolic_bp: "",
    spo2: "",
    temperature: "",
    weight: "",
    height: "",
    allergies: "",
    medical_history: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOptionalVitals, setShowOptionalVitals] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
    setError("");
  };

  const [agreeTerms, setAgreeTerms] = useState(false);

  const passwordStrength = useMemo(() => {
    const password = formData.password;
    if (!password) {
      return { score: 0, label: "", color: "" };
    }

    let score = 0;
    if (password.length >= 10) score++;
    if (password.length >= 14) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) return { score, label: "Weak (min 10 chars, mixed case, numbers & symbols)", color: "#ef4444" };
    if (score <= 4) return { score, label: "Good (add symbols for max strength)", color: "#f59e0b" };
    return { score, label: "Strong (meets clinical security standards)", color: "#10b981" };
  }, [formData.password]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();

    if (!name || !email || !phone || !formData.password) {
      setError("Please complete all required fields.");
      return;
    }

    if (formData.password.length < 10) {
      setError("Password must contain at least 10 characters (with uppercase, lowercase, numbers & symbols).");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!agreeTerms) {
      setError("You must consent to the Terms of Service & DPDP Act 2023 Privacy Policy to register.");
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const payload = {
        name,
        email,
        password: formData.password,
        role: "PATIENT",
        phone,
      };

      // Include optional baseline health vitals if entered
      if (formData.age) payload.age = parseInt(formData.age, 10);
      if (formData.gender) payload.gender = formData.gender;
      if (formData.blood_group) payload.blood_group = formData.blood_group;
      if (formData.heart_rate) payload.heart_rate = parseInt(formData.heart_rate, 10);
      if (formData.systolic_bp) payload.systolic_bp = parseInt(formData.systolic_bp, 10);
      if (formData.diastolic_bp) payload.diastolic_bp = parseInt(formData.diastolic_bp, 10);
      if (formData.spo2) payload.spo2 = parseFloat(formData.spo2);
      if (formData.temperature) payload.temperature = parseFloat(formData.temperature);
      if (formData.weight) payload.weight = parseFloat(formData.weight);
      if (formData.height) payload.height = parseFloat(formData.height);
      if (formData.allergies) payload.allergies = formData.allergies;
      if (formData.medical_history) payload.medical_history = formData.medical_history;

      const res = await authAPI.register(payload, controller.signal);
      clearTimeout(timeoutId);

      setSuccess("Account registered successfully! A verification link has been sent to your email. Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Registration error:", err);

      if (err.name === "AbortError") {
        setError("Registration request timed out. Please check your internet connection.");
      } else {
        const errorDetail =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          (err.message === "Network Error"
            ? "Unable to connect to CareBridge AI server. Please verify backend is running."
            : err.message || "Registration failed. Please try again.");

        if (Array.isArray(errorDetail)) {
          setError(errorDetail.map((item) => item.msg || item.message || JSON.stringify(item)).join(", "));
        } else {
          setError(typeof errorDetail === "string" ? errorDetail : "Registration failed. Please check your information.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      {/* Background */}
      <div className="register-background">
        <div className="register-orb register-orb-one"></div>
        <div className="register-orb register-orb-two"></div>
        <div className="register-grid"></div>
      </div>

      <section className="register-shell">
        {/* ================= LEFT PANEL ================= */}
        <aside className="register-hero">
          <div className="hero-top">
            <Link to="/" className="brand">
              <span className="brand-mark">C</span>
              <span className="brand-name">
                Care<span>Bridge</span>
                <small>AI</small>
              </span>
            </Link>
            <div className="hero-status">
              <span className="status-dot"></span>
              Healthcare platform
            </div>
          </div>

          <div className="hero-content">
            <div className="hero-badge">
              <span>✦</span>
              Intelligent healthcare
            </div>
            <h1>
              CareBridge AI
              <br />
              <span>Universal Health Identity</span>
            </h1>
            <p>
              Create your account to access digital OPD passes, track vital signs, consult specialists, and receive clinical assistance from CareBridge AI.
            </p>

            <div className="hero-feature-cards">
              <div className="feature-card">
                <div className="feature-card-icon">
                  <Icon type="heart" />
                </div>
                <div>
                  <h4>Baseline Vitals Tracking</h4>
                  <p>Capture initial physiological telemetry on registration</p>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-card-icon">
                  <Icon type="activity" />
                </div>
                <div>
                  <h4>Live Queue & OPD Pass</h4>
                  <p>QR pass and real-time hospital token updates</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ================= RIGHT PANEL ================= */}
        <section className="register-form-area">
          <div className="form-card">
            <div className="form-header">
              <div className="form-header-badge">PATIENT REGISTRATION</div>
              <h2>Create your Account</h2>
              <p>Sign up to start managing your clinical consultations and telemetry</p>
            </div>

            {error && <div className="register-error-banner">{error}</div>}
            {success && <div className="register-success-banner">{success}</div>}

            <form onSubmit={handleSubmit} className="register-form">
              {/* Name */}
              <div className="form-row">
                <div className="field-group">
                  <label htmlFor="name">
                    Full name <span>*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <Icon type="user" />
                    </span>
                    <input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Email + Phone */}
              <div className="form-row">
                <div className="field-group">
                  <label htmlFor="email">
                    Email address <span>*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <Icon type="mail" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="phone">
                    Phone number <span>*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <Icon type="phone" />
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Passwords */}
              <div className="form-row">
                <div className="field-group">
                  <label htmlFor="password">
                    Password <span>*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <Icon type="lock" />
                    </span>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <Icon type={showPassword ? "eyeOff" : "eye"} />
                    </button>
                  </div>

                  {formData.password && (
                    <div className="password-strength">
                      <div className="strength-bars">
                        {[1, 2, 3, 4, 5, 6].map((bar) => (
                          <span
                            key={bar}
                            style={{
                              backgroundColor:
                                bar <= passwordStrength.score ? passwordStrength.color : "#e2e8f0",
                            }}
                            className={bar <= passwordStrength.score ? "active" : ""}
                          />
                        ))}
                      </div>
                      <small style={{ color: passwordStrength.color, fontWeight: 700 }}>
                        {passwordStrength.label}
                      </small>
                    </div>
                  )}
                </div>

                <div className="field-group">
                  <label htmlFor="confirmPassword">
                    Confirm password <span>*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <Icon type="lock" />
                    </span>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Icon type={showConfirmPassword ? "eyeOff" : "eye"} />
                    </button>
                  </div>
                </div>
              </div>

              {/* OPTIONAL BASELINE VITALS & HEALTH PROFILE ACCORDION */}
              <div className="optional-vitals-box">
                <button
                  type="button"
                  className="vitals-accordion-btn"
                  onClick={() => setShowOptionalVitals(!showOptionalVitals)}
                >
                  <div className="btn-left">
                    <span className="vitals-badge">OPTIONAL</span>
                    <strong>Initial Baseline Vitals & Clinical Profile</strong>
                  </div>
                  <span className="accordion-arrow">{showOptionalVitals ? "▲ Hide" : "▼ Add Vitals"}</span>
                </button>

                {showOptionalVitals && (
                  <div className="vitals-expanded-grid">
                    <p className="vitals-help-text">
                      Enter your initial physiological baseline for clinical health monitoring and telemetry analysis:
                    </p>

                    <div className="vitals-inputs-row">
                      <div className="vitals-input-field">
                        <label htmlFor="reg-age">Age (Years)</label>
                        <input
                          id="reg-age"
                          type="number"
                          min="1"
                          max="120"
                          placeholder="e.g. 28"
                          value={formData.age}
                          onChange={(e) => updateField("age", e.target.value)}
                        />
                      </div>

                      <div className="vitals-input-field">
                        <label htmlFor="reg-gender">Gender</label>
                        <select
                          id="reg-gender"
                          value={formData.gender}
                          onChange={(e) => updateField("gender", e.target.value)}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="vitals-input-field">
                        <label htmlFor="reg-blood">Blood Group</label>
                        <select
                          id="reg-blood"
                          value={formData.blood_group}
                          onChange={(e) => updateField("blood_group", e.target.value)}
                        >
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                    </div>

                    <div className="vitals-inputs-row">
                      <div className="vitals-input-field">
                        <label htmlFor="reg-hr">Heart Rate (BPM)</label>
                        <input
                          id="reg-hr"
                          type="number"
                          placeholder="e.g. 72"
                          value={formData.heart_rate}
                          onChange={(e) => updateField("heart_rate", e.target.value)}
                        />
                      </div>

                      <div className="vitals-input-field">
                        <label htmlFor="reg-sys">BP Systolic (mmHg)</label>
                        <input
                          id="reg-sys"
                          type="number"
                          placeholder="e.g. 120"
                          value={formData.systolic_bp}
                          onChange={(e) => updateField("systolic_bp", e.target.value)}
                        />
                      </div>

                      <div className="vitals-input-field">
                        <label htmlFor="reg-dia">BP Diastolic (mmHg)</label>
                        <input
                          id="reg-dia"
                          type="number"
                          placeholder="e.g. 80"
                          value={formData.diastolic_bp}
                          onChange={(e) => updateField("diastolic_bp", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="vitals-inputs-row">
                      <div className="vitals-input-field">
                        <label htmlFor="reg-spo2">SpO2 Oxygen (%)</label>
                        <input
                          id="reg-spo2"
                          type="number"
                          step="0.1"
                          placeholder="e.g. 98"
                          value={formData.spo2}
                          onChange={(e) => updateField("spo2", e.target.value)}
                        />
                      </div>

                      <div className="vitals-input-field">
                        <label htmlFor="reg-temp">Temperature (°C)</label>
                        <input
                          id="reg-temp"
                          type="number"
                          step="0.1"
                          placeholder="e.g. 36.8"
                          value={formData.temperature}
                          onChange={(e) => updateField("temperature", e.target.value)}
                        />
                      </div>

                      <div className="vitals-input-field">
                        <label htmlFor="reg-weight">Weight (kg)</label>
                        <input
                          id="reg-weight"
                          type="number"
                          step="0.1"
                          placeholder="e.g. 68"
                          value={formData.weight}
                          onChange={(e) => updateField("weight", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="vitals-input-field full">
                      <label htmlFor="reg-allergies">Known Allergies (Optional, comma-separated)</label>
                      <input
                        id="reg-allergies"
                        type="text"
                        placeholder="e.g. Penicillin, Peanuts, Sulfa"
                        value={formData.allergies}
                        onChange={(e) => updateField("allergies", e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* DPDP Act 2023 Consent Checkbox */}
              <div className="flex items-start gap-3 my-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <input
                  id="agree-dpdp"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                  required
                />
                <label htmlFor="agree-dpdp" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                  I consent to the collection and processing of my health profile under India's <strong>DPDP Act 2023</strong> and agree to the{" "}
                  <Link to="/terms" target="_blank" className="text-cyan-400 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" target="_blank" className="text-cyan-400 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              {/* Security note */}
              <div className="security-note">
                <div className="security-icon">
                  <Icon type="lock" />
                </div>
                <div>
                  <strong>Your clinical records are encrypted</strong>
                  <span>Your medical profile and vitals are securely stored in CareBridge AI.</span>
                </div>
              </div>

              {/* Button */}
              <button type="submit" className="register-button" disabled={loading || !agreeTerms}>
                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <span className="button-arrow">→</span>
                  </>
                )}
              </button>
            </form>

            {/* Login */}
            <div className="login-divider">
              <span>Already have an account?</span>
              <Link to="/login">Sign in</Link>
            </div>

            <div className="mt-4 text-center">
              <span className="text-xs text-slate-500">
                Need help? Email{" "}
                <a href="mailto:phoolkumari2603@gmail.com" className="text-slate-400 hover:text-cyan-400">
                  phoolkumari2603@gmail.com
                </a>
              </span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
};

export default Register;