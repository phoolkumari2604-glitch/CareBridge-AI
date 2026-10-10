import React, { useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Heart,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Shield,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import authAPI from "../../services/auth";
import { useAuth } from "../../context/AuthContext";
import "./Register.css";

const Register = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  // Core Account Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    // Optional Baseline Vitals & Clinical Profile
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

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOptionalVitals, setShowOptionalVitals] = useState(false);

  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [successToast, setSuccessToast] = useState("");

  const fieldRefs = {
    name: useRef(null),
    email: useRef(null),
    phone: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null),
    agreeTerms: useRef(null),
    age: useRef(null),
    heart_rate: useRef(null),
    systolic_bp: useRef(null),
    diastolic_bp: useRef(null),
    spo2: useRef(null),
    temperature: useRef(null),
    weight: useRef(null),
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear field-specific error as user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setGlobalError("");
  };

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const pw = formData.password;
    if (!pw) return { score: 0, label: "", colorClass: "" };

    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++;

    if (score <= 2) return { score: 1, label: "Weak (add numbers & symbols)", colorClass: "strength-weak" };
    if (score === 3) return { score: 2, label: "Fair (needs mixed case & symbols)", colorClass: "strength-fair" };
    if (score === 4) return { score: 3, label: "Good (meets standard security)", colorClass: "strength-good" };
    return { score: 4, label: "Strong (clinical grade protection)", colorClass: "strength-strong" };
  }, [formData.password]);

  // Clean Indian phone number to 10 digits
  const sanitizeIndianPhone = (raw) => {
    if (!raw) return "";
    let cleaned = raw.replace(/\D/g, "");
    if (cleaned.startsWith("91") && cleaned.length > 10) {
      cleaned = cleaned.slice(2);
    } else if (cleaned.startsWith("0") && cleaned.length > 10) {
      cleaned = cleaned.slice(1);
    }
    return cleaned;
  };

  // Comprehensive form validation
  const validateForm = () => {
    const errors = {};

    // 1. Full name
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      errors.name = "Full name is required.";
    } else if (trimmedName.length < 2) {
      errors.name = "Name must be at least 2 characters.";
    }

    // 2. Email
    const trimmedEmail = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address (e.g. name@example.com).";
    }

    // 3. Phone (10-digit Indian mobile number)
    const cleanedPhone = sanitizeIndianPhone(formData.phone);
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!phoneRegex.test(cleanedPhone)) {
      errors.phone = "Please enter a valid 10-digit Indian phone number (starts with 6-9).";
    }

    // 4. Password (min 8 chars, uppercase, lowercase, number, symbol)
    const pw = formData.password;
    if (!pw) {
      errors.password = "Password is required.";
    } else if (pw.length < 8) {
      errors.password = "Password must be at least 8 characters long.";
    } else if (!/[A-Z]/.test(pw)) {
      errors.password = "Include at least one uppercase letter (A-Z).";
    } else if (!/[a-z]/.test(pw)) {
      errors.password = "Include at least one lowercase letter (a-z).";
    } else if (!/[0-9]/.test(pw)) {
      errors.password = "Include at least one number (0-9).";
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) {
      errors.password = "Include at least one special character (!@#$%^&*...).";
    }

    // 5. Confirm password
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    // 6. DPDP Consent
    if (!agreeTerms) {
      errors.agreeTerms = "You must consent to the DPDP Act 2023 terms to register.";
    }

    // 7. Optional Baseline Vitals validation (only validated if entered)
    if (formData.age) {
      const ageNum = Number(formData.age);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
        errors.age = "Age must be between 0 and 120 years.";
      }
    }

    if (formData.heart_rate) {
      const hrNum = Number(formData.heart_rate);
      if (isNaN(hrNum) || hrNum < 30 || hrNum > 220) {
        errors.heart_rate = "Heart rate must be between 30 and 220 BPM.";
      }
    }

    if (formData.systolic_bp) {
      const sysNum = Number(formData.systolic_bp);
      if (isNaN(sysNum) || sysNum < 70 || sysNum > 200) {
        errors.systolic_bp = "Systolic BP must be between 70 and 200 mmHg.";
      }
    }

    if (formData.diastolic_bp) {
      const diaNum = Number(formData.diastolic_bp);
      if (isNaN(diaNum) || diaNum < 40 || diaNum > 130) {
        errors.diastolic_bp = "Diastolic BP must be between 40 and 130 mmHg.";
      }
    }

    if (formData.spo2) {
      const spo2Num = Number(formData.spo2);
      if (isNaN(spo2Num) || spo2Num < 70 || spo2Num > 100) {
        errors.spo2 = "SpO2 oxygen saturation must be between 70% and 100%.";
      }
    }

    if (formData.temperature) {
      const tempNum = Number(formData.temperature);
      if (isNaN(tempNum) || tempNum < 34 || tempNum > 42) {
        errors.temperature = "Temperature must be between 34 °C and 42 °C.";
      }
    }

    if (formData.weight) {
      const weightNum = Number(formData.weight);
      if (isNaN(weightNum) || weightNum < 2 || weightNum > 300) {
        errors.weight = "Weight must be between 2 kg and 300 kg.";
      }
    }

    return errors;
  };

  const scrollToFirstError = (errors) => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return;

    const firstKey = errorKeys[0];
    // If error is in vitals section and vitals are collapsed, expand vitals first
    if (["age", "heart_rate", "systolic_bp", "diastolic_bp", "spo2", "temperature", "weight"].includes(firstKey)) {
      setShowOptionalVitals(true);
    }

    setTimeout(() => {
      const targetRef = fieldRefs[firstKey];
      if (targetRef && targetRef.current) {
        targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        if (targetRef.current.focus) {
          targetRef.current.focus();
        }
      }
    }, 100);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setGlobalError("");
    setSuccessToast("");

    // Run field validations
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGlobalError("Please correct the highlighted errors before submitting.");
      scrollToFirstError(errors);
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const cleanedPhone = sanitizeIndianPhone(formData.phone);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: cleanedPhone.length === 10 ? `+91 ${cleanedPhone}` : formData.phone.trim(),
        role: "PATIENT",
      };

      // Add baseline vitals if provided
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
      if (formData.allergies) {
        payload.allergies = formData.allergies
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (formData.medical_history) {
        payload.medical_history = formData.medical_history
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const res = await authAPI.register(payload, controller.signal);
      clearTimeout(timeoutId);

      // Instant auto-login if token and user are returned
      if (res?.access_token && res?.user) {
        localStorage.setItem("access_token", res.access_token);
        localStorage.setItem("user", JSON.stringify(res.user));
        if (setUser) {
          setUser(res.user);
        }
        setSuccessToast("Account created successfully! Logging you in...");
        setTimeout(() => {
          navigate("/patient/dashboard");
        }, 1200);
      } else {
        setSuccessToast(
          res?.message || "Account created successfully! Redirecting to login..."
        );
        setTimeout(() => {
          navigate("/login", {
            state: {
              registeredEmail: formData.email.trim().toLowerCase(),
              message: "Registration successful. Please log in with your credentials.",
            },
          });
        }, 1800);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("CareBridge Registration error:", err);

      if (err.name === "AbortError" || controller.signal.aborted) {
        setGlobalError("Connection timed out (15s). Please check your internet connection and try again.");
      } else if (err.response?.status === 409) {
        setGlobalError("An account with this email address already exists. Please sign in or reset your password.");
        setFieldErrors((prev) => ({
          ...prev,
          email: "This email is already registered. Please sign in.",
        }));
      } else if (err.response?.status === 400) {
        const detail = err.response?.data?.detail || err.response?.data?.message || "Validation failed.";
        setGlobalError(detail);
      } else if (err.response?.status >= 500) {
        setGlobalError("CareBridge clinical registration service encountered an error. Please try again shortly.");
      } else {
        const isNetworkErr =
          err.message === "Network Error" || !err.response || err.code === "ERR_NETWORK";
        setGlobalError(
          isNetworkErr
            ? "Unable to connect to CareBridge AI server. Please verify backend is running on port 5000."
            : err.response?.data?.detail || err.message || "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cb-reg-page">
      {/* Dynamic Success Toast */}
      {successToast && (
        <div className="cb-toast" role="status" aria-live="polite">
          <CheckCircle2 size={20} className="cb-toast-icon" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main 2-Panel Registration Shell */}
      <div className="cb-reg-shell">
        {/* =========================================================
            LEFT PANEL: Hero, Value Props & Trust Badges
            ========================================================= */}
        <aside className="cb-reg-hero">
          <div className="cb-hero-top">
            <Link to="/" className="cb-logo-brand" aria-label="CareBridge AI Home">
              <div className="cb-logo-mark">C</div>
              <div className="cb-logo-text-wrap">
                <span className="cb-logo-name">
                  Care<span className="cb-logo-teal">Bridge</span>
                </span>
                <span className="cb-logo-badge">AI</span>
              </div>
            </Link>
          </div>

          <div className="cb-hero-body">
            <div className="cb-hero-kicker">
              <Sparkles size={14} />
              <span>Intelligent Healthcare Ecosystem</span>
            </div>

            <h1 className="cb-hero-headline">
              Universal Health Identity
              <br />
              for Connected Care
            </h1>

            <p className="cb-hero-desc">
              Join thousands of patients accessing digital OPD passes, real-time hospital queues, specialist consultations, and continuous physiological telemetry.
            </p>

            {/* Vertical Stack of Clean Cards */}
            <div className="cb-feature-stack">
              <div className="cb-feature-item">
                <div className="cb-feature-icon-box">
                  <Activity size={20} />
                </div>
                <div className="cb-feature-content">
                  <h3>Baseline Vitals Tracking</h3>
                  <p>Capture initial physiological telemetry on registration for longitudinal AI insights.</p>
                </div>
              </div>

              <div className="cb-feature-item">
                <div className="cb-feature-icon-box">
                  <Heart size={20} />
                </div>
                <div className="cb-feature-content">
                  <h3>Live Queue & Digital OPD Pass</h3>
                  <p>Instant QR tokens and real-time waiting list telemetry at 50+ network hospitals.</p>
                </div>
              </div>

              <div className="cb-feature-item">
                <div className="cb-feature-icon-box">
                  <ShieldCheck size={20} />
                </div>
                <div className="cb-feature-content">
                  <h3>Clinical Record Encryption</h3>
                  <p>Protected by 256-bit AES encryption conforming to India's DPDP Act 2023.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pinned Bottom Trust Badges */}
          <div className="cb-hero-footer">
            <div className="cb-trust-badge">
              <FileCheck2 size={15} />
              <span>DPDP Act 2023 Compliant</span>
            </div>
            <div className="cb-trust-badge">
              <Shield size={15} />
              <span>256-Bit Encrypted</span>
            </div>
            <div className="cb-trust-badge">
              <Activity size={15} />
              <span>ABDM Ecosystem Ready</span>
            </div>
          </div>
        </aside>

        {/* =========================================================
            RIGHT PANEL: Registration Form
            ========================================================= */}
        <main className="cb-reg-main">
          {/* Mobile Top Brand (Visible on screens < 1024px) */}
          <div className="cb-mobile-header">
            <Link to="/" className="cb-logo-brand">
              <div className="cb-logo-mark">C</div>
              <div className="cb-logo-text-wrap">
                <span className="cb-logo-name">
                  Care<span className="cb-logo-teal">Bridge</span>
                </span>
                <span className="cb-logo-badge">AI</span>
              </div>
            </Link>
          </div>

          <div className="cb-form-container">
            {/* Header */}
            <div className="cb-form-header">
              <span className="cb-form-tag">PATIENT REGISTRATION</span>
              <h2>Create your account</h2>
              <p>Sign up to start managing your clinical consultations and telemetry</p>
            </div>

            {/* Global Styled Alert Box */}
            {globalError && (
              <div className="cb-alert-error" role="alert" aria-live="polite">
                <AlertCircle size={18} className="cb-alert-icon" />
                <div className="cb-alert-msg">{globalError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="cb-form">
              {/* 2-Column Grid */}
              <div className="cb-form-grid">
                {/* Full Name (Spans full width) */}
                <div className="cb-input-group cb-col-span-2">
                  <label htmlFor="reg-name" className="cb-label">
                    Full name <span className="cb-req">*</span>
                  </label>
                  <div className={`cb-input-wrap ${fieldErrors.name ? "has-error" : ""}`}>
                    <User size={18} className="cb-field-icon" />
                    <input
                      ref={fieldRefs.name}
                      id="reg-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      autoComplete="name"
                      disabled={loading}
                      aria-invalid={Boolean(fieldErrors.name)}
                      aria-describedby={fieldErrors.name ? "err-name" : undefined}
                      className="cb-input"
                    />
                  </div>
                  {fieldErrors.name && (
                    <span id="err-name" className="cb-error-text" role="alert">
                      {fieldErrors.name}
                    </span>
                  )}
                </div>

                {/* Email Address */}
                <div className="cb-input-group">
                  <label htmlFor="reg-email" className="cb-label">
                    Email address <span className="cb-req">*</span>
                  </label>
                  <div className={`cb-input-wrap ${fieldErrors.email ? "has-error" : ""}`}>
                    <Mail size={18} className="cb-field-icon" />
                    <input
                      ref={fieldRefs.email}
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      autoComplete="email"
                      disabled={loading}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? "err-email" : undefined}
                      className="cb-input"
                    />
                  </div>
                  {fieldErrors.email && (
                    <span id="err-email" className="cb-error-text" role="alert">
                      {fieldErrors.email}
                    </span>
                  )}
                </div>

                {/* Phone Number (Separate State & tel autocomplete) */}
                <div className="cb-input-group">
                  <label htmlFor="reg-phone" className="cb-label">
                    Phone number <span className="cb-req">*</span>
                  </label>
                  <div className={`cb-input-wrap ${fieldErrors.phone ? "has-error" : ""}`}>
                    <Phone size={18} className="cb-field-icon" />
                    <input
                      ref={fieldRefs.phone}
                      id="reg-phone"
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      autoComplete="tel"
                      disabled={loading}
                      aria-invalid={Boolean(fieldErrors.phone)}
                      aria-describedby={fieldErrors.phone ? "err-phone" : undefined}
                      className="cb-input"
                    />
                  </div>
                  {fieldErrors.phone && (
                    <span id="err-phone" className="cb-error-text" role="alert">
                      {fieldErrors.phone}
                    </span>
                  )}
                </div>

                {/* Password */}
                <div className="cb-input-group">
                  <label htmlFor="reg-password" className="cb-label">
                    Password <span className="cb-req">*</span>
                  </label>
                  <div className={`cb-input-wrap ${fieldErrors.password ? "has-error" : ""}`}>
                    <Lock size={18} className="cb-field-icon" />
                    <input
                      ref={fieldRefs.password}
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      autoComplete="new-password"
                      disabled={loading}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? "err-password" : undefined}
                      className="cb-input"
                    />
                    <button
                      type="button"
                      className="cb-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <span id="err-password" className="cb-error-text" role="alert">
                      {fieldErrors.password}
                    </span>
                  )}

                  {/* Password Strength Meter */}
                  {formData.password && (
                    <div className="cb-strength-box">
                      <div className="cb-strength-bars">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`cb-strength-bar ${
                              step <= passwordStrength.score ? passwordStrength.colorClass : ""
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`cb-strength-label ${passwordStrength.colorClass}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="cb-input-group">
                  <label htmlFor="reg-confirm-password" className="cb-label">
                    Confirm password <span className="cb-req">*</span>
                  </label>
                  <div className={`cb-input-wrap ${fieldErrors.confirmPassword ? "has-error" : ""}`}>
                    <Lock size={18} className="cb-field-icon" />
                    <input
                      ref={fieldRefs.confirmPassword}
                      id="reg-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      autoComplete="new-password"
                      disabled={loading}
                      aria-invalid={Boolean(fieldErrors.confirmPassword)}
                      aria-describedby={fieldErrors.confirmPassword ? "err-confirm" : undefined}
                      className="cb-input"
                    />
                    <button
                      type="button"
                      className="cb-password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <span id="err-confirm" className="cb-error-text" role="alert">
                      {fieldErrors.confirmPassword}
                    </span>
                  )}
                </div>
              </div>

              {/* =====================================================
                  OPTIONAL BASELINE VITALS CARD (Collapsed by default)
                  ===================================================== */}
              <div className="cb-vitals-card">
                <button
                  type="button"
                  className="cb-vitals-header-btn"
                  onClick={() => setShowOptionalVitals(!showOptionalVitals)}
                  aria-expanded={showOptionalVitals}
                >
                  <div className="cb-vitals-btn-title">
                    <span className="cb-vitals-pill">OPTIONAL</span>
                    <span className="cb-vitals-title-text">Initial Baseline Vitals & Clinical Profile</span>
                  </div>
                  <span className="cb-vitals-chevron">
                    {showOptionalVitals ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>

                {showOptionalVitals && (
                  <div className="cb-vitals-content">
                    <p className="cb-vitals-subtitle">
                      Enter your initial physiological baseline for personalized clinical monitoring and telemetry analysis:
                    </p>

                    <div className="cb-vitals-grid">
                      {/* Age */}
                      <div className="cb-vitals-field">
                        <label htmlFor="reg-vitals-age">Age (Years)</label>
                        <input
                          ref={fieldRefs.age}
                          id="reg-vitals-age"
                          type="number"
                          min="0"
                          max="120"
                          placeholder="e.g. 28"
                          value={formData.age}
                          onChange={(e) => updateField("age", e.target.value)}
                          className={fieldErrors.age ? "has-error" : ""}
                        />
                        {fieldErrors.age && <span className="cb-error-text">{fieldErrors.age}</span>}
                      </div>

                      {/* Gender */}
                      <div className="cb-vitals-field">
                        <label htmlFor="reg-vitals-gender">Gender</label>
                        <select
                          id="reg-vitals-gender"
                          value={formData.gender}
                          onChange={(e) => updateField("gender", e.target.value)}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Blood Group */}
                      <div className="cb-vitals-field">
                        <label htmlFor="reg-vitals-blood">Blood Group</label>
                        <select
                          id="reg-vitals-blood"
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

                      {/* Heart Rate */}
                      <div className="cb-vitals-field">
                        <label htmlFor="reg-vitals-hr">Heart Rate (BPM)</label>
                        <input
                          ref={fieldRefs.heart_rate}
                          id="reg-vitals-hr"
                          type="number"
                          min="30"
                          max="220"
                          placeholder="e.g. 72"
                          value={formData.heart_rate}
                          onChange={(e) => updateField("heart_rate", e.target.value)}
                          className={fieldErrors.heart_rate ? "has-error" : ""}
                        />
                        {fieldErrors.heart_rate && (
                          <span className="cb-error-text">{fieldErrors.heart_rate}</span>
                        )}
                      </div>

                      {/* Systolic BP */}
                      <div className="cb-vitals-field">
                        <label htmlFor="reg-vitals-sys">BP Systolic (mmHg)</label>
                        <input
                          ref={fieldRefs.systolic_bp}
                          id="reg-vitals-sys"
                          type="number"
                          min="70"
                          max="200"
                          placeholder="e.g. 120"
                          value={formData.systolic_bp}
                          onChange={(e) => updateField("systolic_bp", e.target.value)}
                          className={fieldErrors.systolic_bp ? "has-error" : ""}
                        />
                        {fieldErrors.systolic_bp && (
                          <span className="cb-error-text">{fieldErrors.systolic_bp}</span>
                        )}
                      </div>

                      {/* Diastolic BP */}
                      <div className="cb-vitals-field">
                        <label htmlFor="reg-vitals-dia">BP Diastolic (mmHg)</label>
                        <input
                          ref={fieldRefs.diastolic_bp}
                          id="reg-vitals-dia"
                          type="number"
                          min="40"
                          max="130"
                          placeholder="e.g. 80"
                          value={formData.diastolic_bp}
                          onChange={(e) => updateField("diastolic_bp", e.target.value)}
                          className={fieldErrors.diastolic_bp ? "has-error" : ""}
                        />
                        {fieldErrors.diastolic_bp && (
                          <span className="cb-error-text">{fieldErrors.diastolic_bp}</span>
                        )}
                      </div>

                      {/* SpO2 */}
                      <div className="cb-vitals-field">
                        <label htmlFor="reg-vitals-spo2">SpO2 Oxygen (%)</label>
                        <input
                          ref={fieldRefs.spo2}
                          id="reg-vitals-spo2"
                          type="number"
                          min="70"
                          max="100"
                          step="0.1"
                          placeholder="e.g. 98"
                          value={formData.spo2}
                          onChange={(e) => updateField("spo2", e.target.value)}
                          className={fieldErrors.spo2 ? "has-error" : ""}
                        />
                        {fieldErrors.spo2 && <span className="cb-error-text">{fieldErrors.spo2}</span>}
                      </div>

                      {/* Temperature in Celsius */}
                      <div className="cb-vitals-field">
                        <label htmlFor="reg-vitals-temp">Temperature (°C)</label>
                        <input
                          ref={fieldRefs.temperature}
                          id="reg-vitals-temp"
                          type="number"
                          min="34"
                          max="42"
                          step="0.1"
                          placeholder="e.g. 36.8"
                          value={formData.temperature}
                          onChange={(e) => updateField("temperature", e.target.value)}
                          className={fieldErrors.temperature ? "has-error" : ""}
                        />
                        {fieldErrors.temperature && (
                          <span className="cb-error-text">{fieldErrors.temperature}</span>
                        )}
                      </div>

                      {/* Weight in kg */}
                      <div className="cb-vitals-field">
                        <label htmlFor="reg-vitals-weight">Weight (kg)</label>
                        <input
                          ref={fieldRefs.weight}
                          id="reg-vitals-weight"
                          type="number"
                          min="2"
                          max="300"
                          step="0.1"
                          placeholder="e.g. 68"
                          value={formData.weight}
                          onChange={(e) => updateField("weight", e.target.value)}
                          className={fieldErrors.weight ? "has-error" : ""}
                        />
                        {fieldErrors.weight && (
                          <span className="cb-error-text">{fieldErrors.weight}</span>
                        )}
                      </div>

                      {/* Allergies (Full row) */}
                      <div className="cb-vitals-field cb-col-full">
                        <label htmlFor="reg-vitals-allergies">Known Allergies (Comma-separated)</label>
                        <input
                          id="reg-vitals-allergies"
                          type="text"
                          placeholder="e.g. Penicillin, Peanuts, Pollen"
                          value={formData.allergies}
                          onChange={(e) => updateField("allergies", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* DPDP Act Consent Checkbox */}
              <div className={`cb-consent-box ${fieldErrors.agreeTerms ? "has-error" : ""}`}>
                <input
                  ref={fieldRefs.agreeTerms}
                  id="cb-agree-dpdp"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    if (fieldErrors.agreeTerms) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.agreeTerms;
                        return next;
                      });
                    }
                  }}
                  className="cb-checkbox"
                />
                <label htmlFor="cb-agree-dpdp" className="cb-consent-label">
                  I consent to the collection and processing of my health profile under India's{" "}
                  <strong>Digital Personal Data Protection (DPDP) Act 2023</strong> and agree to the{" "}
                  <Link to="/terms" target="_blank" className="cb-link-accent">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" target="_blank" className="cb-link-accent">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>
              {fieldErrors.agreeTerms && (
                <span className="cb-error-text cb-consent-error" role="alert">
                  {fieldErrors.agreeTerms}
                </span>
              )}

              {/* Submit Button (type="submit", 52px, gradient) */}
              <button
                type="submit"
                className="cb-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={19} className="cb-spinner" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="cb-form-footer">
              <span>Already have an account?</span>{" "}
              <Link to="/login" className="cb-link-signin">
                Sign in
              </Link>
            </div>

            {/* Contact Support */}
            <div className="cb-support-note">
              <span>Need help? Contact support: </span>
              <a href="mailto:support@carebridge.ai" className="cb-link-accent">
                support@carebridge.ai
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Register;