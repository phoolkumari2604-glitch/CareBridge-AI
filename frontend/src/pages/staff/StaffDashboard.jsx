import React from "react";
import "./StaffDashboard.css";

function StaffDashboard() {
  const stats = [
    {
      title: "Total Patients",
      value: "1,248",
      change: "+12.5%",
      icon: "👥",
      type: "blue",
    },
    {
      title: "Appointments",
      value: "186",
      change: "+8.2%",
      icon: "📅",
      type: "purple",
    },
    {
      title: "Doctors",
      value: "64",
      change: "+4.6%",
      icon: "🩺",
      type: "green",
    },
    {
      title: "Queue Today",
      value: "92",
      change: "-3.4%",
      icon: "⏱️",
      type: "orange",
    },
  ];

  const appointments = [
    {
      id: "APT-1024",
      patient: "Ananya Sharma",
      doctor: "Dr. Rahul Verma",
      time: "09:30 AM",
      status: "Confirmed",
    },
    {
      id: "APT-1025",
      patient: "Ravi Kumar",
      doctor: "Dr. Priya Reddy",
      time: "10:15 AM",
      status: "Pending",
    },
    {
      id: "APT-1026",
      patient: "Sneha Patel",
      doctor: "Dr. Arjun Rao",
      time: "11:00 AM",
      status: "Confirmed",
    },
    {
      id: "APT-1027",
      patient: "Vikram Singh",
      doctor: "Dr. Neha Kapoor",
      time: "11:45 AM",
      status: "Cancelled",
    },
  ];

  const activities = [
    {
      icon: "👤",
      title: "New patient registered",
      description: "Ananya Sharma created a new account",
      time: "5 min ago",
    },
    {
      icon: "📋",
      title: "Appointment approved",
      description: "Appointment APT-1025 was approved",
      time: "18 min ago",
    },
    {
      icon: "🏥",
      title: "Doctor availability updated",
      description: "Dr. Priya Reddy updated availability",
      time: "32 min ago",
    },
    {
      icon: "🔔",
      title: "Queue notification sent",
      description: "Queue update sent to 14 patients",
      time: "1 hour ago",
    },
  ];

  return (
    <div className="staff-dashboard">

      {/* ================= HEADER ================= */}
      <header className="staff-header">
        <div>
          <p className="staff-eyebrow">STAFF / ADMIN PORTAL</p>

          <h1>
            Good morning, <span>Administrator</span> 👋
          </h1>

          <p className="staff-subtitle">
            Manage patients, appointments, doctors and hospital operations
            from one place.
          </p>
        </div>

        <div className="staff-header-actions">
          <button className="header-action" aria-label="Search">
            🔍
          </button>

          <button className="header-action notification-button">
            🔔
            <span className="notification-dot"></span>
          </button>

          <div className="staff-user">
            <div className="staff-avatar">
              A
            </div>

            <div className="staff-user-info">
              <strong>Administrator</strong>
              <span>Staff Admin</span>
            </div>
          </div>
        </div>
      </header>


      {/* ================= QUICK ACTIONS ================= */}
      <section className="quick-actions">

        <button className="quick-action primary">
          <span>＋</span>
          Add Patient
        </button>

        <button className="quick-action">
          <span>📅</span>
          New Appointment
        </button>

        <button className="quick-action">
          <span>🩺</span>
          Manage Doctors
        </button>

        <button className="quick-action">
          <span>🏥</span>
          Hospital Management
        </button>

      </section>


      {/* ================= STATISTICS ================= */}
      <section className="stats-grid">

        {stats.map((stat) => (
          <article
            className={`stat-card ${stat.type}`}
            key={stat.title}
          >
            <div className="stat-top">
              <div className="stat-icon">
                {stat.icon}
              </div>

              <span className="stat-change">
                {stat.change}
              </span>
            </div>

            <p>{stat.title}</p>

            <h2>{stat.value}</h2>

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
              <p className="card-label">TODAY</p>
              <h2>Appointments</h2>
            </div>

            <button className="view-all">
              View all →
            </button>
          </div>

          <div className="appointment-list">

            {appointments.map((appointment) => (
              <div
                className="appointment-row"
                key={appointment.id}
              >
                <div className="appointment-time">
                  <strong>{appointment.time}</strong>
                  <span>{appointment.id}</span>
                </div>

                <div className="appointment-patient">
                  <div className="patient-avatar">
                    {appointment.patient.charAt(0)}
                  </div>

                  <div>
                    <strong>{appointment.patient}</strong>
                    <span>{appointment.doctor}</span>
                  </div>
                </div>

                <span
                  className={`appointment-status ${appointment.status
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  {appointment.status}
                </span>
              </div>
            ))}

          </div>

        </article>


        {/* QUEUE */}
        <article className="dashboard-card queue-card">

          <div className="card-header">
            <div>
              <p className="card-label">LIVE STATUS</p>
              <h2>Queue Overview</h2>
            </div>

            <span className="live-badge">
              <span></span>
              LIVE
            </span>
          </div>

          <div className="queue-circle">

            <div className="queue-circle-inner">
              <strong>92</strong>
              <span>Patients</span>
            </div>

          </div>

          <div className="queue-info">

            <div>
              <span className="queue-dot waiting"></span>
              Waiting
              <strong>54</strong>
            </div>

            <div>
              <span className="queue-dot consultation"></span>
              In consultation
              <strong>23</strong>
            </div>

            <div>
              <span className="queue-dot completed"></span>
              Completed
              <strong>15</strong>
            </div>

          </div>

          <button className="queue-button">
            Manage Queue
          </button>

        </article>

      </section>


      {/* ================= BOTTOM GRID ================= */}
      <section className="bottom-grid">

        {/* RECENT ACTIVITY */}
        <article className="dashboard-card activity-card">

          <div className="card-header">
            <div>
              <p className="card-label">SYSTEM</p>
              <h2>Recent Activity</h2>
            </div>

            <button className="view-all">
              View logs →
            </button>
          </div>

          <div className="activity-list">

            {activities.map((activity, index) => (
              <div
                className="activity-item"
                key={index}
              >
                <div className="activity-icon">
                  {activity.icon}
                </div>

                <div className="activity-content">
                  <strong>{activity.title}</strong>
                  <span>{activity.description}</span>
                </div>

                <time>{activity.time}</time>
              </div>
            ))}

          </div>

        </article>


        {/* OPERATIONS */}
        <article className="dashboard-card operations-card">

          <div className="card-header">
            <div>
              <p className="card-label">MANAGEMENT</p>
              <h2>Operations</h2>
            </div>
          </div>

          <div className="operations-grid">

            <button className="operation-item">
              <span>👥</span>
              <strong>Patients</strong>
              <small>Manage records</small>
            </button>

            <button className="operation-item">
              <span>🩺</span>
              <strong>Doctors</strong>
              <small>Manage doctors</small>
            </button>

            <button className="operation-item">
              <span>📋</span>
              <strong>Approvals</strong>
              <small>Pending requests</small>
            </button>

            <button className="operation-item">
              <span>🔐</span>
              <strong>Audit & Security</strong>
              <small>Review system</small>
            </button>

          </div>

        </article>

      </section>


      {/* ================= FOOTER STATUS ================= */}
      <div className="system-status">

        <div>
          <span className="online-dot"></span>
          All systems operational
        </div>

        <span>
          CareBridge AI • Staff Administration
        </span>

      </div>

    </div>
  );
}

export default StaffDashboard;