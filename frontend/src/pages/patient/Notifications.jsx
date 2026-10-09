import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartPulse,
  Info,
  Trash2,
  Check,
  AlertTriangle,
  Hospital,
  ShieldCheck,
  Filter,
  Vibrate,
  VibrateOff,
  Radio,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
  Activity,
  X,
  Volume2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import "./Notifications.css";

const VIBRATION_PATTERNS = {
  CRITICAL: [400, 200, 400, 200, 400],
  WARNING: [200, 100, 200],
  INFO: [150],
};

function Notifications() {
  const { user } = useAuth();
  const patientId = user?.patient_id || user?.id;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [healthCount, setHealthCount] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Filters & Views
  const [activeTab, setActiveTab] = useState("all"); // "all", "unread", "appointments", "health", "queue", "system", "calendar"
  const [calendarViewMode, setCalendarViewMode] = useState("month"); // "month" | "week"
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);

  // Live stream & Vibration state
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(() => {
    return localStorage.getItem("carebridge_vibration_mode") === "true";
  });
  const [hasVibrationSupport, setHasVibrationSupport] = useState(true);
  const [pulsingAlertId, setPulsingAlertId] = useState(null);
  const [pulseBell, setPulseBell] = useState(false);

  // New Reminder Modal
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: "",
    message: "",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    notification_type: "APPOINTMENT_REMINDER",
    severity: "INFO",
  });

  const eventSourceRef = useRef(null);

  // Check Vibration API support
  useEffect(() => {
    if (typeof navigator !== "undefined" && !("vibrate" in navigator)) {
      setHasVibrationSupport(false);
    }
  }, []);

  // Request Browser Notification Permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Toggle Vibration Mode
  const toggleVibration = () => {
    const next = !vibrationEnabled;
    setVibrationEnabled(next);
    localStorage.setItem("carebridge_vibration_mode", String(next));
    if (next && "vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
    showToast(`Vibration alert mode turned ${next ? "ON" : "OFF"}.`);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Trigger alert vibration & background notification
  const triggerAlertFeedback = useCallback(
    (notif) => {
      const severity = (notif.severity || notif.notification_type || "INFO").toUpperCase();
      const pattern = severity.includes("CRITICAL")
        ? VIBRATION_PATTERNS.CRITICAL
        : severity.includes("WARNING") || severity.includes("ALERT")
        ? VIBRATION_PATTERNS.WARNING
        : VIBRATION_PATTERNS.INFO;

      // Shake animations
      setPulsingAlertId(notif.id || notif._id);
      setPulseBell(true);
      setTimeout(() => {
        setPulsingAlertId(null);
        setPulseBell(false);
      }, 2500);

      // Vibration
      if (vibrationEnabled && typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(pattern);
        } catch (e) {
          // ignore
        }
      }

      // Background OS Notification
      if (
        typeof document !== "undefined" &&
        document.hidden &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(notif.title || "CareBridge AI Health Alert", {
            body: notif.message || "You have a new clinical notification.",
            icon: "/favicon.ico",
          });
        } catch (e) {
          // ignore
        }
      }
    },
    [vibrationEnabled]
  );

  // Fetch initial notifications & appointment events
  const loadNotificationsData = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [notifsRes, countsRes, aptsRes] = await Promise.allSettled([
        patientService.getNotifications(patientId),
        patientService.getUnreadCount(patientId),
        patientService.getAppointments(patientId),
      ]);

      if (notifsRes.status === "fulfilled") {
        setNotifications(Array.isArray(notifsRes.value) ? notifsRes.value : []);
      }
      if (countsRes.status === "fulfilled") {
        const c = countsRes.value || {};
        setUnreadCount(c.unread_count || 0);
        setAppointmentsCount(c.appointments_count || 0);
        setQueueCount(c.queue_count || 0);
        setHealthCount(c.health_count || 0);
      }
      if (aptsRes.status === "fulfilled") {
        setAppointments(Array.isArray(aptsRes.value) ? aptsRes.value : []);
      }
    } catch (err) {
      console.error("Failed to load notifications data:", err);
      setError("Unable to retrieve notifications. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadNotificationsData();
  }, [loadNotificationsData]);

  // Setup SSE Real-time Live Updates Stream with Polling Fallback
  useEffect(() => {
    if (!patientId) return;

    let sseUrl = `http://127.0.0.1:5000/api/notifications/${patientId}/stream`;
    try {
      const source = new EventSource(sseUrl);
      eventSourceRef.current = source;

      source.addEventListener("notification", (e) => {
        try {
          const newNotif = JSON.parse(e.data);
          setNotifications((prev) => {
            if (prev.some((n) => (n.id || n._id) === (newNotif.id || newNotif._id))) return prev;
            return [newNotif, ...prev];
          });
          setUnreadCount((prev) => prev + 1);
          triggerAlertFeedback(newNotif);
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      });

      source.onerror = () => {
        // Fallback to light periodic polling
        setIsLiveStreaming(false);
        source.close();
      };

      source.onopen = () => {
        setIsLiveStreaming(true);
      };
    } catch (e) {
      setIsLiveStreaming(false);
    }

    // Polling fallback interval
    const interval = setInterval(async () => {
      try {
        const counts = await patientService.getUnreadCount(patientId);
        if (counts) {
          setUnreadCount(counts.unread_count || 0);
          setAppointmentsCount(counts.appointments_count || 0);
          setQueueCount(counts.queue_count || 0);
          setHealthCount(counts.health_count || 0);
        }
      } catch (err) {
        // silence background poll
      }
    }, 8000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearInterval(interval);
    };
  }, [patientId, triggerAlertFeedback]);

  // Actions
  const handleMarkAsRead = async (id) => {
    try {
      await patientService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => ((n.id || n._id) === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Mark as read failed:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await patientService.markAllNotificationsRead(patientId);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      showToast("All notifications marked as read.");
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear all notifications?")) {
      try {
        await patientService.clearAllNotifications(patientId);
        setNotifications([]);
        setUnreadCount(0);
        showToast("All notifications cleared.");
      } catch (err) {
        console.error("Clear all failed:", err);
      }
    }
  };

  const handleSimulateAlert = async (severity = "CRITICAL") => {
    try {
      const titles = {
        CRITICAL: "🚨 Critical Heart Rate Telemetry Alert",
        WARNING: "⚠️ High Blood Pressure Reading Detected (148/92 mmHg)",
        INFO: "ℹ️ Upcoming Cardiology Consultation in 30 Minutes",
      };
      const messages = {
        CRITICAL: "Real-time telemetry flagged an acute tachycardic spike exceeding 125 BPM. Please sit calmly and check your pulse.",
        WARNING: "Your systolic blood pressure crossed the 140 mmHg warning threshold during today's logging.",
        INFO: "Your scheduled consultation with Dr. Sharma is confirmed for 10:30 AM at OPD Chamber 304.",
      };

      const res = await patientService.simulateAlert(patientId, {
        severity,
        notification_type: severity === "INFO" ? "APPOINTMENT_REMINDER" : "HEALTH_ALERT",
        title: titles[severity],
        message: messages[severity],
      });

      if (res?.notification) {
        setNotifications((prev) => [res.notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        triggerAlertFeedback(res.notification);
        showToast(`Dispatched test ${severity.toLowerCase()} notification!`);
      }
    } catch (err) {
      console.error("Simulate alert failed:", err);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!newReminder.title.trim()) return;

    try {
      const res = await patientService.simulateAlert(patientId, {
        title: newReminder.title.trim(),
        message: `${newReminder.message.trim()} (Scheduled for ${newReminder.date} at ${newReminder.time})`,
        notification_type: newReminder.notification_type,
        severity: newReminder.severity,
      });

      if (res?.notification) {
        setNotifications((prev) => [res.notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        showToast("Calendar reminder saved successfully.");
        setReminderModalOpen(false);
        setNewReminder({
          title: "",
          message: "",
          date: new Date().toISOString().split("T")[0],
          time: "09:00",
          notification_type: "APPOINTMENT_REMINDER",
          severity: "INFO",
        });
      }
    } catch (err) {
      console.error("Failed to create reminder:", err);
    }
  };

  // Filtered List
  const filteredNotifications = notifications.filter((n) => {
    const type = (n.notification_type || "").toUpperCase();
    if (activeTab === "unread") return !n.is_read;
    if (activeTab === "appointments") return type.includes("APPOINTMENT");
    if (activeTab === "health") return type.includes("HEALTH") || type.includes("ALERT") || type.includes("VITAL");
    if (activeTab === "queue") return type.includes("QUEUE") || type.includes("OPD");
    if (activeTab === "system") return type.includes("SYSTEM") || type.includes("GENERAL");
    return true;
  });

  // Calendar Helpers
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const getEventsForDate = (dateStr) => {
    const aptMatches = appointments.filter((a) => a.appointment_date === dateStr);
    const notifMatches = notifications.filter((n) => {
      const created = (n.created_at || "").split("T")[0];
      return created === dateStr;
    });
    return [...aptMatches.map((a) => ({ ...a, eventType: "APPOINTMENT" })), ...notifMatches.map((n) => ({ ...n, eventType: "ALERT" }))];
  };

  const handleDateClick = (dayNum) => {
    const targetDate = new Date(year, month, dayNum);
    setSelectedDate(targetDate);
    const dateStr = targetDate.toISOString().split("T")[0];
    const events = getEventsForDate(dateStr);
    setSelectedDayEvents(events);
  };

  const getIconForType = (type, severity) => {
    const t = (type || "").toUpperCase();
    const s = (severity || "").toUpperCase();
    if (s === "CRITICAL" || t.includes("CRITICAL")) return AlertTriangle;
    if (t.includes("APPOINTMENT")) return CalendarDays;
    if (t.includes("QUEUE")) return Clock3;
    if (t.includes("HEALTH") || t.includes("ALERT") || t.includes("VITAL")) return HeartPulse;
    return Bell;
  };

  return (
    <div className="notifications-page">
      {/* ADD REMINDER MODAL */}
      {reminderModalOpen && (
        <div className="notif-modal-backdrop" onClick={() => setReminderModalOpen(false)}>
          <div className="notif-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <div className="modal-title">
                <CalendarIcon size={18} />
                <span>Schedule Healthcare Reminder</span>
              </div>
              <button onClick={() => setReminderModalOpen(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="notif-reminder-form">
              <div className="form-group">
                <label>Reminder Title</label>
                <input
                  type="text"
                  placeholder="e.g. Fasting Glucose Test, Blood Pressure Check, Medication"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Scheduled Date</label>
                  <input
                    type="date"
                    value={newReminder.date}
                    onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={newReminder.time}
                    onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newReminder.notification_type}
                    onChange={(e) => setNewReminder({ ...newReminder, notification_type: e.target.value })}
                  >
                    <option value="APPOINTMENT_REMINDER">Appointment Reminder</option>
                    <option value="HEALTH_ALERT">Health & Vitals Check</option>
                    <option value="MEDICATION">Medication Schedule</option>
                    <option value="GENERAL">General Notice</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Alert Severity</label>
                  <select
                    value={newReminder.severity}
                    onChange={(e) => setNewReminder({ ...newReminder, severity: e.target.value })}
                  >
                    <option value="INFO">Informational (1 soft chime)</option>
                    <option value="WARNING">Warning (2 pulses)</option>
                    <option value="CRITICAL">Critical (Repeated pulse)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Details / Instructions</label>
                <textarea
                  rows="3"
                  placeholder="Additional medical instructions or fasting requirements..."
                  value={newReminder.message}
                  onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                />
              </div>

              <div className="notif-modal-actions">
                <button type="button" onClick={() => setReminderModalOpen(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-save-reminder">
                  Save to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER */}
      <section className="notifications-header">
        <div>
          <span className="notif-kicker">REAL-TIME CLINICAL EVENT STREAM</span>
          <div className="title-row">
            <h1>Notifications & Alerts</h1>
            <div className={`bell-indicator-icon ${pulseBell ? "bell-shake" : ""}`}>
              <Bell size={22} />
              {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
            </div>
          </div>
          <p>
            Stay updated with appointment confirmations, prescription alerts, critical physiological thresholds, and live OPD queue movements.
          </p>
        </div>

        <div className="notif-header-actions">
          {/* VIBRATION TOGGLE */}
          <button
            type="button"
            className={`vibration-toggle-btn ${vibrationEnabled ? "enabled" : ""}`}
            onClick={toggleVibration}
            title={
              hasVibrationSupport
                ? `Vibration Alert Mode is ${vibrationEnabled ? "ACTIVE" : "OFF"}`
                : "Vibration API not supported on this browser (Visual animation active)"
            }
          >
            {vibrationEnabled ? <Vibrate size={16} /> : <VibrateOff size={16} />}
            <span>Vibration {vibrationEnabled ? "ON" : "OFF"}</span>
          </button>

          {/* LIVE STREAM BADGE */}
          <div className={`live-stream-badge ${isLiveStreaming ? "active" : "polling"}`}>
            <Radio size={14} className="live-radio-icon" />
            <span>{isLiveStreaming ? "LIVE SYNCED" : "POLLING"}</span>
          </div>

          <button type="button" onClick={handleMarkAllRead} className="notif-action-btn" title="Mark all as read">
            <Check size={16} />
            <span>Mark All Read</span>
          </button>

          <button type="button" onClick={handleClearAll} className="notif-action-btn danger" title="Clear all">
            <Trash2 size={16} />
            <span>Clear All</span>
          </button>
        </div>
      </section>

      {/* TOAST BANNER */}
      {toastMessage && (
        <div className="notif-toast-banner">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SIMULATE TEST ALERTS & STATUS */}
      <section className="sim-alert-tray">
        <div className="sim-alert-label">
          <Zap size={14} />
          <span>Test Alert Simulator:</span>
        </div>
        <div className="sim-buttons">
          <button type="button" onClick={() => handleSimulateAlert("CRITICAL")} className="sim-btn critical">
            🚨 Trigger Critical Alert
          </button>
          <button type="button" onClick={() => handleSimulateAlert("WARNING")} className="sim-btn warning">
            ⚠️ Trigger Warning Alert
          </button>
          <button type="button" onClick={() => handleSimulateAlert("INFO")} className="sim-btn info">
            ℹ️ Trigger Appointment Notice
          </button>
        </div>
        {!hasVibrationSupport && (
          <span className="vibration-note">
            <Info size={12} /> Visual shake animation active (device lacks hardware vibration).
          </span>
        )}
      </section>

      {/* SUMMARY KPI COUNTERS */}
      <section className="notif-summary-grid">
        <div
          className={`notif-stat-card ${activeTab === "unread" ? "selected" : ""}`}
          onClick={() => setActiveTab("unread")}
        >
          <div className="stat-icon-wrap blue">
            <Bell size={20} />
          </div>
          <div className="stat-info">
            <span>Unread Alerts</span>
            <strong>{unreadCount}</strong>
          </div>
        </div>

        <div
          className={`notif-stat-card ${activeTab === "appointments" ? "selected" : ""}`}
          onClick={() => setActiveTab("appointments")}
        >
          <div className="stat-icon-wrap green">
            <CalendarDays size={20} />
          </div>
          <div className="stat-info">
            <span>Appointments</span>
            <strong>{appointmentsCount}</strong>
          </div>
        </div>

        <div
          className={`notif-stat-card ${activeTab === "queue" ? "selected" : ""}`}
          onClick={() => setActiveTab("queue")}
        >
          <div className="stat-icon-wrap orange">
            <Clock3 size={20} />
          </div>
          <div className="stat-info">
            <span>Queue Updates</span>
            <strong>{queueCount}</strong>
          </div>
        </div>

        <div
          className={`notif-stat-card ${activeTab === "health" ? "selected" : ""}`}
          onClick={() => setActiveTab("health")}
        >
          <div className="stat-icon-wrap red">
            <HeartPulse size={20} />
          </div>
          <div className="stat-info">
            <span>Health & Vitals</span>
            <strong>{healthCount}</strong>
          </div>
        </div>
      </section>

      {/* TABS SELECTOR */}
      <section className="notif-tabs-bar">
        <div className="tabs-left">
          <button className={`tab-pill ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
            All ({notifications.length})
          </button>
          <button
            className={`tab-pill ${activeTab === "unread" ? "active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread ({unreadCount})
          </button>
          <button
            className={`tab-pill ${activeTab === "appointments" ? "active" : ""}`}
            onClick={() => setActiveTab("appointments")}
          >
            Appointments
          </button>
          <button
            className={`tab-pill ${activeTab === "health" ? "active" : ""}`}
            onClick={() => setActiveTab("health")}
          >
            Health & Alerts
          </button>
          <button
            className={`tab-pill ${activeTab === "queue" ? "active" : ""}`}
            onClick={() => setActiveTab("queue")}
          >
            Live Queue
          </button>
          <button
            className={`tab-pill ${activeTab === "calendar" ? "active" : ""}`}
            onClick={() => setActiveTab("calendar")}
          >
            <CalendarIcon size={14} /> Clinical Calendar
          </button>
        </div>

        {activeTab === "calendar" && (
          <button type="button" onClick={() => setReminderModalOpen(true)} className="add-reminder-btn">
            <Plus size={15} /> Add Reminder
          </button>
        )}
      </section>

      {/* VIEW CONTENT */}
      {activeTab === "calendar" ? (
        /* CALENDAR WORKFLOW VIEW */
        <section className="calendar-section">
          <div className="calendar-layout">
            <div className="calendar-main-card">
              <div className="calendar-header-bar">
                <div className="cal-title">
                  <h2>
                    {selectedDate.toLocaleString("default", { month: "long" })} {year}
                  </h2>
                </div>
                <div className="cal-nav">
                  <button
                    onClick={() => setSelectedDate(new Date(year, month - 1, 1))}
                    className="cal-nav-btn"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setSelectedDate(new Date())} className="cal-today-btn">
                    Today
                  </button>
                  <button
                    onClick={() => setSelectedDate(new Date(year, month + 1, 1))}
                    className="cal-nav-btn"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* MONTH GRID */}
              <div className="calendar-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                  <div key={dayName} className="cal-day-name">
                    {dayName}
                  </div>
                ))}

                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="cal-cell empty" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const events = getEventsForDate(dateStr);
                  const isToday =
                    new Date().getDate() === dayNum &&
                    new Date().getMonth() === month &&
                    new Date().getFullYear() === year;
                  const isSelected = selectedDate.getDate() === dayNum && selectedDate.getMonth() === month;

                  return (
                    <div
                      key={dayNum}
                      className={`cal-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${
                        events.length > 0 ? "has-events" : ""
                      }`}
                      onClick={() => handleDateClick(dayNum)}
                    >
                      <span className="cal-date-number">{dayNum}</span>
                      {events.length > 0 && (
                        <div className="cal-event-dots">
                          {events.slice(0, 3).map((ev, evIdx) => (
                            <span
                              key={evIdx}
                              className={`event-dot ${ev.eventType === "APPOINTMENT" ? "blue" : "red"}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AGENDA SIDEBAR */}
            <aside className="calendar-agenda-sidebar">
              <div className="agenda-card">
                <div className="agenda-header">
                  <h3>
                    Agenda: {selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </h3>
                  <button onClick={() => setReminderModalOpen(true)} className="small-add-btn" title="Add reminder">
                    <Plus size={14} />
                  </button>
                </div>

                <div className="agenda-events-list">
                  {selectedDayEvents.length === 0 ? (
                    <div className="agenda-empty">
                      <CalendarDays size={32} />
                      <p>No consultations or reminders scheduled for this date.</p>
                      <button onClick={() => setReminderModalOpen(true)} className="agenda-create-btn">
                        Schedule Reminder
                      </button>
                    </div>
                  ) : (
                    selectedDayEvents.map((ev, evIdx) => (
                      <div key={evIdx} className={`agenda-item ${ev.eventType?.toLowerCase()}`}>
                        <div className="agenda-item-header">
                          <strong>{ev.title || ev.reason || "Scheduled Clinical Item"}</strong>
                          <span className="agenda-tag">{ev.eventType}</span>
                        </div>
                        <p>{ev.message || ev.doctor_name || "CareBridge Hospital Consultation"}</p>
                        <small className="agenda-time">{ev.appointment_time || "All day"}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>
      ) : (
        /* NOTIFICATIONS LIST VIEW */
        <section className="notif-list-section" role="log" aria-live="polite">
          {filteredNotifications.length === 0 ? (
            <div className="notif-empty-state">
              <CheckCircle2 size={48} />
              <h3>All Caught Up!</h3>
              <p>You have no active alerts or unread notifications in this filter category.</p>
            </div>
          ) : (
            <div className="notif-cards-list">
              {filteredNotifications.map((notif) => {
                const notifId = notif.id || notif._id;
                const Icon = getIconForType(notif.notification_type, notif.severity);
                const isCritical = (notif.severity || "").toUpperCase() === "CRITICAL";
                const isWarning = (notif.severity || "").toUpperCase() === "WARNING";
                const isPulsing = pulsingAlertId === notifId;

                return (
                  <div
                    key={notifId}
                    className={`notif-card ${!notif.is_read ? "unread" : ""} ${
                      isCritical ? "critical-card" : isWarning ? "warning-card" : ""
                    } ${isPulsing ? "shake-pulse" : ""}`}
                  >
                    <div className="notif-icon-col">
                      <div className={`notif-type-icon ${isCritical ? "red" : isWarning ? "amber" : "cyan"}`}>
                        <Icon size={18} />
                      </div>
                    </div>

                    <div className="notif-content-col">
                      <div className="notif-top-row">
                        <span className="notif-type-badge">
                          {notif.notification_type?.replace(/_/g, " ") || "ALERT"}
                        </span>
                        {notif.severity && notif.severity !== "INFO" && (
                          <span className={`severity-tag ${notif.severity.toLowerCase()}`}>
                            {notif.severity}
                          </span>
                        )}
                        <span className="notif-time-stamp">
                          {notif.created_at
                            ? new Date(notif.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
                              " · " +
                              new Date(notif.created_at).toLocaleDateString()
                            : "Just now"}
                        </span>
                      </div>

                      <h3 className="notif-card-title">{notif.title}</h3>
                      <p className="notif-card-message">{notif.message}</p>
                    </div>

                    <div className="notif-actions-col">
                      {!notif.is_read && (
                        <button
                          type="button"
                          className="mark-read-btn"
                          onClick={() => handleMarkAsRead(notifId)}
                          title="Mark as read"
                        >
                          <Check size={16} />
                          <span>Mark Read</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default Notifications;