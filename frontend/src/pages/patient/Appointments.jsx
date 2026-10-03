import {
  CalendarDays,
  Clock3,
  MapPin,
  UserRound,
  Video,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  CalendarCheck,
} from "lucide-react";

import "./Appointments.css";

const appointments = [
  {
    id: 1,
    doctor: "Dr. Ananya Sharma",
    specialty: "Cardiologist",
    hospital: "CareBridge Medical Center",
    date: "Oct 04, 2026",
    time: "10:30 AM",
    type: "In-person",
    status: "Confirmed",
    initials: "AS",
  },
  {
    id: 2,
    doctor: "Dr. Rahul Mehta",
    specialty: "General Physician",
    hospital: "CareBridge City Hospital",
    date: "Oct 08, 2026",
    time: "02:00 PM",
    type: "Video consultation",
    status: "Confirmed",
    initials: "RM",
  },
  {
    id: 3,
    doctor: "Dr. Priya Reddy",
    specialty: "Dermatologist",
    hospital: "CareBridge Health Center",
    date: "Sep 22, 2026",
    time: "11:00 AM",
    type: "In-person",
    status: "Completed",
    initials: "PR",
  },
];

function Appointments() {
  return (
    <div className="appointments-page">

      {/* HEADER */}
      <section className="appointments-header">

        <div>
          <span className="appointments-kicker">
            PATIENT PORTAL
          </span>

          <h1>My appointments</h1>

          <p>
            Manage your upcoming consultations and view your
            appointment history in one place.
          </p>
        </div>

        <button className="appointment-primary-btn">
          <Plus size={18} />
          Book appointment
        </button>

      </section>


      {/* SUMMARY */}
      <section className="appointment-summary">

        <div className="appointment-summary-card">
          <div className="appointment-summary-icon blue">
            <CalendarDays size={20} />
          </div>

          <div>
            <span>Upcoming</span>
            <strong>2</strong>
          </div>
        </div>

        <div className="appointment-summary-card">
          <div className="appointment-summary-icon green">
            <CalendarCheck size={20} />
          </div>

          <div>
            <span>Completed</span>
            <strong>12</strong>
          </div>
        </div>

        <div className="appointment-summary-card">
          <div className="appointment-summary-icon orange">
            <Clock3 size={20} />
          </div>

          <div>
            <span>Next appointment</span>
            <strong>Oct 04</strong>
          </div>
        </div>

      </section>


      {/* UPCOMING */}
      <section className="appointments-section">

        <div className="appointments-section-heading">
          <div>
            <h2>Upcoming appointments</h2>
            <p>Your scheduled consultations</p>
          </div>

          <button className="appointment-filter">
            All appointments
          </button>
        </div>


        <div className="appointments-list">

          {appointments
            .filter(
              (appointment) =>
                appointment.status === "Confirmed"
            )
            .map((appointment) => (
              <article
                className="appointment-card"
                key={appointment.id}
              >

                <div className="appointment-date">
                  <span>
                    {appointment.date.split(" ")[0]}
                  </span>

                  <strong>
                    {appointment.date.split(" ")[1].replace(",", "")}
                  </strong>

                  <small>
                    {appointment.date.split(" ")[2]}
                  </small>
                </div>


                <div className="appointment-doctor">

                  <div className="appointment-avatar">
                    {appointment.initials}
                  </div>

                  <div>
                    <h3>{appointment.doctor}</h3>

                    <span>
                      {appointment.specialty}
                    </span>

                    <div className="appointment-location">
                      <MapPin size={14} />
                      {appointment.hospital}
                    </div>
                  </div>

                </div>


                <div className="appointment-time">

                  <div>
                    <Clock3 size={16} />
                    <strong>{appointment.time}</strong>
                  </div>

                  <span>
                    {appointment.type}
                  </span>

                </div>


                <div className="appointment-status">
                  <CheckCircle2 size={15} />
                  {appointment.status}
                </div>


                <div className="appointment-actions">

                  <button
                    className="appointment-view-btn"
                    title="View appointment"
                  >
                    View
                  </button>

                  <button
                    className="appointment-more-btn"
                    title="More options"
                  >
                    <MoreHorizontal size={19} />
                  </button>

                </div>

              </article>
            ))}

        </div>

      </section>


      {/* EMPTY / QUICK BOOKING CARD */}
      <section className="appointment-book-card">

        <div className="appointment-book-icon">
          <CalendarDays size={25} />
        </div>

        <div className="appointment-book-content">
          <h2>Need another consultation?</h2>

          <p>
            Find a doctor by specialty, check availability and
            book your next appointment.
          </p>
        </div>

        <button className="appointment-secondary-btn">
          Find a doctor
        </button>

      </section>


      {/* HISTORY */}
      <section className="appointments-section history-section">

        <div className="appointments-section-heading">
          <div>
            <h2>Recent history</h2>
            <p>Your previous consultations</p>
          </div>

          <button className="history-link">
            View all
          </button>
        </div>


        <div className="history-list">

          {appointments
            .filter(
              (appointment) =>
                appointment.status === "Completed"
            )
            .map((appointment) => (
              <div
                className="history-row"
                key={appointment.id}
              >

                <div className="history-doctor">

                  <div className="history-avatar">
                    {appointment.initials}
                  </div>

                  <div>
                    <strong>{appointment.doctor}</strong>
                    <span>{appointment.specialty}</span>
                  </div>

                </div>


                <div className="history-date">
                  <CalendarDays size={15} />
                  {appointment.date}
                </div>


                <div className="history-type">
                  <UserRound size={15} />
                  {appointment.type}
                </div>


                <div className="completed-status">
                  <CheckCircle2 size={15} />
                  Completed
                </div>

              </div>
            ))}

        </div>

      </section>

    </div>
  );
}

export default Appointments;