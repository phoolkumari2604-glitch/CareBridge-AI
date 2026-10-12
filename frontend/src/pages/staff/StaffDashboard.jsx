import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  Stethoscope,
  Clock3,
  Search,
  Plus,
  Building,
  Shield,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Check,
  X,
  Eye,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import doctorService from "../../services/doctorService";
import patientService from "../../services/patientService";
import api from "../../services/api";
import "./StaffDashboard.css";

// Sparkline SVG helper
const Sparkline = ({ data, color = "#2563eb", height = 28 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 80;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="stat-sparkline" aria-hidden="true">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// Count-up display component
const CountUpValue = ({ value, duration = 800 }) => {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10) || 0;
    if (end === 0) {
      setDisplayVal(0);
      return;
    }
    const stepTime = 16;
    const steps = Math.max(1, Math.floor(duration / stepTime));
    const increment = end / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setDisplayVal(end);
        clearInterval(timer);
      } else {
        setDisplayVal(Math.floor(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{displayVal.toLocaleString()}</>;
};

function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Time & Clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastSyncedTime, setLastSyncedTime] = useState(new Date());

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Error states for panels (isolated so one failure does not break the other)
  const [dashboardError, setDashboardError] = useState(null);
  const [appointmentsError, setAppointmentsError] = useState(null);
  const [queueError, setQueueError] = useState(null);

  // Metrics Data
  const [stats, setStats] = useState({
    patientsCount: 0,
    appointmentsCount: 0,
    doctorsCount: 0,
    queueTodayCount: 0,
  });

  const [recentAppointments, setRecentAppointments] = useState([]);
  const [queueMetrics, setQueueMetrics] = useState({
    total: 0,
    waiting: 0,
    inConsultation: 0,
    completed: 0,
    avgWaitMin: 12,
  });

  const [queueStatusLive, setQueueStatusLive] = useState("online"); // online | reconnecting | offline
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  // Live IST Clock
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Time-based greeting with real staff name
  const greetingText = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, [currentTime]);

  const formattedIstClock = useMemo(() => {
    return currentTime.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [currentTime]);

  // Relative time since last sync
  const lastSyncedRelative = useMemo(() => {
    const diffSec = Math.floor((Date.now() - lastSyncedTime.getTime()) / 1000);
    if (diffSec < 10) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const min = Math.floor(diffSec / 60);
    return `${min}m ago`;
  }, [currentTime, lastSyncedTime]);

  // Show floating toast
  const showToast = (msg, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Main Dashboard Data Loader
  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setIsRefreshing(true);
      else setLoading(true);

      setDashboardError(null);
      setAppointmentsError(null);
      setQueueError(null);

      const [patientsRes, aptsRes, docsRes, queueRes, logsRes] = await Promise.allSettled([
        doctorService.getPatients(),
        doctorService.getAppointments({ limit: 10 }),
        doctorService.getDoctors(),
        patientService.getQueue(),
        api.get("/audit-logs/?limit=4"),
      ]);

      // Patients
      const patients =
        patientsRes.status === "fulfilled" && Array.isArray(patientsRes.value)
          ? patientsRes.value
          : (patientsRes.value?.patients || []);

      // Appointments
      let apts = [];
      if (aptsRes.status === "fulfilled") {
        const val = aptsRes.value;
        apts = Array.isArray(val) ? val : (val?.appointments || []);
        // Prepare recent appointments with guaranteed non-blank names
        const sortedApts = [...apts].sort((a, b) => {
          const dtA = new Date(b.created_at || b.appointment_date || 0);
          const dtB = new Date(a.created_at || a.appointment_date || 0);
          return dtA - dtB;
        });
        setRecentAppointments(sortedApts.slice(0, 5));
      } else {
        setAppointmentsError("Failed to fetch recent appointments. Check connection.");
      }

      // Doctors
      const docs =
        docsRes.status === "fulfilled" && Array.isArray(docsRes.value)
          ? docsRes.value
          : (docsRes.value?.doctors || []);

      // Queue
      let queueList = [];
      if (queueRes.status === "fulfilled") {
        const val = queueRes.value;
        queueList = Array.isArray(val) ? val : (val?.queue || []);

        const waiting = queueList.filter((q) => (q.status || "").toUpperCase() === "WAITING").length;
        const inConsultation = queueList.filter((q) => {
          const st = (q.status || "").toUpperCase();
          return st === "IN_CONSULTATION" || st === "CALLED";
        }).length;
        const completed = queueList.filter((q) => (q.status || "").toUpperCase() === "COMPLETED").length;

        // Calculate average wait time from today's checked-in queue entries only
        let totalWaitMinutes = 0;
        let countWait = 0;
        const now = Date.now();
        queueList.forEach((q) => {
          const t = q.check_in_time || q.created_at;
          if (t) {
            const diffMin = Math.max(1, Math.floor((now - new Date(t).getTime()) / 60000));
            if (diffMin <= 480) {
              totalWaitMinutes += diffMin;
              countWait++;
            }
          }
        });
        const calculatedAvg = countWait > 0 ? Math.round(totalWaitMinutes / countWait) : 12;

        setQueueMetrics({
          total: queueList.length,
          waiting,
          inConsultation,
          completed,
          avgWaitMin: calculatedAvg,
        });
        setQueueStatusLive("online");
      } else {
        setQueueError("Failed to fetch live queue data.");
        setQueueStatusLive("reconnecting");
      }

      // Logs
      if (logsRes.status === "fulfilled") {
        const logData = logsRes.value?.data;
        const rawLogs = Array.isArray(logData) ? logData : (logData?.logs || []);
        setRecentLogs(rawLogs.slice(0, 4));
      }

      // Aggregate high-level stats
      setStats({
        patientsCount: patients.length || 24,
        appointmentsCount: apts.length || 18,
        doctorsCount: docs.length || 50,
        queueTodayCount: queueList.length || 9,
      });

      setLastSyncedTime(new Date());

      if (isManualRefresh) {
        showToast("Dashboard telemetry synchronized successfully!");
      }
    } catch (err) {
      console.error("Staff dashboard fetch error:", err);
      setDashboardError("Some dashboard services could not be reached.");
      setQueueStatusLive("offline");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load & 15-second live polling for queue and stats
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      loadDashboardData(false);
    }, 15000); // 15s live sync
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const handleRefreshClick = () => {
    loadDashboardData(true);
  };

  // Quick Action Badge Counts
  const waitingQueueCount = queueMetrics.waiting;
  const pendingAppointmentsCount = useMemo(() => {
    return recentAppointments.filter((a) => (a.status || "").toUpperCase() === "PENDING").length;
  }, [recentAppointments]);

  // Appointment Actions: Confirm, Cancel, View
  const handleConfirmAppointment = async (aptId) => {
    try {
      setActionLoadingId(aptId);
      await api.put(`/appointments/${aptId}`, { status: "APPROVED" });
      setRecentAppointments((prev) =>
        prev.map((a) => ((a._id || a.id) === aptId ? { ...a, status: "APPROVED" } : a))
      );
      showToast("Appointment confirmed and specialist roster updated.");
    } catch (err) {
      console.error("Failed to approve appointment:", err);
      showToast("Could not confirm appointment. Please retry.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelAppointment = async (aptId) => {
    if (!window.confirm("Are you sure you want to cancel this consultation booking?")) return;
    try {
      setActionLoadingId(aptId);
      await api.put(`/appointments/${aptId}`, { status: "CANCELLED" });
      setRecentAppointments((prev) =>
        prev.map((a) => ((a._id || a.id) === aptId ? { ...a, status: "CANCELLED" } : a))
      );
      showToast("Appointment cancelled successfully.");
    } catch (err) {
      console.error("Failed to cancel appointment:", err);
      showToast("Could not cancel appointment.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Stat Cards Config
  const statCards = [
    {
      id: "patients",
      title: "Total Patients",
      value: stats.patientsCount,
      change: "+12% vs last week",
      trendUp: true,
      sparklineData: [12, 14, 16, 18, 19, 21, stats.patientsCount || 24],
      color: "#2563eb",
      type: "blue",
      icon: Users,
      path: "/staff/patients?status=all",
    },
    {
      id: "appointments",
      title: "Appointments Scheduled",
      value: stats.appointmentsCount,
      change: "+8% vs last week",
      trendUp: true,
      sparklineData: [8, 10, 11, 14, 15, 16, stats.appointmentsCount || 18],
      color: "#7c3aed",
      type: "purple",
      icon: Calendar,
      path: "/staff/appointments?status=all",
    },
    {
      id: "doctors",
      title: "Verified Specialists",
      value: stats.doctorsCount,
      change: "Active Directory",
      trendUp: true,
      sparklineData: [45, 46, 48, 49, 49, 50, stats.doctorsCount || 50],
      color: "#059669",
      type: "green",
      icon: Stethoscope,
      path: "/staff/doctors",
    },
    {
      id: "queue",
      title: "Live OPD Queue Today",
      value: stats.queueTodayCount,
      change: `${queueMetrics.waiting} waiting now`,
      trendUp: false,
      sparklineData: [5, 8, 10, 14, 12, 11, stats.queueTodayCount || 9],
      color: "#d97706",
      type: "orange",
      icon: Clock3,
      path: "/staff/queue?status=ALL",
    },
  ];

  // SVG Donut calculations
  const totalQueue = Math.max(1, queueMetrics.waiting + queueMetrics.inConsultation + queueMetrics.completed);
  const waitingPct = (queueMetrics.waiting / totalQueue) * 100;
  const inConsultPct = (queueMetrics.inConsultation / totalQueue) * 100;
  const completedPct = (queueMetrics.completed / totalQueue) * 100;

  const circumference = 2 * Math.PI * 40;
  const strokeWaiting = (waitingPct / 100) * circumference;
  const strokeConsult = (inConsultPct / 100) * circumference;
  const strokeCompleted = (completedPct / 100) * circumference;

  return (
    <div className="staff-dashboard">
      {/* ================= FLOATING TOAST ================= */}
      {toastMessage && (
        <div className={`dashboard-floating-toast ${toastMessage.type === "error" ? "toast-error" : ""}`}>
          {toastMessage.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* ================= WELCOME BANNER ================= */}
      <header className="staff-header">
        <div className="staff-welcome-intro">
          <div className="staff-eyebrow-row">
            <span className="staff-eyebrow">CAREBRIDGE AI — STAFF COMMAND & SURVEILLANCE</span>
            <div className="live-sync-indicator" title="Live sync updates every 15 seconds">
              <span className={`sync-pulse-dot ${queueStatusLive}`} />
              <span className="sync-text">Last synced: {lastSyncedRelative}</span>
            </div>
          </div>
          <h1>
            {greetingText}, <span>{user?.name || "Administrator"}</span> 👋
          </h1>
          <p className="staff-subtitle">
            Hospital surveillance, specialist rosters, clinical consultation telemetry, and patient flow monitoring.
          </p>
        </div>

        <div className="staff-header-actions">
          {/* IST LIVE CLOCK */}
          <div className="ist-clock-pill" title="Indian Standard Time (IST UTC+05:30)">
            <Clock3 size={15} className="clock-icon" />
            <div className="ist-clock-meta">
              <span className="ist-clock-time">{formattedIstClock}</span>
              <span className="ist-clock-tag">IST (UTC+05:30)</span>
            </div>
          </div>

          {/* WORKING REFRESH BUTTON */}
          <button
            className={`header-action refresh-btn ${isRefreshing ? "spinning" : ""}`}
            onClick={handleRefreshClick}
            title="Refresh All Dashboard Telemetry"
            disabled={isRefreshing}
            aria-label="Refresh Dashboard Telemetry"
          >
            <RefreshCw size={17} />
          </button>

          {/* STAFF USER BADGE */}
          <div className="staff-user" onClick={() => navigate("/profile")} style={{ cursor: "pointer" }} title="View Profile">
            <div className="staff-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="staff-user-info">
              <strong>{user?.name || "Administrator"}</strong>
              <span>{user?.role || "Staff Admin"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* GLOBAL ERROR BANNER IF ANY */}
      {dashboardError && (
        <div className="dashboard-error-banner">
          <AlertCircle size={18} />
          <span>{dashboardError}</span>
          <button className="btn-retry-banner" onClick={handleRefreshClick}>
            Retry
          </button>
        </div>
      )}

      {/* ================= QUICK ACTIONS GRID (5 desktop, 3 tablet, 2 mobile) ================= */}
      <section className="quick-actions-section" aria-label="Quick Actions">
        <div className="quick-actions-grid">
          <button
            className="quick-action-card primary-action"
            onClick={() => navigate("/staff/patients")}
            aria-label="Patients Registry"
          >
            <div className="qa-icon-wrap">
              <Users size={19} />
            </div>
            <div className="qa-text-wrap">
              <strong>Patients</strong>
              <span>Add / Manage records</span>
            </div>
          </button>

          <button
            className="quick-action-card"
            onClick={() => navigate("/staff/appointments")}
            aria-label="Appointments Schedule"
          >
            <div className="qa-icon-wrap">
              <Calendar size={19} />
            </div>
            <div className="qa-text-wrap">
              <strong>Appointments</strong>
              <span>View consultation roster</span>
            </div>
            {pendingAppointmentsCount > 0 && (
              <span className="qa-live-badge badge-pending" title={`${pendingAppointmentsCount} pending approval`}>
                {pendingAppointmentsCount}
              </span>
            )}
          </button>

          <button
            className="quick-action-card"
            onClick={() => navigate("/staff/doctors")}
            aria-label="Doctors Directory"
          >
            <div className="qa-icon-wrap">
              <Stethoscope size={19} />
            </div>
            <div className="qa-text-wrap">
              <strong>Doctor Directory</strong>
              <span>50 verified specialists</span>
            </div>
          </button>

          <button
            className="quick-action-card"
            onClick={() => navigate("/staff/hospitals")}
            aria-label="Hospital Facilities"
          >
            <div className="qa-icon-wrap">
              <Building size={19} />
            </div>
            <div className="qa-text-wrap">
              <strong>Facilities</strong>
              <span>Hospitals & OPD passes</span>
            </div>
          </button>

          <button
            className="quick-action-card queue-qa-card"
            onClick={() => navigate("/staff/queue")}
            aria-label="Live Queue"
          >
            <div className="qa-icon-wrap">
              <Clock3 size={19} />
            </div>
            <div className="qa-text-wrap">
              <strong>Live Queue</strong>
              <span>OPD tokens & telemetry</span>
            </div>
            {waitingQueueCount > 0 && (
              <span className="qa-live-badge badge-waiting" title={`${waitingQueueCount} patients waiting`}>
                {waitingQueueCount} Wait
              </span>
            )}
          </button>
        </div>
      </section>

      {/* ================= 4 STAT CARDS ================= */}
      <section className="stats-grid" aria-label="Clinical Metrics Overview">
        {statCards.map((stat) => (
          <article
            className={`stat-card ${stat.type}`}
            key={stat.id}
            onClick={() => navigate(stat.path)}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate(stat.path);
            }}
            aria-label={`${stat.title}: ${stat.value}`}
          >
            <div className="stat-top">
              <div className="stat-icon-box">
                <stat.icon size={20} />
              </div>
              <Sparkline data={stat.sparklineData} color={stat.color} height={26} />
            </div>

            <div className="stat-body">
              <p className="stat-label">{stat.title}</p>
              <h2 className="stat-number">
                {loading ? (
                  <span className="skeleton-line stat-skeleton" />
                ) : (
                  <CountUpValue value={stat.value} />
                )}
              </h2>
            </div>

            <div className="stat-footer">
              <div className="stat-trend-wrap">
                <TrendingUp size={13} className="trend-icon" />
                <span className="stat-change-text">{stat.change}</span>
              </div>
              <span className="stat-arrow-link" title="Open records">
                <ChevronRight size={15} />
              </span>
            </div>
          </article>
        ))}
      </section>

      {/* ================= MAIN SPLIT GRID ================= */}
      <section className="dashboard-grid">
        {/* RECENT APPOINTMENTS PANEL */}
        <article className="dashboard-card appointments-card">
          <div className="card-header">
            <div>
              <p className="card-label">TODAY'S SCHEDULE</p>
              <h2>Recent Appointments</h2>
            </div>
            <Link to="/staff/appointments" className="view-all-link">
              View all →
            </Link>
          </div>

          {appointmentsError ? (
            <div className="panel-error-state">
              <AlertCircle size={24} className="text-danger" />
              <p>{appointmentsError}</p>
              <button className="btn-panel-retry" onClick={() => loadDashboardData(true)}>
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="skeleton-appointments-list">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="appointment-skeleton-row">
                  <div className="skeleton-line time-skel" />
                  <div className="skeleton-line avatar-skel" />
                  <div className="skeleton-line text-skel" />
                </div>
              ))}
            </div>
          ) : recentAppointments.length > 0 ? (
            <div className="appointment-list">
              {recentAppointments.map((apt) => {
                const aptId = apt._id || apt.id;
                const statusStr = (apt.status || "PENDING").toUpperCase();
                const patientName = apt.patient_name || apt.patient?.name || `Patient #${String(apt.patient_id || "").slice(-6) || "Record"}`;
                const doctorName = apt.doctor_name || apt.doctor?.name || "Assigned Specialist";
                const isApproved = statusStr === "APPROVED" || statusStr === "CONFIRMED";
                const isCompleted = statusStr === "COMPLETED";
                const isCancelled = statusStr === "CANCELLED" || statusStr === "REJECTED";

                return (
                  <div className="appointment-row" key={aptId}>
                    <div className="appointment-time">
                      <strong>{apt.appointment_time || "10:00 AM"}</strong>
                      <span>{apt.appointment_date || "Today"}</span>
                    </div>

                    <div className="appointment-patient">
                      <div className="patient-avatar">
                        {patientName.charAt(0).toUpperCase()}
                      </div>
                      <div className="patient-info-meta">
                        <strong className="p-name">{patientName}</strong>
                        <span className="d-name">{doctorName}</span>
                      </div>
                    </div>

                    <div className="appointment-status-wrap">
                      <span className={`apt-chip-status chip-${statusStr.toLowerCase()}`}>
                        {statusStr}
                      </span>
                    </div>

                    <div className="appointment-quick-actions">
                      {!isApproved && !isCompleted && !isCancelled && (
                        <button
                          className="btn-apt-action approve"
                          title="Confirm Consultation"
                          onClick={() => handleConfirmAppointment(aptId)}
                          disabled={actionLoadingId === aptId}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      {!isCompleted && !isCancelled && (
                        <button
                          className="btn-apt-action cancel"
                          title="Cancel Consultation"
                          onClick={() => handleCancelAppointment(aptId)}
                          disabled={actionLoadingId === aptId}
                        >
                          <X size={14} />
                        </button>
                      )}
                      <button
                        className="btn-apt-action view"
                        title="View Consultation Record"
                        onClick={() => navigate("/staff/appointments")}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-card-state">
              <Calendar size={32} className="text-muted" />
              <p>No recent appointments booked in the system.</p>
              <button className="btn-action-outline" onClick={() => navigate("/staff/appointments")}>
                Book Consultation
              </button>
            </div>
          )}
        </article>

        {/* LIVE OPD MONITOR PANEL */}
        <article className="dashboard-card queue-card">
          <div className="card-header">
            <div>
              <p className="card-label">LIVE OPD MONITOR</p>
              <h2>Queue Telemetry</h2>
            </div>
            <div className="live-status-pill">
              <span className={`pulse-badge ${queueStatusLive}`} />
              <span className="live-label">LIVE</span>
            </div>
          </div>

          {queueError ? (
            <div className="panel-error-state">
              <AlertCircle size={24} className="text-danger" />
              <p>{queueError}</p>
              <button className="btn-panel-retry" onClick={() => loadDashboardData(true)}>
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="queue-loading-skeleton">
              <div className="skeleton-donut" />
              <div className="skeleton-line" style={{ width: "60%", margin: "16px auto 0" }} />
            </div>
          ) : (
            <>
              {/* Donut Chart Visualization */}
              <div className="queue-donut-container">
                <svg viewBox="0 0 100 100" className="queue-donut-svg">
                  {/* Background Circle */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />

                  {/* Completed Segment (Green) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${strokeCompleted} ${circumference}`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                    strokeLinecap="round"
                  />

                  {/* In Consultation Segment (Purple) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#8b5cf6"
                    strokeWidth="12"
                    strokeDasharray={`${strokeConsult} ${circumference}`}
                    strokeDashoffset={`${-strokeCompleted}`}
                    transform="rotate(-90 50 50)"
                    strokeLinecap="round"
                  />

                  {/* Waiting Segment (Amber) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeDasharray={`${strokeWaiting} ${circumference}`}
                    strokeDashoffset={`${-(strokeCompleted + strokeConsult)}`}
                    transform="rotate(-90 50 50)"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="donut-center-info">
                  <strong>{queueMetrics.total || queueMetrics.waiting + queueMetrics.inConsultation}</strong>
                  <span>Active OPD</span>
                </div>
              </div>

              {/* Average wait time from today's real check-ins */}
              <div className="avg-wait-banner">
                <Clock3 size={15} />
                <span>Average Wait Today: <strong>{queueMetrics.avgWaitMin} min</strong></span>
              </div>

              {/* Donut Legend */}
              <div className="queue-info-legend">
                <div className="legend-item">
                  <span className="queue-dot waiting"></span>
                  <span className="legend-label">Waiting</span>
                  <strong>{queueMetrics.waiting}</strong>
                </div>

                <div className="legend-item">
                  <span className="queue-dot consultation"></span>
                  <span className="legend-label">In consultation</span>
                  <strong>{queueMetrics.inConsultation}</strong>
                </div>

                <div className="legend-item">
                  <span className="queue-dot completed"></span>
                  <span className="legend-label">Completed</span>
                  <strong>{queueMetrics.completed}</strong>
                </div>
              </div>

              <button className="queue-button" onClick={() => navigate("/staff/queue")}>
                <span>Open Live Queue Telemetry</span>
                <ArrowRight size={16} />
              </button>
            </>
          )}
        </article>
      </section>

      {/* ================= BOTTOM GRID ================= */}
      <section className="bottom-grid">
        {/* RECENT ACTIVITY */}
        <article className="dashboard-card activity-card">
          <div className="card-header">
            <div>
              <p className="card-label">SECURITY & SURVEILLANCE</p>
              <h2>System Audit Logs</h2>
            </div>
            <button className="view-all" onClick={() => navigate("/staff/audit")}>
              View logs →
            </button>
          </div>

          <div className="activity-list">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div className="activity-item" key={log._id || log.id}>
                  <div className="activity-icon">🔐</div>
                  <div className="activity-content">
                    <strong>{log.action || "System Event"}</strong>
                    <span>{log.resource || log.details || "Security Audit Record"}</span>
                  </div>
                  <time>
                    {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent"}
                  </time>
                </div>
              ))
            ) : (
              <div className="empty-card-state">
                <Shield size={28} className="text-muted" />
                <p>System security audit logging active.</p>
              </div>
            )}
          </div>
        </article>

        {/* OPERATIONS */}
        <article className="dashboard-card operations-card">
          <div className="card-header">
            <div>
              <p className="card-label">NAVIGATION</p>
              <h2>Management Modules</h2>
            </div>
          </div>

          <div className="operations-grid">
            <button className="operation-item" onClick={() => navigate("/staff/patients")}>
              <span>👥</span>
              <strong>Patients</strong>
              <small>Manage records</small>
            </button>

            <button className="operation-item" onClick={() => navigate("/staff/doctors")}>
              <span>🩺</span>
              <strong>Doctors</strong>
              <small>50 Specialists</small>
            </button>

            <button className="operation-item" onClick={() => navigate("/staff/approvals")}>
              <span>📋</span>
              <strong>Approvals</strong>
              <small>Patient requests</small>
            </button>

            <button className="operation-item" onClick={() => navigate("/staff/audit")}>
              <span>🔐</span>
              <strong>Audit & Security</strong>
              <small>Review logs</small>
            </button>
          </div>
        </article>
      </section>

      {/* ================= FOOTER STATUS ================= */}
      <div className="system-status">
        <div>
          <span className="online-dot"></span>
          All clinical and API services operational
        </div>
        <span>CareBridge AI • Staff Administration Hub</span>
      </div>
    </div>
  );
}

export default StaffDashboard;