import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  HeartPulse,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Users,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Search,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Bell,
  ShieldAlert,
  Loader2,
  Stethoscope,
  Phone,
  Droplets,
  Thermometer,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import doctorService from "../../services/doctorService";
import "./DoctorDashboard.css";

function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState("");

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Data states
  const [patients, setPatients] = useState([]);
  const [patientVitalsMap, setPatientVitalsMap] = useState({});
  const [patientAlertsMap, setPatientAlertsMap] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState(new Set());

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch core datasets concurrently
      const [patientsData, appointmentsData, approvalsData] = await Promise.all([
        doctorService.getPatients(),
        doctorService.getAppointments(),
        doctorService.getApprovals(),
      ]);

      const patientList = Array.isArray(patientsData) ? patientsData : [];
      setPatients(patientList);
      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      setApprovals(Array.isArray(approvalsData) ? approvalsData : []);

      // Fetch latest vitals and alert summaries for patients
      const vitalsMap = {};
      const alertsMap = {};

      if (patientList.length > 0) {
        await Promise.all(
          patientList.slice(0, 15).map(async (pat) => {
            const pid = pat._id || pat.id;
            try {
              const [vitals, alertSummary] = await Promise.all([
                doctorService.getLatestVitals(pid),
                doctorService.getHealthAlertSummary(pid),
              ]);
              if (vitals) vitalsMap[pid] = vitals;
              if (alertSummary) alertsMap[pid] = alertSummary;
            } catch (e) {
              // Ignore single patient fetch error
            }
          })
        );
      }

      setPatientVitalsMap(vitalsMap);
      setPatientAlertsMap(alertsMap);
      setLastRefreshed(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard telemetry. Please check your backend connection.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  const handleAcknowledgeAlert = (alertKey) => {
    setAcknowledgedAlertIds((prev) => new Set([...prev, alertKey]));
  };

  // Helper to determine clinical status of patient
  const getPatientClinicalStatus = (patientId) => {
    const summary = patientAlertsMap[patientId];
    const vitals = patientVitalsMap[patientId];

    if (summary && summary.status === "ALERT") {
      return { status: "critical", label: "Critical", reason: summary.message || "Acute parameters flagged" };
    }
    if (vitals) {
      if (
        (vitals.heart_rate && (vitals.heart_rate > 105 || vitals.heart_rate < 55)) ||
        (vitals.systolic_bp && vitals.systolic_bp >= 140) ||
        (vitals.spo2 && vitals.spo2 < 95) ||
        (vitals.blood_sugar && (vitals.blood_sugar > 140 || vitals.blood_sugar < 70))
      ) {
        return { status: "attention", label: "Attention", reason: "Elevated vital indicators" };
      }
      return { status: "stable", label: "Stable", reason: "Within physiological baseline" };
    }
    return { status: "stable", label: "Stable", reason: "Baseline normal" };
  };

  // Calculate telemetry counts
  const totalPatientsCount = patients.length;
  const criticalPatients = patients.filter(
    (p) => getPatientClinicalStatus(p._id || p.id).status === "critical"
  );
  const attentionPatients = patients.filter(
    (p) => getPatientClinicalStatus(p._id || p.id).status === "attention"
  );
  const stablePatients = patients.filter(
    (p) => getPatientClinicalStatus(p._id || p.id).status === "stable"
  );

  const pendingApprovalsCount = approvals.filter(
    (app) => (app.status || "").toUpperCase() === "PENDING"
  ).length;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments.filter((apt) => {
    if (!apt.appointment_date) return false;
    return apt.appointment_date.startsWith(todayStr);
  });

  // Filtered patients for main list
  const filteredPatients = patients.filter((pat) => {
    const pid = pat._id || pat.id;
    const { status } = getPatientClinicalStatus(pid);

    const matchesFilter =
      activeFilter === "all"
        ? true
        : activeFilter === "critical"
        ? status === "critical"
        : activeFilter === "attention"
        ? status === "attention"
        : status === "stable";

    const matchesSearch =
      (pat.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pat.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pat.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pid || "").toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="doctor-monitoring-dashboard">
      {/* ============================================================
          1. TELEMETRY HEADER
      ============================================================ */}
      <section className="monitoring-header">
        <div className="header-left">
          <div className="doctor-badge-row">
            <span className="portal-kicker">
              <Activity size={14} className="pulse-icon" />
              CLINICAL COMMAND CENTER
            </span>
            <span className="live-status-pill">
              <span className="live-dot" /> LIVE TELEMETRY
            </span>
          </div>

          <h1>Welcome back, {user?.name || "Dr. Arjun Mehta"} 🩺</h1>
          <p>
            Real-time telemetry streams, active vital sign surveillance, and patient queue triage.
          </p>
        </div>

        <div className="header-actions">
          {lastRefreshed && (
            <div className="sync-indicator">
              <Clock3 size={15} />
              <span>Synced at {lastRefreshed}</span>
            </div>
          )}

          <button
            className={`refresh-btn ${isRefreshing ? "spinning" : ""}`}
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh Live Telemetry"
          >
            <RefreshCw size={17} />
            <span>{isRefreshing ? "Syncing..." : "Sync Telemetry"}</span>
          </button>

          <button
            className="record-vitals-btn"
            onClick={() => navigate("/doctor/vitals")}
          >
            <HeartPulse size={17} />
            <span>Record Vitals</span>
          </button>
        </div>
      </section>

      {/* ERROR BANNER IF ANY */}
      {error && (
        <div className="dashboard-error-banner">
          <AlertCircle size={20} />
          <div>
            <strong>Telemetry Feed Notice:</strong>
            <p>{error}</p>
          </div>
          <button className="error-retry-btn" onClick={fetchDashboardData}>
            Retry
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && !error && (
        <div className="dashboard-loading-state">
          <Loader2 size={36} className="spinning" />
          <h3>Connecting to Clinical Telemetry Stream...</h3>
          <p>Aggregating vitals, active patient queue, and critical thresholds.</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ============================================================
              2. KPI MONITORING STATS GRID
          ============================================================ */}
          <section className="telemetry-stats-grid">
            {/* Total Patients */}
            <div
              className={`telemetry-card total-card ${activeFilter === "all" ? "active-card" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              <div className="card-top">
                <div className="stat-icon-wrapper blue">
                  <Users size={22} />
                </div>
                <span className="stat-badge live">Live Registry</span>
              </div>
              <div className="stat-value-block">
                <h3>{totalPatientsCount}</h3>
                <p>Monitored Patients</p>
              </div>
              <div className="stat-footer">
                <span>Active Inpatients & OPD</span>
                <ArrowUpRight size={16} />
              </div>
            </div>

            {/* Critical Alerts */}
            <div
              className={`telemetry-card critical-card ${criticalPatients.length > 0 ? "has-alert" : ""} ${
                activeFilter === "critical" ? "active-card" : ""
              }`}
              onClick={() => setActiveFilter("critical")}
            >
              <div className="card-top">
                <div className="stat-icon-wrapper red">
                  <ShieldAlert size={22} />
                </div>
                <span className="stat-badge critical">Immediate Action</span>
              </div>
              <div className="stat-value-block">
                <h3 className="critical-number">{criticalPatients.length}</h3>
                <p>Critical Vital Alerts</p>
              </div>
              <div className="stat-footer">
                <span className="urgent-text">SpO₂ &lt; 94% / High BP</span>
                <ArrowUpRight size={16} />
              </div>
            </div>

            {/* Needs Attention */}
            <div
              className={`telemetry-card warning-card ${activeFilter === "attention" ? "active-card" : ""}`}
              onClick={() => setActiveFilter("attention")}
            >
              <div className="card-top">
                <div className="stat-icon-wrapper amber">
                  <AlertTriangle size={22} />
                </div>
                <span className="stat-badge warning">Clinical Watch</span>
              </div>
              <div className="stat-value-block">
                <h3>{attentionPatients.length}</h3>
                <p>Needs Clinical Review</p>
              </div>
              <div className="stat-footer">
                <span>Borderline Vitals Logged</span>
                <ArrowUpRight size={16} />
              </div>
            </div>

            {/* Stable Patients */}
            <div
              className={`telemetry-card stable-card ${activeFilter === "stable" ? "active-card" : ""}`}
              onClick={() => setActiveFilter("stable")}
            >
              <div className="card-top">
                <div className="stat-icon-wrapper emerald">
                  <CheckCircle2 size={22} />
                </div>
                <span className="stat-badge stable">Stable</span>
              </div>
              <div className="stat-value-block">
                <h3>{stablePatients.length}</h3>
                <p>Physiological Baseline</p>
              </div>
              <div className="stat-footer">
                <span>Within safe thresholds</span>
                <ArrowUpRight size={16} />
              </div>
            </div>
          </section>

          {/* ============================================================
              3. CRITICAL / EMERGENCY ALERTS STREAM (IF ANY)
          ============================================================ */}
          {criticalPatients.length > 0 && (
            <section className="critical-alerts-banner">
              <div className="banner-header">
                <div className="banner-title">
                  <AlertCircle size={20} className="flash-alert" />
                  <strong>Active High-Priority Physiological Alerts</strong>
                  <span className="unread-count-pill">
                    {criticalPatients.filter((p) => !acknowledgedAlertIds.has(p._id || p.id)).length} Actionable
                  </span>
                </div>
                <Link to="/doctor/notifications" className="banner-link">
                  All Notifications <ChevronRight size={16} />
                </Link>
              </div>

              <div className="alerts-stream">
                {criticalPatients.map((pat) => {
                  const pid = pat._id || pat.id;
                  const isAck = acknowledgedAlertIds.has(pid);
                  const vit = patientVitalsMap[pid];
                  const alertSummary = patientAlertsMap[pid];

                  if (isAck) return null;

                  return (
                    <div key={pid} className="alert-stream-item critical">
                      <div className="alert-meta">
                        <span className="severity-tag critical">CRITICAL TELEMETRY</span>
                        <strong className="patient-name">{pat.name || "Patient"}</strong>
                        <span className="room-tag">ID: {pid.slice(-6)}</span>
                        {pat.phone && <span className="time-tag"><Phone size={11} /> {pat.phone}</span>}
                      </div>

                      <div className="alert-body">
                        <strong>Alert Reason: </strong>
                        <span>
                          {alertSummary?.message ||
                            `SpO₂ ${vit?.spo2 || 92}%, HR ${vit?.heart_rate || 112} bpm, BP ${vit?.systolic_bp || 150}/${vit?.diastolic_bp || 96} mmHg`}
                        </span>
                      </div>

                      <div className="alert-actions">
                        <button
                          className="ack-btn"
                          onClick={() => handleAcknowledgeAlert(pid)}
                        >
                          <CheckCircle2 size={15} /> Acknowledge
                        </button>
                        <button
                          className="triage-btn"
                          onClick={() => navigate(`/doctor/ai-assistant?patientId=${pid}`)}
                        >
                          <Sparkles size={15} /> AI Triage Note
                        </button>
                        <button
                          className="view-patient-btn"
                          onClick={() => navigate(`/doctor/patient-monitoring?search=${pid}`)}
                        >
                          <Activity size={15} /> Open Monitor
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ============================================================
              4. MAIN SPLIT LAYOUT: PATIENTS STREAM & CLINICAL QUEUE
          ============================================================ */}
          <div className="monitoring-main-layout">
            {/* LEFT COLUMN: PATIENT STREAM */}
            <div className="left-monitoring-column">
              <div className="clinical-panel">
                <div className="panel-top-bar">
                  <div>
                    <h2>Continuous Patient Vitals Stream</h2>
                    <p>Physiological sensor parameters & acute thresholds</p>
                  </div>

                  {/* FILTER TABS */}
                  <div className="filter-tab-group">
                    <button
                      className={`filter-tab ${activeFilter === "all" ? "active" : ""}`}
                      onClick={() => setActiveFilter("all")}
                    >
                      All ({totalPatientsCount})
                    </button>
                    <button
                      className={`filter-tab critical ${activeFilter === "critical" ? "active" : ""}`}
                      onClick={() => setActiveFilter("critical")}
                    >
                      Critical ({criticalPatients.length})
                    </button>
                    <button
                      className={`filter-tab attention ${activeFilter === "attention" ? "active" : ""}`}
                      onClick={() => setActiveFilter("attention")}
                    >
                      Attention ({attentionPatients.length})
                    </button>
                    <button
                      className={`filter-tab stable ${activeFilter === "stable" ? "active" : ""}`}
                      onClick={() => setActiveFilter("stable")}
                    >
                      Stable ({stablePatients.length})
                    </button>
                  </div>
                </div>

                {/* SEARCH & STREAM COUNTER */}
                <div className="monitoring-search-row">
                  <div className="search-input-box">
                    <Search size={18} />
                    <input
                      type="text"
                      placeholder="Search by patient name, ID, phone, email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button className="clear-search-btn" onClick={() => setSearchTerm("")}>
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="stream-counter">
                    Showing <strong>{filteredPatients.length}</strong> of {totalPatientsCount} registered patients
                  </div>
                </div>

                {/* PATIENTS LIST */}
                <div className="patient-telemetry-list">
                  {filteredPatients.length === 0 ? (
                    <div className="no-telemetry-state">
                      <Users size={40} />
                      <h3>No patients match your current filter</h3>
                      <p>Try switching filter tabs or clearing your search term.</p>
                      {searchTerm && (
                        <button className="reset-filter-btn" onClick={() => setSearchTerm("")}>
                          Clear Search
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredPatients.map((pat) => {
                      const pid = pat._id || pat.id;
                      const { status, label, reason } = getPatientClinicalStatus(pid);
                      const vit = patientVitalsMap[pid];

                      return (
                        <article key={pid} className={`telemetry-patient-card ${status}`}>
                          {/* Card Header */}
                          <div className="patient-card-header">
                            <div className="patient-avatar-box">
                              <span className="avatar-initials">
                                {pat.name
                                  ? pat.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)
                                  : "PT"}
                              </span>
                            </div>

                            <div className="patient-identification">
                              <div className="name-and-id">
                                <h3>{pat.name || "Unnamed Patient"}</h3>
                                <span className="patient-id-badge">ID: {pid.slice(-6)}</span>
                                {pat.gender && <span className="patient-room-badge">{pat.gender}</span>}
                                {pat.age && <span className="patient-room-badge">Age {pat.age}</span>}
                              </div>
                              <div className="patient-condition-text">
                                {pat.email && <span>{pat.email}</span>}
                                {pat.phone && (
                                  <>
                                    <span className="dot-divider">•</span>
                                    <span>{pat.phone}</span>
                                  </>
                                )}
                                <span className="dot-divider">•</span>
                                <span className="condition-highlight">{reason}</span>
                              </div>
                            </div>

                            <div className="patient-status-indicator">
                              <span className={`status-pill ${status}`}>
                                {status === "critical" && <AlertCircle size={14} />}
                                {status === "attention" && <AlertTriangle size={14} />}
                                {status === "stable" && <CheckCircle2 size={14} />}
                                {label.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* Vitals Matrix */}
                          <div className="vitals-matrix-grid">
                            {/* Heart Rate */}
                            <div
                              className={`vital-metric-cell ${
                                vit?.heart_rate && (vit.heart_rate > 100 || vit.heart_rate < 60)
                                  ? "critical"
                                  : "normal"
                              }`}
                            >
                              <div className="metric-header">
                                <Activity size={15} className="metric-icon" />
                                <span>Heart Rate</span>
                              </div>
                              <div className="metric-reading">
                                <span className="reading-val">{vit?.heart_rate || "--"}</span>
                                <span className="reading-unit">bpm</span>
                              </div>
                              <span className="metric-range">Normal: 60-100</span>
                            </div>

                            {/* Blood Pressure */}
                            <div
                              className={`vital-metric-cell ${
                                vit?.systolic_bp && (vit.systolic_bp >= 140 || vit.systolic_bp < 90)
                                  ? "warning"
                                  : "normal"
                              }`}
                            >
                              <div className="metric-header">
                                <HeartPulse size={15} className="metric-icon" />
                                <span>Blood Pressure</span>
                              </div>
                              <div className="metric-reading">
                                <span className="reading-val">
                                  {vit?.systolic_bp && vit?.diastolic_bp
                                    ? `${vit.systolic_bp}/${vit.diastolic_bp}`
                                    : "--/--"}
                                </span>
                                <span className="reading-unit">mmHg</span>
                              </div>
                              <span className="metric-range">Target: &lt;120/80</span>
                            </div>

                            {/* SpO2 */}
                            <div
                              className={`vital-metric-cell ${
                                vit?.spo2 && vit.spo2 < 95 ? "critical" : "normal"
                              }`}
                            >
                              <div className="metric-header">
                                <Droplets size={15} className="metric-icon" />
                                <span>SpO₂ Saturation</span>
                              </div>
                              <div className="metric-reading">
                                <span className="reading-val">
                                  {vit?.spo2 ? `${vit.spo2}%` : "--%"}
                                </span>
                              </div>
                              <span className="metric-range">Target: &gt;95%</span>
                            </div>

                            {/* Temperature */}
                            <div
                              className={`vital-metric-cell ${
                                vit?.temperature && (vit.temperature >= 38.0 || vit.temperature > 100.4)
                                  ? "warning"
                                  : "normal"
                              }`}
                            >
                              <div className="metric-header">
                                <Thermometer size={15} className="metric-icon" />
                                <span>Temperature</span>
                              </div>
                              <div className="metric-reading">
                                <span className="reading-val">
                                  {vit?.temperature ? `${vit.temperature}°` : "--°"}
                                </span>
                              </div>
                              <span className="metric-range">Target: 36.5 - 37.5°C</span>
                            </div>

                            {/* Blood Sugar */}
                            <div
                              className={`vital-metric-cell ${
                                vit?.blood_sugar && (vit.blood_sugar > 140 || vit.blood_sugar < 70)
                                  ? "warning"
                                  : "normal"
                              }`}
                            >
                              <div className="metric-header">
                                <TrendingUp size={15} className="metric-icon" />
                                <span>Blood Sugar</span>
                              </div>
                              <div className="metric-reading">
                                <span className="reading-val">{vit?.blood_sugar || "--"}</span>
                                <span className="reading-unit">mg/dL</span>
                              </div>
                              <span className="metric-range">Target: 70-120</span>
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div className="patient-card-footer">
                            <button
                              className="patient-action-btn primary"
                              onClick={() => navigate(`/doctor/records?patientId=${pid}`)}
                            >
                              <FileText size={15} />
                              <span>Medical Chart</span>
                            </button>

                            <button
                              className="patient-action-btn secondary"
                              onClick={() => navigate(`/doctor/health-monitoring?patientId=${pid}`)}
                            >
                              <Activity size={15} />
                              <span>Telemetry Trends</span>
                            </button>

                            <button
                              className="patient-action-btn record"
                              onClick={() => navigate(`/doctor/vitals?patientId=${pid}`)}
                            >
                              <HeartPulse size={15} />
                              <span>Log Vitals</span>
                            </button>

                            <button
                              className="patient-action-btn ai"
                              onClick={() => navigate(`/doctor/ai-assistant?patientId=${pid}`)}
                            >
                              <Sparkles size={15} />
                              <span>AI Triage</span>
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: QUEUE & WORKFLOW TOOLS */}
            <div className="right-monitoring-column">
              {/* TODAY'S CONSULTATIONS QUEUE */}
              <div className="clinical-panel side-panel">
                <div className="panel-header-compact">
                  <div>
                    <span className="panel-kicker">TODAY'S SCHEDULE</span>
                    <h3>Consultation Queue</h3>
                  </div>
                  <button
                    className="view-link-btn"
                    onClick={() => navigate("/doctor/appointments")}
                  >
                    View all ({appointments.length}) <ArrowUpRight size={15} />
                  </button>
                </div>

                <div className="queue-list">
                  {todayAppointments.length === 0 && appointments.length === 0 ? (
                    <div className="empty-queue-box">
                      <CalendarDays size={28} />
                      <p>No appointments booked yet.</p>
                      <button
                        className="quick-action-link"
                        onClick={() => navigate("/doctor/appointments")}
                      >
                        Open Appointments Schedule
                      </button>
                    </div>
                  ) : (
                    (todayAppointments.length > 0 ? todayAppointments : appointments)
                      .slice(0, 5)
                      .map((apt, index) => {
                        const statusLower = (apt.status || "PENDING").toLowerCase();
                        return (
                          <div key={apt._id || apt.id || index} className="queue-item">
                            <div className="queue-token">#{index + 1}</div>
                            <div className="queue-info">
                              <strong>{apt.reason || "General Consultation"}</strong>
                              <div className="queue-meta">
                                <span>{apt.appointment_time || "Scheduled Slot"}</span>
                                <span>•</span>
                                <span>{apt.appointment_date || "Today"}</span>
                              </div>
                            </div>
                            <span className={`queue-badge ${statusLower}`}>
                              {apt.status || "PENDING"}
                            </span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* PENDING APPROVALS WIDGET */}
              <div className="clinical-panel side-panel">
                <div className="panel-header-compact">
                  <div>
                    <span className="panel-kicker">WORKFLOW REQUESTS</span>
                    <h3>Pending Approvals</h3>
                  </div>
                  <span className="badge-counter-amber">
                    {pendingApprovalsCount} Pending
                  </span>
                </div>

                <div className="quick-approval-box">
                  <p>
                    {pendingApprovalsCount > 0
                      ? `You have ${pendingApprovalsCount} consultation request(s) awaiting clinical confirmation.`
                      : "All incoming patient consultation requests have been processed."}
                  </p>
                  <button
                    className="review-approvals-btn"
                    onClick={() => navigate("/doctor/approvals")}
                  >
                    <ClipboardCheck size={16} />
                    <span>Review Approvals</span>
                  </button>
                </div>
              </div>

              {/* CLINICAL QUICK LAUNCH HUB */}
              <div className="clinical-panel side-panel">
                <div className="panel-header-compact">
                  <div>
                    <span className="panel-kicker">NAVIGATION HUB</span>
                    <h3>Doctor Quick Launch</h3>
                  </div>
                </div>

                <div className="quick-launch-grid">
                  <Link to="/doctor/patient-monitoring" className="launch-tool-card">
                    <div className="tool-icon blue">
                      <Users size={19} />
                    </div>
                    <div className="tool-text">
                      <strong>Patient Monitoring</strong>
                      <span>Search & full patient registry</span>
                    </div>
                    <ChevronRight size={17} className="tool-arrow" />
                  </Link>

                  <Link to="/doctor/health-monitoring" className="launch-tool-card">
                    <div className="tool-icon teal">
                      <Activity size={19} />
                    </div>
                    <div className="tool-text">
                      <strong>Health Monitoring</strong>
                      <span>Continuous telemetry charts</span>
                    </div>
                    <ChevronRight size={17} className="tool-arrow" />
                  </Link>

                  <Link to="/doctor/vitals" className="launch-tool-card">
                    <div className="tool-icon emerald">
                      <HeartPulse size={19} />
                    </div>
                    <div className="tool-text">
                      <strong>Vitals Hub</strong>
                      <span>Physiological cards & logging</span>
                    </div>
                    <ChevronRight size={17} className="tool-arrow" />
                  </Link>

                  <Link to="/doctor/records" className="launch-tool-card">
                    <div className="tool-icon purple">
                      <FileText size={19} />
                    </div>
                    <div className="tool-text">
                      <strong>Health Records</strong>
                      <span>Diagnoses & prescriptions</span>
                    </div>
                    <ChevronRight size={17} className="tool-arrow" />
                  </Link>

                  <Link to="/doctor/ai-assistant" className="launch-tool-card">
                    <div className="tool-icon cyan">
                      <Sparkles size={19} />
                    </div>
                    <div className="tool-text">
                      <strong>AI Clinical Assistant</strong>
                      <span>Triage, SOAP & DDx notes</span>
                    </div>
                    <ChevronRight size={17} className="tool-arrow" />
                  </Link>

                  <Link to="/doctor/notifications" className="launch-tool-card">
                    <div className="tool-icon orange">
                      <Bell size={19} />
                    </div>
                    <div className="tool-text">
                      <strong>Clinical Notifications</strong>
                      <span>Emergency & system updates</span>
                    </div>
                    <ChevronRight size={17} className="tool-arrow" />
                  </Link>
                </div>
              </div>

              {/* CLINICAL SESSION SUMMARY */}
              <div className="clinical-panel side-panel summary-box">
                <div className="panel-header-compact">
                  <div>
                    <span className="panel-kicker">METRICS</span>
                    <h3>Active Session Status</h3>
                  </div>
                  <Stethoscope size={18} className="text-teal" />
                </div>

                <div className="efficiency-stats">
                  <div className="efficiency-row">
                    <span>Active Telemetry Streams</span>
                    <strong>{totalPatientsCount} Patients</strong>
                  </div>
                  <div className="efficiency-row">
                    <span>Critical Alert Thresholds</span>
                    <strong className={criticalPatients.length > 0 ? "text-red" : "text-emerald"}>
                      {criticalPatients.length} Active
                    </strong>
                  </div>
                  <div className="efficiency-row">
                    <span>Pending Approvals</span>
                    <strong>{pendingApprovalsCount} Items</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DoctorDashboard;