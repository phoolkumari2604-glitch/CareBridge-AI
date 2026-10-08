import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  Mail,
  Droplets,
  Thermometer,
  ShieldCheck,
  UserCheck,
  Zap,
  Info,
  Building,
  Heart,
  Wind,
  PlusCircle,
  Pill,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import doctorService from "../../services/doctorService";
import "./DoctorDashboard.css";

function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get("patientId");

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState("");

  // Search & Filters
  const [patientSearch, setPatientSearch] = useState("");
  const [kpiFilter, setKpiFilter] = useState("all");

  // Core Data
  const [patients, setPatients] = useState([]);
  const [focusedPatientId, setFocusedPatientId] = useState(null);
  const [patientVitalsMap, setPatientVitalsMap] = useState({});
  const [patientVitalsHistoryMap, setPatientVitalsHistoryMap] = useState({});
  const [patientAlertsMap, setPatientAlertsMap] = useState({});
  const [patientRecordsMap, setPatientRecordsMap] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [consultingDoctors, setConsultingDoctors] = useState([]);
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState(new Set());

  // Fetch all dashboard data concurrently
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);

      const [patientsData, appointmentsData, approvalsData, doctorsData] = await Promise.all([
        doctorService.getPatients(),
        doctorService.getAppointments(),
        doctorService.getApprovals(),
        doctorService.getDoctors(),
      ]);

      const patientList = Array.isArray(patientsData) ? patientsData : [];
      setPatients(patientList);
      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      setApprovals(Array.isArray(approvalsData) ? approvalsData : []);
      setConsultingDoctors(Array.isArray(doctorsData) ? doctorsData.slice(0, 6) : []);

      // Determine initially focused patient
      if (patientList.length > 0) {
        if (queryPatientId && patientList.some((p) => (p._id || p.id) === queryPatientId)) {
          setFocusedPatientId(queryPatientId);
        } else if (!focusedPatientId) {
          setFocusedPatientId(patientList[0]._id || patientList[0].id);
        }
      }

      // Fetch telemetry, alerts, records for active patients
      const vitalsMap = {};
      const vitalsHistMap = {};
      const alertsMap = {};
      const recordsMap = {};

      if (patientList.length > 0) {
        await Promise.all(
          patientList.slice(0, 15).map(async (pat) => {
            const pid = pat._id || pat.id;
            try {
              const [latestVit, vitalsHist, alertSummary, records] = await Promise.all([
                doctorService.getLatestVitals(pid),
                doctorService.getPatientVitals(pid),
                doctorService.getHealthAlertSummary(pid),
                doctorService.getHealthRecords(pid),
              ]);

              if (latestVit) vitalsMap[pid] = latestVit;
              if (Array.isArray(vitalsHist)) vitalsHistMap[pid] = vitalsHist;
              if (alertSummary) alertsMap[pid] = alertSummary;
              if (Array.isArray(records)) recordsMap[pid] = records;
            } catch (e) {
              // Ignore individual patient telemetry errors
            }
          })
        );
      }

      setPatientVitalsMap(vitalsMap);
      setPatientVitalsHistoryMap(vitalsHistMap);
      setPatientAlertsMap(alertsMap);
      setPatientRecordsMap(recordsMap);
      setLastRefreshed(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch (err) {
      console.error("Doctor dashboard fetch error:", err);
      setError("Unable to sync live telemetry from backend. Please verify your connection.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [focusedPatientId, queryPatientId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  const handleAcknowledgeAlert = (patientId) => {
    setAcknowledgedAlertIds((prev) => new Set([...prev, patientId]));
  };

  // Determine clinical status for any patient
  const getPatientClinicalStatus = (patientId) => {
    const summary = patientAlertsMap[patientId];
    const vitals = patientVitalsMap[patientId];

    if (summary && (summary.status === "ALERT" || summary.high_alerts > 0)) {
      return {
        status: "critical",
        label: "Critical",
        reason: summary.message || "Acute parameters flagged by clinical monitoring",
      };
    }
    if (vitals) {
      const isHrAbnormal = vitals.heart_rate && (vitals.heart_rate > 105 || vitals.heart_rate < 55);
      const isBpAbnormal = vitals.systolic_bp && (vitals.systolic_bp >= 140 || vitals.systolic_bp < 90);
      const isSpo2Low = vitals.spo2 && vitals.spo2 < 95;
      const isSugarAbnormal = vitals.blood_sugar && (vitals.blood_sugar > 140 || vitals.blood_sugar < 70);

      if (isSpo2Low || (vitals.systolic_bp && vitals.systolic_bp >= 160)) {
        return {
          status: "critical",
          label: "Critical",
          reason: isSpo2Low ? `SpO₂ critically low (${vitals.spo2}%)` : `Severe hypertension (${vitals.systolic_bp} mmHg)`,
        };
      }
      if (isHrAbnormal || isBpAbnormal || isSugarAbnormal) {
        return {
          status: "attention",
          label: "Attention",
          reason: "Borderline vital sign deviations logged",
        };
      }
      return { status: "stable", label: "Stable", reason: "Within physiological baseline" };
    }
    return { status: "stable", label: "Stable", reason: "Baseline physiological state" };
  };

  // Filtered patients list
  const filteredPatients = useMemo(() => {
    return patients.filter((pat) => {
      const pid = pat._id || pat.id;
      const { status } = getPatientClinicalStatus(pid);
      const q = patientSearch.toLowerCase().trim();

      const matchesKpi =
        kpiFilter === "all"
          ? true
          : kpiFilter === "critical"
          ? status === "critical"
          : kpiFilter === "attention"
          ? status === "attention"
          : status === "stable";

      const matchesSearch =
        !q ||
        (pat.name || "").toLowerCase().includes(q) ||
        (pat.email || "").toLowerCase().includes(q) ||
        (pat.phone || "").toLowerCase().includes(q) ||
        pid.toLowerCase().includes(q);

      return matchesKpi && matchesSearch;
    });
  }, [patients, patientSearch, kpiFilter, patientAlertsMap, patientVitalsMap]);

  // Telemetry counts
  const totalPatientsCount = patients.length;
  const criticalPatients = useMemo(() => {
    return patients.filter((p) => getPatientClinicalStatus(p._id || p.id).status === "critical");
  }, [patients, patientAlertsMap, patientVitalsMap]);

  const attentionPatients = useMemo(() => {
    return patients.filter((p) => getPatientClinicalStatus(p._id || p.id).status === "attention");
  }, [patients, patientAlertsMap, patientVitalsMap]);

  const stablePatients = useMemo(() => {
    return patients.filter((p) => getPatientClinicalStatus(p._id || p.id).status === "stable");
  }, [patients, patientAlertsMap, patientVitalsMap]);

  const pendingApprovalsCount = useMemo(() => {
    return approvals.filter((a) => (a.status || "").toUpperCase() === "PENDING").length;
  }, [approvals]);

  // Focused patient data
  const focusedPatient = useMemo(() => {
    if (!focusedPatientId && patients.length > 0) return patients[0];
    return patients.find((p) => (p._id || p.id) === focusedPatientId) || patients[0] || null;
  }, [patients, focusedPatientId]);

  const focusedPid = focusedPatient?._id || focusedPatient?.id;
  const focusedVitals = focusedPid ? patientVitalsMap[focusedPid] : null;
  const focusedVitalsHistory = focusedPid ? patientVitalsHistoryMap[focusedPid] || [] : [];
  const focusedRecords = focusedPid ? patientRecordsMap[focusedPid] || [] : [];
  const focusedStatus = focusedPid ? getPatientClinicalStatus(focusedPid) : { status: "stable", label: "Stable", reason: "Baseline" };

  // Generate SVG Sparkline helper
  const renderSparkline = (dataPoints, color = "#0284c7") => {
    if (!dataPoints || dataPoints.length < 2) {
      // Gentle mock curve placeholder based on single point
      return (
        <svg className="sparkline-svg" viewBox="0 0 100 30" preserveAspectRatio="none">
          <path
            d="M 0 15 Q 25 10, 50 15 T 100 15"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints);
    const range = max - min || 1;
    const width = 100;
    const height = 30;

    const points = dataPoints.map((val, idx) => {
      const x = (idx / (dataPoints.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return (
      <svg className="sparkline-svg" viewBox="0 0 100 30" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(" ")}
        />
      </svg>
    );
  };

  return (
    <div className="doctor-monitoring-dashboard light-clinical-theme">
      {/* ============================================================
          1. TOP CLINICAL COMMAND BAR & HEADER
      ============================================================ */}
      <header className="clinical-header-card">
        <div className="header-identity">
          <div className="kicker-badge-row">
            <span className="portal-kicker-pill">
              <Activity size={13} className="pulse-icon" />
              CLINICAL COMMAND CENTER
            </span>
            <span className="live-telemetry-tag">
              <span className="live-dot-pulse" />
              REAL-TIME SENSOR FEED
            </span>
          </div>

          <h1>Welcome back, {user?.name || "Doctor"}</h1>
          <p>
            Continuous patient monitoring, acute physiological surveillance, and outpatient schedule management.
          </p>
        </div>

        <div className="header-controls">
          {lastRefreshed && (
            <div className="sync-timestamp-pill">
              <Clock3 size={14} />
              <span>Synced at {lastRefreshed}</span>
            </div>
          )}

          <button
            className={`btn-sync ${isRefreshing ? "spinning" : ""}`}
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh clinical telemetry"
          >
            <RefreshCw size={15} />
            <span>{isRefreshing ? "Syncing..." : "Sync Telemetry"}</span>
          </button>

          <button
            className="btn-record-vitals"
            onClick={() => navigate(focusedPid ? `/doctor/vitals?patientId=${focusedPid}` : "/doctor/vitals")}
          >
            <PlusCircle size={15} />
            <span>Record Vitals</span>
          </button>
        </div>
      </header>

      {/* ERROR BANNER */}
      {error && (
        <div className="dashboard-alert-banner error">
          <AlertCircle size={20} />
          <div>
            <strong>Telemetry Feed Notice:</strong>
            <p>{error}</p>
          </div>
          <button className="banner-action-btn" onClick={fetchDashboardData}>
            Retry Sync
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && !error && (
        <div className="dashboard-loading-card">
          <Loader2 size={38} className="spinning" />
          <h3>Connecting to CareBridge Clinical Telemetry...</h3>
          <p>Aggregating patient sensor parameters, vital thresholds, and active queue.</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ============================================================
              2. KPI SUMMARY METRIC CARDS (4 POLISHED LIGHT CARDS)
          ============================================================ */}
          <section className="kpi-metrics-grid">
            {/* Total Monitored Patients */}
            <div
              className={`kpi-card ${kpiFilter === "all" ? "active-kpi" : ""}`}
              onClick={() => setKpiFilter("all")}
            >
              <div className="kpi-card-head">
                <div className="kpi-icon-wrap blue">
                  <Users size={20} />
                </div>
                <span className="kpi-badge neutral">Live Registry</span>
              </div>
              <div className="kpi-value-wrap">
                <h2>{totalPatientsCount}</h2>
                <span className="kpi-label">Monitored Patients</span>
              </div>
              <div className="kpi-footer">
                <span>Active Inpatients &amp; OPD</span>
                <ArrowUpRight size={14} />
              </div>
            </div>

            {/* Critical Alerts */}
            <div
              className={`kpi-card ${criticalPatients.length > 0 ? "has-urgent" : ""} ${
                kpiFilter === "critical" ? "active-kpi" : ""
              }`}
              onClick={() => setKpiFilter("critical")}
            >
              <div className="kpi-card-head">
                <div className="kpi-icon-wrap red">
                  <ShieldAlert size={20} />
                </div>
                <span className="kpi-badge critical">Immediate Action</span>
              </div>
              <div className="kpi-value-wrap">
                <h2 className="text-red">{criticalPatients.length}</h2>
                <span className="kpi-label">Critical Vital Alerts</span>
              </div>
              <div className="kpi-footer">
                <span className="text-red">SpO₂ &lt; 95% / High BP</span>
                <ArrowUpRight size={14} />
              </div>
            </div>

            {/* Needs Attention */}
            <div
              className={`kpi-card ${kpiFilter === "attention" ? "active-kpi" : ""}`}
              onClick={() => setKpiFilter("attention")}
            >
              <div className="kpi-card-head">
                <div className="kpi-icon-wrap amber">
                  <AlertTriangle size={20} />
                </div>
                <span className="kpi-badge warning">Clinical Watch</span>
              </div>
              <div className="kpi-value-wrap">
                <h2 className="text-amber">{attentionPatients.length}</h2>
                <span className="kpi-label">Needs Clinical Review</span>
              </div>
              <div className="kpi-footer">
                <span>Borderline Vitals Logged</span>
                <ArrowUpRight size={14} />
              </div>
            </div>

            {/* Stable Physiological Baseline */}
            <div
              className={`kpi-card ${kpiFilter === "stable" ? "active-kpi" : ""}`}
              onClick={() => setKpiFilter("stable")}
            >
              <div className="kpi-card-head">
                <div className="kpi-icon-wrap emerald">
                  <CheckCircle2 size={20} />
                </div>
                <span className="kpi-badge stable">Normal Baseline</span>
              </div>
              <div className="kpi-value-wrap">
                <h2 className="text-emerald">{stablePatients.length}</h2>
                <span className="kpi-label">Physiological Baseline</span>
              </div>
              <div className="kpi-footer">
                <span>Within safe thresholds</span>
                <ArrowUpRight size={14} />
              </div>
            </div>
          </section>

          {/* ============================================================
              3. HIGH-PRIORITY PHYSIOLOGICAL ALERTS STREAM (IF ANY)
          ============================================================ */}
          {criticalPatients.length > 0 && (
            <section className="critical-alerts-section">
              <div className="critical-section-header">
                <div className="header-title-flex">
                  <ShieldAlert size={18} className="pulse-red" />
                  <h3>Active High-Priority Physiological Alerts</h3>
                  <span className="alert-count-pill">
                    {criticalPatients.filter((p) => !acknowledgedAlertIds.has(p._id || p.id)).length} Actionable
                  </span>
                </div>
                <Link to="/doctor/notifications" className="all-alerts-link">
                  <span>View All Notifications</span>
                  <ChevronRight size={15} />
                </Link>
              </div>

              <div className="critical-alerts-list">
                {criticalPatients.map((pat) => {
                  const pid = pat._id || pat.id;
                  const isAck = acknowledgedAlertIds.has(pid);
                  const vit = patientVitalsMap[pid];
                  const summary = patientAlertsMap[pid];

                  if (isAck) return null;

                  return (
                    <div key={pid} className="critical-alert-card">
                      <div className="alert-badge-meta">
                        <span className="severity-pill critical">CRITICAL TELEMETRY</span>
                        <strong className="patient-target-name">{pat.name || "Patient"}</strong>
                        <span className="meta-tag">ID: {pid.slice(-6)}</span>
                        {pat.phone && (
                          <span className="meta-tag">
                            <Phone size={11} /> {pat.phone}
                          </span>
                        )}
                      </div>

                      <div className="alert-content-body">
                        <strong>Reason Flagged: </strong>
                        <span>
                          {summary?.message ||
                            `SpO₂ ${vit?.spo2 || 92}%, HR ${vit?.heart_rate || 112} bpm, BP ${vit?.systolic_bp || 150}/${vit?.diastolic_bp || 96} mmHg`}
                        </span>
                      </div>

                      <div className="alert-actions-row">
                        <button
                          className="btn-alert-action ack"
                          onClick={() => handleAcknowledgeAlert(pid)}
                        >
                          <CheckCircle2 size={14} />
                          <span>Acknowledge</span>
                        </button>
                        <button
                          className="btn-alert-action triage"
                          onClick={() => navigate(`/doctor/ai-assistant?patientId=${pid}`)}
                        >
                          <Sparkles size={14} />
                          <span>AI Triage Note</span>
                        </button>
                        <button
                          className="btn-alert-action view"
                          onClick={() => {
                            setFocusedPatientId(pid);
                            window.scrollTo({ top: 380, behavior: "smooth" });
                          }}
                        >
                          <Activity size={14} />
                          <span>Inspect Patient</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ============================================================
              4. MAIN CLINICAL SPLIT WORKBENCH (IMAGE 1 + IMAGE 2 COMBINED)
          ============================================================ */}
          <div className="dashboard-workbench-layout">
            {/* --------------------------------------------------------
                LEFT / CENTER: PATIENT CLINICAL DOSSIER & VITALS
            -------------------------------------------------------- */}
            <main className="workbench-main-dossier">
              {/* PATIENT SELECTOR STRIP */}
              <section className="patient-selector-card">
                <div className="selector-top-row">
                  <div className="selector-heading">
                    <Users size={16} />
                    <h3>Patient Monitoring Roster</h3>
                  </div>

                  <div className="selector-search-box">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Search patient name, ID, phone..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                    />
                    {patientSearch && (
                      <button className="clear-btn" onClick={() => setPatientSearch("")}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Horizontal Patient Switcher Pills */}
                <div className="patient-pills-carousel">
                  {filteredPatients.length === 0 ? (
                    <div className="no-patients-mini">No patients match your search.</div>
                  ) : (
                    filteredPatients.map((pat) => {
                      const pid = pat._id || pat.id;
                      const { status } = getPatientClinicalStatus(pid);
                      const isSelected = focusedPid === pid;

                      return (
                        <button
                          key={pid}
                          className={`patient-tab-pill ${isSelected ? "selected" : ""} ${status}`}
                          onClick={() => setFocusedPatientId(pid)}
                        >
                          <span className={`status-dot ${status}`} />
                          <span className="pill-name">{pat.name || "Patient"}</span>
                          <span className="pill-id">#{pid.slice(-4)}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              {focusedPatient ? (
                <>
                  {/* FOCUSED PATIENT CLINICAL IDENTITY CARD */}
                  <section className="patient-clinical-header-card">
                    <div className="patient-identity-left">
                      <div className="avatar-circle">
                        {focusedPatient.name
                          ? focusedPatient.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()
                          : "PT"}
                      </div>

                      <div className="identity-details">
                        <div className="name-and-status-row">
                          <h2>{focusedPatient.name || "Patient Profile"}</h2>
                          <span className={`clinical-status-pill ${focusedStatus.status}`}>
                            {focusedStatus.status === "critical" && <AlertCircle size={13} />}
                            {focusedStatus.status === "attention" && <AlertTriangle size={13} />}
                            {focusedStatus.status === "stable" && <CheckCircle2 size={13} />}
                            <span>{focusedStatus.label.toUpperCase()}</span>
                          </span>
                        </div>

                        <div className="identity-tags-row">
                          <span className="meta-tag bold">ID: {focusedPid.slice(-8)}</span>
                          {focusedPatient.age && <span className="meta-tag">Age {focusedPatient.age} yrs</span>}
                          {focusedPatient.gender && <span className="meta-tag">{focusedPatient.gender}</span>}
                          {focusedPatient.blood_group && (
                            <span className="meta-tag blood-tag">
                              <Droplets size={12} /> Blood {focusedPatient.blood_group}
                            </span>
                          )}
                        </div>

                        <div className="identity-contact-row">
                          {focusedPatient.phone && (
                            <span>
                              <Phone size={12} /> {focusedPatient.phone}
                            </span>
                          )}
                          {focusedPatient.email && (
                            <span>
                              <Mail size={12} /> {focusedPatient.email}
                            </span>
                          )}
                          {focusedPatient.emergency_contact && (
                            <span>
                              <ShieldAlert size={12} /> ICE: {focusedPatient.emergency_contact}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="patient-quick-nav-actions">
                      <button
                        className="btn-quick-nav primary"
                        onClick={() => navigate(`/doctor/records?patientId=${focusedPid}`)}
                        title="Open full medical chart"
                      >
                        <FileText size={15} />
                        <span>Medical Chart</span>
                      </button>

                      <button
                        className="btn-quick-nav secondary"
                        onClick={() => navigate(`/doctor/health-monitoring?patientId=${focusedPid}`)}
                        title="View telemetry trends"
                      >
                        <TrendingUp size={15} />
                        <span>Telemetry Trends</span>
                      </button>

                      <button
                        className="btn-quick-nav ai"
                        onClick={() => navigate(`/doctor/ai-assistant?patientId=${focusedPid}`)}
                        title="AI clinical decision support"
                      >
                        <Sparkles size={15} />
                        <span>AI Triage</span>
                      </button>
                    </div>
                  </section>

                  {/* PATIENT ORGAN & BODY SYSTEM OVERVIEW (IMAGE 2 CONCEPT) */}
                  <section className="body-systems-status-card">
                    <div className="card-section-heading">
                      <Stethoscope size={16} />
                      <h3>Physiological System Surveillance</h3>
                    </div>

                    <div className="systems-grid">
                      {/* Cardiovascular */}
                      <div className="system-pill-item">
                        <div className="system-icon-wrap red">
                          <Heart size={16} />
                        </div>
                        <div className="system-info">
                          <strong>Cardiovascular</strong>
                          <span>
                            {focusedVitals?.heart_rate
                              ? `${focusedVitals.heart_rate} BPM (${focusedVitals.heart_rate > 100 || focusedVitals.heart_rate < 60 ? "Abnormal" : "Normal"})`
                              : "72 BPM (Baseline)"}
                          </span>
                        </div>
                        <span className={`status-badge-mini ${focusedVitals?.heart_rate > 100 ? "warn" : "ok"}`}>
                          {focusedVitals?.heart_rate > 100 ? "Tachycardia" : "Stable"}
                        </span>
                      </div>

                      {/* Respiratory */}
                      <div className="system-pill-item">
                        <div className="system-icon-wrap cyan">
                          <Wind size={16} />
                        </div>
                        <div className="system-info">
                          <strong>Respiratory / SpO₂</strong>
                          <span>
                            {focusedVitals?.spo2 ? `${focusedVitals.spo2}% Oxygenation` : "98% (Baseline)"}
                          </span>
                        </div>
                        <span className={`status-badge-mini ${focusedVitals?.spo2 < 95 ? "crit" : "ok"}`}>
                          {focusedVitals?.spo2 < 95 ? "Hypoxia Alert" : "Optimal"}
                        </span>
                      </div>

                      {/* Hemodynamic / Blood Pressure */}
                      <div className="system-pill-item">
                        <div className="system-icon-wrap purple">
                          <Activity size={16} />
                        </div>
                        <div className="system-info">
                          <strong>Hemodynamics (BP)</strong>
                          <span>
                            {focusedVitals?.systolic_bp
                              ? `${focusedVitals.systolic_bp}/${focusedVitals.diastolic_bp || 80} mmHg`
                              : "120/80 mmHg"}
                          </span>
                        </div>
                        <span className={`status-badge-mini ${focusedVitals?.systolic_bp >= 140 ? "warn" : "ok"}`}>
                          {focusedVitals?.systolic_bp >= 140 ? "Elevated BP" : "Normotensive"}
                        </span>
                      </div>

                      {/* Metabolism / Glycemic */}
                      <div className="system-pill-item">
                        <div className="system-icon-wrap amber">
                          <TrendingUp size={16} />
                        </div>
                        <div className="system-info">
                          <strong>Metabolism / Glucose</strong>
                          <span>
                            {focusedVitals?.blood_sugar ? `${focusedVitals.blood_sugar} mg/dL` : "95 mg/dL (Normal)"}
                          </span>
                        </div>
                        <span className={`status-badge-mini ${focusedVitals?.blood_sugar > 140 ? "warn" : "ok"}`}>
                          {focusedVitals?.blood_sugar > 140 ? "Elevated" : "Euglycemic"}
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* COMPREHENSIVE PATIENT VITALS MATRIX & TREND SPARKLINES (IMAGE 1 + 2 CONCEPT) */}
                  <section className="vitals-matrix-section">
                    <div className="vitals-section-head">
                      <div>
                        <h3>Continuous Vital Signs Matrix</h3>
                        <p>Real-time telemetry feeds, historical trend curves &amp; reference ranges</p>
                      </div>

                      <button
                        className="btn-log-vital-sm"
                        onClick={() => navigate(`/doctor/vitals?patientId=${focusedPid}`)}
                      >
                        <HeartPulse size={14} />
                        <span>Log Reading</span>
                      </button>
                    </div>

                    <div className="vital-cards-grid">
                      {/* Heart Rate */}
                      <div className="vital-card hr-card">
                        <div className="vital-card-top">
                          <div className="icon-and-title">
                            <div className="vital-icon-circle red">
                              <HeartPulse size={18} />
                            </div>
                            <div>
                              <h4>Heart Rate</h4>
                              <span className="vital-sub-target">Normal: 60 - 100 BPM</span>
                            </div>
                          </div>
                          <span className="pulse-indicator-live" />
                        </div>

                        <div className="vital-reading-display">
                          <span className="primary-value">{focusedVitals?.heart_rate || "--"}</span>
                          <span className="unit-label">BPM</span>
                        </div>

                        <div className="vital-sparkline-wrap">
                          {renderSparkline(
                            focusedVitalsHistory.map((v) => v.heart_rate).filter(Boolean),
                            "#ef4444"
                          )}
                        </div>

                        <div className="vital-card-footer">
                          <span>Status: </span>
                          <strong className={focusedVitals?.heart_rate > 100 || focusedVitals?.heart_rate < 60 ? "text-amber" : "text-emerald"}>
                            {focusedVitals?.heart_rate
                              ? focusedVitals.heart_rate > 100
                                ? "Elevated (Tachycardia)"
                                : focusedVitals.heart_rate < 60
                                ? "Low (Bradycardia)"
                                : "Optimal"
                              : "No data available"}
                          </strong>
                        </div>
                      </div>

                      {/* Blood Pressure */}
                      <div className="vital-card bp-card">
                        <div className="vital-card-top">
                          <div className="icon-and-title">
                            <div className="vital-icon-circle blue">
                              <Activity size={18} />
                            </div>
                            <div>
                              <h4>Blood Pressure</h4>
                              <span className="vital-sub-target">Target: &lt;120/80 mmHg</span>
                            </div>
                          </div>
                          <span className="reading-time-tag">Latest</span>
                        </div>

                        <div className="vital-reading-display">
                          <span className="primary-value">
                            {focusedVitals?.systolic_bp && focusedVitals?.diastolic_bp
                              ? `${focusedVitals.systolic_bp}/${focusedVitals.diastolic_bp}`
                              : focusedVitals?.systolic_bp
                              ? `${focusedVitals.systolic_bp}/80`
                              : "--/--"}
                          </span>
                          <span className="unit-label">mmHg</span>
                        </div>

                        <div className="vital-sparkline-wrap">
                          {renderSparkline(
                            focusedVitalsHistory.map((v) => v.systolic_bp).filter(Boolean),
                            "#0284c7"
                          )}
                        </div>

                        <div className="vital-card-footer">
                          <span>Category: </span>
                          <strong className={focusedVitals?.systolic_bp >= 140 ? "text-red" : "text-emerald"}>
                            {focusedVitals?.systolic_bp
                              ? focusedVitals.systolic_bp >= 140
                                ? "Stage 2 Hypertension"
                                : focusedVitals.systolic_bp >= 130
                                ? "Stage 1 Hypertension"
                                : "Normal Pressure"
                              : "No data available"}
                          </strong>
                        </div>
                      </div>

                      {/* SpO2 Oxygen Saturation */}
                      <div className="vital-card spo2-card">
                        <div className="vital-card-top">
                          <div className="icon-and-title">
                            <div className="vital-icon-circle cyan">
                              <Droplets size={18} />
                            </div>
                            <div>
                              <h4>Oxygen Saturation</h4>
                              <span className="vital-sub-target">Target: &gt;95% SpO₂</span>
                            </div>
                          </div>
                          <span className="reading-time-tag">Pulse Ox</span>
                        </div>

                        <div className="vital-reading-display">
                          <span className="primary-value">
                            {focusedVitals?.spo2 ? `${focusedVitals.spo2}%` : "--%"}
                          </span>
                          <span className="unit-label">SpO₂</span>
                        </div>

                        <div className="vital-sparkline-wrap">
                          {renderSparkline(
                            focusedVitalsHistory.map((v) => v.spo2).filter(Boolean),
                            "#0d9488"
                          )}
                        </div>

                        <div className="vital-card-footer">
                          <span>Oxygenation: </span>
                          <strong className={focusedVitals?.spo2 < 95 ? "text-red" : "text-emerald"}>
                            {focusedVitals?.spo2
                              ? focusedVitals.spo2 >= 95
                                ? "Normal Saturation"
                                : "Hypoxemia Flagged"
                              : "No data available"}
                          </strong>
                        </div>
                      </div>

                      {/* Body Temperature */}
                      <div className="vital-card temp-card">
                        <div className="vital-card-top">
                          <div className="icon-and-title">
                            <div className="vital-icon-circle amber">
                              <Thermometer size={18} />
                            </div>
                            <div>
                              <h4>Body Temperature</h4>
                              <span className="vital-sub-target">Normal: 36.5 - 37.5°C</span>
                            </div>
                          </div>
                          <span className="reading-time-tag">Thermal</span>
                        </div>

                        <div className="vital-reading-display">
                          <span className="primary-value">
                            {focusedVitals?.temperature ? `${focusedVitals.temperature}°` : "--°"}
                          </span>
                          <span className="unit-label">C</span>
                        </div>

                        <div className="vital-sparkline-wrap">
                          {renderSparkline(
                            focusedVitalsHistory.map((v) => v.temperature).filter(Boolean),
                            "#f59e0b"
                          )}
                        </div>

                        <div className="vital-card-footer">
                          <span>Thermal State: </span>
                          <strong className={focusedVitals?.temperature >= 38.0 ? "text-red" : "text-emerald"}>
                            {focusedVitals?.temperature
                              ? focusedVitals.temperature >= 38.0
                                ? "Febrile / Fever"
                                : focusedVitals.temperature < 36.0
                                ? "Hypothermia"
                                : "Afebrile / Normal"
                              : "No data available"}
                          </strong>
                        </div>
                      </div>

                      {/* Blood Glucose */}
                      <div className="vital-card sugar-card">
                        <div className="vital-card-top">
                          <div className="icon-and-title">
                            <div className="vital-icon-circle emerald">
                              <TrendingUp size={18} />
                            </div>
                            <div>
                              <h4>Blood Sugar</h4>
                              <span className="vital-sub-target">Target: 70 - 120 mg/dL</span>
                            </div>
                          </div>
                          <span className="reading-time-tag">Fasting/Random</span>
                        </div>

                        <div className="vital-reading-display">
                          <span className="primary-value">{focusedVitals?.blood_sugar || "--"}</span>
                          <span className="unit-label">mg/dL</span>
                        </div>

                        <div className="vital-sparkline-wrap">
                          {renderSparkline(
                            focusedVitalsHistory.map((v) => v.blood_sugar).filter(Boolean),
                            "#10b981"
                          )}
                        </div>

                        <div className="vital-card-footer">
                          <span>Glycemic Status: </span>
                          <strong className={focusedVitals?.blood_sugar > 140 ? "text-amber" : "text-emerald"}>
                            {focusedVitals?.blood_sugar
                              ? focusedVitals.blood_sugar > 140
                                ? "Hyperglycemic"
                                : focusedVitals.blood_sugar < 70
                                ? "Hypoglycemic"
                                : "Normal Glucose"
                              : "No data available"}
                          </strong>
                        </div>
                      </div>

                      {/* Weight, Height & Body Mass Index */}
                      <div className="vital-card bmi-card">
                        <div className="vital-card-top">
                          <div className="icon-and-title">
                            <div className="vital-icon-circle purple">
                              <Users size={18} />
                            </div>
                            <div>
                              <h4>Weight &amp; Height</h4>
                              <span className="vital-sub-target">Anthropometrics</span>
                            </div>
                          </div>
                          <span className="reading-time-tag">Physical</span>
                        </div>

                        <div className="vital-reading-display">
                          <span className="primary-value">
                            {focusedVitals?.weight ? `${focusedVitals.weight}` : "--"}
                          </span>
                          <span className="unit-label">kg</span>
                          {focusedVitals?.height && (
                            <span className="height-val">/ {focusedVitals.height} cm</span>
                          )}
                        </div>

                        <div className="anthro-meta-summary">
                          <span>Recorded Date: </span>
                          <strong>
                            {focusedVitals?.recorded_at
                              ? new Date(focusedVitals.recorded_at).toLocaleDateString()
                              : "No date recorded"}
                          </strong>
                        </div>

                        <div className="vital-card-footer">
                          <span>Anthropometrics: </span>
                          <strong className="text-emerald">
                            {focusedVitals?.weight ? "Physique Logged" : "No data available"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* RECENT MEDICAL RECORDS & CLINICAL DIAGNOSES FOR FOCUSED PATIENT */}
                  <section className="recent-records-card">
                    <div className="records-card-header">
                      <div>
                        <h3>Recent Health Records &amp; Clinical Notes</h3>
                        <p>Latest consultations, diagnoses, and prescriptions on file</p>
                      </div>

                      <button
                        className="btn-text-link"
                        onClick={() => navigate(`/doctor/records?patientId=${focusedPid}`)}
                      >
                        <span>Open Complete Chart</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>

                    <div className="records-compact-list">
                      {focusedRecords.length === 0 ? (
                        <div className="empty-records-box">
                          <FileText size={24} />
                          <p>No health records logged yet for this patient.</p>
                          <button
                            className="btn-create-record-link"
                            onClick={() => navigate(`/doctor/records?patientId=${focusedPid}`)}
                          >
                            + Create Clinical Record
                          </button>
                        </div>
                      ) : (
                        focusedRecords.slice(0, 3).map((rec, i) => (
                          <div key={rec._id || rec.id || i} className="record-compact-item">
                            <div className="record-type-pill">{rec.record_type || "Consultation"}</div>

                            <div className="record-details-block">
                              <strong>{rec.title || rec.diagnosis || "Clinical Note"}</strong>
                              {rec.description && <p className="record-snippet">{rec.description}</p>}

                              <div className="record-meta-row">
                                <span>Date: {rec.record_date || "Recent"}</span>
                                {rec.doctor_name && <span>Attending: {rec.doctor_name}</span>}
                              </div>

                              {Array.isArray(rec.medications) && rec.medications.length > 0 && (
                                <div className="meds-tag-row">
                                  <Pill size={12} />
                                  {rec.medications.map((m, mIdx) => (
                                    <span key={mIdx} className="med-tag">
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </>
              ) : (
                <div className="no-patient-selected-card">
                  <Users size={48} />
                  <h3>No Patients Available in Roster</h3>
                  <p>When patients register or schedule appointments, they will appear here for live monitoring.</p>
                </div>
              )}
            </main>

            {/* --------------------------------------------------------
                RIGHT: SCHEDULE, ASSIGNED DOCTORS & QUICK ACTIONS
            -------------------------------------------------------- */}
            <aside className="workbench-side-column">
              {/* TODAY'S CONSULTATION APPOINTMENTS QUEUE */}
              <div className="side-widget-card">
                <div className="widget-card-head">
                  <div>
                    <span className="widget-kicker">OUTPATIENT CLINIC</span>
                    <h3>Today's Consultation Schedule</h3>
                  </div>
                  <button
                    className="icon-link-btn"
                    onClick={() => navigate("/doctor/appointments")}
                    title="View all appointments"
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </div>

                <div className="appointments-queue-list">
                  {appointments.length === 0 ? (
                    <div className="empty-widget-state">
                      <CalendarDays size={28} />
                      <p>No appointments booked for today.</p>
                      <button
                        className="btn-widget-action"
                        onClick={() => navigate("/doctor/appointments")}
                      >
                        Open Appointments Schedule
                      </button>
                    </div>
                  ) : (
                    appointments.slice(0, 5).map((apt, idx) => {
                      const status = (apt.status || "PENDING").toLowerCase();
                      return (
                        <div key={apt._id || apt.id || idx} className="queue-appointment-item">
                          <div className="token-index-badge">#{idx + 1}</div>
                          <div className="appointment-info-body">
                            <strong>{apt.reason || "General Consultation"}</strong>
                            <div className="appointment-meta-text">
                              <span>{apt.appointment_time || "10:00 AM"}</span>
                              <span>&middot;</span>
                              <span>{apt.appointment_date || "Today"}</span>
                            </div>
                          </div>
                          <span className={`apt-status-badge ${status}`}>{apt.status || "Pending"}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* PENDING APPROVALS WIDGET */}
              <div className="side-widget-card">
                <div className="widget-card-head">
                  <div>
                    <span className="widget-kicker">TRIAGE &amp; APPROVALS</span>
                    <h3>Pending Confirmations</h3>
                  </div>
                  <span className="badge-counter-warning">{pendingApprovalsCount}</span>
                </div>

                <div className="pending-approvals-box">
                  <p>
                    {pendingApprovalsCount > 0
                      ? `You have ${pendingApprovalsCount} consultation request(s) awaiting clinical confirmation.`
                      : "All incoming consultation requests have been triaged."}
                  </p>
                  <button
                    className="btn-review-approvals"
                    onClick={() => navigate("/doctor/approvals")}
                  >
                    <ClipboardCheck size={15} />
                    <span>Review Approvals</span>
                  </button>
                </div>
              </div>

              {/* ASSIGNED / CONSULTING SPECIALISTS (IMAGE 2 CONCEPT) */}
              <div className="side-widget-card">
                <div className="widget-card-head">
                  <div>
                    <span className="widget-kicker">NETWORK SPECIALISTS</span>
                    <h3>Consulting Physicians</h3>
                  </div>
                  <button
                    className="icon-link-btn"
                    onClick={() => navigate("/doctor/patient-monitoring")}
                    title="View specialists directory"
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </div>

                <div className="consulting-doctors-list">
                  {consultingDoctors.map((doc) => {
                    const initials = doc.name
                      ? doc.name
                          .replace(/^(Dr\.|Sir|Prof\.)\s*/i, "")
                          .trim()
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "MD";

                    return (
                      <div key={doc._id || doc.id || doc.name} className="consulting-doc-item">
                        <div className="doc-avatar-mini">{initials}</div>
                        <div className="doc-info-block">
                          <strong>{doc.name}</strong>
                          <span>{doc.specialty || "Specialist"}</span>
                          <small>{doc.hospital_name || doc.hospital || "Medical Network"}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CLINICAL QUICK LAUNCH NAVIGATION */}
              <div className="side-widget-card">
                <div className="widget-card-head">
                  <div>
                    <span className="widget-kicker">WORKSPACE TOOLS</span>
                    <h3>Clinical Launch Hub</h3>
                  </div>
                </div>

                <div className="quick-launch-hub-grid">
                  <Link to="/doctor/patient-monitoring" className="launch-tool-link">
                    <div className="tool-icon-box blue">
                      <Users size={17} />
                    </div>
                    <div className="tool-text-wrap">
                      <strong>Patient Monitoring</strong>
                      <span>Full patient registry</span>
                    </div>
                    <ChevronRight size={15} className="tool-chevron" />
                  </Link>

                  <Link to="/doctor/health-monitoring" className="launch-tool-link">
                    <div className="tool-icon-box emerald">
                      <TrendingUp size={17} />
                    </div>
                    <div className="tool-text-wrap">
                      <strong>Health Monitoring</strong>
                      <span>Continuous vitals telemetry</span>
                    </div>
                    <ChevronRight size={15} className="tool-chevron" />
                  </Link>

                  <Link to="/doctor/records" className="launch-tool-link">
                    <div className="tool-icon-box purple">
                      <FileText size={17} />
                    </div>
                    <div className="tool-text-wrap">
                      <strong>Medical Records</strong>
                      <span>Charts, lab results &amp; notes</span>
                    </div>
                    <ChevronRight size={15} className="tool-chevron" />
                  </Link>

                  <Link to="/doctor/ai-assistant" className="launch-tool-link">
                    <div className="tool-icon-box cyan">
                      <Sparkles size={17} />
                    </div>
                    <div className="tool-text-wrap">
                      <strong>Clinical AI Assistant</strong>
                      <span>Decision support &amp; triage</span>
                    </div>
                    <ChevronRight size={15} className="tool-chevron" />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

export default DoctorDashboard;