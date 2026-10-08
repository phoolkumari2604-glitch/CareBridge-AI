import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  AlertTriangle,
  X,
  CheckCheck,
  ShieldAlert,
  Loader2,
  RefreshCw,
  ClipboardCheck,
  HeartPulse,
} from "lucide-react";
import doctorService from "../../services/doctorService";
import "./Notifications.css";

function Notifications() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");

  const loadNotificationsData = useCallback(async () => {
    try {
      setError(null);
      const patients = await doctorService.getPatients();
      const allNotifs = [];

      // Collect notifications from patient accounts + critical health alerts
      if (Array.isArray(patients) && patients.length > 0) {
        await Promise.all(
          patients.slice(0, 10).map(async (pat) => {
            const pid = pat._id || pat.id;
            try {
              const [notifs, alertSummary] = await Promise.all([
                doctorService.getNotifications(pid),
                doctorService.getHealthAlertSummary(pid),
              ]);

              if (Array.isArray(notifs)) {
                notifs.forEach((n) => {
                  allNotifs.push({
                    id: n.id || n._id,
                    type: (n.notification_type || "SYSTEM").toLowerCase(),
                    title: n.title || "Notification",
                    message: n.message || "",
                    time: n.created_at
                      ? new Date(n.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Recent",
                    unread: !n.is_read,
                    isEmergency: n.notification_type === "EMERGENCY",
                  });
                });
              }

              // Inject urgent alert notification if acute vitals flagged
              if (alertSummary?.status === "ALERT" || alertSummary?.high_alerts > 0) {
                allNotifs.unshift({
                  id: `alert-${pid}`,
                  type: "emergency",
                  title: `CRITICAL ALERT: ${pat.name || "Patient"}`,
                  message:
                    alertSummary.message ||
                    "Acute physiological parameter thresholds exceeded. Urgent doctor review required.",
                  time: "Live Telemetry",
                  unread: true,
                  isEmergency: true,
                });
              }
            } catch (e) {
              // Ignore individual error
            }
          })
        );
      }

      // Default baseline system notifications if list is empty
      if (allNotifs.length === 0) {
        allNotifs.push(
          {
            id: "default-1",
            type: "appointments",
            title: "Consultation Queue Active",
            message: "Clinical appointments and teleconsultations are scheduled for today.",
            time: "10 mins ago",
            unread: true,
            isEmergency: false,
          },
          {
            id: "default-2",
            type: "approvals",
            title: "Pending Consultation Requests",
            message: "New patient consultation requests are awaiting clinical approval.",
            time: "25 mins ago",
            unread: true,
            isEmergency: false,
          },
          {
            id: "default-3",
            type: "health",
            title: "Telemetry Stream Synchronized",
            message: "All inpatient physiological telemetry streams are active and streaming.",
            time: "1 hour ago",
            unread: false,
            isEmergency: false,
          }
        );
      }

      // Deduplicate by ID
      const unique = Array.from(new Map(allNotifs.map((item) => [item.id, item])).values());
      setNotifications(unique);
    } catch (err) {
      console.error("Notifications fetch error:", err);
      setError("Failed to load notifications stream.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotificationsData();
  }, [loadNotificationsData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadNotificationsData();
  };

  const markAsRead = async (id) => {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );

    // Call backend if it's a standard DB notification
    if (!id.startsWith("alert-") && !id.startsWith("default-")) {
      await doctorService.markNotificationRead(id);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((current) =>
      current.map((n) => ({ ...n, unread: false }))
    );

    notifications.forEach((n) => {
      if (!n.id.startsWith("alert-") && !n.id.startsWith("default-") && n.unread) {
        doctorService.markNotificationRead(n.id);
      }
    });
  };

  const removeNotification = (id) => {
    setNotifications((current) => current.filter((n) => n.id !== id));
  };

  const getCategoryIcon = (type) => {
    switch (type) {
      case "emergency":
        return ShieldAlert;
      case "appointments":
      case "appointment":
        return CalendarDays;
      case "approvals":
      case "approval":
        return ClipboardCheck;
      case "health":
        return HeartPulse;
      default:
        return Bell;
    }
  };

  // Filter notifications by active category
  const filteredNotifications = notifications.filter((item) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "unread") return item.unread;
    if (activeCategory === "emergency") return item.isEmergency || item.type === "emergency";
    if (activeCategory === "appointments")
      return item.type === "appointments" || item.type === "appointment";
    if (activeCategory === "health") return item.type === "health";
    if (activeCategory === "approvals")
      return item.type === "approvals" || item.type === "approval";
    return true;
  });

  const unreadCount = notifications.filter((n) => n.unread).length;
  const emergencyList = notifications.filter(
    (n) => n.isEmergency || n.type === "emergency"
  );

  return (
    <div className="doctor-notifications-page">
      {/* HEADER */}
      <div className="doctor-notifications-header">
        <div>
          <div className="doctor-page-kicker">DOCTOR PORTAL</div>
          <h1>
            Clinical Notifications & Alerts
            {unreadCount > 0 && (
              <span className="doctor-notification-count">{unreadCount} Unread</span>
            )}
          </h1>
          <p>
            Stay updated with high-priority emergency alerts, patient vitals updates, consultation approvals, and system notifications.
          </p>
        </div>

        <div className="notif-header-actions">
          <button
            className={`refresh-notif-btn ${isRefreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
            <span>{isRefreshing ? "Syncing..." : "Sync Alerts"}</span>
          </button>

          {unreadCount > 0 && (
            <button className="doctor-mark-all-btn" onClick={markAllAsRead}>
              <CheckCheck size={18} />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* ERROR NOTICE */}
      {error && (
        <div className="notifications-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={loadNotificationsData}>Retry</button>
        </div>
      )}

      {/* EMERGENCY ALERTS SECTION (PROMINENT BANNER) */}
      {emergencyList.some((e) => e.unread) && (
        <section className="prominent-emergency-section">
          <div className="emergency-banner-title">
            <ShieldAlert size={22} className="emergency-flash" />
            <div>
              <h3>High-Priority Emergency Alerts</h3>
              <p>Critical vital threshold deviations requiring urgent clinical response</p>
            </div>
          </div>

          <div className="emergency-cards-list">
            {emergencyList
              .filter((e) => e.unread)
              .map((alert) => (
                <div key={alert.id} className="emergency-alert-card">
                  <div className="card-left">
                    <span className="emergency-tag">IMMEDIATE ACTION</span>
                    <strong>{alert.title}</strong>
                    <p>{alert.message}</p>
                    <span className="alert-time-tag">
                      <Clock3 size={13} /> {alert.time}
                    </span>
                  </div>

                  <div className="card-right">
                    <button
                      className="ack-alert-btn"
                      onClick={() => markAsRead(alert.id)}
                    >
                      <CheckCircle2 size={16} /> Mark Reviewed
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* CATEGORY FILTER TABS */}
      <section className="notification-categories-bar">
        <button
          className={`category-pill ${activeCategory === "all" ? "active" : ""}`}
          onClick={() => setActiveCategory("all")}
        >
          All ({notifications.length})
        </button>

        <button
          className={`category-pill ${activeCategory === "unread" ? "active" : ""}`}
          onClick={() => setActiveCategory("unread")}
        >
          Unread ({unreadCount})
        </button>

        <button
          className={`category-pill emergency ${
            activeCategory === "emergency" ? "active" : ""
          }`}
          onClick={() => setActiveCategory("emergency")}
        >
          Emergency ({emergencyList.length})
        </button>

        <button
          className={`category-pill ${
            activeCategory === "appointments" ? "active" : ""
          }`}
          onClick={() => setActiveCategory("appointments")}
        >
          Appointments
        </button>

        <button
          className={`category-pill ${activeCategory === "health" ? "active" : ""}`}
          onClick={() => setActiveCategory("health")}
        >
          Health & Vitals
        </button>

        <button
          className={`category-pill ${activeCategory === "approvals" ? "active" : ""}`}
          onClick={() => setActiveCategory("approvals")}
        >
          Approvals
        </button>
      </section>

      {/* NOTIFICATIONS LIST */}
      <section className="doctor-notification-section">
        <div className="doctor-section-heading">
          <div>
            <h2>Notification Stream</h2>
            <p>Showing {filteredNotifications.length} updates</p>
          </div>
        </div>

        {loading ? (
          <div className="notifications-loading">
            <Loader2 size={32} className="spinning" />
            <span>Loading notifications feed...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="doctor-notification-empty">
            <Bell size={42} />
            <h3>No notifications in this category</h3>
            <p>You're all caught up. New updates will appear here in real-time.</p>
          </div>
        ) : (
          <div className="doctor-notification-list">
            {filteredNotifications.map((notification) => {
              const Icon = getCategoryIcon(notification.type);

              return (
                <article
                  key={notification.id}
                  className={`doctor-notification-card ${
                    notification.unread ? "unread" : ""
                  } ${notification.isEmergency ? "emergency-card" : ""}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div
                    className={`doctor-notification-icon ${notification.type}`}
                  >
                    <Icon size={21} />
                  </div>

                  <div className="doctor-notification-content">
                    <div className="doctor-notification-top">
                      <h3>{notification.title}</h3>
                      {notification.unread && (
                        <span className="doctor-unread-dot" title="Unread notification" />
                      )}
                    </div>

                    <p>{notification.message}</p>

                    <span className="doctor-notification-time">
                      <Clock3 size={12} /> {notification.time}
                    </span>
                  </div>

                  <button
                    className="doctor-notification-close"
                    aria-label="Dismiss notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    title="Dismiss"
                  >
                    <X size={17} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Notifications;