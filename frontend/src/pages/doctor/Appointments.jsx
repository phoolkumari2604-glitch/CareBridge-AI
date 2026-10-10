import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  RefreshCw,
  Loader2,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import doctorService from "../../services/doctorService";
import "./Appointments.css";

function DoctorAppointments() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const [appointments, setAppointments] = useState([]);
  const [patientsMap, setPatientsMap] = useState({});

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(""); // filter by specific date

  // Modal for updating appointment status
  const [updatingAppointment, setUpdatingAppointment] = useState(null);
  const [statusToSet, setStatusToSet] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const loadAppointmentsData = useCallback(async () => {
    try {
      setError(null);
      const [appointmentsData, patientsData] = await Promise.all([
        doctorService.getAppointments(),
        doctorService.getPatients(),
      ]);

      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);

      const pMap = {};
      if (Array.isArray(patientsData)) {
        patientsData.forEach((p) => {
          pMap[p._id || p.id] = p;
        });
      }
      setPatientsMap(pMap);
    } catch (err) {
      console.error("Error loading appointments:", err);
      setError("Failed to load clinical appointment schedule.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAppointmentsData();
  }, [loadAppointmentsData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAppointmentsData();
  };

  const handleUpdateStatus = async () => {
    if (!updatingAppointment || !statusToSet) return;
    setIsUpdating(true);
    const aptId = updatingAppointment._id || updatingAppointment.id;

    try {
      await doctorService.updateAppointment(aptId, {
        status: statusToSet,
        approval_status: statusToSet === "CANCELLED" ? "REJECTED" : "APPROVED",
      });

      setSuccessMessage(`Appointment marked as ${statusToSet}.`);
      setTimeout(() => setSuccessMessage(""), 3500);

      setAppointments((prev) =>
        prev.map((apt) =>
          (apt._id || apt.id) === aptId
            ? { ...apt, status: statusToSet }
            : apt
        )
      );

      setUpdatingAppointment(null);
    } catch (err) {
      console.error("Failed to update appointment status:", err);
      alert(err.response?.data?.detail || "Failed to update appointment status.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((apt) => {
    const statusUpper = (apt.status || "PENDING").toUpperCase();

    const matchesTab =
      activeTab === "all"
        ? true
        : activeTab === "confirmed"
        ? statusUpper === "APPROVED" || statusUpper === "CONFIRMED"
        : activeTab === "pending"
        ? statusUpper === "PENDING"
        : activeTab === "completed"
        ? statusUpper === "COMPLETED"
        : activeTab === "cancelled"
        ? statusUpper === "CANCELLED" || statusUpper === "REJECTED"
        : true;

    const patient = patientsMap[apt.patient_id];
    const patientName = patient?.name || "";
    const reason = apt.reason || "";
    const aptId = apt._id || apt.id || "";

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      patientName.toLowerCase().includes(query) ||
      reason.toLowerCase().includes(query) ||
      aptId.toLowerCase().includes(query);

    const matchesDate = !selectedDate || apt.appointment_date === selectedDate;

    return matchesTab && matchesSearch && matchesDate;
  });

  const totalCount = appointments.length;
  const confirmedCount = appointments.filter((a) => {
    const s = (a.status || "").toUpperCase();
    return s === "APPROVED" || s === "CONFIRMED";
  }).length;
  const pendingCount = appointments.filter(
    (a) => (a.status || "").toUpperCase() === "PENDING"
  ).length;
  const completedCount = appointments.filter(
    (a) => (a.status || "").toUpperCase() === "COMPLETED"
  ).length;
  const cancelledCount = appointments.filter((a) => {
    const s = (a.status || "").toUpperCase();
    return s === "CANCELLED" || s === "REJECTED";
  }).length;

  return (
    <div className="doctor-appointments-page">
      {/* HEADER */}
      <section className="doctor-appointments-header">
        <div>
          <div className="doctor-page-kicker">DOCTOR PORTAL</div>
          <h1>Consultation Schedule & Appointments</h1>
          <p>
            Manage upcoming patient consultations, review clinical reasons, and update visit statuses.
          </p>
        </div>

        <div className="header-date-and-actions">
          <div className="date-picker-wrap">
            <CalendarDays size={16} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="calendar-date-input"
              title="Filter by appointment date"
            />
            {selectedDate && (
              <button
                className="clear-date-btn"
                onClick={() => setSelectedDate("")}
                title="Clear date filter"
              >
                ✕
              </button>
            )}
          </div>

          <button
            className={`refresh-schedule-btn ${isRefreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </section>

      {/* SUCCESS TOAST */}
      {successMessage && (
        <div className="success-toast">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="appointment-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={loadAppointmentsData}>Retry</button>
        </div>
      )}

      {/* STATS BAR */}
      <section className="doctor-appointment-stats">
        <div
          className={`doctor-appointment-stat ${activeTab === "all" ? "active-stat" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <div className="appointment-stat-icon blue">
            <CalendarDays size={20} />
          </div>
          <div>
            <span>Total Schedule</span>
            <strong>{totalCount}</strong>
          </div>
        </div>

        <div
          className={`doctor-appointment-stat ${activeTab === "confirmed" ? "active-stat" : ""}`}
          onClick={() => setActiveTab("confirmed")}
        >
          <div className="appointment-stat-icon green">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span>Confirmed</span>
            <strong>{confirmedCount}</strong>
          </div>
        </div>

        <div
          className={`doctor-appointment-stat ${activeTab === "pending" ? "active-stat" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          <div className="appointment-stat-icon purple">
            <Clock3 size={20} />
          </div>
          <div>
            <span>Pending Review</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>

        <div
          className={`doctor-appointment-stat ${activeTab === "completed" ? "active-stat" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          <div className="appointment-stat-icon teal">
            <Check size={20} />
          </div>
          <div>
            <span>Completed</span>
            <strong>{completedCount}</strong>
          </div>
        </div>

        <div
          className={`doctor-appointment-stat ${activeTab === "cancelled" ? "active-stat" : ""}`}
          onClick={() => setActiveTab("cancelled")}
        >
          <div className="appointment-stat-icon red">
            <XCircle size={20} />
          </div>
          <div>
            <span>Cancelled</span>
            <strong>{cancelledCount}</strong>
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
            className={activeTab === "pending" ? "active" : ""}
            onClick={() => setActiveTab("pending")}
          >
            Pending ({pendingCount})
          </button>
          <button
            className={activeTab === "completed" ? "active" : ""}
            onClick={() => setActiveTab("completed")}
          >
            Completed ({completedCount})
          </button>
          <button
            className={activeTab === "cancelled" ? "active" : ""}
            onClick={() => setActiveTab("cancelled")}
          >
            Cancelled ({cancelledCount})
          </button>
        </div>

        <div className="doctor-appointment-actions">
          <div className="doctor-appointment-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search patient, ID, or clinical reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-text-btn" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* MAIN APPOINTMENTS CARD */}
      <div className="doctor-appointments-card">
        <div className="doctor-appointments-card-header">
          <div>
            <h2>Consultation Schedule</h2>
            <p>
              Showing {filteredAppointments.length} consultation{filteredAppointments.length === 1 ? "" : "s"}
              {selectedDate ? ` on ${selectedDate}` : ""}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="appointments-loading">
            <Loader2 size={32} className="spinning" />
            <span>Loading appointments schedule...</span>
          </div>
        ) : (
          <div className="doctor-appointment-table-wrapper">
            <table className="doctor-appointment-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Slot & Date</th>
                  <th>Clinical Reason</th>
                  <th>Status</th>
                  <th>Workflow Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-appointments-cell">
                      <CalendarDays size={36} />
                      <p>No appointments match your filter criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((apt, index) => {
                    const patient = patientsMap[apt.patient_id];
                    const patientName = patient?.name || "Patient Record";
                    const pid = apt.patient_id || "";
                    const pCode = apt.patient_code || patient?.patient_code || String(patient?.patientId || "").replace("PT-", "") || (pid ? pid.slice(-6) : "");

                    return (
                      <tr key={apt._id || apt.id || index}>
                        <td>
                          <div className="doctor-patient-cell">
                            <div className="doctor-patient-avatar">
                              {patientName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                            <div>
                              <strong>{patientName}</strong>
                              <span>
                                {pCode ? `ID: ${pCode}` : ""}
                                {patient?.phone ? ` • ${patient.phone}` : ""}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="doctor-time-cell">
                            <strong>{apt.appointment_time || "Time Slot"}</strong>
                            <span>{apt.appointment_date || "Date"}</span>
                          </div>
                        </td>

                        <td>
                          <div className="reason-cell">
                            <span className="doctor-reason">
                              {apt.reason || "General Consultation & Review"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`doctor-status ${statusUpper.toLowerCase()}`}
                          >
                            {statusUpper}
                          </span>
                        </td>

                        <td>
                          <div className="actions-button-row">
                            <button
                              className="table-action-btn primary"
                              onClick={() => {
                                setUpdatingAppointment(apt);
                                setStatusToSet("COMPLETED");
                              }}
                              title="Update Status"
                            >
                              Status
                            </button>

                            <button
                              className="table-action-btn secondary"
                              onClick={() => navigate(`/doctor/records?patientId=${pid}`)}
                              title="Medical Chart"
                            >
                              Chart
                            </button>

                            <button
                              className="table-action-btn ai-btn"
                              onClick={() =>
                                navigate(`/doctor/ai-assistant?patientId=${pid}`)
                              }
                              title="AI Triage Note"
                            >
                              <Sparkles size={13} />
                              AI Note
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STATUS UPDATE MODAL */}
      {updatingAppointment && (
        <div
          className="modal-overlay"
          onClick={() => setUpdatingAppointment(null)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Appointment Status</h3>
              <button
                className="modal-close"
                onClick={() => setUpdatingAppointment(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p>
                Select new workflow status for consultation with{" "}
                <strong>
                  {patientsMap[updatingAppointment.patient_id]?.name || "Patient"}
                </strong>
                :
              </p>

              <div className="status-options-grid">
                <button
                  className={`status-select-btn ${statusToSet === "APPROVED" ? "selected approved" : ""}`}
                  onClick={() => setStatusToSet("APPROVED")}
                >
                  <CheckCircle2 size={16} />
                  <span>Approve / Confirm</span>
                </button>

                <button
                  className={`status-select-btn ${statusToSet === "COMPLETED" ? "selected completed" : ""}`}
                  onClick={() => setStatusToSet("COMPLETED")}
                >
                  <Check size={16} />
                  <span>Mark Completed</span>
                </button>

                <button
                  className={`status-select-btn ${statusToSet === "CANCELLED" ? "selected cancelled" : ""}`}
                  onClick={() => setStatusToSet("CANCELLED")}
                >
                  <XCircle size={16} />
                  <span>Cancel Appointment</span>
                </button>

                <button
                  className={`status-select-btn ${statusToSet === "PENDING" ? "selected pending" : ""}`}
                  onClick={() => setStatusToSet("PENDING")}
                >
                  <Clock3 size={16} />
                  <span>Set as Pending</span>
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-btn-cancel"
                onClick={() => setUpdatingAppointment(null)}
              >
                Cancel
              </button>
              <button
                className="modal-btn-confirm"
                onClick={handleUpdateStatus}
                disabled={isUpdating || !statusToSet}
              >
                {isUpdating ? "Saving..." : "Save Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorAppointments;
