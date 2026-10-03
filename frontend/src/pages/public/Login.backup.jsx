import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      /*
       * IMPORTANT:
       * We will adjust this endpoint/body to exactly match
       * your existing FastAPI backend after checking it.
       */

      const response = await api.post("/auth/login", form);

      const data = response.data;

      const token =
        data.access_token ||
        data.token;

      const user =
        data.user ||
        data.data ||
        data;

      if (!token) {
        throw new Error("Login token was not returned by server.");
      }

      login(token, user);

      const role =
        user?.role ||
        user?.user_role ||
        user?.account_type;

      if (role === "patient") {
        navigate("/patient/dashboard");
      } else if (role === "doctor") {
        navigate("/doctor/dashboard");
      } else if (
        role === "staff" ||
        role === "admin" ||
        role === "staff_admin"
      ) {
        navigate("/staff/dashboard");
      } else {
        navigate("/");
      }

    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
        err.message ||
        "Unable to login. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* LEFT BRAND PANEL */}

      <section className="auth-brand-panel">

        <div className="auth-brand-content">

          <div className="brand">
            <div className="brand-icon">
              C
            </div>

            <div className="brand-text">
              Care<span>Bridge</span>
            </div>
          </div>

          <h1>
            Healthcare,
            <br />
            connected intelligently.
          </h1>

          <p>
            A unified healthcare platform connecting
            patients, doctors and healthcare staff.
          </p>

          <div className="auth-feature-list">

            <div>
              ✓ Smart appointments
            </div>

            <div>
              ✓ Digital OPD pass
            </div>

            <div>
              ✓ Live queue tracking
            </div>

            <div>
              ✓ AI healthcare assistant
            </div>

          </div>

        </div>

      </section>


      {/* LOGIN FORM */}

      <section className="auth-form-panel">

        <div className="auth-card">

          <div className="auth-card-header">

            <span className="auth-kicker">
              CAREBRIDGE AI
            </span>

            <h2>
              Welcome back
            </h2>

            <p>
              Sign in to access your healthcare dashboard.
            </p>

          </div>


          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}


          <form onSubmit={handleSubmit}>

            {/* EMAIL */}

            <div className="form-group">

              <label className="form-label">
                Email address
              </label>

              <div className="input-with-icon">

                <Mail size={18} />

                <input
                  className="form-input"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />

              </div>

            </div>


            {/* PASSWORD */}

            <div className="form-group">

              <label className="form-label">
                Password
              </label>

              <div className="input-with-icon">

                <Lock size={18} />

                <input
                  className="form-input"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

            </div>


            <div className="auth-options">

              <label className="remember-me">

                <input type="checkbox" />

                <span>
                  Remember me
                </span>

              </label>

              <button
                type="button"
                className="text-button"
              >
                Forgot password?
              </button>

            </div>


            <button
              className="btn btn-primary auth-submit"
              type="submit"
              disabled={loading}
            >

              {loading
                ? "Signing in..."
                : "Sign in"}

              {!loading && (
                <ArrowRight size={18} />
              )}

            </button>

          </form>


          <div className="auth-divider">
            <span>New to CareBridge?</span>
          </div>


          <Link
            to="/register"
            className="btn btn-secondary auth-register"
          >
            Create an account
          </Link>

        </div>

      </section>

    </div>
  );
}

export default Login;