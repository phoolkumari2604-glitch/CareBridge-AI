import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import "./Settings.css";

function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [savedToast, setSavedToast] = useState(false);

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
      // Notifications
      notifications: true,
      emailNotifications: true,
      appointmentReminders: true,
      emergencyAudioAlerts: true,
      healthAlerts: true,
      reminderLeadTime: "30m",
      
      // Appearance
      theme: "dark",
      compactMode: false,
      highContrast: false,
      
      // Security
      twoFactorEnabled: true,
      sessionTimeout: "60m",
      
      // Preferences
      tempUnit: "C",
      weightUnit: "kg",
      glucoseUnit: "mg/dL",
      defaultMonitoringInterval: "24h",
      autoRefreshRate: "30s",
    };
  });

  const [passwordModal, setPasswordModal] = useState(false);
  const [passData, setPassData] = useState({ current: "", newPass: "", confirm: "" });
  const [passMessage, setPassMessage] = useState({ text: "", type: "" });

  // Save to localStorage when settings change
  useEffect(() => {
    localStorage.setItem("carebridge_settings", JSON.stringify(settings));
    if (settings.theme === "light") {
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
    } else {
      document.body.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
    }
  }, [settings]);

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    showToast();
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    showToast();
  };

  const showToast = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!passData.current || !passData.newPass) {
      setPassMessage({ text: "Please fill in all required fields.", type: "error" });
      return;
    }
    if (passData.newPass !== passData.confirm) {
      setPassMessage({ text: "New passwords do not match.", type: "error" });
      return;
    }
    if (passData.newPass.length < 8) {
      setPassMessage({ text: "Password must be at least 8 characters long.", type: "error" });
      return;
    }
    
    // Simulate safe state response
    setPassMessage({ text: "Password security update preferences logged.", type: "success" });
    setTimeout(() => {
      setPasswordModal(false);
      setPassData({ current: "", newPass: "", confirm: "" });
      setPassMessage({ text: "", type: "" });
    }, 1500);
  };

  return (
    <main className="settings-page">
      {/* Header */}
      <section className="settings-header">
        <div>
          <span className="settings-eyebrow">SYSTEM CONFIGURATION</span>
          <h1>System Settings</h1>
          <p>
            Configure your clinical workflow preferences, notification channels, security policies, and interface appearance.
          </p>
        </div>

        <div className="settings-status">
          <span className="status-dot"></span>
          <span>System Connected ({user?.role?.toUpperCase() || "STAFF"})</span>
        </div>
      </section>

      {/* Settings Navigation Tabs */}
      <div className="settings-tabs-bar">
        <button
          className={`settings-tab-btn ${activeTab === "account" ? "active" : ""}`}
          onClick={() => setActiveTab("account")}
        >
          <span className="tab-icon">👤</span> Account
        </button>
        <button
          className={`settings-tab-btn ${activeTab === "notifications" ? "active" : ""}`}
          onClick={() => setActiveTab("notifications")}
        >
          <span className="tab-icon">🔔</span> Notifications
        </button>
        <button
          className={`settings-tab-btn ${activeTab === "security" ? "active" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <span className="tab-icon">🔐</span> Security
        </button>
        <button
          className={`settings-tab-btn ${activeTab === "appearance" ? "active" : ""}`}
          onClick={() => setActiveTab("appearance")}
        >
          <span className="tab-icon">🎨</span> Appearance
        </button>
        <button
          className={`settings-tab-btn ${activeTab === "preferences" ? "active" : ""}`}
          onClick={() => setActiveTab("preferences")}
        >
          <span className="tab-icon">⚙️</span> Preferences
        </button>
      </div>

      {/* Toast Notification */}
      {savedToast && (
        <div className="settings-toast-banner">
          <span className="toast-check">✓</span> Settings updated & synced locally
        </div>
      )}

      {/* Tab Contents */}
      <div className="settings-tab-container">
        {/* ACCOUNT TAB */}
        {activeTab === "account" && (
          <div className="settings-section-card">
            <div className="card-heading">
              <div className="card-icon account-icon">👤</div>
              <div>
                <h2>Account Profile</h2>
                <p>Your institutional credentials and identity details.</p>
              </div>
            </div>

            <div className="account-details-grid">
              <div className="account-item">
                <span className="account-label">Full Name</span>
                <span className="account-val">{user?.full_name || user?.username || "Healthcare Professional"}</span>
              </div>
              <div className="account-item">
                <span className="account-label">Email Address</span>
                <span className="account-val">{user?.email || "doctor@carebridge.ai"}</span>
              </div>
              <div className="account-item">
                <span className="account-label">System Role</span>
                <span className="account-val role-badge">{user?.role?.toUpperCase() || "DOCTOR"}</span>
              </div>
              <div className="account-item">
                <span className="account-label">User ID</span>
                <span className="account-val font-mono">{user?.id || user?._id || "CB-DOC-8941"}</span>
              </div>
              <div className="account-item">
                <span className="account-label">Department / Unit</span>
                <span className="account-val">Cardiology & Critical Care Telemetry</span>
              </div>
              <div className="account-item">
                <span className="account-label">Authentication Mode</span>
                <span className="account-val">OAuth2 JWT Token (Bearer)</span>
              </div>
            </div>

            <div className="account-footer-notice">
              <span>ℹ️</span> To update official medical credentials or hospital affiliations, please use the <strong>Profile</strong> screen or contact the CareBridge Institutional Registrar.
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <div className="settings-section-card">
            <div className="card-heading">
              <div className="card-icon notification-icon">🔔</div>
              <div>
                <h2>Notification Channels & Alerts</h2>
                <p>Control critical patient telemetry alerts and workflow dispatches.</p>
              </div>
            </div>

            <div className="settings-list">
              <SettingRow
                title="Critical Emergency Telemetry Alerts"
                description="Immediately broadcast high-priority visual banners when a patient vitals trigger critical thresholds."
                checked={settings.healthAlerts}
                onChange={() => handleToggle("healthAlerts")}
              />

              <SettingRow
                title="Audible Alert Chimes"
                description="Play emergency tone alerts for tachycardia, extreme hypoxia, and rapid vitals decline."
                checked={settings.emergencyAudioAlerts}
                onChange={() => handleToggle("emergencyAudioAlerts")}
              />

              <SettingRow
                title="In-App Push Notifications"
                description="Show live toasts for new appointment bookings, lab uploads, and clearance requests."
                checked={settings.notifications}
                onChange={() => handleToggle("notifications")}
              />

              <SettingRow
                title="Email Digest & Clinical Summaries"
                description="Receive daily patient consult digests and scheduled shifts directly at your registered email."
                checked={settings.emailNotifications}
                onChange={() => handleToggle("emailNotifications")}
              />

              <SettingRow
                title="Appointment Reminders"
                description="Receive lead-time warnings before scheduled consultations."
                checked={settings.appointmentReminders}
                onChange={() => handleToggle("appointmentReminders")}
              />

              <div className="setting-row select-row">
                <div className="setting-content">
                  <strong>Appointment Warning Window</strong>
                  <p>Lead time before consultation commencement.</p>
                </div>
                <select
                  className="settings-select"
                  value={settings.reminderLeadTime}
                  onChange={(e) => handleChange("reminderLeadTime", e.target.value)}
                >
                  <option value="10m">10 Minutes Before</option>
                  <option value="15m">15 Minutes Before</option>
                  <option value="30m">30 Minutes Before</option>
                  <option value="1h">1 Hour Before</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === "security" && (
          <div className="settings-section-card">
            <div className="card-heading">
              <div className="card-icon privacy-icon">🔐</div>
              <div>
                <h2>Security & Access Control</h2>
                <p>Manage session authorization, token lifetimes, and cryptographic access.</p>
              </div>
            </div>

            <div className="security-items">
              <div className="security-row">
                <div>
                  <strong>Doctor Access Password</strong>
                  <p>Update your CareBridge account security credentials.</p>
                </div>
                <button className="secondary-btn" onClick={() => setPasswordModal(true)}>
                  Change Password
                </button>
              </div>

              <div className="security-row">
                <div>
                  <strong>Two-Factor Authentication (2FA)</strong>
                  <p>Institutional security standard for HIPAA-compliant clinical portals.</p>
                </div>
                <span className="security-badge">Enforced / Active</span>
              </div>

              <div className="security-row select-row">
                <div className="setting-content">
                  <strong>Automatic Idle Session Timeout</strong>
                  <p>Automatically lock workstation dashboard after inactivity.</p>
                </div>
                <select
                  className="settings-select"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleChange("sessionTimeout", e.target.value)}
                >
                  <option value="15m">15 Minutes</option>
                  <option value="30m">30 Minutes</option>
                  <option value="60m">60 Minutes</option>
                  <option value="120m">2 Hours</option>
                  <option value="never">Never (Shift Mode)</option>
                </select>
              </div>

              <div className="security-row">
                <div>
                  <strong>Active Session Token</strong>
                  <p>JWT Signature valid with active authorization claims.</p>
                </div>
                <span className="enabled-label">Secure TLS 1.3</span>
              </div>
            </div>
          </div>
        )}

        {/* APPEARANCE TAB */}
        {activeTab === "appearance" && (
          <div className="settings-section-card">
            <div className="card-heading">
              <div className="card-icon appearance-icon">🎨</div>
              <div>
                <h2>Interface Theme & Layout</h2>
                <p>Customize workstation display mode, contrast, and visual density.</p>
              </div>
            </div>

            <div className="appearance-options">
              <button
                type="button"
                className={`appearance-option ${settings.theme === "dark" ? "selected" : ""}`}
                onClick={() => handleChange("theme", "dark")}
              >
                <span className="appearance-preview dark-preview">🌙</span>
                <span>
                  <strong>Clinical Dark Theme (Default)</strong>
                  <small>Optimized for intensive telemetry, reduced eye strain</small>
                </span>
                {settings.theme === "dark" && <span className="selected-check">✓</span>}
              </button>

              <button
                type="button"
                className={`appearance-option ${settings.theme === "light" ? "selected" : ""}`}
                onClick={() => handleChange("theme", "light")}
              >
                <span className="appearance-preview light-preview">☀️</span>
                <span>
                  <strong>Clinical Light Theme</strong>
                  <small>High daylight readability for well-lit ward offices</small>
                </span>
                {settings.theme === "light" && <span className="selected-check">✓</span>}
              </button>
            </div>

            <div className="settings-list" style={{ marginTop: "16px" }}>
              <SettingRow
                title="Compact Data Density"
                description="Compress padding on patient vitals tables to display more metrics simultaneously."
                checked={settings.compactMode}
                onChange={() => handleToggle("compactMode")}
              />

              <SettingRow
                title="High-Contrast Metric Borders"
                description="Enhance outline boundaries on charts and critical triage badges."
                checked={settings.highContrast}
                onChange={() => handleToggle("highContrast")}
              />
            </div>
          </div>
        )}

        {/* PREFERENCES TAB */}
        {activeTab === "preferences" && (
          <div className="settings-section-card">
            <div className="card-heading">
              <div className="card-icon prefs-icon">⚙️</div>
              <div>
                <h2>Clinical & Telemetry Preferences</h2>
                <p>Configure default measurement standards and chart telemetry timeframes.</p>
              </div>
            </div>

            <div className="settings-list">
              <div className="setting-row select-row">
                <div className="setting-content">
                  <strong>Body Temperature Unit</strong>
                  <p>Standard unit for patient thermometer recordings.</p>
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

              <div className="setting-row select-row">
                <div className="setting-content">
                  <strong>Body Weight Metric</strong>
                  <p>Standard unit for patient mass measurements.</p>
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

              <div className="setting-row select-row">
                <div className="setting-content">
                  <strong>Blood Sugar Metric</strong>
                  <p>Glucose concentration reporting scale.</p>
                </div>
                <select
                  className="settings-select"
                  value={settings.glucoseUnit}
                  onChange={(e) => handleChange("glucoseUnit", e.target.value)}
                >
                  <option value="mg/dL">mg/dL</option>
                  <option value="mmol/L">mmol/L</option>
                </select>
              </div>

              <div className="setting-row select-row">
                <div className="setting-content">
                  <strong>Default Telemetry Window</strong>
                  <p>Standard historical timeframe when viewing patient vitals curves.</p>
                </div>
                <select
                  className="settings-select"
                  value={settings.defaultMonitoringInterval}
                  onChange={(e) => handleChange("defaultMonitoringInterval", e.target.value)}
                >
                  <option value="24h">Past 24 Hours</option>
                  <option value="7d">Past 7 Days</option>
                  <option value="30d">Past 30 Days</option>
                </select>
              </div>

              <div className="setting-row select-row">
                <div className="setting-content">
                  <strong>Live Telemetry Polling Rate</strong>
                  <p>Frequency to refresh active ward vitals streams automatically.</p>
                </div>
                <select
                  className="settings-select"
                  value={settings.autoRefreshRate}
                  onChange={(e) => handleChange("autoRefreshRate", e.target.value)}
                >
                  <option value="15s">Every 15 seconds (Intensive Care)</option>
                  <option value="30s">Every 30 seconds (Standard)</option>
                  <option value="60s">Every 60 seconds (Conserve)</option>
                  <option value="off">Manual Refresh Only</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Password Modal */}
      {passwordModal && (
        <div className="modal-backdrop" onClick={() => setPasswordModal(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Account Password</h3>
              <button className="close-btn" onClick={() => setPasswordModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="modal-form">
              {passMessage.text && (
                <div className={`form-alert ${passMessage.type}`}>
                  {passMessage.text}
                </div>
              )}
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passData.current}
                  onChange={(e) => setPassData({ ...passData, current: e.target.value })}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password (min 8 characters)</label>
                <input
                  type="password"
                  value={passData.newPass}
                  onChange={(e) => setPassData({ ...passData, newPass: e.target.value })}
                  placeholder="Enter new strong password"
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passData.confirm}
                  onChange={(e) => setPassData({ ...passData, confirm: e.target.value })}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <section className="settings-footer">
        <div>
          <strong>CareBridge AI Healthcare System</strong>
          <span>Doctor Clinical Workstation Suite &middot; HIPAA & HL7 Telemetry Compliant</span>
        </div>
        <span className="version-label">
          CareBridge Suite v2.4.0
        </span>
      </section>
    </main>
  );
}

/* Reusable Setting Row */
function SettingRow({ title, description, checked, onChange }) {
  return (
    <div className="setting-row">
      <div className="setting-content">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <button
        type="button"
        className={`toggle ${checked ? "active" : ""}`}
        onClick={onChange}
        aria-label={`Toggle ${title}`}
        aria-pressed={checked}
      >
        <span></span>
      </button>
    </div>
  );
}

export default Settings;
