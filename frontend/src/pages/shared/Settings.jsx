import React, { useState, useEffect, useMemo } from "react";
import {
  User,
  Shield,
  Bell,
  Sun,
  Moon,
  Sliders,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  Mail,
  Volume2,
  Clock,
  HeartPulse,
  Save,
  RotateCcw,
  Sparkles,
  Stethoscope,
  Info,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import authAPI from "../../services/auth";
import "./Settings.css";

function Settings() {
  const { user, setUser } = useAuth();
  const { theme, setTheme, compactMode, setCompactMode } = useTheme();
  const role = (user?.role || "PATIENT").toUpperCase();
  const isDoctor = role === "DOCTOR";
  const isPatient = role === "PATIENT";

  const [activeTab, setActiveTab] = useState("account");
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Settings State initialized from localStorage or defaults
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("carebridge_settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      // Appearance
      highContrast: false,

      // Notifications
      emailNotifications: true,
      smsNotifications: true,
      appointmentReminders: true,
      emergencyAudioAlerts: true,
      healthAlerts: true,
      reminderLeadTime: "30m",

      // Security
      twoFactorEnabled: false,
      sessionTimeout: "60m",

      // Preferences
      tempUnit: "C",
      weightUnit: "kg",
      glucoseUnit: "mg/dL",
      autoRefreshRate: "30s",

      // Doctor / Role Specific
      consultationBuffer: "10m",
      autoAcceptEmergency: true,
      telemetrySoundAlerts: true,
    };
  });

  // Password Change Form State
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Save settings state to localStorage
  useEffect(() => {
    localStorage.setItem("carebridge_settings", JSON.stringify(settings));
  }, [settings]);

  const showToast = (msg = "Settings preferences updated successfully.") => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleToggle = (key) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      return updated;
    });
    showToast();
  };

  const handleChange = (key, value) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      return updated;
    });
    showToast();
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    showToast(`Interface appearance switched to ${newTheme === "dark" ? "Dark" : "Light"} mode.`);
  };

  const newPasswordStrength = useMemo(() => {
    const password = passwordForm.new_password;
    if (!password) {
      return { score: 0, label: "" };
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: "Weak (add numbers & symbols)", color: "#ef4444" };
    if (score <= 4) return { score, label: "Medium (good password)", color: "#f59e0b" };
    return { score, label: "Strong (high security)", color: "#10b981" };
  }, [passwordForm.new_password]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordForm.current_password || !passwordForm.new_password) {
      setPasswordError("Please enter your current and new password.");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    try {
      setPasswordLoading(true);
      await authAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });

      setPasswordSuccess("Account password changed successfully.");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => setPasswordSuccess(""), 4000);
    } catch (err) {
      console.error("Password change failed:", err);
      const detail = err.response?.data?.detail || "Failed to update password. Please check your current password.";
      setPasswordError(detail);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResetDefaults = () => {
    const defaults = {
      theme: "light",
      compactMode: false,
      highContrast: false,
      emailNotifications: true,
      smsNotifications: true,
      appointmentReminders: true,
      emergencyAudioAlerts: true,
      healthAlerts: true,
      reminderLeadTime: "30m",
      twoFactorEnabled: false,
      sessionTimeout: "60m",
      tempUnit: "C",
      weightUnit: "kg",
      glucoseUnit: "mg/dL",
      autoRefreshRate: "30s",
      consultationBuffer: "10m",
      autoAcceptEmergency: true,
      telemetrySoundAlerts: true,
    };
    setSettings(defaults);
    showToast("Settings reset to system clinical defaults.");
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        {/* HEADER */}
        <div className="settings-header">
          <div>
            <span className="settings-eyebrow">CAREBRIDGE AI SYSTEM CONFIGURATION</span>
            <h1>Settings & Preferences</h1>
            <p>Customize your account credentials, notifications, light/dark themes, and clinical preferences.</p>
          </div>

          <button className="settings-reset-btn" onClick={handleResetDefaults} title="Reset to default settings">
            <RotateCcw size={15} />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* NOTIFICATION TOAST */}
        {toastMessage && (
          <div className="settings-toast">
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="settings-tabs-nav">
          <button
            className={`tab-btn ${activeTab === "account" ? "active" : ""}`}
            onClick={() => setActiveTab("account")}
          >
            <User size={17} />
            <span>Account</span>
          </button>

          <button
            className={`tab-btn ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <Shield size={17} />
            <span>Security & Password</span>
          </button>

          <button
            className={`tab-btn ${activeTab === "notifications" ? "active" : ""}`}
            onClick={() => setActiveTab("notifications")}
          >
            <Bell size={17} />
            <span>Notifications</span>
          </button>

          <button
            className={`tab-btn ${activeTab === "appearance" ? "active" : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            {settings.theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
            <span>Appearance & Theme</span>
          </button>

          <button
            className={`tab-btn ${activeTab === "preferences" ? "active" : ""}`}
            onClick={() => setActiveTab("preferences")}
          >
            <Sliders size={17} />
            <span>Clinical Units</span>
          </button>

          {isDoctor && (
            <button
              className={`tab-btn ${activeTab === "doctor" ? "active" : ""}`}
              onClick={() => setActiveTab("doctor")}
            >
              <Stethoscope size={17} />
              <span>Doctor Practice</span>
            </button>
          )}
        </div>

        {/* TAB CONTENT AREA */}
        <div className="settings-content-card">
          {/* TAB 1: ACCOUNT */}
          {activeTab === "account" && (
            <div className="settings-tab-pane">
              <div className="pane-header">
                <h2>Account Overview</h2>
                <p>Authenticated identity and role permissions</p>
              </div>

              <div className="settings-group">
                <div className="setting-item-row">
                  <div>
                    <label className="setting-label">Full Name</label>
                    <p className="setting-desc">{user?.name || "CareBridge User"}</p>
                  </div>
                  <span className="setting-badge verified">Verified Member</span>
                </div>

                <div className="setting-item-row">
                  <div>
                    <label className="setting-label">Email Address</label>
                    <p className="setting-desc">{user?.email || "user@carebridge.ai"}</p>
                  </div>
                  <span className="setting-badge role-badge">{role}</span>
                </div>

                <div className="setting-item-row">
                  <div>
                    <label className="setting-label">Registered Phone Number</label>
                    <p className="setting-desc">{user?.phone || "No phone number linked"}</p>
                  </div>
                </div>

                <div className="setting-item-row">
                  <div>
                    <label className="setting-label">CareBridge Universal Identifier</label>
                    <p className="setting-desc font-mono">
                      #{String(user?.doctor_id || user?.patient_id || user?.id || "CB-8921").toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & PASSWORD CHANGE */}
          {activeTab === "security" && (
            <div className="settings-tab-pane">
              <div className="pane-header">
                <h2>Security & Authentication</h2>
                <p>Change password, configure two-factor authentication, and manage session duration</p>
              </div>

              {/* PASSWORD CHANGE FORM */}
              <div className="password-change-box">
                <div className="box-title">
                  <KeyRound size={18} className="text-teal" />
                  <h3>Change Account Password</h3>
                </div>

                {passwordSuccess && (
                  <div className="settings-alert success">
                    <CheckCircle2 size={16} />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="settings-alert error">
                    <AlertCircle size={16} />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="password-form-grid">
                  <div className="form-group">
                    <label htmlFor="curr-pass">Current Password *</label>
                    <input
                      id="curr-pass"
                      type="password"
                      placeholder="••••••••"
                      value={passwordForm.current_password}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, current_password: e.target.value })
                      }
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="new-pass">New Password * (Min 8 characters)</label>
                    <input
                      id="new-pass"
                      type="password"
                      placeholder="••••••••"
                      value={passwordForm.new_password}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, new_password: e.target.value })
                      }
                      autoComplete="new-password"
                      required
                    />
                    {passwordForm.new_password && (
                      <div className="settings-password-strength">
                        <div className="settings-strength-bars">
                          {[1, 2, 3, 4, 5, 6].map((bar) => (
                            <span
                              key={bar}
                              style={{
                                backgroundColor:
                                  bar <= newPasswordStrength.score
                                    ? newPasswordStrength.color
                                    : "#e2e8f0",
                              }}
                              className={bar <= newPasswordStrength.score ? "active" : ""}
                            />
                          ))}
                        </div>
                        <small style={{ color: newPasswordStrength.color, fontWeight: 700 }}>
                          {newPasswordStrength.label}
                        </small>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirm-pass">Confirm New Password *</label>
                    <input
                      id="confirm-pass"
                      type="password"
                      placeholder="••••••••"
                      value={passwordForm.confirm_password}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                      }
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <button type="submit" className="save-password-btn" disabled={passwordLoading}>
                    {passwordLoading ? (
                      <>
                        <Loader2 size={15} className="spinner-icon" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={15} />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* SECURITY TOGGLES */}
              <div className="settings-group">
                <div className="setting-item-row toggle-row">
                  <div>
                    <label className="setting-label">Two-Factor Authentication (2FA)</label>
                    <p className="setting-desc">Enforce SMS / OTP verification on new device logins</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.twoFactorEnabled}
                      onChange={() => handleToggle("twoFactorEnabled")}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="setting-item-row">
                  <div>
                    <label className="setting-label">Automatic Inactivity Logout</label>
                    <p className="setting-desc">Auto-terminate active sessions after idle period</p>
                  </div>
                  <select
                    className="settings-select"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleChange("sessionTimeout", e.target.value)}
                  >
                    <option value="15m">15 Minutes</option>
                    <option value="30m">30 Minutes</option>
                    <option value="60m">1 Hour (Standard)</option>
                    <option value="120m">2 Hours</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="settings-tab-pane">
              <div className="pane-header">
                <h2>Alerts & Notification Channels</h2>
                <p>Manage SMS, email, and clinical audio alert dispatching</p>
              </div>

              <div className="settings-group">
                <div className="setting-item-row toggle-row">
                  <div className="item-icon-text">
                    <Mail size={18} className="item-icon" />
                    <div>
                      <label className="setting-label">Email Notifications</label>
                      <p className="setting-desc">Receive appointment confirmations and clinical summaries via email</p>
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={() => handleToggle("emailNotifications")}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="setting-item-row toggle-row">
                  <div className="item-icon-text">
                    <Smartphone size={18} className="item-icon" />
                    <div>
                      <label className="setting-label">SMS Alerts</label>
                      <p className="setting-desc">Get critical token calls and queue updates sent to your phone</p>
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.smsNotifications}
                      onChange={() => handleToggle("smsNotifications")}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="setting-item-row toggle-row">
                  <div className="item-icon-text">
                    <Volume2 size={18} className="item-icon" />
                    <div>
                      <label className="setting-label">Critical Vital Audio Siren</label>
                      <p className="setting-desc">Play audible browser tone when vitals breach safety thresholds</p>
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.emergencyAudioAlerts}
                      onChange={() => handleToggle("emergencyAudioAlerts")}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="setting-item-row">
                  <div className="item-icon-text">
                    <Clock size={18} className="item-icon" />
                    <div>
                      <label className="setting-label">Appointment Reminder Lead Time</label>
                      <p className="setting-desc">Send notification prior to scheduled doctor consultation</p>
                    </div>
                  </div>
                  <select
                    className="settings-select"
                    value={settings.reminderLeadTime}
                    onChange={(e) => handleChange("reminderLeadTime", e.target.value)}
                  >
                    <option value="15m">15 Minutes Before</option>
                    <option value="30m">30 Minutes Before</option>
                    <option value="1h">1 Hour Before</option>
                    <option value="24h">24 Hours Before</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: APPEARANCE & THEME */}
          {activeTab === "appearance" && (
            <div className="settings-tab-pane">
              <div className="pane-header">
                <h2>Interface & Theme</h2>
                <p>Switch between Light Mode and Dark Mode for optimal clinical viewing</p>
              </div>

              {/* THEME SELECTOR CARDS */}
              <div className="theme-cards-grid">
                <div
                  className={`theme-card light ${theme === "light" ? "selected" : ""}`}
                  onClick={() => handleThemeChange("light")}
                >
                  <div className="theme-preview-box light-box">
                    <div className="mock-bar"></div>
                    <div className="mock-card"></div>
                  </div>
                  <div className="theme-card-info">
                    <div className="theme-title-row">
                      <Sun size={18} className="text-amber-500" />
                      <h4>Light Mode (Default)</h4>
                    </div>
                    <p>Clean, high-contrast healthcare white aesthetic with deep navy brand accents.</p>
                  </div>
                </div>

                <div
                  className={`theme-card dark ${theme === "dark" ? "selected" : ""}`}
                  onClick={() => handleThemeChange("dark")}
                >
                  <div className="theme-preview-box dark-box">
                    <div className="mock-bar dark"></div>
                    <div className="mock-card dark"></div>
                  </div>
                  <div className="theme-card-info">
                    <div className="theme-title-row">
                      <Moon size={18} className="text-cyan-400" />
                      <h4>Dark Mode</h4>
                    </div>
                    <p>Subdued midnight background with radiant teal telemetry highlights.</p>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <div className="setting-item-row toggle-row">
                  <div>
                    <label className="setting-label">Compact Density View</label>
                    <p className="setting-desc">Decrease padding and row heights on telemetry tables and queues</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={compactMode}
                      onChange={() => setCompactMode(!compactMode)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="setting-item-row toggle-row">
                  <div>
                    <label className="setting-label">High-Contrast Color Mode</label>
                    <p className="setting-desc">Enhance border lines and badge contrast for clinical accessibility</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.highContrast}
                      onChange={() => handleToggle("highContrast")}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLINICAL UNITS */}
          {activeTab === "preferences" && (
            <div className="settings-tab-pane">
              <div className="pane-header">
                <h2>Clinical & Measurement Units</h2>
                <p>Standardize clinical metrics across vital monitors and health records</p>
              </div>

              <div className="settings-group">
                <div className="setting-item-row">
                  <div>
                    <label className="setting-label">Body Temperature Unit</label>
                    <p className="setting-desc">Displayed on fever monitors and telemetry logs</p>
                  </div>
                  <select
                    className="settings-select"
                    value={settings.tempUnit}
                    onChange={(e) => handleChange("tempUnit", e.target.value)}
                  >
                    <option value="C">Celsius (°C)</option>
                    <option value="F">Fahrenheit (°F)</option>
                  </select>
                </div>

                <div className="setting-item-row">
                  <div>
                    <label className="setting-label">Body Weight Unit</label>
                    <p className="setting-desc">Used for dosage titration and BMI calculation</p>
                  </div>
                  <select
                    className="settings-select"
                    value={settings.weightUnit}
                    onChange={(e) => handleChange("weightUnit", e.target.value)}
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="lbs">Pounds (lbs)</option>
                  </select>
                </div>

                <div className="setting-item-row">
                  <div>
                    <label className="setting-label">Blood Glucose Unit</label>
                    <p className="setting-desc">Laboratory standard for diabetic tracking</p>
                  </div>
                  <select
                    className="settings-select"
                    value={settings.glucoseUnit}
                    onChange={(e) => handleChange("glucoseUnit", e.target.value)}
                  >
                    <option value="mg/dL">mg/dL (Milligrams per deciliter)</option>
                    <option value="mmol/L">mmol/L (Millimoles per liter)</option>
                  </select>
                </div>

                <div className="setting-item-row">
                  <div>
                    <label className="setting-label">Dashboard Telemetry Auto-Refresh Rate</label>
                    <p className="setting-desc">Frequency for polling live vitals and queue status</p>
                  </div>
                  <select
                    className="settings-select"
                    value={settings.autoRefreshRate}
                    onChange={(e) => handleChange("autoRefreshRate", e.target.value)}
                  >
                    <option value="15s">Every 15 Seconds</option>
                    <option value="30s">Every 30 Seconds (Recommended)</option>
                    <option value="60s">Every 60 Seconds</option>
                    <option value="manual">Manual Refresh Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DOCTOR PRACTICE SETTINGS */}
          {isDoctor && activeTab === "doctor" && (
            <div className="settings-tab-pane">
              <div className="pane-header">
                <h2>Doctor Practice Preferences</h2>
                <p>Configure appointment slot buffers, emergency auto-intake, and clinical telemetry alerts</p>
              </div>

              <div className="settings-group">
                <div className="setting-item-row">
                  <div>
                    <label className="setting-label">Consultation Buffer Between Appointments</label>
                    <p className="setting-desc">Minimum gap time allocated between consecutive patient bookings</p>
                  </div>
                  <select
                    className="settings-select"
                    value={settings.consultationBuffer}
                    onChange={(e) => handleChange("consultationBuffer", e.target.value)}
                  >
                    <option value="5m">5 Minutes</option>
                    <option value="10m">10 Minutes (Standard)</option>
                    <option value="15m">15 Minutes</option>
                  </select>
                </div>

                <div className="setting-item-row toggle-row">
                  <div>
                    <label className="setting-label">Auto-Accept Emergency Walk-In Slots</label>
                    <p className="setting-desc">Automatically reserve priority slots for triaged emergency cases</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.autoAcceptEmergency}
                      onChange={() => handleToggle("autoAcceptEmergency")}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="setting-item-row toggle-row">
                  <div>
                    <label className="setting-label">Sound Notifications on Critical Patient Vitals</label>
                    <p className="setting-desc">Play alert chime when a monitored patient exhibits tachy/bradycardia or low SpO2</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.telemetrySoundAlerts}
                      onChange={() => handleToggle("telemetrySoundAlerts")}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
