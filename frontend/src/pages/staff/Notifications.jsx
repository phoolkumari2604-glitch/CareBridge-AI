import React, { useMemo, useState } from "react";
import "./Notifications.css";

const initialNotifications = [
  {
    id: 1,
    type: "appointment",
    title: "New appointment booked",
    message: "A new patient appointment has been scheduled for Dr. Sharma.",
    time: "10 minutes ago",
    read: false,
  },
  {
    id: 2,
    type: "approval",
    title: "Approval request pending",
    message: "A hospital registration request is waiting for staff review.",
    time: "32 minutes ago",
    read: false,
  },
  {
    id: 3,
    type: "queue",
    title: "Queue update",
    message: "OPD queue for General Medicine has reached token 24.",
    time: "1 hour ago",
    read: true,
  },
  {
    id: 4,
    type: "health",
    title: "Health alert",
    message: "A critical health alert requires administrative attention.",
    time: "2 hours ago",
    read: false,
  },
  {
    id: 5,
    type: "system",
    title: "System maintenance",
    message: "Scheduled maintenance is planned for tonight at 11:30 PM.",
    time: "4 hours ago",
    read: true,
  },
];

function Notifications() {
  const [notifications, setNotifications] =
    useState(initialNotifications);

  const [filter, setFilter] = useState("all");

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((item) => !item.read);
    }

    return notifications;
  }, [notifications, filter]);

  const markAsRead = (id) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, read: true }
          : item
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read: true,
      }))
    );
  };

  const deleteNotification = (id) => {
    setNotifications((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type) => {
    switch (type) {
      case "appointment":
        return "📅";
      case "approval":
        return "✓";
      case "queue":
        return "⏱";
      case "health":
        return "♥";
      case "system":
        return "⚙";
      default:
        return "🔔";
    }
  };

  return (
    <div className="staff-notifications-page">

      {/* HEADER */}
      <section className="notifications-header">

        <div>
          <span className="page-eyebrow">
            STAFF / ADMIN
          </span>

          <h1>Notifications</h1>

          <p>
            Stay updated with appointments, approvals,
            queues, health alerts and system activity.
          </p>
        </div>

        <div className="notification-header-actions">
          <button
            className="secondary-action"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            ✓ Mark all read
          </button>

          <button
            className="danger-action"
            onClick={clearAll}
            disabled={notifications.length === 0}
          >
            Clear all
          </button>
        </div>

      </section>


      {/* SUMMARY */}
      <section className="notification-summary">

        <div className="notification-stat">
          <div className="stat-icon blue">🔔</div>
          <div>
            <span>Total notifications</span>
            <strong>{notifications.length}</strong>
          </div>
        </div>

        <div className="notification-stat">
          <div className="stat-icon orange">●</div>
          <div>
            <span>Unread</span>
            <strong>{unreadCount}</strong>
          </div>
        </div>

        <div className="notification-stat">
          <div className="stat-icon green">✓</div>
          <div>
            <span>Read</span>
            <strong>
              {notifications.length - unreadCount}
            </strong>
          </div>
        </div>

      </section>


      {/* FILTER BAR */}
      <section className="notification-toolbar">

        <div className="filter-buttons">

          <button
            className={
              filter === "all"
                ? "filter-btn active"
                : "filter-btn"
            }
            onClick={() => setFilter("all")}
          >
            All
          </button>

          <button
            className={
              filter === "unread"
                ? "filter-btn active"
                : "filter-btn"
            }
            onClick={() => setFilter("unread")}
          >
            Unread
            {unreadCount > 0 && (
              <span className="filter-count">
                {unreadCount}
              </span>
            )}
          </button>

        </div>

        <span className="notification-count">
          {filteredNotifications.length} notification
          {filteredNotifications.length !== 1
            ? "s"
            : ""}
        </span>

      </section>


      {/* NOTIFICATION LIST */}
      <section className="notification-list">

        {filteredNotifications.length === 0 ? (
          <div className="notification-empty">

            <div className="empty-icon">
              🔔
            </div>

            <h2>No notifications</h2>

            <p>
              You're all caught up. New notifications
              will appear here.
            </p>

          </div>
        ) : (
          filteredNotifications.map((notification) => (

            <article
              key={notification.id}
              className={
                notification.read
                  ? "notification-card"
                  : "notification-card unread"
              }
            >

              <div
                className={`notification-type ${notification.type}`}
              >
                {getIcon(notification.type)}
              </div>

              <div className="notification-content">

                <div className="notification-title-row">

                  <h3>
                    {notification.title}
                  </h3>

                  {!notification.read && (
                    <span className="unread-badge">
                      NEW
                    </span>
                  )}

                </div>

                <p>
                  {notification.message}
                </p>

                <span className="notification-time">
                  {notification.time}
                </span>

              </div>

              <div className="notification-actions">

                {!notification.read && (
                  <button
                    className="read-btn"
                    onClick={() =>
                      markAsRead(notification.id)
                    }
                    title="Mark as read"
                  >
                    ✓
                  </button>
                )}

                <button
                  className="delete-btn"
                  onClick={() =>
                    deleteNotification(notification.id)
                  }
                  title="Delete notification"
                >
                  ×
                </button>

              </div>

            </article>

          ))
        )}

      </section>

    </div>
  );
}

export default Notifications;