import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import authAPI from "../../services/auth";
import "./Login.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      await authAPI.forgotPassword(email.trim(), controller.signal);
      clearTimeout(timeoutId);
      setSubmitted(true);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError" || err.code === "ECONNABORTED") {
        setError("Request timed out. Please verify your internet connection and try again.");
      } else {
        const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to process password reset request.";
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
              <span className="login-brand-tag">Security & Recovery</span>
            </div>
          </Link>

          <h1>Reset Password</h1>
          <p>
            Enter your registered email address and we will send you a secure link to reset your account password.
          </p>

          {error && (
            <div className="login-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Check your email</h3>
              <p className="text-sm text-slate-300 mb-6">
                If an account exists for <strong className="text-white">{email}</strong>, we have dispatched password reset instructions.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800 text-slate-300 hover:text-white text-sm font-medium transition"
                >
                  Didn't receive email? Try again
                </button>
                <Link
                  to="/login"
                  className="login-button inline-flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="reset-email">Email Address</label>
                <div className="input-wrap">
                  <Mail size={18} className="field-icon" />
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
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
                    <span>Sending Instructions...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="login-footer">
                Remember your password?{" "}
                <Link to="/login">Sign in</Link>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <span className="text-xs text-slate-400">
              Need assistance? Contact{" "}
              <a href="mailto:phoolkumari2603@gmail.com" className="text-cyan-400 hover:underline">
                phoolkumari2603@gmail.com
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
