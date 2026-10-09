import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, ArrowRight, Loader2, Mail } from "lucide-react";
import authAPI from "../../services/auth";
import "./Login.css";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(!token ? "Missing email verification token." : "");

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const controller = new AbortController();

    const doVerify = async () => {
      try {
        await authAPI.verifyEmail(token, controller.signal);
        if (isMounted) {
          setVerified(true);
        }
      } catch (err) {
        if (isMounted) {
          const msg = err.response?.data?.detail || err.response?.data?.message || "Invalid or expired verification link.";
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    doVerify();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [token]);

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
              <span className="login-brand-tag">Email Verification</span>
            </div>
          </Link>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 size={36} className="spinner mx-auto text-cyan-400 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Verifying Your Email</h2>
              <p className="text-sm text-slate-300">Please hold on while we authenticate your registration...</p>
            </div>
          ) : verified ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
              <p className="text-sm text-slate-300 mb-6">
                Your email address has been verified. Your CareBridge AI clinical portal account is fully active.
              </p>
              <Link to="/login" className="login-button inline-flex items-center justify-center gap-2">
                <span>Sign In to Your Account</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/20 text-red-400 mb-4">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
              <p className="text-sm text-slate-300 mb-6">{error}</p>
              <div className="flex flex-col gap-3">
                <Link to="/login" className="login-button inline-flex items-center justify-center gap-2">
                  <span>Go to Sign In</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
