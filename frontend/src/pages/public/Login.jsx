import { useState } from "react";
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
  Building
} from "lucide-react";
import authAPI from "../../services/auth";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await authAPI.login({
        email: emailTrimmed,
        password,
      });

      // Save JWT token
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
      }

      // Save user
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        if (setUser) {
          setUser(data.user);
        }
      }

      // Redirect according to role
      const role = (data.user?.role || "").toUpperCase();

      if (role === "PATIENT") {
        navigate("/patient/dashboard");
      } else if (role === "DOCTOR") {
        navigate("/doctor/dashboard");
      } else if (role === "STAFF" || role === "ADMIN") {
        navigate("/staff/dashboard");
      } else {
        navigate("/patient/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);

      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        (err.message === "Network Error"
          ? "Unable to connect to CareBridge AI server. Please make sure the backend is running."
          : "Invalid email or password. Please try again.");

      setError(
        typeof errorMessage === "string"
          ? errorMessage
          : "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
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
              <span className="login-brand-tag">Clinical Portal</span>
            </div>
          </Link>

          <h1>Welcome back</h1>
          <p>Access your personal health records, live queues, and appointments.</p>

          {error && (
            <div className="login-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="login-field">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-wrap">
                <Mail size={18} className="field-icon" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="login-field">
              <div className="label-row">
                <label htmlFor="login-password">Password</label>
              </div>
              <div className="input-wrap">
                <Lock size={18} className="field-icon" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-password"
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

          {/* QUICK DEMO LOGIN BUTTONS */}
          <div className="demo-accounts-section">
            <span className="demo-title">Quick Demo Login:</span>
            <div className="demo-buttons">
              <button
                type="button"
                className="demo-btn"
                onClick={() => fillDemoCredentials("patient@carebridge.ai", "CareBridge#Pt2026!Secure")}
              >
                <User size={14} />
                <span>Patient</span>
              </button>
              <button
                type="button"
                className="demo-btn"
                onClick={() => fillDemoCredentials("doctor@carebridge.ai", "CareBridge#Doc2026!Secure")}
              >
                <Stethoscope size={14} />
                <span>Doctor</span>
              </button>
              <button
                type="button"
                className="demo-btn"
                onClick={() => fillDemoCredentials("staff@carebridge.ai", "CareBridge#Staff2026!Admin")}
              >
                <Building size={14} />
                <span>Staff</span>
              </button>
            </div>
          </div>

          <div className="login-footer">
            Don't have an account?{" "}
            <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
