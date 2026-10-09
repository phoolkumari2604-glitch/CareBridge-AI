import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Loader2, ShieldCheck, UserCheck } from "lucide-react";
import authAPI from "../../services/auth";
import "./Login.css";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [inviteData, setInviteData] = useState(null);
  const [verifying, setVerifying] = useState(!!token);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(!token ? "Missing or invalid invitation token." : "");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const controller = new AbortController();

    const verifyToken = async () => {
      try {
        const data = await authAPI.verifyInvite(token, controller.signal);
        if (isMounted) {
          setInviteData(data);
        }
      } catch (err) {
        if (isMounted) {
          const msg = err.response?.data?.detail || err.response?.data?.message || "Invitation link is invalid or has expired.";
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setVerifying(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [token]);

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
    if (!token) return;

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
      await authAPI.setPassword({ token, password }, controller.signal);
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
        const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to set password. The invite link may have expired.";
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
              <span className="login-brand-tag">Staff & Doctor Onboarding</span>
            </div>
          </Link>

          {verifying ? (
            <div className="text-center py-8">
              <Loader2 size={36} className="spinner mx-auto text-cyan-400 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Verifying Invitation</h2>
              <p className="text-sm text-slate-300">Validating your security credentials...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/20 text-red-400 mb-4">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Invitation Error</h2>
              <p className="text-sm text-slate-300 mb-6">{error}</p>
              <Link to="/login" className="login-button inline-flex items-center justify-center gap-2">
                <span>Go to Sign In</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : success ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Account Activated!</h2>
              <p className="text-sm text-slate-300 mb-6">
                Your credentials have been securely registered. Redirecting to sign in...
              </p>
              <Link to="/login" className="login-button inline-flex items-center justify-center gap-2">
                <span>Sign In Now</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div>
              <h1>Activate Your Account</h1>
              <p className="text-sm text-slate-300 mb-4">
                Welcome, <strong className="text-white">{inviteData?.name || inviteData?.email}</strong>. Set your password to complete your <strong>{inviteData?.role || "Staff"}</strong> account registration.
              </p>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-field">
                  <label htmlFor="invite-pw">Set Password</label>
                  <div className="input-wrap">
                    <Lock size={18} className="field-icon" />
                    <input
                      id="invite-pw"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 10 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      disabled={loading}
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
                  <label htmlFor="invite-confirm">Confirm Password</label>
                  <div className="input-wrap">
                    <Lock size={18} className="field-icon" />
                    <input
                      id="invite-confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      disabled={loading}
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
                  disabled={loading || strength.score < 2}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Activating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Activate & Sign In</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
