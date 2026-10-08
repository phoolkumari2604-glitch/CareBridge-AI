import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  Stethoscope,
  Clock3,
  Search,
  Bell,
  Plus,
  Building,
  Shield,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import doctorService from "../../services/doctorService";
import patientService from "../../services/patientService";
import api from "../../services/api";
import "./StaffDashboard.css";

function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
  });

  const [recentLogs, setRecentLogs] = useState([]);

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);

      const [patientsRes, aptsRes, docsRes, queueRes, logsRes] = await Promise.allSettled([
        doctorService.getPatients(),
        doctorService.getAppointments(),
        doctorService.getDoctors(),
        patientService.getQueue(),
        api.get("/audit-logs/"),
      ]);

      const patients = patientsRes.status === "fulfilled" && Array.isArray(patientsRes.value) ? patientsRes.value : [];
      const apts = aptsRes.status === "fulfilled" && Array.isArray(aptsRes.value) ? aptsRes.value : [];
      const docs = docsRes.status === "fulfilled" && Array.isArray(docsRes.value) ? docsRes.value : [];
      const queue = queueRes.status === "fulfilled" && Array.isArray(queueRes.value) ? queueRes.value : [];
      const logs = logsRes.status === "fulfilled" && Array.isArray(logsRes.value?.data) ? logsRes.value.data : [];

      // Calculate stats
      const waiting = queue.filter((q) => q.status === "WAITING").length;
      const inConsultation = queue.filter((q) => q.status === "IN_CONSULTATION" || q.status === "CALLED").length;
      const completed = queue.filter((q) => q.status === "COMPLETED").length;

      setStats({
        patientsCount: patients.length,
        appointmentsCount: apts.length,
        doctorsCount: docs.length,
        queueTodayCount: queue.length || apts.length,
      });

      setQueueMetrics({
        total: queue.length,
        waiting: waiting || Math.max(0, apts.filter((a) => (a.status || "").toUpperCase() === "PENDING").length),
        inConsultation: inConsultation || Math.max(0, apts.filter((a) => (a.status || "").toUpperCase() === "APPROVED").length),
        completed: completed || Math.max(0, apts.filter((a) => (a.status || "").toUpperCase() === "COMPLETED").length),
      });

      // Prepare recent appointments with doctor and patient names
      const sortedApts = [...apts].sort((a, b) => new Date(b.created_at || b.appointment_date) - new Date(a.created_at || a.appointment_date));
      setRecentAppointments(sortedApts.slice(0, 5));

      setRecentLogs(logs.slice(0, 4));
    } catch (err) {
      console.error("Staff dashboard fetch error:", err);
      setError("Failed to load some dashboard metrics. Please refresh.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  const statCards = [
    {
      title: "Total Patients",
      value: stats.patientsCount,
      change: "Active Registry",
      icon: "👥",
      type: "blue",
      path: "/staff/patients",
    },
    {
      title: "Appointments",
      value: stats.appointmentsCount,
      change: "Scheduled",
      icon: "📅",
      type: "purple",
      path: "/staff/appointments",
    },
    {
      title: "Verified Doctors",
      value: stats.doctorsCount,
      change: "Directory",
      icon: "🩺",
      type: "green",
      path: "/staff/doctors",
    },
    {
      title: "Queue Active",
      value: stats.queueTodayCount,
      change: "Live Status",
      icon: "⏱️",
      type: "orange",
      path: "/staff/queue",
    },
  ];

  return (
    <div className="staff-dashboard">
      {/* ================= HEADER ================= */}
      <header className="staff-header">
        <div>
          <p className="staff-eyebrow">CAREBRIDGE AI — STAFF & ADMIN COMMAND</p>
          <h1>
            Welcome, <span>{user?.name || "Administrator"}</span> 👋
          </h1>
          <p className="staff-subtitle">
            Surveillance of hospital operations, clinical consultations, specialist rosters, and patient flow.
          </p>
        </div>

        <div className="staff-header-actions">
          <button
            className={`header-action ${isRefreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            title="Refresh Dashboard"
            disabled={isRefreshing}
          >
            <RefreshCw size={18} />
          </button>

          <Link to="/staff/notifications" className="header-action notification-button" title="View Notifications">
            <Bell size={18} />
          </Link>

          <div className="staff-user">
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

      {error && (
        <div className="dashboard-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ================= QUICK ACTIONS ================= */}
      <section className="quick-actions">
        <button className="quick-action primary" onClick={() => navigate("/staff/patients")}>
          <span>＋</span>
          Add / View Patients
        </button>

        <button className="quick-action" onClick={() => navigate("/staff/appointments")}>
          <span>📅</span>
          Appointments
        </button>

        <button className="quick-action" onClick={() => navigate("/staff/doctors")}>
          <span>🩺</span>
          Doctor Directory
        </button>

        <button className="quick-action" onClick={() => navigate("/staff/hospitals")}>
          <span>🏥</span>
          Hospital Facilities
        </button>

        <button className="quick-action" onClick={() => navigate("/staff/queue")}>
          <span>⏱️</span>
          Live Queue
        </button>
      </section>

      {/* ================= STATISTICS ================= */}
      <section className="stats-grid">
        {statCards.map((stat) => (
          <article
            className={`stat-card ${stat.type}`}
            key={stat.title}
            onClick={() => navigate(stat.path)}
            style={{ cursor: "pointer" }}
          >
            <div className="stat-top">
              <div className="stat-icon">{stat.icon}</div>
              <span className="stat-change">{stat.change}</span>
            </div>
            <p>{stat.title}</p>
            <h2>{loading ? "--" : stat.value}</h2>
            <div className="stat-progress">
              <span></span>
            </div>
          </article>
        ))}
      </section>

      {/* ================= MAIN GRID ================= */}
      <section className="dashboard-grid">
        {/* APPOINTMENTS */}
        <article className="dashboard-card appointments-card">
          <div className="card-header">
            <div>
              <p className="card-label">SCHEDULE</p>
              <h2>Recent Appointments</h2>
            </div>
            <button className="view-all" onClick={() => navigate("/staff/appointments")}>
              View all →
            </button>
          </div>

          <div className="appointment-list">
            {recentAppointments.length > 0 ? (
              recentAppointments.map((appointment) => {
                const statusStr = (appointment.status || "PENDING").toUpperCase();
                return (
                  <div className="appointment-row" key={appointment._id || appointment.id}>
                    <div className="appointment-time">
                      <strong>{appointment.appointment_time || "10:00 AM"}</strong>
                      <span>{appointment.appointment_date || "Today"}</span>
                    </div>

                    <div className="appointment-patient">
                      <div className="patient-avatar">
                        {(appointment.patient_name || "P").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{appointment.patient_name || `Patient #${String(appointment.patient_id || "").slice(-6)}`}</strong>
                        <span>{appointment.doctor_name || "Assigned Specialist"}</span>
                      </div>
                    </div>

                    <span className={`appointment-status ${statusStr.toLowerCase()}`}>
                      {statusStr}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="empty-card-state">
                <Calendar size={28} className="text-muted" />
                <p>No recent appointments booked in the system.</p>
              </div>
            )}
          </div>
        </article>

        {/* QUEUE */}
        <article className="dashboard-card queue-card">
          <div className="card-header">
            <div>
              <p className="card-label">LIVE OPD MONITOR</p>
              <h2>Queue Telemetry</h2>
            </div>
            <span className="live-badge">
              <span></span>
              LIVE
            </span>
          </div>

          <div className="queue-circle">
            <div className="queue-circle-inner">
              <strong>{queueMetrics.total || queueMetrics.waiting + queueMetrics.inConsultation}</strong>
              <span>Active OPD</span>
            </div>
          </div>

          <div className="queue-info">
            <div>
              <span className="queue-dot waiting"></span>
              Waiting
              <strong>{queueMetrics.waiting}</strong>
            </div>

            <div>
              <span className="queue-dot consultation"></span>
              In consultation
              <strong>{queueMetrics.inConsultation}</strong>
            </div>

            <div>
              <span className="queue-dot completed"></span>
              Completed
              <strong>{queueMetrics.completed}</strong>
            </div>
          </div>

          <button className="queue-button" onClick={() => navigate("/staff/queue")}>
            Manage OPD Queue
          </button>
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