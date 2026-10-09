import React, { useState, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import authAPI from "../../services/auth";
import "./Login.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(!token ? "Missing or invalid password reset token." : "");
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    let s = 0;
    if (password.length >= 10) s++;
    if (password.length >= 14) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) s++;

    if (s <= 2) return { score: s, label: "Weak (add mixed case, numbers & symbols)", color: "#ef4444" };
    if (s <= 4) return { score: s, label: "Moderate (add symbols for max strength)", color: "#f59e0b" };
    return { score: s, label: "Strong (meets clinical security standards)", color: "#10b981" };
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid password reset token.");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      await authAPI.resetPassword({ token, password }, controller.signal);
      clearTimeout(timeoutId);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to reset password. The link may have expired.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <Link to="/" className="login-brand-link">
            <div className="login-logo">C</div>
            <div>
              <span className="login-brand-name">
                Care<span>Bridge</span> AI
              </span>
              <span className="login-brand-tag">Security Setup</span>
            </div>
          </Link>

          <h1>Create New Password</h1>
          <p>Choose a secure, strong password with at least 10 characters.</p>

          {error && (
            <div className="login-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Password Updated!</h3>
              <p className="text-sm text-slate-300 mb-6">
                Your password has been changed securely. Redirecting you to the sign in portal...
              </p>
              <Link to="/login" className="login-button inline-flex items-center justify-center gap-2">
                <span>Sign In Now</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="new-pw">New Password</label>
                <div className="input-wrap">
                  <Lock size={18} className="field-icon" />
                  <input
                    id="new-pw"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 10 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading || !token}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {password && (
                  <div className="mt-1 text-xs" style={{ color: strength.color }}>
                    Strength: {strength.label}
                  </div>
                )}
              </div>

              <div className="login-field">
                <label htmlFor="confirm-pw">Confirm Password</label>
                <div className="input-wrap">
                  <Lock size={18} className="field-icon" />
                  <input
                    id="confirm-pw"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading || !token}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label="Toggle password"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading || !token || strength.score < 2}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Set New Password</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="login-footer">
                <Link to="/login">Cancel and Return to Sign In</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
