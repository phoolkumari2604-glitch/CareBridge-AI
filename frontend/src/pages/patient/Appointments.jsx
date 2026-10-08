import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  Building,
  Ticket,
  ChevronRight,
  Loader2,
  RefreshCw,
  Trash2,
  Eye,
  Search,
  Check,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import "./Appointments.css";

function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search State
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const loadAppointmentsData = useCallback(async () => {
    if (!user?.patient_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [aptsData, docsData, hospsData] = await Promise.allSettled([
        patientService.getPatientAppointments(user.patient_id),
        patientService.getDoctors(),
        patientService.getHospitals(),
      ]);

      if (aptsData.status === "fulfilled") {
        setAppointments(aptsData.value || []);
      }
      if (docsData.status === "fulfilled") {
        setDoctors(docsData.value || []);
      }
      if (hospsData.status === "fulfilled") {
        setHospitals(hospsData.value || []);
      }
    } catch (err) {
      console.error("Failed to load appointments:", err);
      setError("Unable to retrieve appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAppointmentsData();
  }, [loadAppointmentsData]);

  // Lookup helpers
  const getDoctor = (doctorId) => {
    return doctors.find((d) => d._id === doctorId || d.id === doctorId) || {};
  };

  const getHospital = (hospitalId) => {
    return hospitals.find((h) => h._id === hospitalId || h.id === hospitalId) || {};
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((apt) => {
    const doc = getDoctor(apt.doctor_id);
    const hosp = getHospital(apt.hospital_id);
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      !q ||
      (doc.name || "").toLowerCase().includes(q) ||
      (doc.specialization || "").toLowerCase().includes(q) ||
      (hosp.name || "").toLowerCase().includes(q) ||
      (apt.reason || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;

    const status = (apt.status || "PENDING").toUpperCase();
    const approval = (apt.approval_status || "PENDING").toUpperCase();

    if (activeTab === "upcoming") {
      return status === "APPROVED" || status === "CONFIRMED" || (status === "PENDING" && approval !== "REJECTED");
    }
    if (activeTab === "pending") {
      return approval === "PENDING" || status === "PENDING";
    }
    if (activeTab === "completed") {
      return status === "COMPLETED";
    }
    if (activeTab === "cancelled") {
      return status === "CANCELLED" || approval === "REJECTED";
    }

    return true;
  });

  // Calculate statistics
  const upcomingCount = appointments.filter((a) => {
    const s = (a.status || "").toUpperCase();
    return s === "APPROVED" || s === "CONFIRMED" || s === "PENDING";
  }).length;

  const completedCount = appointments.filter((a) => (a.status || "").toUpperCase() === "COMPLETED").length;
  const pendingCount = appointments.filter((a) => (a.approval_status || "").toUpperCase() === "PENDING").length;

  // Cancel Appointment
  const handleCancelConfirm = async () => {
    if (!cancelModal) return;
    try {
      setActionLoading(true);
      await patientService.deleteAppointment(cancelModal._id || cancelModal.id);
      patientService.removeStoredAppointmentId(user.patient_id, cancelModal._id || cancelModal.id);
      
      setAppointments((prev) => prev.filter((a) => a._id !== cancelModal._id && a.id !== cancelModal.id));
      setCancelModal(null);
      setSelectedAppointment(null);
      setToastMessage("Appointment cancelled successfully.");
      setTimeout(() => setToastMessage(""), 3000);
    } catch (err) {
      console.error("Cancel appointment error:", err);
      alert("Failed to cancel appointment. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="appointments-page">
      {/* HEADER */}
      <section className="appointments-header">
        <div>
          <span className="appointments-kicker">PATIENT CLINICAL SCHEDULE</span>
          <h1>My Appointments</h1>
          <p>
            Track your medical consultations, review approval clearances, and access your Digital OPD Pass.
          </p>
        </div>

        <div className="appointments-header-actions">
          <button className="refresh-apts-btn" onClick={loadAppointmentsData} title="Refresh Appointments">
            <RefreshCw size={16} />
          </button>
          <Link to="/patient/doctors" className="appointment-primary-btn">
            <Plus size={18} />
            Book New Appointment
          </Link>
        </div>
      </section>

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="appointment-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SUMMARY STATS */}
      <section className="appointment-summary">
        <div
          className={`appointment-summary-card ${activeTab === "upcoming" ? "active" : ""}`}
          onClick={() => setActiveTab(activeTab === "upcoming" ? "all" : "upcoming")}
        >
          <div className="appointment-summary-icon blue">
            <CalendarDays size={20} />
          </div>
          <div>
            <span>Active & Upcoming</span>
            <strong>{upcomingCount}</strong>
          </div>
        </div>

        <div
          className={`appointment-summary-card ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab(activeTab === "pending" ? "all" : "pending")}
        >
          <div className="appointment-summary-icon orange">
            <Clock3 size={20} />
          </div>
          <div>
            <span>Pending Clearance</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>

        <div
          className={`appointment-summary-card ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab(activeTab === "completed" ? "all" : "completed")}
        >
          <div className="appointment-summary-icon green">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span>Completed Consults</span>
            <strong>{completedCount}</strong>
          </div>
        </div>
      </section>

      {/* APPOINTMENTS LIST CONTAINER */}
      <section className="appointments-section">
        <div className="appointments-section-heading">
          <div className="tab-filters-row">
            <button className={`tab-btn ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
              All ({appointments.length})
            </button>
            <button className={`tab-btn ${activeTab === "upcoming" ? "active" : ""}`} onClick={() => setActiveTab("upcoming")}>
              Upcoming ({upcomingCount})
            </button>
            <button className={`tab-btn ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
              Pending Approval ({pendingCount})
            </button>
            <button className={`tab-btn ${activeTab === "completed" ? "active" : ""}`} onClick={() => setActiveTab("completed")}>
              Completed ({completedCount})
            </button>
          </div>

          <div className="appointment-search-wrap">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by doctor, hospital, or symptoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="apts-loading-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="apt-skeleton-card">
                <div className="skeleton-date" />
                <div className="skeleton-body" />
              </div>
            ))}
          </div>
        )}

        {/* ERROR BANNER */}
        {error && (
          <div className="apt-error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={loadAppointmentsData}>Try Again</button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && filteredAppointments.length === 0 && (
          <div className="apt-empty-state">
            <CalendarDays size={48} />
            <h3>No Appointments Found</h3>
            <p>
              {appointments.length === 0
                ? "You haven't booked any medical consultations yet. Find a doctor and schedule an appointment."
                : "No appointments match your selected filter criteria."}
            </p>
            <Link to="/patient/doctors" className="find-doctor-btn">
              <Stethoscope size={16} /> Find a Doctor
            </Link>
          </div>
        )}

        {/* APPOINTMENT CARDS */}
        {!loading && !error && filteredAppointments.length > 0 && (
          <div className="appointments-list">
            {filteredAppointments.map((apt) => {
              const doc = getDoctor(apt.doctor_id);
              const hosp = getHospital(apt.hospital_id);

              const dateStr = apt.appointment_date || "Today";
              const timeStr = apt.appointment_time || "10:00 AM";
              const status = (apt.status || "PENDING").toUpperCase();
              const approval = (apt.approval_status || "PENDING").toUpperCase();

              const initials = doc.name
                ? doc.name
                    .replace(/^(Dr\.|Dr)\s*/i, "")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "DR";

              return (
                <article className="appointment-card" key={apt._id || apt.id}>
                  {/* DATE PILL */}
                  <div className="appointment-date-box">
                    <CalendarDays size={18} />
                    <strong>{dateStr}</strong>
                    <span>{timeStr}</span>
                  </div>

                  {/* DOCTOR INFO */}
                  <div className="appointment-doctor">
                    <div className="appointment-avatar">{initials}</div>
                    <div className="doctor-details-wrap">
                      <h3>{doc.name || "Specialist Doctor"}</h3>
                      <span className="doc-spec">{doc.specialization || doc.specialty || "Medical Consultation"}</span>
                      <div className="appointment-location">
                        <Building size={14} />
                        <span>{hosp.name || "CareBridge Hospital Center"}</span>
                      </div>
                    </div>
                  </div>

                  {/* REASON & DETAILS */}
                  <div className="appointment-reason-preview">
                    <span className="reason-label">Clinical Reason</span>
                    <p>{apt.reason || "General health consultation and evaluation"}</p>
                  </div>

                  {/* STATUS BADGES */}
                  <div className="appointment-status-group">
                    <span className={`status-badge-pill ${approval.toLowerCase()}`}>
                      {approval === "APPROVED" ? (
                        <>
                          <CheckCircle2 size={13} /> Approved
                        </>
                      ) : approval === "REJECTED" ? (
                        <>
                          <XCircle size={13} /> Rejected
                        </>
                      ) : (
                        <>
                          <Clock3 size={13} /> Approval Pending
                        </>
                      )}
                    </span>
                  </div>

                  {/* WORKING ACTIONS */}
                  <div className="appointment-card-actions">
                    <button
                      className="apt-details-btn"
                      onClick={() => setSelectedAppointment(apt)}
                      title="View Appointment Details"
                    >
                      <Eye size={15} /> Details
                    </button>

                    {approval === "APPROVED" && (
                      <Link
                        to={`/patient/opd-pass?appointmentId=${apt._id || apt.id}`}
                        className="apt-opd-link"
                        title="Access Digital OPD Pass"
                      >
                        <Ticket size={15} /> OPD Pass
                      </Link>
                    )}

                    {status !== "COMPLETED" && (
                      <button
                        className="apt-cancel-btn"
                        onClick={() => setCancelModal(apt)}
                        title="Cancel Appointment"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* QUICK BOOKING CALLOUT BANNER */}
      <section className="appointment-book-card">
        <div className="appointment-book-icon">
          <Stethoscope size={26} />
        </div>
        <div className="appointment-book-content">
          <h2>Need Another Consultation?</h2>
          <p>
            Search specialists across cardiology, neurology, pediatrics, general medicine, and schedule your appointment with verified practitioners.
          </p>
        </div>
        <Link to="/patient/doctors" className="appointment-secondary-btn">
          Find a Doctor
        </Link>
      </section>

      {/* APPOINTMENT DETAILS MODAL */}
      {selectedAppointment && (
        <div className="modal-overlay" onClick={() => setSelectedAppointment(null)}>
          <div className="modal-content apt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Consultation Details</h2>
                <p>Appointment ID: #{String(selectedAppointment._id || selectedAppointment.id).slice(-8).toUpperCase()}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedAppointment(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Doctor Card */}
              <div className="modal-doctor-summary">
                <div className="appointment-avatar large">
                  {getDoctor(selectedAppointment.doctor_id).name
                    ? getDoctor(selectedAppointment.doctor_id).name.charAt(0).toUpperCase()
                    : "D"}
                </div>
                <div>
                  <h3>{getDoctor(selectedAppointment.doctor_id).name || "Specialist Doctor"}</h3>
                  <p>{getDoctor(selectedAppointment.doctor_id).specialization || "General Medicine"}</p>
                  <small>{getHospital(selectedAppointment.hospital_id).name || "CareBridge Hospital"}</small>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span>Consultation Date</span>
                  <strong>{selectedAppointment.appointment_date}</strong>
                </div>
                <div className="modal-info-item">
                  <span>Scheduled Time</span>
                  <strong>{selectedAppointment.appointment_time}</strong>
                </div>
                <div className="modal-info-item">
                  <span>Approval Status</span>
                  <strong className="text-green">
                    {(selectedAppointment.approval_status || selectedAppointment.status || "PENDING").toUpperCase()}
                  </strong>
                </div>
                <div className="modal-info-item">
                  <span>Consultation Mode</span>
                  <strong>Hospital In-Person OPD</strong>
                </div>
              </div>

              {/* Reason */}
              <div className="modal-section">
                <h4>Symptoms / Consultation Reason</h4>
                <p className="modal-reason-text">{selectedAppointment.reason || "General checkup and medical review."}</p>
              </div>

              {/* Hospital Location */}
              <div className="modal-section">
                <h4>Facility Location & Contact</h4>
                <p className="flex-row">
                  <MapPin size={16} />
                  <span>
                    {[getHospital(selectedAppointment.hospital_id).address, getHospital(selectedAppointment.hospital_id).city]
                      .filter(Boolean)
                      .join(", ") || "Main Medical Campus"}
                  </span>
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <div className="modal-actions-row">
                <button
                  className="cancel-btn-outline"
                  onClick={() => {
                    setCancelModal(selectedAppointment);
                    setSelectedAppointment(null);
                  }}
                >
                  Cancel Booking
                </button>

                <Link
                  to={`/patient/opd-pass?appointmentId=${selectedAppointment._id || selectedAppointment.id}`}
                  className="opd-link-btn"
                >
                  <Ticket size={16} /> Digital OPD Pass
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {cancelModal && (
        <div className="modal-overlay" onClick={() => setCancelModal(null)}>
          <div className="modal-content cancel-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cancel Appointment?</h2>
              <button className="modal-close-btn" onClick={() => setCancelModal(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to cancel your scheduled appointment with{" "}
                <strong>{getDoctor(cancelModal.doctor_id).name || "Doctor"}</strong> on{" "}
                <strong>{cancelModal.appointment_date}</strong> at <strong>{cancelModal.appointment_time}</strong>?
              </p>
              <p className="text-muted">
                This action will release your slot and remove the appointment from your active queue.
              </p>
            </div>

            <div className="modal-footer">
              <div className="modal-actions-row">
                <button className="cancel-btn-outline" onClick={() => setCancelModal(null)} disabled={actionLoading}>
                  Keep Appointment
                </button>
                <button className="danger-confirm-btn" onClick={handleCancelConfirm} disabled={actionLoading}>
                  {actionLoading ? <Loader2 size={16} className="spinner-icon" /> : <Trash2 size={16} />}
                  <span>Yes, Cancel Consultation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;