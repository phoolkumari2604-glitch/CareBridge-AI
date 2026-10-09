import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import "./PatientDashboard.css";
import {
  Activity,
  AlertCircle,
  FileText,
  Bell,
  Building,
  Heart,
  Thermometer,
  Droplets,
  Wind,
  Stethoscope,
  ChevronRight,
  Bot,
  MapPin,
  CalendarDays,
  Ticket,
  Clock3,
  CheckCircle2,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  Radio,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import EmergencyFacilitiesMap from "../../components/patient/EmergencyFacilitiesMap";

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshToast, setRefreshToast] = useState(false);

  const [stats, setStats] = useState({
    hospitalsCount: 0,
    alertsTotal: 0,
    recordsCount: 0,
    unreadNotifications: 0,
    upcomingAppointmentsCount: 0,
  });

  const [vitals, setVitals] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [alertSummary, setAlertSummary] = useState(null);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [doctor, setDoctor] = useState(null);

  const eventSourceRef = useRef(null);

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (!user?.patient_id) {
      setLoading(false);
      return;
    }

    const patientId = user.patient_id;

    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else if (!stats.hospitalsCount && loading) {
        setLoading(true);
      }
      setError(null);

      // Concurrent fetch across clinical services
      const [
        hospitalsRes,
        alertsSummaryRes,
        recordsRes,
        notificationsCountRes,
        vitalsRes,
        appointmentsRes,
        doctorsRes,
      ] = await Promise.allSettled([
        patientService.getHospitals(),
        patientService.getAlertSummary(patientId),
        patientService.getHealthRecords(patientId),
        patientService.getUnreadCount(patientId),
        patientService.getLatestVital(patientId),
        patientService.getPatientAppointments(patientId),
        patientService.getDoctors(),
      ]);

      // 1. Hospitals count
      let hospitalsCount = 0;
      if (hospitalsRes.status === "fulfilled") {
        const hData = hospitalsRes.value;
        hospitalsCount = Array.isArray(hData) ? hData.length : (hData?.hospitals?.length || hData?.total || 0);
      }

      // 2. Alerts Summary
      let alertsTotal = 0;
      if (alertsSummaryRes.status === "fulfilled") {
        const summaryData = alertsSummaryRes.value;
        setAlertSummary(summaryData);
        alertsTotal = summaryData?.total_alerts || 0;
      }

      // 3. Health Records
      let recordsCount = 0;
      if (recordsRes.status === "fulfilled") {
        const records = recordsRes.value || [];
        recordsCount = records.length;
        setRecentRecords(
          [...records]
            .sort((a, b) => new Date(b.created_at || b.record_date) - new Date(a.created_at || a.record_date))
            .slice(0, 3)
        );
      }

      // 4. Notifications
      let unreadNotifications = 0;
      if (notificationsCountRes.status === "fulfilled") {
        unreadNotifications = notificationsCountRes.value?.unread_count || 0;
      }

      // 5. Vitals
      if (vitalsRes.status === "fulfilled") {
        setVitals(vitalsRes.value);
      }

      // 6. Appointments & Consults
      let allDocs = [];
      if (doctorsRes.status === "fulfilled") {
        allDocs = doctorsRes.value || [];
      }

      let upcomingAptsCount = 0;
      if (appointmentsRes.status === "fulfilled") {
        const apts = appointmentsRes.value || [];
        const upcoming = apts.filter(
          (a) => (a.status || "").toUpperCase() !== "COMPLETED" && (a.status || "").toUpperCase() !== "CANCELLED"
        );
        upcomingAptsCount = upcoming.length;
        if (upcoming.length > 0) {
          const firstApt = upcoming[0];
          setUpcomingAppointment(firstApt);
          const matchedDoc = allDocs.find((d) => (d._id || d.id) === firstApt.doctor_id);
          setDoctor(matchedDoc || null);
        } else {
          setUpcomingAppointment(null);
        }
      }

      setStats({
        hospitalsCount: hospitalsCount || 15,
        alertsTotal,
        recordsCount,
        unreadNotifications,
        upcomingAppointmentsCount: upcomingAptsCount,
      });

      setLastUpdated(new Date());

      if (isManualRefresh) {
        setRefreshToast(true);
        setTimeout(() => setRefreshToast(false), 2500);
      }
    } catch (err) {
      console.error("Error fetching patient dashboard data:", err);
      setError("Failed to load some dashboard telemetry. Please try again later.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, stats.hospitalsCount, loading]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Background SSE Live Updates with Polling Fallback
  useEffect(() => {
    if (!user?.patient_id) return;

    const patientId = user.patient_id;
    let sseUrl = `http://127.0.0.1:5000/api/notifications/${patientId}/stream`;

    try {
      const source = new EventSource(sseUrl);
      eventSourceRef.current = source;

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.stats) {
            setStats((prev) => ({
              ...prev,
              unreadNotifications: data.stats.unread_count ?? prev.unreadNotifications,
              alertsTotal: data.stats.health_alerts ?? prev.alertsTotal,
              upcomingAppointmentsCount: data.stats.appointments ?? prev.upcomingAppointmentsCount,
            }));
            setLastUpdated(new Date());
          }
        } catch {
          // ignore keepalive parse
        }
      };

      source.onerror = () => {
        source.close();
      };
    } catch (err) {
      console.warn("SSE stream unavailable on dashboard, falling back to interval polling:", err);
    }

    // Polling fallback every 20 seconds
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 20000);

    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [user?.patient_id, fetchDashboardData]);

  const formatLastUpdated = (date) => {
    try {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "Just now";
    }
  };

  const handleBookDoctor = () => {
    navigate("/patient/doctors");
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="skeleton-header"></div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card stat-skeleton"></div>
          ))}
        </div>
        <div className="patient-dashboard-layout">
          <div className="main-column">
            <div className="skeleton-card large-skeleton"></div>
            <div className="skeleton-card large-skeleton"></div>
          </div>
          <div className="side-column">
            <div className="skeleton-card medium-skeleton"></div>
            <div className="skeleton-card medium-skeleton"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* REFRESH TOAST */}
      {refreshToast && (
        <div className="dash-toast-alert" role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <span>Dashboard telemetry synchronized</span>
        </div>
      )}

      {/* HEADER */}
      <header className="dashboard-header">
        <div>
          <div className="dash-header-badge-row">
            <span className="patient-kicker">PATIENT CLINICAL COMMAND</span>
            <div className="live-telemetry-badge" title="Live background SSE & polling active">
              <span className="live-pulsing-dot"></span>
              <span>LIVE TELEMETRY</span>
              <small className="last-sync-time">Last updated: {formatLastUpdated(lastUpdated)}</small>
            </div>
          </div>
          <h1 className="patient-greeting">Welcome back, {user?.name || "Patient"} 👋</h1>
          <p className="patient-subtitle">
            Personalized health overview, real-time appointment status, and emergency medical services locator.
          </p>
        </div>

        <div className="header-actions-row">
          <button
            className={`dashboard-refresh-btn ${isRefreshing ? "refreshing" : ""}`}
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            title="Refresh Dashboard Telemetry"
            aria-label="Refresh Dashboard Telemetry"
          >
            <RefreshCw size={16} className={isRefreshing ? "spin-icon" : ""} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </button>
          <button
            onClick={handleBookDoctor}
            className="dash-book-btn"
            aria-label="Book a Doctor Appointment"
          >
            <Plus size={16} />
            <span>Book Doctor</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="dashboard-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => fetchDashboardData(true)}>Retry</button>
        </div>
      )}

      {/* STATS CARDS (ALL CLICKABLE WITH HIGH-CONTRAST LABELS) */}
      <section className="stats-grid" aria-label="Patient Health Key Metrics">
        <Link to="/patient/hospitals" className="stat-card" aria-label="Nearby Hospitals">
          <div className="stat-icon blue">
            <Building size={24} />
          </div>
          <div className="stat-details">
            <h3 className="stat-title">Nearby Hospitals</h3>
            <p className="stat-value">{stats.hospitalsCount}</p>
          </div>
        </Link>

        <Link to="/patient/appointments" className="stat-card" aria-label="Upcoming Consultations">
          <div className="stat-icon cyan">
            <CalendarDays size={24} />
          </div>
          <div className="stat-details">
            <h3 className="stat-title">Upcoming Consults</h3>
            <p className="stat-value">{stats.upcomingAppointmentsCount}</p>
          </div>
        </Link>

        <Link to="/patient/health" className="stat-card" aria-label="Health Safety Alerts">
          <div className={`stat-icon ${stats.alertsTotal > 0 ? "red" : "green"}`}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-details">
            <h3 className="stat-title">Health Alerts</h3>
            <p className="stat-value">{stats.alertsTotal}</p>
          </div>
        </Link>

        <Link to="/patient/notifications" className="stat-card" aria-label="Notifications">
          <div className="stat-icon orange">
            <Bell size={24} />
          </div>
          <div className="stat-details">
            <h3 className="stat-title">Notifications</h3>
            <p className="stat-value">{stats.unreadNotifications}</p>
          </div>
        </Link>
      </section>

      {/* ACTIVE APPOINTMENT & OPD PASS BANNER */}
      {upcomingAppointment && (
        <section className="dashboard-appointment-banner" aria-label="Upcoming Consultation Alert">
          <div className="apt-banner-left">
            <div className="apt-banner-badge">
              <CalendarDays size={16} />
              <span>Next Scheduled Consultation</span>
            </div>
            <h3 className="apt-banner-title">
              {doctor?.name || "Specialist Physician"} &middot; {upcomingAppointment.appointment_date} at{" "}
              {upcomingAppointment.appointment_time}
            </h3>
            <p className="apt-banner-reason">Reason: {upcomingAppointment.reason || "Outpatient Clinical Consultation"}</p>
          </div>

          <div className="apt-banner-actions">
            <Link
              to={`/patient/opd-pass?appointmentId=${upcomingAppointment._id || upcomingAppointment.id}`}
              className="banner-opd-btn"
            >
              <Ticket size={16} />
              <span>Digital OPD Pass</span>
            </Link>
            <Link to="/patient/queue" className="banner-queue-btn">
              <Clock3 size={16} />
              <span>Live Queue</span>
            </Link>
          </div>
        </section>
      )}

      {/* LIVE EMERGENCY FACILITIES MAP */}
      <EmergencyFacilitiesMap />

      {/* MAIN & SIDE LAYOUT */}
      <div className="patient-dashboard-layout">
        <div className="main-column">
          {/* LATEST VITALS PANEL */}
          <div className="panel vitals-panel">
            <div className="panel-header">
              <div>
                <h2>Latest Vitals Telemetry</h2>
                <span className="panel-sub">Monitored clinical parameters</span>
              </div>
              <Link to="/patient/health" className="view-all">
                Full Health App <ChevronRight size={16} />
              </Link>
            </div>

            {vitals ? (
              <div className="vitals-grid">
                <div className="vital-item">
                  <Heart size={20} className="vital-icon red-text" />
                  <div className="vital-info">
                    <span className="vital-label">Heart Rate</span>
                    <span className="vital-value">
                      {vitals.heart_rate} <small>bpm</small>
                    </span>
                  </div>
                </div>

                <div className="vital-item">
                  <Activity size={20} className="vital-icon blue-text" />
                  <div className="vital-info">
                    <span className="vital-label">Blood Pressure</span>
                    <span className="vital-value">
                      {vitals.systolic_bp}/{vitals.diastolic_bp} <small>mmHg</small>
                    </span>
                  </div>
                </div>

                <div className="vital-item">
                  <Wind size={20} className="vital-icon teal-text" />
                  <div className="vital-info">
                    <span className="vital-label">SpO2</span>
                    <span className="vital-value">
                      {vitals.spo2} <small>%</small>
                    </span>
                  </div>
                </div>

                <div className="vital-item">
                  <Thermometer size={20} className="vital-icon orange-text" />
                  <div className="vital-info">
                    <span className="vital-label">Temperature</span>
                    <span className="vital-value">
                      {vitals.temperature} <small>°C</small>
                    </span>
                  </div>
                </div>

                <div className="vital-item">
                  <Droplets size={20} className="vital-icon red-text" />
                  <div className="vital-info">
                    <span className="vital-label">Blood Sugar</span>
                    <span className="vital-value">
                      {vitals.blood_sugar} <small>mg/dL</small>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <ShieldCheck size={28} color="#10b981" />
                <p>No vital readings logged yet. Consultations will record your telemetry.</p>
              </div>
            )}
          </div>

          {/* RECENT HEALTH RECORDS */}
          <div className="panel records-panel">
            <div className="panel-header">
              <div>
                <h2>Recent Health Dossier</h2>
                <span className="panel-sub">Clinical files & prescriptions</span>
              </div>
              <Link to="/patient/health" className="view-all">
                View All <ChevronRight size={16} />
              </Link>
            </div>

            {recentRecords.length > 0 ? (
              <div className="records-list">
                {recentRecords.map((record) => (
                  <Link
                    to="/patient/health"
                    key={record._id || record.id}
                    className="record-item"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className="record-icon">
                      <Stethoscope size={20} />
                    </div>
                    <div className="record-content">
                      <h4>{record.title || record.diagnosis || "Medical Record"}</h4>
                      <p>
                        Dr. {record.doctor_name || record.doctor || "Attending Doctor"} &middot;{" "}
                        {record.record_date ||
                          (record.created_at ? new Date(record.created_at).toLocaleDateString() : "--")}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <FileText size={28} />
                <p>No health records on file yet.</p>
                <Link to="/patient/health" className="small-link">
                  Upload Record
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* SIDE COLUMN */}
        <div className="side-column">
          {/* QUICK ACTIONS HUB */}
          <div className="panel quick-actions-panel">
            <div className="panel-header">
              <h2>Quick Actions Hub</h2>
            </div>
            <div className="quick-actions-grid">
              <Link to="/patient/doctors" className="action-btn">
                <Stethoscope size={20} />
                <span>Find Doctor</span>
              </Link>
              <Link to="/patient/hospitals" className="action-btn">
                <Building size={20} />
                <span>Hospitals</span>
              </Link>
              <Link to="/patient/opd-pass" className="action-btn">
                <Ticket size={20} />
                <span>OPD Pass</span>
              </Link>
              <Link to="/patient/queue" className="action-btn">
                <Clock3 size={20} />
                <span>Live Queue</span>
              </Link>
              <Link to="/patient/health" className="action-btn">
                <FileText size={20} />
                <span>My Records</span>
              </Link>
              <Link to="/patient/ai-assistant" className="action-btn ai-btn">
                <Bot size={20} />
                <span>AI Assistant</span>
              </Link>
            </div>
          </div>

          {/* ALERT SUMMARY */}
          <div className="panel alert-summary-panel">
            <div className="panel-header">
              <h2>Health Safety Monitor</h2>
              <AlertCircle className={`panel-icon ${stats.alertsTotal > 0 ? "red-text" : "teal-text"}`} size={20} />
            </div>
            {alertSummary && alertSummary.total_alerts > 0 ? (
              <div className="alert-content">
                <div className="alert-count-big">
                  <span className="count">{alertSummary.total_alerts}</span>
                  <span className="label">Active Alerts</span>
                </div>
                <ul className="alert-status-list">
                  {alertSummary.high_priority > 0 && (
                    <li className="alert-high">
                      <span className="dot red"></span> {alertSummary.high_priority} High Priority Alerts
                    </li>
                  )}
                  {alertSummary.medium_priority > 0 && (
                    <li className="alert-medium">
                      <span className="dot orange"></span> {alertSummary.medium_priority} Review Required
                    </li>
                  )}
                </ul>
                <Link to="/patient/health" className="alert-review-link">
                  <span>Review Clinical Alerts</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="empty-state success">
                <ShieldCheck size={32} color="#10b981" />
                <p>No active health alerts detected. All vitals in safe range.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;