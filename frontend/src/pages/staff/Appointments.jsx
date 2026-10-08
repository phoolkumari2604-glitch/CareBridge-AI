import { useMemo, useState } from "react";
import "./Appointments.css";

const initialAppointments = [
  {
    id: "APT-1001",
    patient: "Ananya Sharma",
    patientId: "P-20451",
    doctor: "Dr. Naresh Trehan",
    department: "Cardiovascular Surgery",
    date: "02 Oct 2026",
    time: "10:30 AM",
    type: "Consultation",
    status: "Confirmed",
  },
  {
    id: "APT-1002",
    patient: "Ravi Kumar",
    patientId: "P-20452",
    doctor: "Dr. Ashok Seth",
    department: "Interventional Cardiology",
    date: "02 Oct 2026",
    time: "10:45 AM",
    type: "Follow-up",
    status: "Confirmed",
  },
  {
    id: "APT-1003",
    patient: "Meera Singh",
    patientId: "P-20453",
    doctor: "Dr. Arvinder Singh Soin",
    department: "Liver Transplant",
    date: "02 Oct 2026",
    time: "11:00 AM",
    type: "Consultation",
    status: "Waiting",
  },
  {
    id: "APT-1004",
    patient: "Vikram Patel",
    patientId: "P-20454",
    doctor: "Dr. Sandeep Vaishya",
    department: "Neurosurgery",
    date: "02 Oct 2026",
    time: "11:15 AM",
    type: "Check-up",
    status: "Completed",
  },
  {
    id: "APT-1005",
    patient: "Sana Khan",
    patientId: "P-20455",
    doctor: "Dr. Naresh Trehan",
    department: "Cardiovascular Surgery",
    date: "02 Oct 2026",
    time: "11:30 AM",
    type: "Consultation",
    status: "Cancelled",
  },
  {
    id: "APT-1006",
    patient: "Arjun Verma",
    patientId: "P-20456",
    doctor: "Dr. Ashok Seth",
    department: "Interventional Cardiology",
    date: "02 Oct 2026",
    time: "12:00 PM",
    type: "Follow-up",
    status: "Confirmed",
  },
];

function Appointments() {
  const [appointments, setAppointments] = useState(
    initialAppointments
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const query = search.toLowerCase();

      const matchesSearch =
        appointment.patient
          .toLowerCase()
          .includes(query) ||
        appointment.patientId
          .toLowerCase()
          .includes(query) ||
        appointment.doctor
          .toLowerCase()
          .includes(query) ||
        appointment.id
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        appointment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [appointments, search, statusFilter]);

  const total = appointments.length;

  const confirmed = appointments.filter(
    (item) => item.status === "Confirmed"
  ).length;

  const waiting = appointments.filter(
    (item) => item.status === "Waiting"
  ).length;

  const completed = appointments.filter(
    (item) => item.status === "Completed"
  ).length;

  const updateStatus = (id, newStatus) => {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id
          ? {
              ...appointment,
              status: newStatus,
            }
          : appointment
      )
    );
  };

  return (
    <div className="staff-appointments-page">

      {/* Header */}
      <section className="appointments-header">
        <div>
          <span className="appointments-eyebrow">
            STAFF / ADMIN
          </span>

          <h1>Appointments</h1>

          <p>
            Manage hospital appointments, schedules,
            consultations, and patient bookings.
          </p>
        </div>

        <button className="appointment-add-btn">
          + New Appointment
        </button>
      </section>

      {/* Statistics */}
      <section className="appointment-stats">

        <div className="appointment-stat-card">
          <div className="appointment-stat-icon blue">
            ◫
          </div>

          <div>
            <span>Total Appointments</span>
            <strong>{total}</strong>
            <small>Today's schedule</small>
          </div>
        </div>

        <div className="appointment-stat-card">
          <div className="appointment-stat-icon green">
            ✓
          </div>

          <div>
            <span>Confirmed</span>
            <strong>{confirmed}</strong>
            <small>Confirmed bookings</small>
          </div>
        </div>

        <div className="appointment-stat-card">
          <div className="appointment-stat-icon orange">
            ◷
          </div>

          <div>
            <span>Waiting</span>
            <strong>{waiting}</strong>
            <small>Patients waiting</small>
          </div>
        </div>

        <div className="appointment-stat-card">
          <div className="appointment-stat-icon purple">
            ✓
          </div>

          <div>
            <span>Completed</span>
            <strong>{completed}</strong>
            <small>Finished today</small>
          </div>
        </div>

      </section>

      {/* Main card */}
      <section className="appointments-card">

        <div className="appointments-card-header">

          <div>
            <h2>Appointment Schedule</h2>
            <p>
              View and manage today's patient appointments
            </p>
          </div>

          <div className="schedule-date">
            <span>▣</span>
            02 October 2026
          </div>

        </div>

        {/* Controls */}
        <div className="appointments-controls">

          <div className="appointment-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search patient, doctor or appointment ID..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <div className="appointment-filter">

            {[
              "All",
              "Confirmed",
              "Waiting",
              "Completed",
              "Cancelled",
            ].map((status) => (
              <button
                key={status}
                className={
                  statusFilter === status
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setStatusFilter(status)
                }
              >
                {status}
              </button>
            ))}

          </div>

        </div>

        {/* Table */}
        <div className="appointments-table-wrapper">

          <table className="appointments-table">

            <thead>
              <tr>
                <th>Appointment</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredAppointments.map(
                (appointment) => (
                  <tr key={appointment.id}>

                    <td>
                      <span className="appointment-id">
                        {appointment.id}
                      </span>
                    </td>

                    <td>
                      <div className="appointment-patient">

                        <div className="appointment-avatar">
                          {appointment.patient
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {appointment.patient}
                          </strong>

                          <small>
                            {appointment.patientId}
                          </small>
                        </div>

                      </div>
                    </td>

                    <td>
                      <span className="appointment-doctor">
                        {appointment.doctor}
                      </span>
                    </td>

                    <td>
                      <span className="department-text">
                        {appointment.department}
                      </span>
                    </td>

                    <td>
                      <div className="appointment-time">

                        <strong>
                          {appointment.date}
                        </strong>

                        <span>
                          {appointment.time}
                        </span>

                      </div>
                    </td>

                    <td>
                      <span className="type-badge">
                        {appointment.type}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`appointment-status ${appointment.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        <span></span>
                        {appointment.status}
                      </span>
                    </td>

                    <td>
                      <div className="appointment-actions">

                        {appointment.status ===
                          "Confirmed" && (
                          <button
                            className="action-wait"
                            onClick={() =>
                              updateStatus(
                                appointment.id,
                                "Waiting"
                              )
                            }
                          >
                            Check In
                          </button>
                        )}

                        {appointment.status ===
                          "Waiting" && (
                          <button
                            className="action-complete"
                            onClick={() =>
                              updateStatus(
                                appointment.id,
                                "Completed"
                              )
                            }
                          >
                            Complete
                          </button>
                        )}

                        {appointment.status ===
                          "Completed" && (
                          <span className="completed-label">
                            Done
                          </span>
                        )}

                        {appointment.status ===
                          "Cancelled" && (
                          <span className="cancelled-label">
                            Cancelled
                          </span>
                        )}

                      </div>
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

          {filteredAppointments.length === 0 && (
            <div className="appointments-empty">

              <div className="empty-calendar">
                ▣
              </div>

              <h3>No appointments found</h3>

              <p>
                Try changing your search or status filter.
              </p>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="appointments-footer">

          <span>
            Showing{" "}
            <strong>
              {filteredAppointments.length}
            </strong>{" "}
            of{" "}
            <strong>{appointments.length}</strong>{" "}
            appointments
          </span>

          <div className="appointment-pagination">
            <button disabled>‹</button>
            <button className="current-page">1</button>
            <button>›</button>
          </div>

        </div>

      </section>

      {/* Information cards */}
      <section className="appointment-info-grid">

        <div className="appointment-info-card">

          <div className="info-card-icon blue">
            ✓
          </div>

          <div>
            <h3>Appointment Management</h3>

            <p>
              Staff can check patients in, monitor
              appointment status, and complete visits
              from this screen.
            </p>
          </div>

        </div>

        <div className="appointment-info-card">

          <div className="info-card-icon orange">
            !
          </div>

          <div>
            <h3>Schedule Monitoring</h3>

            <p>
              Keep track of confirmed, waiting,
              completed, and cancelled appointments.
            </p>
          </div>

        </div>

      </section>

    </div>
  );
}

export default Appointments;