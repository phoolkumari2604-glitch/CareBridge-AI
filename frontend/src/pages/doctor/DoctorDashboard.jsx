import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
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
  Stethoscope,
  Sparkles,
  ChevronRight,
  Filter,
  RefreshCw,
  Bell,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./DoctorDashboard.css";

function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Clinical Monitored Patients Data
  const [patients, setPatients] = useState([
    {
      id: "PT-10761",
      name: "Arjun Kumar",
      age: 52,
      gender: "Male",
      room: "ICU-Bed 04",
      condition: "Hypertension / T2D",
      time: "2 mins ago",
      bp: "154/98",
      bpStatus: "critical",
      heartRate: 98,
      hrStatus: "critical",
      spo2: 93,
      spo2Status: "critical",
      sugar: 165,
      sugarStatus: "warning",
      temperature: "100.4°F",
      tempStatus: "warning",
      overallStatus: "critical",
      alertMessage: "SpO₂ dropped below 94%, Tachycardia noted",
    },
    {
      id: "PT-10921",
      name: "Rahul Verma",
      age: 45,
      gender: "Male",
      room: "Ward B-12",
      condition: "Post-op Monitoring",
      time: "8 mins ago",
      bp: "142/92",
      bpStatus: "warning",
      heartRate: 88,
      hrStatus: "normal",
      spo2: 96,
      spo2Status: "normal",
      sugar: 128,
      sugarStatus: "warning",
      temperature: "99.2°F",
      tempStatus: "normal",
      overallStatus: "attention",
      alertMessage: "Elevated systolic BP post-medication",
    },
    {
      id: "PT-10482",
      name: "Ananya Sharma",
      age: 28,
      gender: "Female",
      room: "OPD Room 3",
      condition: "Seasonal Bronchitis",
      time: "15 mins ago",
      bp: "118/76",
      bpStatus: "normal",
      heartRate: 72,
      hrStatus: "normal",
      spo2: 98,
      spo2Status: "normal",
      sugar: 94,
      sugarStatus: "normal",
      temperature: "98.4°F",
      tempStatus: "normal",
      overallStatus: "stable",
      alertMessage: null,
    },
    {
      id: "PT-10234",
      name: "Priya Reddy",
      age: 34,
      gender: "Female",
      room: "Day Care 02",
      condition: "Migraine / Recovery",
      time: "22 mins ago",
      bp: "120/80",
      bpStatus: "normal",
      heartRate: 76,
      hrStatus: "normal",
      spo2: 99,
      spo2Status: "normal",
      sugar: 88,
      sugarStatus: "normal",
      temperature: "98.2°F",
      tempStatus: "normal",
      overallStatus: "stable",
      alertMessage: null,
    },
    {
      id: "PT-10884",
      name: "Vikram Malhotra",
      age: 61,
      gender: "Male",
      room: "Cardiac Stepdown",
      condition: "Coronary Angioplasty",
      time: "3 mins ago",
      bp: "148/94",
      bpStatus: "warning",
      heartRate: 92,
      hrStatus: "warning",
      spo2: 95,
      spo2Status: "normal",
      sugar: 142,
      sugarStatus: "warning",
      temperature: "98.8°F",
      tempStatus: "normal",
      overallStatus: "attention",
      alertMessage: "Heart rate fluctuation detected",
    },
  ]);

  // Today's appointments / queue
  const appointments = [
    {
      id: 1,
      time: "09:30 AM",
      token: "#01",
      patient: "Arjun Kumar",
      type: "Urgent Review",
      dept: "Cardiology",
      status: "In Consultation",
      statusClass: "in-consultation",
    },
    {
      id: 2,
      time: "10:15 AM",
      token: "#02",
      patient: "Rahul Verma",
      type: "Post-op Follow-up",
      dept: "General Medicine",
      status: "Waiting",
      statusClass: "waiting",
    },
    {
      id: 3,
      time: "11:00 AM",
      token: "#03",
      patient: "Ananya Sharma",
      type: "Routine Checkup",
      dept: "Pulmonology",
      status: "Confirmed",
      statusClass: "confirmed",
    },
    {
      id: 4,
      time: "11:45 AM",
      token: "#04",
      patient: "Priya Reddy",
      type: "Migraine Review",
      dept: "Neurology",
      status: "Confirmed",
      statusClass: "confirmed",
    },
  ];

  // Active Critical Alerts
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      patient: "Arjun Kumar",
      patientId: "PT-10761",
      room: "ICU-Bed 04",
      severity: "CRITICAL",
      title: "Desaturation & High BP Alert",
      description: "SpO₂ dropped to 93% (threshold: 95%). Blood pressure 154/98 mmHg.",
      time: "Just now",
      acknowledged: false,
    },
    {
      id: 2,
      patient: "Vikram Malhotra",
      patientId: "PT-10884",
      room: "Cardiac Stepdown",
      severity: "WARNING",
      title: "Tachycardia Fluctuation",
      description: "Heart rate sustained > 90 bpm over 30 minutes.",
      time: "5 mins ago",
      acknowledged: false,
    },
    {
      id: 3,
      patient: "Rahul Verma",
      patientId: "PT-10921",
      room: "Ward B-12",
      severity: "WARNING",
      title: "Blood Sugar Spike",
      description: "Fasting glucose elevated to 128 mg/dL.",
      time: "12 mins ago",
      acknowledged: true,
    },
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 600);
  };

  const handleAcknowledgeAlert = (id) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  // Filter patients based on tab and search
  const filteredPatients = patients.filter((patient) => {
    const matchesFilter =
      activeFilter === "all"
        ? true
        : activeFilter === "critical"
        ? patient.overallStatus === "critical"
        : activeFilter === "attention"
        ? patient.overallStatus === "attention"
        : patient.overallStatus === "stable";

    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.condition.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const criticalCount = patients.filter((p) => p.overallStatus === "critical").length;
  const attentionCount = patients.filter((p) => p.overallStatus === "attention").length;
  const stableCount = patients.filter((p) => p.overallStatus === "stable").length;

  return (
    <div className="doctor-monitoring-dashboard">
      {/* ================================
          TOP TELEMETRY HEADER
      ================================= */}
      <section className="monitoring-header">
        <div className="header-left">
          <div className="doctor-badge-row">
            <span className="portal-kicker">
              <Activity size={14} className="pulse-icon" />
              CLINICAL MONITORING CENTER
            </span>
            <span className="live-status-pill">
              <span className="live-dot"></span> LIVE TELEMETRY
            </span>
          </div>

          <h1>Welcome back, {user?.name || "Dr. Arjun Mehta"} 🩺</h1>
          <p>
            Real-time telemetry stream, vital thresholds, and acute patient monitoring.
          </p>
        </div>

        <div className="header-actions">
          <div className="sync-indicator">
            <Clock3 size={15} />
            <span>Updated {lastRefreshed}</span>
          </div>

          <button
            className={`refresh-btn ${isRefreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            title="Refresh Live Vitals"
          >
            <RefreshCw size={17} />
            <span>Sync Vitals</span>
          </button>

          <button
            className="record-vitals-btn"
            onClick={() => navigate("/doctor/vitals")}
          >
            <HeartPulse size={17} />
            <span>Open Vitals Hub</span>
          </button>
        </div>
      </section>

      {/* ================================
          KPI MONITORING STATS
      ================================= */}
      <section className="telemetry-stats-grid">
        <div className="telemetry-card total-card" onClick={() => setActiveFilter("all")}>
          <div className="card-top">
            <div className="stat-icon-wrapper blue">
              <Users size={22} />
            </div>
            <span className="stat-badge live">Live Stream</span>
          </div>
          <div className="stat-value-block">
            <h3>{patients.length}</h3>
            <p>Active Monitored Patients</p>
          </div>
          <div className="stat-footer">
            <span>Inpatient & Day Care Units</span>
            <ArrowUpRight size={16} />
          </div>
        </div>

        <div
          className={`telemetry-card critical-card ${criticalCount > 0 ? "has-alert" : ""}`}
          onClick={() => setActiveFilter("critical")}
        >
          <div className="card-top">
            <div className="stat-icon-wrapper red">
              <ShieldAlert size={22} />
            </div>
            <span className="stat-badge critical">Immediate Action</span>
          </div>
          <div className="stat-value-block">
            <h3 className="critical-number">{criticalCount}</h3>
            <p>Critical Vital Alerts</p>
          </div>
          <div className="stat-footer">
            <span className="urgent-text">SpO₂ &lt; 94% / Acute BP</span>
            <ArrowUpRight size={16} />
          </div>
        </div>

        <div className="telemetry-card warning-card" onClick={() => setActiveFilter("attention")}>
          <div className="card-top">
            <div className="stat-icon-wrapper amber">
              <AlertTriangle size={22} />
            </div>
            <span className="stat-badge warning">Watchlist</span>
          </div>
          <div className="stat-value-block">
            <h3>{attentionCount}</h3>
            <p>Needs Clinical Attention</p>
          </div>
          <div className="stat-footer">
            <span>Elevated Vitals / Sugar</span>
            <ArrowUpRight size={16} />
          </div>
        </div>

        <div className="telemetry-card stable-card" onClick={() => setActiveFilter("stable")}>
          <div className="card-top">
            <div className="stat-icon-wrapper emerald">
              <CheckCircle2 size={22} />
            </div>
            <span className="stat-badge stable">Normal</span>
          </div>
          <div className="stat-value-block">
            <h3>{stableCount}</h3>
            <p>Stable Parameters</p>
          </div>
          <div className="stat-footer">
            <span>Within standard thresholds</span>
            <ArrowUpRight size={16} />
          </div>
        </div>
      </section>

      {/* ================================
          ACTIVE CLINICAL ALERTS FEED
      ================================= */}
      {alerts.some((a) => !a.acknowledged) && (
        <section className="critical-alerts-banner">
          <div className="banner-header">
            <div className="banner-title">
              <AlertCircle size={20} className="flash-alert" />
              <strong>High-Priority Patient Alerts</strong>
              <span className="unread-count-pill">
                {alerts.filter((a) => !a.acknowledged).length} Pending Review
              </span>
            </div>
            <Link to="/doctor/notifications" className="banner-link">
              All Notifications <ChevronRight size={16} />
            </Link>
          </div>

          <div className="alerts-stream">
            {alerts
              .filter((a) => !a.acknowledged)
              .map((alert) => (
                <div key={alert.id} className={`alert-stream-item ${alert.severity.toLowerCase()}`}>
                  <div className="alert-meta">
                    <span className={`severity-tag ${alert.severity.toLowerCase()}`}>
                      {alert.severity}
                    </span>
                    <strong className="patient-name">{alert.patient}</strong>
                    <span className="room-tag">{alert.room}</span>
                    <span className="time-tag">{alert.time}</span>
                  </div>
                  <div className="alert-body">
                    <strong>{alert.title}: </strong>
                    <span>{alert.description}</span>
                  </div>
                  <div className="alert-actions">
                    <button
                      className="ack-btn"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                    >
                      <CheckCircle2 size={15} /> Acknowledge
                    </button>
                    <button
                      className="triage-btn"
                      onClick={() => navigate("/doctor/ai-assistant")}
                    >
                      <Sparkles size={15} /> AI Triage Note
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ================================
          MAIN PATIENT TELEMETRY MONITOR
      ================================= */}
      <div className="monitoring-main-layout">
        <div className="left-monitoring-column">
          <div className="clinical-panel">
            <div className="panel-top-bar">
              <div>
                <h2>Real-Time Patient Vitals Stream</h2>
                <p>Continuous physiological parameter feeds and alert flags</p>
              </div>

              {/* FILTER TABS */}
              <div className="filter-tab-group">
                <button
                  className={`filter-tab ${activeFilter === "all" ? "active" : ""}`}
                  onClick={() => setActiveFilter("all")}
                >
                  All ({patients.length})
                </button>
                <button
                  className={`filter-tab critical ${activeFilter === "critical" ? "active" : ""}`}
                  onClick={() => setActiveFilter("critical")}
                >
                  Critical ({criticalCount})
                </button>
                <button
                  className={`filter-tab attention ${activeFilter === "attention" ? "active" : ""}`}
                  onClick={() => setActiveFilter("attention")}
                >
                  Attention ({attentionCount})
                </button>
                <button
                  className={`filter-tab stable ${activeFilter === "stable" ? "active" : ""}`}
                  onClick={() => setActiveFilter("stable")}
                >
                  Stable ({stableCount})
                </button>
              </div>
            </div>

            {/* SEARCH & CONTROLS */}
            <div className="monitoring-search-row">
              <div className="search-input-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Filter by patient name, ID (PT-...), or condition..."
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
                Showing <strong>{filteredPatients.length}</strong> of {patients.length} patients
              </div>
            </div>

            {/* TELEMETRY PATIENT CARDS / TABLE */}
            <div className="patient-telemetry-list">
              {filteredPatients.length === 0 ? (
                <div className="no-telemetry-state">
                  <Activity size={36} />
                  <h3>No patients match your filter</h3>
                  <p>Try selecting "All" or clearing your search term.</p>
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <article key={patient.id} className={`telemetry-patient-card ${patient.overallStatus}`}>
                    {/* Patient Header */}
                    <div className="patient-card-header">
                      <div className="patient-avatar-box">
                        <span className="avatar-initials">
                          {patient.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>

                      <div className="patient-identification">
                        <div className="name-and-id">
                          <h3>{patient.name}</h3>
                          <span className="patient-id-badge">{patient.id}</span>
                          <span className="patient-room-badge">{patient.room}</span>
                        </div>
                        <div className="patient-condition-text">
                          <span>{patient.gender}, Age {patient.age}</span>
                          <span className="dot-divider">•</span>
                          <span className="condition-highlight">{patient.condition}</span>
                          <span className="dot-divider">•</span>
                          <span className="time-highlight"><Clock3 size={13} /> {patient.time}</span>
                        </div>
                      </div>

                      <div className="patient-status-indicator">
                        <span className={`status-pill ${patient.overallStatus}`}>
                          {patient.overallStatus === "critical" && <AlertCircle size={14} />}
                          {patient.overallStatus === "attention" && <AlertTriangle size={14} />}
                          {patient.overallStatus === "stable" && <CheckCircle2 size={14} />}
                          {patient.overallStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Alert Message Banner if any */}
                    {patient.alertMessage && (
                      <div className={`patient-alert-ribbon ${patient.overallStatus}`}>
                        <AlertCircle size={15} />
                        <span>{patient.alertMessage}</span>
                      </div>
                    )}

                    {/* Vitals Matrix Grid */}
                    <div className="vitals-matrix-grid">
                      {/* Heart Rate */}
                      <div className={`vital-metric-cell ${patient.hrStatus}`}>
                        <div className="metric-header">
                          <Activity size={15} className="metric-icon" />
                          <span>Heart Rate</span>
                        </div>
                        <div className="metric-reading">
                          <span className="reading-val">{patient.heartRate}</span>
                          <span className="reading-unit">bpm</span>
                        </div>
                        <span className="metric-range">Normal: 60-100</span>
                      </div>

                      {/* Blood Pressure */}
                      <div className={`vital-metric-cell ${patient.bpStatus}`}>
                        <div className="metric-header">
                          <HeartPulse size={15} className="metric-icon" />
                          <span>Blood Pressure</span>
                        </div>
                        <div className="metric-reading">
                          <span className="reading-val">{patient.bp}</span>
                          <span className="reading-unit">mmHg</span>
                        </div>
                        <span className="metric-range">Target: &lt;120/80</span>
                      </div>

                      {/* SpO2 */}
                      <div className={`vital-metric-cell ${patient.spo2Status}`}>
                        <div className="metric-header">
                          <Droplets size={15} className="metric-icon" />
                          <span>SpO₂ Oxygen</span>
                        </div>
                        <div className="metric-reading">
                          <span className="reading-val">{patient.spo2}%</span>
                          <span className="reading-unit">saturation</span>
                        </div>
                        <span className="metric-range">Target: &gt;95%</span>
                      </div>

                      {/* Temperature */}
                      <div className={`vital-metric-cell ${patient.tempStatus}`}>
                        <div className="metric-header">
                          <Thermometer size={15} className="metric-icon" />
                          <span>Temperature</span>
                        </div>
                        <div className="metric-reading">
                          <span className="reading-val">{patient.temperature}</span>
                        </div>
                        <span className="metric-range">Normal: 98.6°F</span>
                      </div>

                      {/* Blood Sugar */}
                      <div className={`vital-metric-cell ${patient.sugarStatus}`}>
                        <div className="metric-header">
                          <TrendingUp size={15} className="metric-icon" />
                          <span>Blood Sugar</span>
                        </div>
                        <div className="metric-reading">
                          <span className="reading-val">{patient.sugar}</span>
                          <span className="reading-unit">mg/dL</span>
                        </div>
                        <span className="metric-range">Target: 70-120</span>
                      </div>
                    </div>

                    {/* Patient Card Actions */}
                    <div className="patient-card-footer">
                      <button
                        className="patient-action-btn primary"
                        onClick={() => navigate("/doctor/records")}
                      >
                        <FileText size={15} />
                        <span>Medical Chart</span>
                      </button>

                      <button
                        className="patient-action-btn secondary"
                        onClick={() => navigate("/doctor/vitals")}
                      >
                        <HeartPulse size={15} />
                        <span>Record Vitals</span>
                      </button>

                      <button
                        className="patient-action-btn ai"
                        onClick={() => navigate("/doctor/ai-assistant")}
                      >
                        <Sparkles size={15} />
                        <span>AI Triage</span>
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ================================
            RIGHT COLUMN: QUEUE & QUICK TOOLS
        ================================= */}
        <div className="right-monitoring-column">
          {/* TODAY'S CONSULTATION QUEUE */}
          <div className="clinical-panel side-panel">
            <div className="panel-header-compact">
              <div>
                <span className="panel-kicker">TODAY'S SCHEDULE</span>
                <h3>Patient Queue</h3>
              </div>
              <button
                className="view-link-btn"
                onClick={() => navigate("/doctor/appointments")}
              >
                View all <ArrowUpRight size={15} />
              </button>
            </div>

            <div className="queue-list">
              {appointments.map((apt) => (
                <div key={apt.id} className="queue-item">
                  <div className="queue-token">{apt.token}</div>
                  <div className="queue-info">
                    <strong>{apt.patient}</strong>
                    <div className="queue-meta">
                      <span>{apt.time}</span>
                      <span>•</span>
                      <span>{apt.type}</span>
                    </div>
                  </div>
                  <span className={`queue-badge ${apt.statusClass}`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CLINICAL QUICK LAUNCH TOOLS */}
          <div className="clinical-panel side-panel">
            <div className="panel-header-compact">
              <div>
                <span className="panel-kicker">WORKFLOW TOOLS</span>
                <h3>Doctor Quick Launch</h3>
              </div>
            </div>

            <div className="quick-launch-grid">
              <Link to="/doctor/vitals" className="launch-tool-card">
                <div className="tool-icon blue">
                  <HeartPulse size={20} />
                </div>
                <div className="tool-text">
                  <strong>Patient Vitals</strong>
                  <span>Telemetry hub & logging</span>
                </div>
                <ChevronRight size={17} className="tool-arrow" />
              </Link>

              <Link to="/doctor/records" className="launch-tool-card">
                <div className="tool-icon emerald">
                  <FileText size={20} />
                </div>
                <div className="tool-text">
                  <strong>Health Records</strong>
                  <span>Diagnoses, labs & charts</span>
                </div>
                <ChevronRight size={17} className="tool-arrow" />
              </Link>

              <Link to="/doctor/ai-assistant" className="launch-tool-card">
                <div className="tool-icon purple">
                  <Sparkles size={20} />
                </div>
                <div className="tool-text">
                  <strong>AI Clinical Assistant</strong>
                  <span>Triage, ICD-10 & DDx notes</span>
                </div>
                <ChevronRight size={17} className="tool-arrow" />
              </Link>

              <Link to="/doctor/approvals" className="launch-tool-card">
                <div className="tool-icon orange">
                  <ClipboardCheck size={20} />
                </div>
                <div className="tool-text">
                  <strong>Pending Approvals</strong>
                  <span>Consent & access requests</span>
                </div>
                <ChevronRight size={17} className="tool-arrow" />
              </Link>

              <Link to="/doctor/notifications" className="launch-tool-card">
                <div className="tool-icon teal">
                  <Bell size={20} />
                </div>
                <div className="tool-text">
                  <strong>System Notifications</strong>
                  <span>Clinical alerts & updates</span>
                </div>
                <ChevronRight size={17} className="tool-arrow" />
              </Link>
            </div>
          </div>

          {/* CLINICAL EFFICIENCY / SUMMARY */}
          <div className="clinical-panel side-panel summary-box">
            <div className="panel-header-compact">
              <div>
                <span className="panel-kicker">SUMMARY</span>
                <h3>Clinical Session</h3>
              </div>
              <CheckCircle2 size={18} className="text-emerald" />
            </div>

            <div className="efficiency-stats">
              <div className="efficiency-row">
                <span>Completed Consultations</span>
                <strong>7 / 12</strong>
              </div>
              <div className="efficiency-row">
                <span>Average Consultation Time</span>
                <strong>14 mins</strong>
              </div>
              <div className="efficiency-row">
                <span>Pending Lab Reviews</span>
                <strong>3 files</strong>
              </div>

              <div className="progress-bar-container">
                <div className="progress-info">
                  <span>Day Shift Progress</span>
                  <span>58%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: "58%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorDashboard;