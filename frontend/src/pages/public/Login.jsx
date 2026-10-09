import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  User,
  Stethoscope,
  Building,
  RotateCcw,
} from "lucide-react";
import authAPI from "../../services/auth";
import { useAuth } from "../../context/AuthContext";
import { isDemoMode, getDemoCredentials } from "../../config/demoAuth";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 2FA Admin verification step
  const [require2FA, setRequire2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [timerSeconds, setTimerSeconds] = useState(600); // 10 minutes
  const [resendingOtp, setResendingOtp] = useState(false);
  const otpInputRefs = useRef([]);

  // Countdown timer for 2FA OTP
  useEffect(() => {
    let interval = null;
    if (require2FA && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [require2FA, timerSeconds]);

  const handleLogin = async (e, customCredentials = null) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    // Prevent double submits
    if (loading) return;

    const loginEmail = (customCredentials?.email || email).trim().toLowerCase();
    const loginPassword = customCredentials?.password || password;

    if (!loginEmail || !loginPassword) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      const data = await authAPI.login(
        {
          email: loginEmail,
          password: loginPassword,
        },
        controller.signal
      );

      clearTimeout(timeoutId);

      // Check if 2FA is required for Admin
      if (data?.require_2fa) {
        setRequire2FA(true);
        setTempToken(data.temp_token);
        setTimerSeconds(600);
        setError("");
        return;
      }

      // Complete login & redirect by role
      completeLoginSuccess(data);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("CareBridge Login error:", err);

      if (err.name === "AbortError" || err.code === "ECONNABORTED" || controller.signal.aborted) {
        setError("Unable to sign in. Check your connection and try again.");
      } else if (err.response?.status === 401) {
        setError(err.response?.data?.detail || "Invalid email or password. Please verify your credentials.");
      } else if (err.response?.status === 429) {
        setError(err.response?.data?.detail || "Too many sign-in attempts. Please wait a few minutes and try again.");
      } else if (err.response?.status === 403) {
        setError(err.response?.data?.detail || "This account has been deactivated. Please contact support.");
      } else if (err.response?.status >= 500) {
        setError("CareBridge clinical authentication service encountered an error. Please try again shortly.");
      } else {
        const msg =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          "Unable to sign in. Check your connection and try again.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSubmit = (role) => {
    if (loading) return;
    const creds = getDemoCredentials(role);
    if (!creds) return;

    setEmail(creds.email);
    setPassword(creds.password);
    setError("");
    handleLogin(null, creds);
  };

  const handle2FASubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (loading) return;

    const otpCode = otpValues.join("");

    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setError("");
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const data = await authAPI.verify2FA(
        {
          temp_token: tempToken,
          otp: otpCode,
        },
        controller.signal
      );

      clearTimeout(timeoutId);
      completeLoginSuccess(data);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("CareBridge 2FA verification error:", err);

      if (err.name === "AbortError" || controller.signal.aborted) {
        setError("Verification timed out. Check your connection and try again.");
      } else if (err.response?.status === 401) {
        setError("Invalid or expired OTP code.");
      } else {
        const msg = err.response?.data?.detail || err.response?.data?.message || "Invalid or expired OTP code.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, "");
    if (!cleanVal && value !== "") return;

    const newValues = [...otpValues];
    newValues[index] = cleanVal.slice(-1);
    setOtpValues(newValues);

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newValues = [...otpValues];
    for (let i = 0; i < pastedData.length; i++) {
      newValues[i] = pastedData[i];
    }
    setOtpValues(newValues);

    const nextIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const handleResendOtp = async () => {
    if (resendingOtp) return;
    setResendingOtp(true);
    setError("");
    try {
      const data = await authAPI.login({ email: email.trim().toLowerCase(), password });
      if (data.temp_token) {
        setTempToken(data.temp_token);
        setTimerSeconds(600);
        setOtpValues(["", "", "", "", "", ""]);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to resend code.");
    } finally {
      setResendingOtp(false);
    }
  };

  const completeLoginSuccess = (data) => {
    // Save JWT token
    if (data?.access_token) {
      localStorage.setItem("access_token", data.access_token);
    }

    // Save user in state and localStorage
    if (data?.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      if (setUser) {
        setUser(data.user);
      }
    }

    // Strictly redirect by role
    const role = (data?.user?.role || "").toUpperCase();

    if (role === "ADMIN") {
      navigate("/admin");
    } else if (role === "DOCTOR") {
      navigate("/doctor/dashboard");
    } else if (role === "STAFF") {
      navigate("/staff/dashboard");
    } else {
      navigate("/patient/dashboard");
    }
  };

  return (
    <div className="login-page dark" data-theme="dark">
      <div className="login-container">
        <div className="login-card dark" data-theme="dark">
          <Link to="/" className="login-brand-link">
            <div className="login-logo">C</div>
            <div>
              <span className="login-brand-name text-white">
                Care<span className="text-teal-400">Bridge</span> AI
              </span>
              <span className="login-brand-tag text-slate-400">Clinical Portal</span>
            </div>
          </Link>

          {require2FA ? (
            /* 2FA OTP STEP */
            <div className="twofa-container">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={24} className="text-teal-400" />
                <h1 className="text-xl font-bold text-white m-0">Admin 2FA Verification</h1>
              </div>
              <p className="text-sm text-slate-300 mb-4">
                A 6-digit security code has been dispatched to <strong className="text-white">{email}</strong>. Please enter the verification code to authenticate.
              </p>

              {error && (
                <div className="login-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handle2FASubmit} className="login-form">
                <div className="flex justify-between gap-2 my-2" onPaste={handleOtpPaste}>
                  {otpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-12 h-12 text-center text-xl font-mono font-bold rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                      disabled={loading}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 my-2">
                  <span>
                    Expires in: <strong className="text-teal-400">{Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, "0")}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendingOtp || timerSeconds > 540}
                    className="text-teal-400 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw size={12} className={resendingOtp ? "spin-icon" : ""} />
                    <span>Resend Code</span>
                  </button>
                </div>

                <button
                  type="submit"
                  className="login-button"
                  disabled={loading || otpValues.join("").length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Verifying 2FA...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Admin Sign In</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="text-center mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRequire2FA(false);
                      setError("");
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 transition"
                  >
                    &larr; Back to standard login
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* STANDARD LOGIN FORM */
            <div>
              <h1 className="text-white text-2xl font-bold tracking-tight mb-2">Welcome back</h1>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Access your personal health records, live queues, and appointments.
              </p>

              {error && (
                <div className="login-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="login-form">
                <div className="login-field">
                  <label htmlFor="login-email" className="text-slate-300 block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="input-wrap">
                    <Mail size={18} className="field-icon text-slate-500" />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="username"
                      disabled={loading}
                      className="login-input text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="login-field">
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="text-slate-300 block text-xs font-semibold uppercase tracking-wider">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-teal-400 hover:underline font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="input-wrap">
                    <Lock size={18} className="field-icon text-slate-500" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={loading}
                      className="login-input text-white placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      className="toggle-password text-slate-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="login-button"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* QUICK DEMO LOGIN (Only rendered if VITE_DEMO_MODE=true) */}
              {isDemoMode && (
                <div className="demo-accounts-section">
                  <span className="demo-title text-slate-400">Quick Demo Login:</span>
                  <div className="demo-buttons">
                    <button
                      type="button"
                      className="demo-btn"
                      disabled={loading}
                      onClick={() => handleDemoSubmit("patient")}
                    >
                      <User size={14} className="text-teal-400" />
                      <span>Patient</span>
                    </button>
                    <button
                      type="button"
                      className="demo-btn"
                      disabled={loading}
                      onClick={() => handleDemoSubmit("doctor")}
                    >
                      <Stethoscope size={14} className="text-teal-400" />
                      <span>Doctor</span>
                    </button>
                    <button
                      type="button"
                      className="demo-btn"
                      disabled={loading}
                      onClick={() => handleDemoSubmit("staff")}
                    >
                      <Building size={14} className="text-teal-400" />
                      <span>Staff</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="login-footer text-slate-400">
                Don't have an account?{" "}
                <Link to="/register" className="text-teal-400 hover:underline font-semibold">
                  Create an account
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <span className="text-xs text-slate-400">
              Support & Inquiries:{" "}
              <a href="mailto:phoolkumari2603@gmail.com" className="text-teal-400 hover:underline">
                phoolkumari2603@gmail.com
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
