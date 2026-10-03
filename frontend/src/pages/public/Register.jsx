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
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const passwordStrength = useMemo(() => {
    const password = formData.password;

    if (!password) {
      return {
        score: 0,
        label: "",
      };
    }

    let score = 0;

    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) {
      return {
        score,
        label: "Weak",
      };
    }

    if (score <= 3) {
      return {
        score,
        label: "Good",
      };
    }

    return {
      score,
      label: "Strong",
    };
  }, [formData.password]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();

    if (!name || !email || !phone || !formData.password) {
      setError("Please complete all required fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await authAPI.register({
        name,
        email,
        password: formData.password,
        role: "PATIENT",
        phone,
      });

      setSuccess("Your account has been created successfully. Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      console.error("Registration error:", err);

      const errorDetail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        (err.message === "Network Error"
          ? "Unable to connect to CareBridge AI server. Please verify backend is running on port 8000."
          : err.message || "Registration failed. Please try again.");

      if (Array.isArray(errorDetail)) {
        setError(
          errorDetail.map((item) => item.msg || item.message || JSON.stringify(item)).join(", ")
        );
      } else {
        setError(
          typeof errorDetail === "string"
            ? errorDetail
            : "Registration failed. Please check your information."
        );
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
              Your health.
              <br />
              <span>Connected.</span>
              <br />
              Simplified.
            </h1>

            <p className="hero-description">
              One secure platform for managing appointments,
              health records, digital OPD passes, live queues
              and intelligent healthcare assistance.
            </p>

            <div className="feature-list">

              <div className="feature-item">
                <span className="feature-icon">✓</span>

                <div>
                  <strong>Smart appointments</strong>
                  <small>
                    Find and manage your care effortlessly
                  </small>
                </div>
              </div>

              <div className="feature-item">
                <span className="feature-icon">✓</span>

                <div>
                  <strong>Digital OPD pass</strong>
                  <small>
                    Keep your visit information accessible
                  </small>
                </div>
              </div>

              <div className="feature-item">
                <span className="feature-icon">✓</span>

                <div>
                  <strong>Live queue tracking</strong>
                  <small>
                    Know your position before you arrive
                  </small>
                </div>
              </div>

              <div className="feature-item">
                <span className="feature-icon">✓</span>

                <div>
                  <strong>AI healthcare assistant</strong>
                  <small>
                    Get guidance when you need it
                  </small>
                </div>
              </div>

            </div>
          </div>

          <div className="hero-footer">
            <span>Secure</span>
            <i></i>
            <span>Connected</span>
            <i></i>
            <span>Patient-first</span>
          </div>

        </aside>

        {/* ================= RIGHT FORM ================= */}

        <section className="register-form-area">

          <div className="register-card">

            <div className="card-decoration"></div>

            {/* Header */}

            <div className="form-header">

              <div className="form-icon">
                <Icon type="user" />
              </div>

              <div>

                <span className="form-eyebrow">
                  GET STARTED
                </span>

                <h2>Create your account</h2>

                <p>
                  Join CareBridge AI and manage your
                  healthcare journey in one place.
                </p>

              </div>

            </div>

            {/* Error */}

            {error && (
              <div className="form-alert form-alert-error">
                <span>!</span>
                <p>{error}</p>
              </div>
            )}

            {/* Success */}

            {success && (
              <div className="form-alert form-alert-success">
                <span>
                  <Icon type="check" />
                </span>

                <p>{success}</p>
              </div>
            )}

            {/* Form */}

            <form
              onSubmit={handleSubmit}
              className="register-form"
            >

              {/* Name */}

              <div className="form-row">

                <div className="field-group field-full">

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
                      onChange={(e) =>
                        updateField("name", e.target.value)
                      }
                      autoComplete="name"
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
                      onChange={(e) =>
                        updateField("email", e.target.value)
                      }
                      autoComplete="email"
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
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={(e) =>
                        updateField("phone", e.target.value)
                      }
                      autoComplete="tel"
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
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) =>
                        updateField(
                          "password",
                          e.target.value
                        )
                      }
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                    >
                      <Icon
                        type={
                          showPassword
                            ? "eyeOff"
                            : "eye"
                        }
                      />
                    </button>

                  </div>

                  {formData.password && (
                    <div className="password-strength">

                      <div className="strength-bars">

                        {[1, 2, 3, 4, 5].map((bar) => (
                          <span
                            key={bar}
                            className={
                              bar <=
                              passwordStrength.score
                                ? "active"
                                : ""
                            }
                          ></span>
                        ))}

                      </div>

                      <small>
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
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        updateField(
                          "confirmPassword",
                          e.target.value
                        )
                      }
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                    >
                      <Icon
                        type={
                          showConfirmPassword
                            ? "eyeOff"
                            : "eye"
                        }
                      />
                    </button>

                  </div>

                </div>

              </div>

              {/* Security */}

              <div className="security-note">

                <div className="security-icon">
                  <Icon type="lock" />
                </div>

                <div>
                  <strong>
                    Your information is protected
                  </strong>

                  <span>
                    Your account details are securely
                    transmitted to CareBridge AI.
                  </span>
                </div>

              </div>

              {/* Button */}

              <button
                type="submit"
                className="register-button"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <span className="button-arrow">
                      →
                    </span>
                  </>
                )}

              </button>

            </form>

            {/* Login */}

            <div className="login-divider">

              <span>
                Already have an account?
              </span>

              <Link to="/login">
                Sign in
              </Link>

            </div>

            <p className="terms-text">
              By creating an account, you agree to use
              CareBridge AI responsibly and provide accurate
              information.
            </p>

          </div>

        </section>

      </section>

    </main>
  );
};

export default Register;