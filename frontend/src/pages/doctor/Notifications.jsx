import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  AlertTriangle,
  X,
  CheckCheck,
} from "lucide-react";
import { useState } from "react";
import "./Notifications.css";

function Notifications() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "appointment",
      title: "New Appointment Request",
      message:
        "A patient has requested an appointment for today at 11:30 AM.",
      time: "10 minutes ago",
      unread: true,
      icon: CalendarDays,
    },
    {
      id: 2,
      type: "approval",
      title: "Appointment Approved",
      message:
        "Your appointment schedule has been updated successfully.",
      time: "35 minutes ago",
      unread: true,
      icon: CheckCircle2,
    },
    {
      id: 3,
      type: "patient",
      title: "Patient Record Updated",
      message:
        "A patient's health record has been updated with new vitals.",
      time: "1 hour ago",
      unread: true,
      icon: FileText,
    },
    {
      id: 4,
      type: "queue",
      title: "Queue Update",
      message:
        "Your OPD queue currently has 8 patients waiting.",
      time: "2 hours ago",
      unread: false,
      icon: Clock3,
    },
    {
      id: 5,
      type: "system",
      title: "System Maintenance",
      message:
        "Scheduled system maintenance will begin tonight at 11:00 PM.",
      time: "Yesterday",
      unread: false,
      icon: AlertTriangle,
    },
  ]);

  const unreadCount = notifications.filter(
    (notification) => notification.unread
  ).length;

  const markAsRead = (id) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, unread: false }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        unread: false,
      }))
    );
  };

  const removeNotification = (id) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id)
    );
  };

  return (
    <div className="doctor-notifications-page">

      {/* HEADER */}
      <div className="doctor-notifications-header">
        <div>
          <div className="doctor-page-kicker">
            DOCTOR PORTAL
          </div>

          <h1>
            Notifications
            {unreadCount > 0 && (
              <span className="doctor-notification-count">
                {unreadCount}
              </span>
            )}
          </h1>

          <p>
            Stay updated with appointments, patients and system alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            className="doctor-mark-all-btn"
            onClick={markAllAsRead}
          >
            <CheckCheck size={18} />
            Mark all as read
          </button>
        )}
      </div>

      {/* SUMMARY */}
      <div className="doctor-notification-summary">

        <div className="doctor-summary-card">
          <div className="doctor-summary-icon blue">
            <Bell size={21} />
          </div>

          <div>
            <span>Total Notifications</span>
            <strong>{notifications.length}</strong>
          </div>
        </div>

        <div className="doctor-summary-card">
          <div className="doctor-summary-icon red">
            <Bell size={21} />
          </div>

          <div>
            <span>Unread</span>
            <strong>{unreadCount}</strong>
          </div>
        </div>

        <div className="doctor-summary-card">
          <div className="doctor-summary-icon green">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>Read</span>
            <strong>
              {notifications.length - unreadCount}
            </strong>
          </div>
        </div>

      </div>

      {/* NOTIFICATION LIST */}
      <section className="doctor-notification-section">

        <div className="doctor-section-heading">
          <div>
            <h2>Recent Notifications</h2>
            <p>
              Your latest updates and important messages
            </p>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="doctor-notification-empty">
            <Bell size={42} />
            <h3>No notifications</h3>
            <p>
              You're all caught up. New notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="doctor-notification-list">

            {notifications.map((notification) => {
              const Icon = notification.icon;

              return (
                <article
                  key={notification.id}
                  className={`doctor-notification-card ${
                    notification.unread
                      ? "unread"
                      : ""
                  }`}
                  onClick={() =>
                    markAsRead(notification.id)
                  }
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
                        <span className="doctor-unread-dot" />
                      )}
                    </div>

                    <p>{notification.message}</p>

                    <span className="doctor-notification-time">
                      {notification.time}
                    </span>

                  </div>

                  <button
                    className="doctor-notification-close"
                    aria-label="Remove notification"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeNotification(notification.id);
                    }}
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