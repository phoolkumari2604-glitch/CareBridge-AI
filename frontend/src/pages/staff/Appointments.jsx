import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CalendarDays,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Plus,
  Eye,
  Check,
  X,
  Calendar,
  User,
  Stethoscope,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCheck,
  Clock3,
} from "lucide-react";
import api from "../../services/api";
import "./Appointments.css";

const TIME_SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
];

const STATUS_TABS = [
  { key: "ALL", label: "Total", countKey: "total", icon: CalendarDays, color: "blue" },
  { key: "APPROVED", label: "Approved", countKey: "approved", icon: CheckCircle2, color: "green" },
  { key: "PENDING", label: "Pending", countKey: "pending", icon: Clock, color: "amber" },
  { key: "COMPLETED", label: "Completed", countKey: "completed", icon: CheckCheck, color: "purple" },
];

export default function Appointments() {
  // Data & Pagination
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, completed: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Add Appointment Form State
  const [addForm, setAddForm] = useState({
    patient_id: "",
    doctor_id: "",
    appointment_date: new Date().toISOString().split("T")[0],
    appointment_time: "10:00 AM",
    reason: "",
  });
  const [addFormErrors, setAddFormErrors] = useState({});

  // Reschedule Form State
  const [rescheduleData, setRescheduleData] = useState({
    appointment_date: "",
    appointment_time: "10:00 AM",
  });

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Show toast utility
  const showToast = (message, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Fetch appointments from API
  const fetchAppointments = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        status: statusFilter,
      };

      const res = await api.get("/appointments/", { params });
      const data = res.data || {};

      if (Array.isArray(data)) {
        setAppointments(data);
        setTotalCount(data.length);
        setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
      } else {
        setAppointments(data.appointments || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.pages || 1);
        if (data.stats) {
          setStats(data.stats);
        }
      }

      if (isRefresh) {
        showToast("Consultation schedule refreshed.", "info");
      }
    } catch (err) {
      console.error("Failed to load appointments:", err);
      setError("Failed to load appointments. Please check network connection.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter]);

  // Initial load & when filters change
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Load patient & doctor lists for dropdowns
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [patRes, docRes] = await Promise.allSettled([
          api.get("/patients/?limit=100"),
          api.get("/doctors/"),
        ]);

        if (patRes.status === "fulfilled") {
          const patData = patRes.value.data;
          const list = Array.isArray(patData) ? patData : (patData.patients || []);
          setPatients(list.filter((p) => p.name && p.name.toLowerCase() !== "string"));
        }

        if (docRes.status === "fulfilled") {
          const docData = docRes.value.data;
          const list = Array.isArray(docData) ? docData : [];
          setDoctors(list);
        }
      } catch (err) {
        console.warn("Could not load form lists:", err);
      }
    };
    loadPrerequisites();
  }, []);

  // Handle Tab Click
  const handleTabClick = (key) => {
    setStatusFilter(key);
    setCurrentPage(1);
  };

  // Status Updater (Approve, Complete, Cancel)
  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      setActionLoading(true);
      await api.put(`/appointments/${appointmentId}`, { status: newStatus });
      showToast(`Appointment #${appointmentId.slice(-6).toUpperCase()} marked as ${newStatus}.`, "success");
      if (showViewModal) setShowViewModal(false);
      fetchAppointments();
    } catch (err) {
      console.error("Status update error:", err);
      showToast(err.response?.data?.detail || "Failed to update appointment status.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Reschedule Form Submit
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    if (!rescheduleData.appointment_date) {
      showToast("Please select a new consultation date.", "error");
      return;
    }

    try {
      setActionLoading(true);
      const apptId = selectedAppointment._id || selectedAppointment.id;
      await api.put(`/appointments/${apptId}`, {
        appointment_date: rescheduleData.appointment_date,
        appointment_time: rescheduleData.appointment_time,
        status: "APPROVED",
      });

      showToast(`Appointment rescheduled to ${rescheduleData.appointment_date} at ${rescheduleData.appointment_time}.`, "success");
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      fetchAppointments();
    } catch (err) {
      console.error("Reschedule failed:", err);
      showToast(err.response?.data?.detail || "Failed to reschedule appointment slot.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Reschedule Modal
  const openReschedule = (apt) => {
    setSelectedAppointment(apt);
    setRescheduleData({
      appointment_date: apt.appointment_date || new Date().toISOString().split("T")[0],
      appointment_time: apt.appointment_time || "10:00 AM",
    });
    setShowRescheduleModal(true);
  };

  // Open View Modal
  const openViewDetails = (apt) => {
    setSelectedAppointment(apt);
    setShowViewModal(true);
  };

  // Add Appointment Form Validation & Submission
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!addForm.patient_id) errors.patient_id = "Please select a patient.";
    if (!addForm.doctor_id) errors.doctor_id = "Please select an attending doctor.";
    if (!addForm.appointment_date) errors.appointment_date = "Date is required.";
    if (!addForm.appointment_time) errors.appointment_time = "Time slot is required.";
    if (!addForm.reason.trim()) errors.reason = "Consultation reason is required.";

    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      return;
    }

    setAddFormErrors({});
    setActionLoading(true);

    try {
      const selectedDoc = doctors.find((d) => (d._id || d.id) === addForm.doctor_id);
      const payload = {
        ...addForm,
        hospital_id: selectedDoc?.hospital_id || undefined,
      };

      const res = await api.post("/appointments/", payload);
      const newBookingId = res.data?.booking_id || `#${(res.data?.appointment_id || "").slice(-6).toUpperCase()}`;

      showToast(`Appointment booked successfully (${newBookingId})!`, "success");
      setShowAddModal(false);
      setAddForm({
        patient_id: "",
        doctor_id: "",
        appointment_date: new Date().toISOString().split("T")[0],
        appointment_time: "10:00 AM",
        reason: "",
      });
      fetchAppointments();
    } catch (err) {
      console.error("Booking error:", err);
      showToast(err.response?.data?.detail || "Failed to book appointment. Please try again.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to format status badges
  const renderStatusBadge = (status) => {
    const st = (status || "PENDING").toUpperCase();
    if (st === "APPROVED" || st === "CONFIRMED") {
      return <span className="apt-badge badge-approved"><CheckCircle2 size={12} /> Approved</span>;
    }
    if (st === "COMPLETED") {
      return <span className="apt-badge badge-completed"><CheckCheck size={12} /> Completed</span>;
    }
    if (st === "CANCELLED" || st === "REJECTED") {
      return <span className="apt-badge badge-cancelled"><XCircle size={12} /> Cancelled</span>;
    }
    return <span className="apt-badge badge-pending"><Clock3 size={12} /> Pending</span>;
  };

  return (
    <div className="staff-appointments-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`staff-apt-toast toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Header */}
      <section className="staff-apt-hero">
        <div className="hero-content">
          <div className="hero-tag">
            <CalendarDays size={14} />
            <span>CAREBRIDGE AI CLINICAL ROSTER</span>
          </div>
          <h1 className="hero-title">Appointments</h1>
          <p className="hero-subtitle">
            Manage hospital consultation schedules, doctor assignments, triage approvals, and patient bookings.
          </p>
        </div>

        <div className="hero-actions">
          <button
            className={`hero-btn-refresh ${isRefreshing ? "spinning" : ""}`}
            onClick={() => fetchAppointments(true)}
            disabled={isRefreshing || loading}
            title="Refresh Appointments"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          <button
            className="hero-btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            <span>New Appointment</span>
          </button>
        </div>
      </section>

      {/* 4 Responsive Stat Cards */}
      <section className="staff-apt-stats-grid">
        {STATUS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = statusFilter === tab.key;
          const count = stats[tab.countKey] || 0;

          return (
            <div
              key={tab.key}
              className={`stat-card card-${tab.color} ${isActive ? "stat-card-active" : ""}`}
              onClick={() => handleTabClick(tab.key)}
              role="button"
              tabIndex={0}
            >
              <div className="stat-card-icon">
                <Icon size={22} />
              </div>
              <div className="stat-card-body">
                <span className="stat-label">{tab.label} Bookings</span>
                <strong className="stat-value">{count}</strong>
              </div>
              <div className="stat-card-indicator" />
            </div>
          );
        })}
      </section>

      {/* Main Table / List Card */}
      <section className="staff-apt-main-card">
        {/* Card Toolbar */}
        <div className="apt-card-toolbar">
          <div className="apt-search-box">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search by patient, doctor, booking ID, phone, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="search-clear-btn"
                onClick={() => setSearch("")}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="apt-filter-group">
            <div className="filter-select-wrapper">
              <Filter size={15} />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved / Confirmed</option>
                <option value="PENDING">Pending Clearance</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="apt-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="apt-loading-state">
            <Loader2 size={36} className="spinner-loader" />
            <p>Loading consultation roster...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && appointments.length === 0 && (
          <div className="apt-empty-state">
            <div className="empty-icon-wrap">
              <CalendarDays size={42} />
            </div>
            <h3>No appointments found</h3>
            <p>
              {search || statusFilter !== "ALL"
                ? "No appointments match your active search and filter criteria. Try adjusting your query."
                : "No appointments are currently booked in the system."}
            </p>
            <button
              className="btn-create-first"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} />
              <span>Book New Appointment</span>
            </button>
          </div>
        )}

        {/* Desktop Table View */}
        {!loading && appointments.length > 0 && (
          <div className="apt-table-wrapper">
            <table className="apt-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Patient</th>
                  <th>Doctor & Department</th>
                  <th>Date & Time</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => {
                  const aptId = apt._id || apt.id;
                  const bookingCode = apt.booking_id || `APT-${String(aptId).slice(-6).toUpperCase()}`;
                  const patientName = apt.patient_name || "—";
                  const patientPhone = apt.patient_phone || "—";
                  const doctorName = apt.doctor_name || "—";
                  const specialty = apt.specialty || apt.department || "General Medicine";
                  const dateStr = apt.appointment_date || "—";
                  const timeStr = apt.appointment_time || "—";
                  const reasonStr = apt.reason || "General Consultation";
                  const status = (apt.status || "PENDING").toUpperCase();

                  return (
                    <tr key={aptId} className="apt-table-row">
                      {/* Booking ID */}
                      <td className="td-booking-id">
                        <span className="booking-tag">{bookingCode}</span>
                      </td>

                      {/* Patient */}
                      <td className="td-patient">
                        <div className="patient-meta">
                          <strong className="patient-name">{patientName}</strong>
                          {patientPhone !== "—" && (
                            <span className="patient-phone">
                              <Phone size={11} /> {patientPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="td-doctor">
                        <div className="doctor-meta">
                          <strong className="doctor-name">{doctorName}</strong>
                          <span className="doctor-spec">{specialty}</span>
                        </div>
                      </td>

                      {/* Date / Time */}
                      <td className="td-datetime">
                        <div className="datetime-meta">
                          <span className="dt-time"><Clock size={12} /> {timeStr}</span>
                          <span className="dt-date"><Calendar size={12} /> {dateStr}</span>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="td-reason">
                        <span className="reason-text" title={reasonStr}>
                          {reasonStr}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="td-status">
                        {renderStatusBadge(status)}
                      </td>

                      {/* Row Actions */}
                      <td className="td-actions">
                        <div className="row-actions-group">
                          <button
                            className="action-btn btn-view"
                            title="View Full Details"
                            onClick={() => openViewDetails(apt)}
                          >
                            <Eye size={15} />
                          </button>

                          {status !== "APPROVED" && status !== "CONFIRMED" && status !== "COMPLETED" && (
                            <button
                              className="action-btn btn-approve"
                              title="Approve Booking"
                              onClick={() => handleUpdateStatus(aptId, "APPROVED")}
                            >
                              <Check size={15} />
                            </button>
                          )}

                          {status !== "COMPLETED" && status !== "CANCELLED" && (
                            <button
                              className="action-btn btn-reschedule"
                              title="Reschedule Slot"
                              onClick={() => openReschedule(apt)}
                            >
                              <Calendar size={15} />
                            </button>
                          )}

                          {status !== "COMPLETED" && (
                            <button
                              className="action-btn btn-complete"
                              title="Mark Completed"
                              onClick={() => handleUpdateStatus(aptId, "COMPLETED")}
                            >
                              <CheckCheck size={15} />
                            </button>
                          )}

                          {status !== "CANCELLED" && (
                            <button
                              className="action-btn btn-cancel"
                              title="Cancel Booking"
                              onClick={() => handleUpdateStatus(aptId, "CANCELLED")}
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Stacked Cards View */}
        {!loading && appointments.length > 0 && (
          <div className="apt-mobile-cards-grid">
            {appointments.map((apt) => {
              const aptId = apt._id || apt.id;
              const bookingCode = apt.booking_id || `APT-${String(aptId).slice(-6).toUpperCase()}`;
              const patientName = apt.patient_name || "—";
              const patientPhone = apt.patient_phone || "—";
              const doctorName = apt.doctor_name || "—";
              const specialty = apt.specialty || "General Medicine";
              const dateStr = apt.appointment_date || "—";
              const timeStr = apt.appointment_time || "—";
              const reasonStr = apt.reason || "General Consultation";
              const status = (apt.status || "PENDING").toUpperCase();

              return (
                <div key={aptId} className="apt-mobile-card">
                  <div className="mobile-card-top">
                    <span className="booking-tag">{bookingCode}</span>
                    {renderStatusBadge(status)}
                  </div>

                  <div className="mobile-card-body">
                    <div className="mobile-info-row">
                      <User size={15} className="info-icon" />
                      <div>
                        <strong>{patientName}</strong>
                        {patientPhone !== "—" && <small>{patientPhone}</small>}
                      </div>
                    </div>

                    <div className="mobile-info-row">
                      <Stethoscope size={15} className="info-icon" />
                      <div>
                        <strong>{doctorName}</strong>
                        <small>{specialty}</small>
                      </div>
                    </div>

                    <div className="mobile-info-row">
                      <Clock size={15} className="info-icon" />
                      <div>
                        <strong>{timeStr}</strong>
                        <small>{dateStr}</small>
                      </div>
                    </div>

                    <div className="mobile-reason-box">
                      <span className="reason-label">Reason:</span>
                      <p>{reasonStr}</p>
                    </div>
                  </div>

                  <div className="mobile-card-actions">
                    <button
                      className="m-btn btn-m-view"
                      onClick={() => openViewDetails(apt)}
                    >
                      <Eye size={14} /> Details
                    </button>

                    {status !== "APPROVED" && status !== "CONFIRMED" && status !== "COMPLETED" && (
                      <button
                        className="m-btn btn-m-approve"
                        onClick={() => handleUpdateStatus(aptId, "APPROVED")}
                      >
                        <Check size={14} /> Approve
                      </button>
                    )}

                    {status !== "COMPLETED" && status !== "CANCELLED" && (
                      <button
                        className="m-btn btn-m-reschedule"
                        onClick={() => openReschedule(apt)}
                      >
                        <Calendar size={14} /> Reschedule
                      </button>
                    )}

                    {status !== "COMPLETED" && (
                      <button
                        className="m-btn btn-m-complete"
                        onClick={() => handleUpdateStatus(aptId, "COMPLETED")}
                      >
                        <CheckCheck size={14} /> Done
                      </button>
                    )}

                    {status !== "CANCELLED" && (
                      <button
                        className="m-btn btn-m-cancel"
                        onClick={() => handleUpdateStatus(aptId, "CANCELLED")}
                      >
                        <X size={14} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Card Footer & Pagination */}
        {!loading && appointments.length > 0 && (
          <div className="apt-card-footer">
            <div className="footer-count">
              Showing <strong>{appointments.length}</strong> of <strong>{totalCount}</strong> appointments
            </div>

            <div className="apt-pagination">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <span className="pagination-current">
                Page {currentPage} of {totalPages}
              </span>

              <button
                className="pagination-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* MODAL: CREATE NEW APPOINTMENT */}
      {/* ============================================================ */}
      {showAddModal && (
        <div className="staff-apt-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="staff-apt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <CalendarDays size={20} className="modal-icon" />
                <h2>Book New Consultation</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="modal-form">
              {/* Select Patient */}
              <div className="form-group">
                <label>Select Patient <span className="req">*</span></label>
                <select
                  value={addForm.patient_id}
                  onChange={(e) => setAddForm({ ...addForm, patient_id: e.target.value })}
                  className={addFormErrors.patient_id ? "input-error" : ""}
                >
                  <option value="">-- Choose Registered Patient --</option>
                  {patients.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name} ({p.phone || "No Phone"} - {p.patient_id_code || p.patientId || "ID"})
                    </option>
                  ))}
                </select>
                {addFormErrors.patient_id && <span className="field-err">{addFormErrors.patient_id}</span>}
              </div>

              {/* Select Doctor */}
              <div className="form-group">
                <label>Attending Specialist <span className="req">*</span></label>
                <select
                  value={addForm.doctor_id}
                  onChange={(e) => setAddForm({ ...addForm, doctor_id: e.target.value })}
                  className={addFormErrors.doctor_id ? "input-error" : ""}
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d._id || d.id} value={d._id || d.id}>
                      {d.name} — {d.specialty || "Specialist"} ({d.hospital_name || d.hospital || "Hospital"})
                    </option>
                  ))}
                </select>
                {addFormErrors.doctor_id && <span className="field-err">{addFormErrors.doctor_id}</span>}
              </div>

              {/* Date & Time Grid */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Appointment Date <span className="req">*</span></label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={addForm.appointment_date}
                    onChange={(e) => setAddForm({ ...addForm, appointment_date: e.target.value })}
                    className={addFormErrors.appointment_date ? "input-error" : ""}
                  />
                  {addFormErrors.appointment_date && <span className="field-err">{addFormErrors.appointment_date}</span>}
                </div>

                <div className="form-group">
                  <label>Time Slot <span className="req">*</span></label>
                  <select
                    value={addForm.appointment_time}
                    onChange={(e) => setAddForm({ ...addForm, appointment_time: e.target.value })}
                    className={addFormErrors.appointment_time ? "input-error" : ""}
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  {addFormErrors.appointment_time && <span className="field-err">{addFormErrors.appointment_time}</span>}
                </div>
              </div>

              {/* Reason */}
              <div className="form-group">
                <label>Chief Complaint / Consultation Reason <span className="req">*</span></label>
                <textarea
                  rows={3}
                  placeholder="e.g., Routine cardiac follow-up, chest discomfort evaluation..."
                  value={addForm.reason}
                  onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
                  className={addFormErrors.reason ? "input-error" : ""}
                />
                {addFormErrors.reason && <span className="field-err">{addFormErrors.reason}</span>}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 size={16} className="spinner-loader" /> : <Check size={16} />}
                  <span>Confirm Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: VIEW DETAILS */}
      {/* ============================================================ */}
      {showViewModal && selectedAppointment && (
        <div className="staff-apt-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="staff-apt-modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Eye size={20} className="modal-icon" />
                <h2>Appointment #{selectedAppointment.booking_id || (selectedAppointment._id || "").slice(-6).toUpperCase()}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowViewModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-details-body">
              <div className="details-grid-2">
                <div className="detail-card">
                  <h4><User size={16} /> Patient Information</h4>
                  <p><strong>Name:</strong> {selectedAppointment.patient_name || "—"}</p>
                  <p><strong>Phone:</strong> {selectedAppointment.patient_phone || "—"}</p>
                  <p><strong>Email:</strong> {selectedAppointment.patient_email || "—"}</p>
                </div>

                <div className="detail-card">
                  <h4><Stethoscope size={16} /> Doctor & Facility</h4>
                  <p><strong>Doctor:</strong> {selectedAppointment.doctor_name || "—"}</p>
                  <p><strong>Specialty:</strong> {selectedAppointment.specialty || "—"}</p>
                  <p><strong>Hospital:</strong> {selectedAppointment.hospital_name || "CareBridge General Hospital"}</p>
                </div>
              </div>

              <div className="detail-card-full">
                <h4><Calendar size={16} /> Schedule & Clinical Notes</h4>
                <div className="details-schedule-row">
                  <div><strong>Date:</strong> {selectedAppointment.appointment_date || "—"}</div>
                  <div><strong>Time:</strong> {selectedAppointment.appointment_time || "—"}</div>
                  <div><strong>Status:</strong> {renderStatusBadge(selectedAppointment.status)}</div>
                </div>
                <div className="details-reason-box">
                  <strong>Consultation Reason:</strong>
                  <p>{selectedAppointment.reason || "General Medical Examination"}</p>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-modal-secondary"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
              {selectedAppointment.status !== "COMPLETED" && (
                <button
                  className="btn-modal-primary"
                  onClick={() => {
                    setShowViewModal(false);
                    openReschedule(selectedAppointment);
                  }}
                >
                  <Calendar size={16} /> Reschedule
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: RESCHEDULE */}
      {/* ============================================================ */}
      {showRescheduleModal && selectedAppointment && (
        <div className="staff-apt-modal-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div className="staff-apt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Calendar size={20} className="modal-icon" />
                <h2>Reschedule Appointment</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowRescheduleModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="modal-form">
              <p className="reschedule-intro">
                Rescheduling appointment for <strong>{selectedAppointment.patient_name}</strong> with <strong>{selectedAppointment.doctor_name}</strong>.
              </p>

              <div className="form-group">
                <label>New Consultation Date <span className="req">*</span></label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={rescheduleData.appointment_date}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, appointment_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Time Slot <span className="req">*</span></label>
                <select
                  value={rescheduleData.appointment_time}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, appointment_time: e.target.value })}
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={() => setShowRescheduleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 size={16} className="spinner-loader" /> : <Check size={16} />}
                  <span>Save New Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}