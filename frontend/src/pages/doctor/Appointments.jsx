import React, { useState } from "react";
import {
  CalendarDays,
  Clock3,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  MoreVertical,
  Stethoscope,
  Video,
  UserCheck,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Appointments.css";

function DoctorAppointments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const appointmentsList = [
    {
      id: 1,
      patient: "Arjun Kumar",
      patientId: "PT-10761",
      age: 52,
      gender: "Male",
      time: "09:30 AM",
      date: "Today, Oct 03",
      type: "Cardiology Consult",
      mode: "In-Person",
      reason: "Follow-up for elevated blood pressure and chest discomfort",
      status: "waiting",
      statusText: "Waiting",
    },
    {
      id: 2,
      patient: "Rahul Verma",
      patientId: "PT-10921",
      age: 45,
      gender: "Male",
      time: "10:15 AM",
      date: "Today, Oct 03",
      type: "General Follow-up",
      mode: "In-Person",
      reason: "Post-surgery recovery assessment and lab review",
      status: "confirmed",
      statusText: "Confirmed",
    },
    {
      id: 3,
      patient: "Ananya Sharma",
      patientId: "PT-10482",
      age: 28,
      gender: "Female",
      time: "11:00 AM",
      date: "Today, Oct 03",
      type: "Pulmonology Check",
      mode: "Teleconsult",
      reason: "Seasonal bronchospasm follow-up and inhaler review",
      status: "confirmed",
      statusText: "Confirmed",
    },
    {
      id: 4,
      patient: "Priya Reddy",
      patientId: "PT-10234",
      age: 34,
      gender: "Female",
      time: "11:45 AM",
      date: "Today, Oct 03",
      type: "Neurology Consult",
      mode: "In-Person",
      reason: "Migraine episodes evaluation and dosage optimization",
      status: "pending",
      statusText: "Pending",
    },
    {
      id: 5,
      patient: "Vikram Malhotra",
      patientId: "PT-10884",
      age: 61,
      gender: "Male",
      time: "02:30 PM",
      date: "Today, Oct 03",
      type: "Cardiac Stepdown",
      mode: "In-Person",
      reason: "Post-angioplasty 6-week clinical review",
      status: "confirmed",
      statusText: "Confirmed",
    },
    {
      id: 6,
      patient: "Deepa Nair",
      patientId: "PT-10519",
      age: 41,
      gender: "Female",
      time: "03:15 PM",
      date: "Today, Oct 03",
      type: "Endocrinology",
      mode: "Teleconsult",
      reason: "HbA1c quarterly monitoring and thyroid profile check",
      status: "cancelled",
      statusText: "Cancelled",
    },
  ];

  const filteredAppointments = appointmentsList.filter((apt) => {
    const matchesTab =
      activeTab === "all"
        ? true
        : activeTab === "confirmed"
        ? apt.status === "confirmed"
        : activeTab === "waiting"
        ? apt.status === "waiting"
        : activeTab === "pending"
        ? apt.status === "pending"
        : apt.status === "cancelled";

    const matchesSearch =
      apt.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.type.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const totalCount = appointmentsList.length;
  const confirmedCount = appointmentsList.filter((a) => a.status === "confirmed").length;
  const waitingCount = appointmentsList.filter((a) => a.status === "waiting").length;
  const pendingCount = appointmentsList.filter((a) => a.status === "pending").length;

  return (
    <div className="doctor-appointments-page">
      {/* HEADER */}
      <section className="doctor-appointments-header">
        <div>
          <div className="doctor-page-kicker">DOCTOR PORTAL</div>
          <h1>Appointments & Clinical Schedule</h1>
          <p>Manage today's consultations, follow-up slots, and tele-consultations.</p>
        </div>

        <button className="doctor-calendar-button">
          <CalendarDays size={18} />
          <span>Oct 03, 2026</span>
        </button>
      </section>

      {/* STATS */}
      <section className="doctor-appointment-stats">
        <div className="doctor-appointment-stat" onClick={() => setActiveTab("all")}>
          <div className="appointment-stat-icon blue">
            <CalendarDays size={22} />
          </div>
          <div>
            <span>Total Today</span>
            <strong>{totalCount}</strong>
          </div>
        </div>

        <div className="doctor-appointment-stat" onClick={() => setActiveTab("confirmed")}>
          <div className="appointment-stat-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span>Confirmed</span>
            <strong>{confirmedCount}</strong>
          </div>
        </div>

        <div className="doctor-appointment-stat" onClick={() => setActiveTab("waiting")}>
          <div className="appointment-stat-icon orange">
            <Clock3 size={22} />
          </div>
          <div>
            <span>In Waiting Room</span>
            <strong>{waitingCount}</strong>
          </div>
        </div>

        <div className="doctor-appointment-stat" onClick={() => setActiveTab("pending")}>
          <div className="appointment-stat-icon purple">
            <AlertCircle size={22} />
          </div>
          <div>
            <span>Pending Requests</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>
      </section>

      {/* TOOLBAR */}
      <section className="doctor-appointments-toolbar">
        <div className="doctor-appointment-tabs">
          <button
            className={activeTab === "all" ? "active" : ""}
            onClick={() => setActiveTab("all")}
          >
            All ({totalCount})
          </button>
          <button
            className={activeTab === "confirmed" ? "active" : ""}
            onClick={() => setActiveTab("confirmed")}
          >
            Confirmed ({confirmedCount})
          </button>
          <button
            className={activeTab === "waiting" ? "active" : ""}
            onClick={() => setActiveTab("waiting")}
          >
            Waiting ({waitingCount})
          </button>
          <button
            className={activeTab === "pending" ? "active" : ""}
            onClick={() => setActiveTab("pending")}
          >
            Pending ({pendingCount})
          </button>
        </div>

        <div className="doctor-appointment-actions">
          <div className="doctor-appointment-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search patient, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* MAIN APPOINTMENTS CARD / TABLE */}
      <div className="doctor-appointments-card">
        <div className="doctor-appointments-card-header">
          <div>
            <h2>Consultation Schedule</h2>
            <p>Showing {filteredAppointments.length} scheduled visits</p>
          </div>
          <div className="doctor-today-label">
            <Clock3 size={15} />
            <span>Today's Stream</span>
          </div>
        </div>

        <div className="doctor-appointment-table-wrapper">
          <table className="doctor-appointment-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Time & Date</th>
                <th>Department / Type</th>
                <th>Clinical Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    No appointments match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt.id}>
                    <td>
                      <div className="doctor-patient-cell">
                        <div className="doctor-patient-avatar">
                          {apt.patient
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <strong>{apt.patient}</strong>
                          <span>{apt.patientId} • Age {apt.age} ({apt.gender})</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="doctor-time-cell">
                        <strong>{apt.time}</strong>
                        <span>{apt.date}</span>
                      </div>
                    </td>

                    <td>
                      <div className="doctor-type-cell">
                        {apt.mode === "Teleconsult" ? (
                          <Video size={16} color="#7c3aed" />
                        ) : (
                          <Stethoscope size={16} color="#2563eb" />
                        )}
                        <div>
                          <strong>{apt.type}</strong>
                          <span>{apt.mode}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="doctor-reason">{apt.reason}</span>
                    </td>

                    <td>
                      <span className={`doctor-status ${apt.status}`}>
                        {apt.statusText}
                      </span>
                    </td>

                    <td>
                      <button className="doctor-more-button" title="View details">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DoctorAppointments;
