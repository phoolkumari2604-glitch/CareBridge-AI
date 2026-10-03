import { useState } from "react";
import "./Settings.css";

function Settings() {
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    appointmentReminders: true,
    queueUpdates: true,
    healthAlerts: true,
    darkMode: false,
    compactMode: false,
  });

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <main className="settings-page">
      {/* Header */}
      <section className="settings-header">
        <div>
          <span className="settings-eyebrow">ACCOUNT CONTROL</span>
          <h1>Settings</h1>
          <p>
            Manage your CareBridge AI preferences, notifications and
            application experience.
          </p>
        </div>

        <div className="settings-status">
          <span className="status-dot"></span>
          <span>System Connected</span>
        </div>
      </section>

      {/* Settings Grid */}
      <section className="settings-grid">

        {/* Notifications */}
        <div className="settings-card">
          <div className="card-heading">
            <div className="card-icon notification-icon">🔔</div>
            <div>
              <h2>Notifications</h2>
              <p>Control how CareBridge AI keeps you informed.</p>
            </div>
          </div>

          <div className="settings-list">

            <SettingRow
              title="Push Notifications"
              description="Receive important updates inside the application."
              checked={settings.notifications}
              onChange={() => handleToggle("notifications")}
            />

            <SettingRow
              title="Email Notifications"
              description="Receive account and healthcare updates by email."
              checked={settings.emailNotifications}
              onChange={() => handleToggle("emailNotifications")}
            />

            <SettingRow
              title="Appointment Reminders"
              description="Get reminders before scheduled appointments."
              checked={settings.appointmentReminders}
              onChange={() => handleToggle("appointmentReminders")}
            />

            <SettingRow
              title="Queue Updates"
              description="Receive updates when your queue position changes."
              checked={settings.queueUpdates}
              onChange={() => handleToggle("queueUpdates")}
            />

            <SettingRow
              title="Health Alerts"
              description="Receive important health-related notifications."
              checked={settings.healthAlerts}
              onChange={() => handleToggle("healthAlerts")}
            />

          </div>
        </div>

        {/* Appearance */}
        <div className="settings-card">
          <div className="card-heading">
            <div className="card-icon appearance-icon">🎨</div>
            <div>
              <h2>Appearance</h2>
              <p>Customize the way CareBridge AI looks.</p>
            </div>
          </div>

          <div className="appearance-options">

            <button
              className={`appearance-option ${
                !settings.darkMode ? "selected" : ""
              }`}
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  darkMode: false,
                }))
              }
            >
              <span className="appearance-preview light-preview">
                ☀️
              </span>

              <span>
                <strong>Light Mode</strong>
                <small>Clean and bright interface</small>
              </span>

              {!settings.darkMode && (
                <span className="selected-check">✓</span>
              )}
            </button>

            <button
              className={`appearance-option ${
                settings.darkMode ? "selected" : ""
              }`}
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  darkMode: true,
                }))
              }
            >
              <span className="appearance-preview dark-preview">
                🌙
              </span>

              <span>
                <strong>Dark Mode</strong>
                <small>Comfortable low-light interface</small>
              </span>

              {settings.darkMode && (
                <span className="selected-check">✓</span>
              )}
            </button>

          </div>

          <SettingRow
            title="Compact Mode"
            description="Reduce spacing to display more information."
            checked={settings.compactMode}
            onChange={() => handleToggle("compactMode")}
          />
        </div>

        {/* Privacy */}
        <div className="settings-card">
          <div className="card-heading">
            <div className="card-icon privacy-icon">🔐</div>
            <div>
              <h2>Privacy & Security</h2>
              <p>Manage your account protection preferences.</p>
            </div>
          </div>

          <div className="security-items">

            <div className="security-row">
              <div>
                <strong>Password</strong>
                <p>Keep your account password secure.</p>
              </div>

              <button className="secondary-btn">
                Change Password
              </button>
            </div>

            <div className="security-row">
              <div>
                <strong>Active Sessions</strong>
                <p>Review devices currently signed in.</p>
              </div>

              <button className="secondary-btn">
                View Sessions
              </button>
            </div>

            <div className="security-row">
              <div>
                <strong>Login Security</strong>
                <p>Additional security options for your account.</p>
              </div>

              <span className="security-badge">
                Protected
              </span>
            </div>

          </div>
        </div>

        {/* Accessibility */}
        <div className="settings-card">
          <div className="card-heading">
            <div className="card-icon accessibility-icon">♿</div>
            <div>
              <h2>Accessibility</h2>
              <p>Make CareBridge AI easier to use.</p>
            </div>
          </div>

          <div className="accessibility-items">

            <div className="accessibility-option">
              <div>
                <strong>Keyboard Navigation</strong>
                <p>Navigate application controls using your keyboard.</p>
              </div>

              <span className="enabled-label">Enabled</span>
            </div>

            <div className="accessibility-option">
              <div>
                <strong>Focus Indicators</strong>
                <p>Clearly identify the currently focused element.</p>
              </div>

              <span className="enabled-label">Enabled</span>
            </div>

            <div className="accessibility-option">
              <div>
                <strong>Readable Interface</strong>
                <p>Optimized typography and contrast.</p>
              </div>

              <span className="enabled-label">Enabled</span>
            </div>

          </div>
        </div>

      </section>

      {/* Footer */}
      <section className="settings-footer">
        <div>
          <strong>CareBridge AI</strong>
          <span>Healthcare management platform</span>
        </div>

        <span className="version-label">
          Frontend v1.0
        </span>
      </section>
    </main>
  );
}

/* Reusable Setting Row */

function SettingRow({
  title,
  description,
  checked,
  onChange,
}) {
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



