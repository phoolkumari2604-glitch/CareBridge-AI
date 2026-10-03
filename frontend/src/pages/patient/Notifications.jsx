import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartPulse,
  Info,
  MoreHorizontal,
  Trash2,
  Check,
  AlertTriangle,
  Hospital,
  ShieldCheck,
  Filter
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import "./Notifications.css";

function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user?.patient_id) {
      setLoading(false);
      return;
    }

    const patientId = user.patient_id;

    try {
      setLoading(true);
      setError(null);

      const [notifsRes, countRes] = await Promise.allSettled([
        api.get(`/notifications/${patientId}`),
        api.get(`/notifications/${patientId}/unread-count`),
      ]);

      if (notifsRes.status === "fulfilled") {
        setNotifications(notifsRes.value.data || []);
      }
      if (countRes.status === "fulfilled") {
        setUnreadCount(countRes.value.data?.unread_count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}`, { is_read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifs = notifications.filter((n) => !n.is_read);
    try {
      await Promise.all(
        unreadNotifs.map((n) =>
          api.put(`/notifications/${n.id}`, { is_read: true })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getIconForType = (type) => {
    const t = (type || "").toUpperCase();
    if (t.includes("APPOINTMENT")) return CalendarDays;
    if (t.includes("QUEUE")) return Clock3;
    if (t.includes("HEALTH") || t.includes("ALERT") || t.includes("VITAL")) return HeartPulse;
    if (t.includes("HOSPITAL")) return Hospital;
    return Bell;
  };

  const getClassForType = (type) => {
    const t = (type || "").toUpperCase();
    if (t.includes("APPOINTMENT")) return "appointment";
    if (t.includes("QUEUE")) return "queue";
    if (t.includes("HEALTH") || t.includes("ALERT") || t.includes("VITAL")) return "health";
    return "info";
  };

  // Counts by type
  const appointmentCount = notifications.filter((n) =>
    (n.notification_type || "").toUpperCase().includes("APPOINTMENT")
  ).length;

  const healthCount = notifications.filter((n) => {
    const t = (n.notification_type || "").toUpperCase();
    return t.includes("HEALTH") || t.includes("ALERT") || t.includes("VITAL");
  }).length;

  const queueCount = notifications.filter((n) =>
    (n.notification_type || "").toUpperCase().includes("QUEUE")
  ).length;

  // Filtered notifications
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.is_read;
    if (activeTab === "appointments") {
      return (n.notification_type || "").toUpperCase().includes("APPOINTMENT");
    }
    if (activeTab === "health") {
      const t = (n.notification_type || "").toUpperCase();
      return t.includes("HEALTH") || t.includes("ALERT") || t.includes("VITAL");
    }
    if (activeTab === "queue") {
      return (n.notification_type || "").toUpperCase().includes("QUEUE");
    }
    return true;
  });

  if (!user?.patient_id) {
    return (
      <div className="notifications-page">
        <div className="notif-no-profile">
          <Info size={40} />
          <h2>Patient Profile Required</h2>
          <p>Please complete your profile to receive healthcare notifications and alerts.</p>
          <Link to="/profile" className="profile-btn">
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      {/* HEADER */}
      <div className="notifications-header">
        <div>
          <div className="notifications-kicker">
            <Bell size={15} />
            COMMUNICATIONS
          </div>
          <h1>Notifications & Alerts</h1>
          <p>
            Stay updated with appointment reminders, vital alerts, and hospital notifications.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            className="notifications-mark-btn"
            onClick={handleMarkAllAsRead}
          >
            <CheckCircle2 size={16} />
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {/* SUMMARY STAT CARDS */}
      <div className="notification-summary">
        <div
          className={`notification-summary-card ${activeTab === "unread" ? "active" : ""}`}
          onClick={() => setActiveTab(activeTab === "unread" ? "all" : "unread")}
        >
          <div className="summary-icon unread">
            <Bell size={20} />
          </div>
          <div>
            <span>Unread</span>
            <strong>{unreadCount}</strong>
          </div>
        </div>

        <div
          className={`notification-summary-card ${activeTab === "appointments" ? "active" : ""}`}
          onClick={() => setActiveTab(activeTab === "appointments" ? "all" : "appointments")}
        >
          <div className="summary-icon appointment">
            <CalendarDays size={20} />
          </div>
          <div>
            <span>Appointments</span>
            <strong>{appointmentCount}</strong>
          </div>
        </div>

        <div
          className={`notification-summary-card ${activeTab === "queue" ? "active" : ""}`}
          onClick={() => setActiveTab(activeTab === "queue" ? "all" : "queue")}
        >
          <div className="summary-icon queue">
            <Clock3 size={20} />
          </div>
          <div>
            <span>Queue Updates</span>
            <strong>{queueCount}</strong>
          </div>
        </div>

        <div
          className={`notification-summary-card ${activeTab === "health" ? "active" : ""}`}
          onClick={() => setActiveTab(activeTab === "health" ? "all" : "health")}
        >
          <div className="summary-icon health">
            <HeartPulse size={20} />
          </div>
          <div>
            <span>Health & Vitals</span>
            <strong>{healthCount}</strong>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS LIST CARD */}
      <section className="notifications-card">
        <div className="notifications-card-header">
          <div>
            <h2>Recent Activity</h2>
            <p>
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </p>
          </div>

          <div className="filter-pill-row">
            <button
              className={`pill ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All
            </button>
            <button
              className={`pill ${activeTab === "unread" ? "active" : ""}`}
              onClick={() => setActiveTab("unread")}
            >
              Unread ({unreadCount})
            </button>
            <button
              className={`pill ${activeTab === "appointments" ? "active" : ""}`}
              onClick={() => setActiveTab("appointments")}
            >
              Appointments
            </button>
            <button
              className={`pill ${activeTab === "health" ? "active" : ""}`}
              onClick={() => setActiveTab("health")}
            >
              Health
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="notif-loading-list">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="notif-skeleton-item">
                <div className="skeleton-circle" />
                <div className="skeleton-content">
                  <div className="skeleton-bar title" />
                  <div className="skeleton-bar text" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div className="notif-error">
            <AlertTriangle size={20} />
            <span>{error}</span>
            <button onClick={fetchNotifications}>Retry</button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && filteredNotifications.length === 0 && (
          <div className="notif-empty">
            <ShieldCheck size={40} />
            <h3>No notifications found</h3>
            <p>
              {activeTab === "unread"
                ? "You have read all your notifications!"
                : "You don't have any notifications under this category yet."}
            </p>
          </div>
        )}

        {/* NOTIFICATION ITEMS */}
        {!loading && !error && filteredNotifications.length > 0 && (
          <div className="notification-list">
            {filteredNotifications.map((item) => {
              const Icon = getIconForType(item.notification_type);
              const typeClass = getClassForType(item.notification_type);

              return (
                <div
                  className={`notification-item ${!item.is_read ? "is-unread" : ""}`}
                  key={item.id}
                >
                  <div className={`notification-icon ${typeClass}`}>
                    <Icon size={20} />
                  </div>

                  <div className="notification-content">
                    <div className="notification-title-row">
                      <h3>{item.title}</h3>
                      {!item.is_read && <span className="unread-dot" />}
                      <span className="notif-type-tag">{item.notification_type || "SYSTEM"}</span>
                    </div>

                    <p>{item.message}</p>

                    <span className="notification-time">
                      <Clock3 size={12} />
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : "Recent"}
                    </span>
                  </div>

                  {!item.is_read && (
                    <button
                      className="notification-read-btn"
                      onClick={() => handleMarkAsRead(item.id)}
                      title="Mark as read"
                    >
                      <Check size={16} />
                      <span>Mark Read</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <div className="notification-footer">
        <div className="footer-check">
          <CheckCircle2 size={18} />
        </div>
        <div>
          <strong>Notification Sync Active</strong>
          <p>
            Connected to CareBridge AI clinical alerts and real-time appointment services.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Notifications;