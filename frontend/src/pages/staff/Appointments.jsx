import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Search,
  CheckCircle2,
  Clock3,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Building,
  User,
  Check,
  X,
} from "lucide-react";
import doctorService from "../../services/doctorService";
import "./Appointments.css";

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const loadAppointments = useCallback(async () => {
    try {
      setError(null);
      const [aptsRes, docsRes] = await Promise.allSettled([
        doctorService.getAppointments(),
        doctorService.getDoctors(),
      ]);

      const aptsList = aptsRes.status === "fulfilled" && Array.isArray(aptsRes.value) ? aptsRes.value : [];
      const docsList = docsRes.status === "fulfilled" && Array.isArray(docsRes.value) ? docsRes.value : [];

      setAppointments(aptsList);
      setDoctors(docsList);
    } catch (err) {
      console.error("Failed to load staff appointments:", err);
      setError("Failed to retrieve appointment roster from backend.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAppointments();
  };

  const getDoctorName = (doctorId) => {
    const doc = doctors.find((d) => (d._id || d.id) === doctorId);
    return doc ? doc.name : "Assigned Specialist";
  };

  const getDoctorSpecialty = (doctorId) => {
    const doc = doctors.find((d) => (d._id || d.id) === doctorId);
    return doc ? doc.specialty || doc.specialization : "General Medicine";
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await doctorService.updateAppointment(id, {
        status: newStatus,
        approval_status: newStatus === "CANCELLED" ? "REJECTED" : "APPROVED",
      });

      setAppointments((current) =>
        current.map((appointment) =>
          (appointment._id || appointment.id) === id
            ? { ...appointment, status: newStatus }
            : appointment
        )
      );

      setToastMessage(`Appointment marked as ${newStatus}.`);
      setTimeout(() => setToastMessage(""), 3500);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert(err.response?.data?.detail || "Failed to persist status change to server.");
    }
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const query = search.toLowerCase().trim();
      const patient = (appointment.patient_name || "").toLowerCase();
      const reason = (appointment.reason || "").toLowerCase();
      const docName = getDoctorName(appointment.doctor_id).toLowerCase();
      const aptId = String(appointment._id || appointment.id || "").toLowerCase();

      const matchesSearch =
        !query ||
        patient.includes(query) ||
        reason.includes(query) ||
        docName.includes(query) ||
        aptId.includes(query);

      const status = (appointment.status || "PENDING").toUpperCase();
      const matchesStatus =
        statusFilter === "All" || status === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [appointments, search, statusFilter, doctors]);

  const total = appointments.length;
  const confirmed = appointments.filter(
    (item) => (item.status || "").toUpperCase() === "APPROVED" || (item.status || "").toUpperCase() === "CONFIRMED"
  ).length;
  const pending = appointments.filter(
    (item) => (item.status || "").toUpperCase() === "PENDING"
  ).length;
  const completed = appointments.filter(
    (item) => (item.status || "").toUpperCase() === "COMPLETED"
  ).length;

  return (
    <div className="staff-appointments-page">
      {/* Header */}
      <section className="appointments-header">
        <div>
          <span className="appointments-eyebrow">CAREBRIDGE AI — CLINICAL SCHEDULING</span>
          <h1>Appointment Operations</h1>
          <p>
            Manage hospital appointments, doctor consultation schedules, clearance approvals, and patient bookings.
          </p>
        </div>

        <button
          className={`refresh-btn-secondary ${isRefreshing ? "spinning" : ""}`}
          onClick={handleRefresh}
          title="Refresh Appointments"
          disabled={isRefreshing}
        >
          <RefreshCw size={16} />
          <span>Refresh Schedule</span>
        </button>
      </section>

      {/* Toast */}
      {toastMessage && (
        <div className="staff-apt-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="staff-apt-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Statistics */}
      <section className="appointments-stats">
        <div className="stat-box">
          <span>Total Bookings</span>
          <strong>{total}</strong>
          <small>Registered appointments</small>
        </div>

        <div className="stat-box">
          <span>Confirmed / Approved</span>
          <strong>{confirmed}</strong>
          <small>Active consultations</small>
        </div>

        <div className="stat-box">
          <span>Pending Clearance</span>
          <strong>{pending}</strong>
          <small>Awaiting triage review</small>
        </div>

        <div className="stat-box">
          <span>Completed Consults</span>
          <strong>{completed}</strong>
          <small>Concluded sessions</small>
        </div>
      </section>

      {/* Main Panel */}
      <section className="appointments-panel">
        <div className="panel-header">
          <div>
            <h2>Consultation Schedule</h2>
            <p>{filteredAppointments.length} bookings displayed</p>
          </div>

          <div className="panel-controls">
            <div className="search-input">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search patient, doctor, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-select"
            >
              <option value="All">All Statuses</option>
              <option value="APPROVED">Approved / Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="appointments-loading-box">
            <Loader2 size={32} className="spinner-icon" />
            <p>Loading appointments from CareBridge AI backend...</p>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="appointments-table-container">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Patient Details</th>
                  <th>Assigned Specialist</th>
                  <th>Schedule Slot</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredAppointments.map((apt) => {
                  const aptId = apt._id || apt.id;
                  const status = (apt.status || "PENDING").toUpperCase();
                  const docName = getDoctorName(apt.doctor_id);
                  const docSpec = getDoctorSpecialty(apt.doctor_id);

                  return (
                    <tr key={aptId}>
                      <td>
                        <span className="apt-id">#{String(aptId).slice(-8).toUpperCase()}</span>
                      </td>

                      <td>
                        <div className="patient-cell">
                          <strong>{apt.patient_name || `Patient #${String(apt.patient_id || "").slice(-6)}`}</strong>
                          <span>{apt.reason || "General Consultation"}</span>
                        </div>
                      </td>

                      <td>
                        <div className="doctor-cell">
                          <strong>{docName}</strong>
                          <span>{docSpec}</span>
                        </div>
                      </td>

                      <td>
                        <div className="schedule-cell">
                          <strong>{apt.appointment_time || "10:00 AM"}</strong>
                          <span>{apt.appointment_date || "Today"}</span>
                        </div>
                      </td>

                      <td>
                        <span className={`status-pill ${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons-group">
                          {status !== "APPROVED" && status !== "CONFIRMED" && (
                            <button
                              className="approve-btn"
                              onClick={() => updateStatus(aptId, "APPROVED")}
                              title="Approve Appointment"
                            >
                              <Check size={14} />
                            </button>
                          )}

                          {status !== "COMPLETED" && (
                            <button
                              className="complete-btn"
                              onClick={() => updateStatus(aptId, "COMPLETED")}
                              title="Mark Completed"
                            >
                              Done
                            </button>
                          )}

                          {status !== "CANCELLED" && (
                            <button
                              className="cancel-btn"
                              onClick={() => updateStatus(aptId, "CANCELLED")}
                              title="Cancel Appointment"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredAppointments.length === 0 && (
              <div className="empty-appointments">
                <CalendarDays size={38} className="text-muted" />
                <h3>No appointments found</h3>
                <p>
                  {appointments.length === 0
                    ? "No appointments booked in the system."
                    : "No appointments match your search and filter criteria."}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Appointments;