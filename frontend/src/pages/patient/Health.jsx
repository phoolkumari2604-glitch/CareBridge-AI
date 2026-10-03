import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  Wind,
  FileText,
  AlertTriangle,
  TrendingUp,
  CalendarDays,
  ChevronRight,
  ShieldCheck,
  User,
  AlertCircle,
  Plus,
  Clock,
  Stethoscope,
  Info
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import "./Health.css";

function Health() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [vitals, setVitals] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const [healthRecords, setHealthRecords] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertSummary, setAlertSummary] = useState(null);

  useEffect(() => {
    fetchHealthData();
  }, [user]);

  const fetchHealthData = async () => {
    if (!user?.patient_id) {
      setLoading(false);
      return;
    }

    const patientId = user.patient_id;

    try {
      setLoading(true);
      setError(null);

      const [
        vitalsRes,
        profileRes,
        recordsRes,
        alertsRes,
        summaryRes,
      ] = await Promise.allSettled([
        api.get(`/vitals/${patientId}/latest`),
        api.get(`/health-profiles/${patientId}`),
        api.get(`/health-records/${patientId}`),
        api.get(`/health-alerts/${patientId}`),
        api.get(`/health-alerts/${patientId}/summary`),
      ]);

      if (vitalsRes.status === "fulfilled") {
        setVitals(vitalsRes.value.data);
      }
      if (profileRes.status === "fulfilled") {
        setHealthProfile(profileRes.value.data);
      }
      if (recordsRes.status === "fulfilled") {
        setHealthRecords(recordsRes.value.data || []);
      }
      if (alertsRes.status === "fulfilled") {
        setAlerts(alertsRes.value.data || []);
      }
      if (summaryRes.status === "fulfilled") {
        setAlertSummary(summaryRes.value.data);
      }
    } catch (err) {
      console.error("Failed to fetch health data:", err);
      setError("Failed to load health records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isAlert = alertSummary?.status === "ALERT" || (alertSummary?.total_alerts || 0) > 0;

  // Format vitals display list
  const vitalsList = [
    {
      label: "Heart Rate",
      value: vitals?.heart_rate ?? "--",
      unit: "bpm",
      status:
        vitals?.heart_rate != null
          ? vitals.heart_rate < 50 || vitals.heart_rate > 120
            ? "Abnormal"
            : "Normal"
          : "Not recorded",
      icon: Activity,
      className: "heart",
    },
    {
      label: "Blood Pressure",
      value:
        vitals?.systolic_bp && vitals?.diastolic_bp
          ? `${vitals.systolic_bp}/${vitals.diastolic_bp}`
          : "--/--",
      unit: "mmHg",
      status:
        vitals?.systolic_bp >= 140 || vitals?.diastolic_bp >= 90
          ? "High"
          : vitals?.systolic_bp != null
          ? "Normal"
          : "Not recorded",
      icon: HeartPulse,
      className: "bp",
    },
    {
      label: "SpO₂ Level",
      value: vitals?.spo2 ?? "--",
      unit: "%",
      status:
        vitals?.spo2 != null
          ? vitals.spo2 < 94
            ? "Low"
            : "Normal"
          : "Not recorded",
      icon: Wind,
      className: "spo2",
    },
    {
      label: "Temperature",
      value: vitals?.temperature ?? "--",
      unit: "°C",
      status:
        vitals?.temperature != null
          ? vitals.temperature >= 38
            ? "Fever"
            : "Normal"
          : "Not recorded",
      icon: Thermometer,
      className: "temperature",
    },
    {
      label: "Blood Sugar",
      value: vitals?.blood_sugar ?? "--",
      unit: "mg/dL",
      status:
        vitals?.blood_sugar != null
          ? vitals.blood_sugar < 70 || vitals.blood_sugar > 200
            ? "Abnormal"
            : "Normal"
          : "Not recorded",
      icon: Droplets,
      className: "sugar",
    },
  ];

  if (!user?.patient_id) {
    return (
      <div className="health-page">
        <div className="health-no-profile">
          <Info size={40} />
          <h2>Patient Profile Required</h2>
          <p>
            Please complete your patient profile registration to start monitoring your vitals and medical records.
          </p>
          <Link to="/profile" className="health-record-btn">
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="health-page">
      {/* HEADER */}
      <div className="health-header">
        <div>
          <span className="health-kicker">PATIENT HEALTH CENTER</span>
          <h1>My Health Dashboard</h1>
          <p>
            Continuous vital monitoring, medical records, and active health alerts.
          </p>
        </div>

        <Link to="/patient/ai-assistant" className="health-assistant-btn">
          <Activity size={17} />
          Consult AI Assistant
        </Link>
      </div>

      {/* OVERALL HEALTH STATUS CARD */}
      <section className={`health-status-card ${isAlert ? "alert-mode" : ""}`}>
        <div className="health-status-icon">
          {isAlert ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
        </div>

        <div className="health-status-content">
          <span>HEALTH STATUS MONITOR</span>
          <h2>{isAlert ? "Attention Recommended" : "Vitals are Stable"}</h2>
          <p>
            {alertSummary?.message ||
              (isAlert
                ? "Some of your recorded readings are outside standard ranges. Please review alerts below."
                : "All latest vital signs fall within configured normal ranges.")}
          </p>
        </div>

        <div className="health-status-date">
          <CalendarDays size={15} />
          {vitals?.recorded_at
            ? `Updated ${new Date(vitals.recorded_at).toLocaleDateString()}`
            : "No vitals recorded yet"}
        </div>
      </section>

      {/* HEALTH PROFILE SUMMARY */}
      {healthProfile && (
        <section className="health-profile-banner">
          <div className="profile-banner-item">
            <span>Blood Group</span>
            <strong>{healthProfile.blood_type || "Not Set"}</strong>
          </div>

          <div className="profile-banner-item">
            <span>Allergies</span>
            <strong>
              {Array.isArray(healthProfile.allergies) && healthProfile.allergies.length > 0
                ? healthProfile.allergies.join(", ")
                : "None reported"}
            </strong>
          </div>

          <div className="profile-banner-item">
            <span>Chronic Conditions</span>
            <strong>
              {Array.isArray(healthProfile.chronic_conditions) && healthProfile.chronic_conditions.length > 0
                ? healthProfile.chronic_conditions.join(", ")
                : "None reported"}
            </strong>
          </div>

          <div className="profile-banner-item">
            <span>Emergency Contact</span>
            <strong>{healthProfile.emergency_contact || "Not provided"}</strong>
          </div>
        </section>
      )}

      {/* VITALS SECTION */}
      <section className="health-section">
        <div className="health-section-heading">
          <div>
            <span>CONTINUOUS MONITORING</span>
            <h2>Latest Recorded Vitals</h2>
          </div>
          {vitals?.recorded_at && (
            <span className="last-sync-tag">
              <Clock size={13} />
              {new Date(vitals.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div className="vitals-grid">
          {vitalsList.map((vital) => {
            const Icon = vital.icon;
            const isAbnormal = vital.status === "Abnormal" || vital.status === "High" || vital.status === "Fever" || vital.status === "Low";

            return (
              <div
                className={`vital-card ${vital.className} ${isAbnormal ? "vital-alert" : ""}`}
                key={vital.label}
              >
                <div className="vital-top">
                  <div className="vital-icon">
                    <Icon size={18} />
                  </div>
                  <span className={`vital-status ${isAbnormal ? "status-bad" : "status-good"}`}>
                    {vital.status}
                  </span>
                </div>

                <span className="vital-label">{vital.label}</span>

                <div className="vital-value">
                  {vital.value}
                  <small>{vital.unit}</small>
                </div>

                <div className="vital-trend">
                  <TrendingUp size={13} />
                  {isAbnormal ? "Review Needed" : "Within Range"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* LOWER CONTENT: RECORDS & ALERTS */}
      <div className="health-content-grid">
        {/* RECORDS */}
        <section className="records-card">
          <div className="health-section-heading">
            <div>
              <span>MEDICAL HISTORY</span>
              <h2>Health Records</h2>
            </div>
            <span className="count-pill">{healthRecords.length} Records</span>
          </div>

          {healthRecords.length === 0 ? (
            <div className="empty-inner-state">
              <FileText size={32} />
              <p>No health records on file yet.</p>
            </div>
          ) : (
            <div className="records-list">
              {healthRecords.map((record) => (
                <div className="record-item" key={record._id}>
                  <div className="record-icon">
                    <FileText size={18} />
                  </div>

                  <div className="record-main">
                    <h3>{record.diagnosis || record.title || "Clinical Record"}</h3>
                    <p>
                      <Stethoscope size={13} />
                      {record.doctor || "Medical Staff"} • {record.record_type || "Consultation"}
                    </p>
                    {record.treatment && (
                      <span className="record-treatment">
                        <strong>Plan:</strong> {record.treatment}
                      </span>
                    )}
                  </div>

                  <div className="record-date">
                    {record.created_at
                      ? new Date(record.created_at).toLocaleDateString()
                      : "--"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ALERTS */}
        <section className="health-alert-card">
          <div className="alert-heading">
            <div className={`alert-icon ${alerts.length > 0 ? "has-alerts" : ""}`}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <span>SYSTEM ALERTS</span>
              <h2>Active Health Alerts</h2>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="empty-inner-state">
              <ShieldCheck size={32} color="#16a34a" />
              <p>No active health alerts detected.</p>
              <small>Your vital parameters are currently safe.</small>
            </div>
          ) : (
            <div className="alerts-list">
              {alerts.map((alert, idx) => (
                <div className="alert-item" key={idx}>
                  <div className="alert-dot" />
                  <div className="alert-info">
                    <div className="alert-top-row">
                      <strong>{alert.alert_type?.replace(/_/g, " ")}</strong>
                      <span className="severity-tag">{alert.severity}</span>
                    </div>
                    <p>{alert.message}</p>
                    {alert.created_at && (
                      <span className="alert-time">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* HEALTH SUMMARY BAR */}
      <section className="health-summary">
        <div>
          <span>Total Records</span>
          <strong>{healthRecords.length} files</strong>
        </div>

        <div>
          <span>Active Alerts</span>
          <strong>{alertSummary?.total_alerts || alerts.length} detected</strong>
        </div>

        <div>
          <span>Overall Status</span>
          <strong className={isAlert ? "summary-alert" : "summary-normal"}>
            {alertSummary?.status || "Normal"}
          </strong>
        </div>

        <div>
          <span>Monitoring System</span>
          <strong className="summary-normal">Active & Synced</strong>
        </div>
      </section>
    </div>
  );
}

export default Health;