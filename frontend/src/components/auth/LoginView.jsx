import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Activity,
  Clock,
  CalendarCheck,
  RefreshCw,
  HeartPulse,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/auth";
import "./loginView.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getRoleHomePath(role) {
  const normalized = (role || "PATIENT").toString().trim().toUpperCase();
  if (normalized === "ADMIN") return "/admin";
  if (normalized === "STAFF") return "/staff/dashboard";
  if (normalized === "DOCTOR") return "/doctor/dashboard";
  return "/patient/dashboard";
}

function formatCountdown(totalSeconds) {
  const sec = Math.max(0, Number(totalSeconds) || 0);
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins}:${rem < 10 ? "0" : ""}${rem}`;
}

// 1. Pure generator for 4-digit numeric CAPTCHA
function generate4DigitCaptcha() {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  return {
    code,
    token: "",
  };
}

export default function LoginView({
  portalRole = "",
  portalTitle = "",
  portalSubtitle = "",
  portalType = "",
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser } = useAuth();

  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem("cb_remembered_email") || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem("cb_remember_me") === "true";
    } catch {
      return false;
    }
  });
  const [showPassword, setShowPassword] = useState(false);

  // Field-level inline validation errors
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
    captcha: "",
  });

  // Banner error / status states
  const [bannerError, setBannerError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendState, setResendState] = useState({ sending: false, message: "" });

  // 1. 4-Digit numeric CAPTCHA state
  const [captchaData, setCaptchaData] = useState(generate4DigitCaptcha);
  // 2. Controlled input bound to state for captcha answer
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  // Admin 2FA state
  const [require2FA, setRequire2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otp, setOtp] = useState("");
  const [twoFAMessage, setTwoFAMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const errorBannerRef = useRef(null);

  // 4. Clear the error as soon as the user edits any field
  const clearFieldAndBannerError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: "" };
    });
    if (bannerError) {
      setBannerError("");
      setErrorCode("");
    }
  };

  // 5. Regenerate the 4-digit CAPTCHA when refreshed or after a wrong answer
  const regenerateCaptcha = async () => {
    setCaptchaAnswer("");
    try {
      const res = await authAPI.getCaptcha();
      if (res?.code || res?.captcha || res?.question) {
        const code = String(res.code || res.captcha || res.question).trim();
        setCaptchaData({
          code,
          token: res.captcha_token || res.token || "",
        });
        return;
      }
    } catch {
      // Local fallback
    }
    setCaptchaData(generate4DigitCaptcha());
  };

  // Synchronize server session on mount (without re-running on ordinary renders)
  useEffect(() => {
    let active = true;
    authAPI.getCaptcha()
      .then((res) => {
        if (!active) return;
        if (res?.code || res?.captcha || res?.question) {
          const code = String(res.code || res.captcha || res.question).trim();
          setCaptchaData({
            code,
            token: res.captcha_token || res.token || "",
          });
        }
      })
      .catch(() => {
        // Fallback initialized via useState initializer
      });
    return () => {
      active = false;
    };
  }, []);

  // Set browser tab title and strip any accidental query parameters containing credentials
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Sign in | CareBridge AI";

    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.has("email") || params.has("password")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Re-hide password automatically when tab loses visibility/focus
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setShowPassword(false);
      }
    };
    const handleWindowBlur = () => {
      setShowPassword(false);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  // Countdown timer when account is temporarily locked
  useEffect(() => {
    if (lockoutSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setErrorCode("");
          setBannerError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutSeconds]);

  // Focus error banner when a new banner error appears so screen readers announce it
  useEffect(() => {
    if (bannerError && errorBannerRef.current) {
      errorBannerRef.current.focus();
    }
  }, [bannerError]);

  const validateFields = () => {
    const nextErrors = { email: "", password: "", captcha: "" };
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      nextErrors.email = "Email address is required.";
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      nextErrors.email = "Please enter a valid email address (e.g., name@domain.com).";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    // 3. 4-Digit numeric CAPTCHA validation
    const trimmedCaptcha = captchaAnswer.trim();
    if (!trimmedCaptcha) {
      nextErrors.captcha = "Please enter the 4-digit security code.";
    } else if (!/^\d{4}$/.test(trimmedCaptcha)) {
      nextErrors.captcha = "Security code must be a 4-digit number.";
    } else if (captchaData.code && trimmedCaptcha !== captchaData.code) {
      nextErrors.captcha = "Incorrect security check answer. Please try again.";
      regenerateCaptcha();
    }

    setFieldErrors(nextErrors);
    return !nextErrors.email && !nextErrors.password && !nextErrors.captcha;
  };

  const handleResendVerification = async () => {
    const targetEmail = (unverifiedEmail || email).trim().toLowerCase();
    if (!targetEmail || resendState.sending) return;

    setResendState({ sending: true, message: "" });
    try {
      const res = await authAPI.resendVerification(targetEmail);
      setResendState({
        sending: false,
        message: res?.message || "A new verification email has been sent. Please check your inbox.",
      });
    } catch {
      setResendState({
        sending: false,
        message: "Could not resend verification email right now. Please try again shortly.",
      });
    }
  };

  const completeSignInRedirect = (res) => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (rememberMe) {
        localStorage.setItem("cb_remember_me", "true");
        localStorage.setItem("cb_remembered_email", normalizedEmail);
      } else {
        localStorage.removeItem("cb_remember_me");
        localStorage.removeItem("cb_remembered_email");
      }
    } catch {
      // Ignore storage quota errors
    }

    if (typeof loginUser === "function") {
      loginUser(res.user, res.access_token);
    } else {
      if (res.access_token) {
        localStorage.setItem("access_token", res.access_token);
      }
      if (res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
      }
    }

    const requestedFrom = location.state?.from?.pathname;
    if (requestedFrom && requestedFrom !== "/login" && requestedFrom !== "/register") {
      navigate(requestedFrom, { replace: true });
      return;
    }

    navigate(getRoleHomePath(res.user?.role), { replace: true });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (loading || lockoutSeconds > 0) return;

    // Always re-hide password on submit
    setShowPassword(false);
    setBannerError("");
    setErrorCode("");
    setResendState({ sending: false, message: "" });

    if (!validateFields()) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      // 6. Send correct field names to Flask (email, password, role, captcha_answer, captcha_token, remember)
      const resolvedRole = portalType ? portalType.toUpperCase() : "";

      const payload = {
        email: normalizedEmail,
        password,
        role: resolvedRole,
        captcha_answer: captchaAnswer.trim(),
        captcha_token: captchaData.token,
        remember: rememberMe,
        remember_me: rememberMe,
      };

      const res = await authAPI.login(payload);

      if (res.require_2fa) {
        setRequire2FA(true);
        setTempToken(res.temp_token);
        setTwoFAMessage(res.message || "Enter the 6-digit verification code sent to your email.");
        setLoading(false);
        return;
      }

      completeSignInRedirect(res);
    } catch (err) {
      console.error("Login error:", err);

      // 5. Regenerate the CAPTCHA after a wrong answer or a failed login.
      regenerateCaptcha();

      if (!err.response) {
        setErrorCode("NETWORK_ERROR");
        setBannerError(
          "Unable to reach the server. Please check your network connection and try again."
        );
        setLoading(false);
        return;
      }

      const data = err.response.data || {};
      const status = err.response.status;
      const code = data.code || "";
      setErrorCode(code);

      if (typeof data.remaining_attempts === "number") {
        setRemainingAttempts(data.remaining_attempts);
      } else {
        setRemainingAttempts(null);
      }

      if (status >= 500) {
        setBannerError("Server error, please try again later");
      } else if (status === 429 || data.locked || code === "ACCOUNT_LOCKED") {
        const lockSecs = Number(data.lockout_seconds) || 15 * 60;
        setLockoutSeconds(lockSecs);
        setBannerError(
          data.detail ||
            "Account temporarily locked due to 5 failed sign-in attempts. Please wait 15 minutes or reset your password."
        );
      } else if (status === 400) {
        // Show server's specific validation messages
        const specificMsg = data.detail || data.error || data.message || "Please answer the security question";
        if (
          code === "CAPTCHA_REQUIRED" ||
          code === "CAPTCHA_INVALID" ||
          specificMsg.toLowerCase().includes("security") ||
          specificMsg.toLowerCase().includes("question") ||
          specificMsg.toLowerCase().includes("check")
        ) {
          setFieldErrors((prev) => ({ ...prev, captcha: specificMsg }));
        }
        setBannerError(specificMsg);
      } else if (code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(data.unverified_email || normalizedEmail);
        setBannerError(
          data.detail || "Your email address has not been verified yet. Please verify your email to continue."
        );
      } else if (code === "ACCOUNT_PENDING_APPROVAL") {
        setBannerError(
          data.detail ||
            "Your doctor credentials have been submitted and are currently under review by hospital administration."
        );
      } else if (code === "ACCOUNT_INVITED") {
        setBannerError(
          data.detail ||
            "This account was invited by administration. Please check your email for the invitation link to set your password."
        );
      } else if (code === "ACCOUNT_SUSPENDED") {
        setBannerError(
          data.detail ||
            "This account has been suspended or deactivated. Please contact support@carebridge.ai for assistance."
        );
      } else if (status === 401) {
        setBannerError(data.detail || "Invalid email or password");
      } else {
        setBannerError(data.detail || data.error || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setBannerError("");
    if (!otp || otp.trim().length < 6) {
      setBannerError("Please enter your 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.verify2FA({ temp_token: tempToken, otp: otp.trim() });
      completeSignInRedirect(res);
    } catch (err) {
      if (!err.response) {
        setBannerError("Network error while verifying 2FA code. Please check your connection.");
      } else {
        setBannerError(
          err.response?.data?.detail ||
            err.response?.data?.error ||
            "Invalid or expired verification code."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cb-login-viewport">
      {/* Top Navigation */}
      <header className="cb-login-topbar">
        <Link to="/" className="cb-login-brand-link" aria-label="CareBridge AI Home">
          <span className="cb-login-logo-mark" aria-hidden="true">
            <HeartPulse size={22} className="cb-login-pulse-icon" />
          </span>
          <span className="cb-login-brand-text">
            <span className="cb-login-brand-name">
              CareBridge <span className="cb-login-brand-ai">AI</span>
            </span>
            <span className="cb-login-brand-tag">Clinical Intelligence Platform</span>
          </span>
        </Link>

        <Link to="/" className="cb-login-back-home">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="cb-login-main">
        {/* Left Clinical Benefits Panel (Desktop Split Layout) */}
        <section className="cb-login-benefits" aria-label="CareBridge AI Platform Highlights">
          <div className="cb-login-benefits-badge">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Unified Healthcare Ecosystem</span>
          </div>

          <h2 className="cb-login-benefits-title">
            Connected clinical care, real-time vitals &amp; SmartFlow queues.
          </h2>
          <p className="cb-login-benefits-subtitle">
            Sign in to access your personalized CareBridge AI workspace across Patient, Doctor, and
            Hospital Operations portals.
          </p>

          <ul className="cb-login-benefit-list">
            <li className="cb-login-benefit-item">
              <span className="cb-login-benefit-icon" aria-hidden="true">
                <Activity size={19} />
              </span>
              <div className="cb-login-benefit-content">
                <h3>Continuous Health Records &amp; Telemetry</h3>
                <p>
                  Track longitudinal vitals, prescriptions, diagnostic reports, and AI-assisted
                  physiological alerts in real time.
                </p>
              </div>
            </li>

            <li className="cb-login-benefit-item">
              <span className="cb-login-benefit-icon" aria-hidden="true">
                <Clock size={19} />
              </span>
              <div className="cb-login-benefit-content">
                <h3>Live SmartFlow OPD Queue &amp; Digital Passes</h3>
                <p>
                  Monitor live token progression, estimated wait times, and QR-verified hospital
                  check-ins from your device.
                </p>
              </div>
            </li>

            <li className="cb-login-benefit-item">
              <span className="cb-login-benefit-icon" aria-hidden="true">
                <CalendarCheck size={19} />
              </span>
              <div className="cb-login-benefit-content">
                <h3>Seamless Multi-Specialty Appointments</h3>
                <p>
                  Book, reschedule, and manage verified consultations with instant doctor and
                  facility synchronization.
                </p>
              </div>
            </li>
          </ul>

          <div className="cb-login-trust-strip">
            <span className="cb-login-trust-pill">
              <ShieldCheck size={14} aria-hidden="true" />
              End-to-End Encrypted
            </span>
            <span>HIPAA &amp; DISHA Aligned Access Control</span>
          </div>
        </section>

        {/* Right Sign-In Card */}
        <section className="cb-login-card" aria-labelledby="cb-login-heading">
          <div className="cb-login-card-header">
            <div className="cb-login-card-header-top">
              <span className="cb-login-card-logo-mini" aria-hidden="true">
                <HeartPulse size={18} />
              </span>
              <span className="cb-login-card-brand-label">CareBridge AI</span>
              {portalRole && (
                <span className="cb-login-portal-tag">{portalRole}</span>
              )}
            </div>
            <h1 id="cb-login-heading" className="cb-login-title">
              {require2FA ? "Two-Factor Verification" : portalTitle || "Sign in to your account"}
            </h1>
            <p className="cb-login-subtitle">
              {require2FA
                ? "Enter the 6-digit security code sent to your administrator email."
                : portalSubtitle || "Enter your registered email and password to continue."}
            </p>
          </div>

          {/* Primary Alert Banner (Screen-reader focusable) */}
          {bannerError && (
            <div
              ref={errorBannerRef}
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
              className={`cb-login-alert ${
                lockoutSeconds > 0 ? "cb-login-alert-warning" : "cb-login-alert-error"
              }`}
            >
              <div className="cb-login-alert-row">
                <AlertCircle size={18} className="cb-login-alert-icon" aria-hidden="true" />
                <span>{bannerError}</span>
              </div>

              {lockoutSeconds > 0 && (
                <>
                  <div className="cb-login-lockout-timer">
                    Time remaining before unlock: {formatCountdown(lockoutSeconds)}
                  </div>
                  <div className="cb-login-alert-actions">
                    <Link to="/forgot-password" className="cb-login-inline-action-btn">
                      Reset password
                    </Link>
                  </div>
                </>
              )}

              {errorCode === "EMAIL_NOT_VERIFIED" && (
                <div className="cb-login-alert-actions">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendState.sending}
                    className="cb-login-inline-action-btn"
                  >
                    <RefreshCw size={13} aria-hidden="true" />
                    <span>
                      {resendState.sending ? "Sending..." : "Resend verification email"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {resendState.message && (
            <div role="status" aria-live="polite" className="cb-login-alert cb-login-alert-success">
              <div className="cb-login-alert-row">
                <CheckCircle2 size={18} className="cb-login-alert-icon" aria-hidden="true" />
                <span>{resendState.message}</span>
              </div>
            </div>
          )}

          {!require2FA ? (
            <form
              method="post"
              onSubmit={handleLoginSubmit}
              className="cb-login-form"
              noValidate
            >
              {/* Email Field */}
              <div className="cb-login-field">
                <div className="cb-login-label-row">
                  <label htmlFor="cb-login-email" className="cb-login-label">
                    Email Address
                  </label>
                </div>
                <div className="cb-login-input-wrap">
                  <span className="cb-login-input-icon" aria-hidden="true">
                    <Mail size={18} />
                  </span>
                  <input
                    id="cb-login-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    placeholder="name@carebridge.ai"
                    value={email}
                    disabled={loading || lockoutSeconds > 0}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "cb-login-email-error" : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldAndBannerError("email");
                    }}
                    onBlur={() => {
                      const trimmed = email.trim();
                      if (trimmed && trimmed !== email) {
                        setEmail(trimmed);
                      }
                    }}
                    className={`cb-login-input ${
                      fieldErrors.email ? "cb-login-input--error" : ""
                    }`}
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <p id="cb-login-email-error" role="alert" className="cb-login-field-error">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field — Explicit separated flex row for PASSWORD and Forgot password? */}
              <div className="cb-login-field">
                <div className="cb-login-label-row">
                  <label htmlFor="cb-login-password" className="cb-login-label">
                    Password
                  </label>
                  <Link to="/forgot-password" className="cb-login-forgot-link">
                    Forgot password?
                  </Link>
                </div>

                <div className="cb-login-input-wrap">
                  <span className="cb-login-input-icon" aria-hidden="true">
                    <Lock size={18} />
                  </span>
                  <input
                    id="cb-login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    disabled={loading || lockoutSeconds > 0}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "cb-login-password-error" : undefined}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldAndBannerError("password");
                    }}
                    onBlur={(e) => {
                      // Re-hide password when focus leaves the password field (unless clicking the eye toggle)
                      const nextFocused = e.relatedTarget;
                      if (!nextFocused || nextFocused.getAttribute("data-pw-toggle") !== "true") {
                        setShowPassword(false);
                      }
                    }}
                    className={`cb-login-input cb-login-input--with-toggle ${
                      fieldErrors.password ? "cb-login-input--error" : ""
                    }`}
                    required
                  />
                  <button
                    type="button"
                    data-pw-toggle="true"
                    className="cb-login-eye-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    onBlur={() => setShowPassword(false)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    disabled={loading || lockoutSeconds > 0}
                  >
                    {showPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="cb-login-password-error" role="alert" className="cb-login-field-error">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* 4-Digit Numeric Security Verification Check */}
              <div className="cb-login-challenge-box">
                <div className="cb-login-challenge-header">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <ShieldCheck size={14} aria-hidden="true" style={{ color: "#38BDF8" }} />
                    <span>Security Verification</span>
                  </span>
                  {remainingAttempts !== null && remainingAttempts > 0 && (
                    <span style={{ color: "#F59E0B" }}>{remainingAttempts} attempt(s) left</span>
                  )}
                  <button
                    type="button"
                    onClick={regenerateCaptcha}
                    className="cb-login-captcha-refresh"
                    title="Get a new security code"
                    disabled={loading || lockoutSeconds > 0}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#38BDF8",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      padding: "2px 4px",
                    }}
                  >
                    <RefreshCw size={12} aria-hidden="true" />
                    <span>New code</span>
                  </button>
                </div>

                <div className="cb-login-captcha-preview-wrap">
                  <div
                    className="cb-login-captcha-code-badge"
                    aria-label={`Security code: ${captchaData.code}`}
                  >
                    {captchaData.code || "----"}
                  </div>
                  <span className="cb-login-captcha-label">Enter the 4-digit code shown above</span>
                </div>

                <div className="cb-login-input-wrap">
                  <input
                    id="cb-login-captcha"
                    name="captcha_answer"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                    placeholder="Enter 4-digit code"
                    value={captchaAnswer}
                    disabled={loading || lockoutSeconds > 0}
                    aria-invalid={Boolean(fieldErrors.captcha)}
                    aria-describedby={fieldErrors.captcha ? "cb-login-captcha-error" : undefined}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setCaptchaAnswer(val);
                      clearFieldAndBannerError("captcha");
                    }}
                    className={`cb-login-input ${
                      fieldErrors.captcha ? "cb-login-input--error" : ""
                    }`}
                    style={{ paddingLeft: "14px", height: "42px", letterSpacing: "3px", fontWeight: "700" }}
                    required
                  />
                </div>
                {fieldErrors.captcha && (
                  <p id="cb-login-captcha-error" role="alert" className="cb-login-field-error">
                    {fieldErrors.captcha}
                  </p>
                )}
              </div>

              {/* Remember Me Checkbox */}
              <div className="cb-login-remember-row">
                <label htmlFor="cb-login-remember" className="cb-login-checkbox-label">
                  <input
                    id="cb-login-remember"
                    name="remember_me"
                    type="checkbox"
                    checked={rememberMe}
                    disabled={loading || lockoutSeconds > 0}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="cb-login-checkbox"
                  />
                  <span>Remember me</span>
                </label>
                <span className="cb-login-session-hint">
                  {rememberMe ? "30-day session" : "12-hour session"}
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || lockoutSeconds > 0}
                className="cb-login-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="cb-login-spinner" aria-hidden="true" />
                    <span>Signing in...</span>
                  </>
                ) : lockoutSeconds > 0 ? (
                  <span>Locked ({formatCountdown(lockoutSeconds)})</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form method="post" onSubmit={handle2FASubmit} className="cb-login-form" noValidate>
              <div role="status" className="cb-login-alert cb-login-alert-success">
                <div className="cb-login-alert-row">
                  <CheckCircle2 size={18} className="cb-login-alert-icon" aria-hidden="true" />
                  <span>{twoFAMessage}</span>
                </div>
              </div>

              <div className="cb-login-field">
                <div className="cb-login-label-row">
                  <label htmlFor="cb-login-otp" className="cb-login-label">
                    6-Digit Verification Code
                  </label>
                </div>
                <div className="cb-login-input-wrap">
                  <span className="cb-login-input-icon" aria-hidden="true">
                    <Lock size={18} />
                  </span>
                  <input
                    id="cb-login-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    disabled={loading}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="cb-login-input"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="cb-login-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="cb-login-spinner" aria-hidden="true" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify &amp; Sign In</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setRequire2FA(false);
                  setOtp("");
                  setBannerError("");
                }}
                className="cb-login-secondary-btn"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Card Footer: Registration Link + Dedicated Support Footer */}
          <div className="cb-login-card-footer">
            <div className="cb-login-portal-switcher">
              <span>Looking for another portal?</span>
              <div className="cb-login-switcher-links">
                {portalType !== "patient" && (
                  <Link to="/patient-login">Patient Login</Link>
                )}
                {portalType !== "doctor" && (
                  <Link to="/doctor-login">Doctor Login</Link>
                )}
                {portalType !== "staff" && (
                  <Link to="/staff-login">Staff Login</Link>
                )}
              </div>
            </div>

            <p className="cb-login-register-prompt">
              Don&apos;t have an account?
              <Link to="/register" className="cb-login-register-link">
                Create an account
              </Link>
            </p>

            <div className="cb-login-support-footer">
              Support &amp; Inquiries:{" "}
              <a href="mailto:support@carebridge.ai" className="cb-login-support-mailto">
                support@carebridge.ai
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Subtle Copyright Footer */}
      <footer className="cb-login-bottom-bar">
        &copy; {new Date().getFullYear()} CareBridge AI. Protected by clinical-grade access security.
      </footer>
    </div>
  );
}
