import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Stethoscope,
  Search,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  Building,
  UserCheck,
  Calendar,
  Clock,
  Eye,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldCheck,
  UserX,
  Award,
  DollarSign,
  MapPin,
} from "lucide-react";
import api from "../../services/api";
import "./Doctors.css";

const DOCTOR_TABS = [
  { key: "ALL", label: "Total Doctors", countKey: "total", icon: Stethoscope, color: "blue" },
  { key: "VERIFIED", label: "Verified Specialists", countKey: "verified", icon: ShieldCheck, color: "green" },
  { key: "AVAILABLE", label: "Available Today", countKey: "available_today", icon: UserCheck, color: "purple" },
  { key: "ON_LEAVE", label: "On Leave / Away", countKey: "on_leave", icon: UserX, color: "amber" },
];

const SPECIALTY_OPTIONS = [
  "All",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "General Medicine",
  "Oncology",
  "Dermatology",
  "Pulmonology",
  "Gastroenterology",
  "Nephrology",
  "ENT Specialist",
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Doctors() {
  // Data & Pagination
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, available_today: 0, on_leave: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("All");
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Add / Edit Form State
  const [formData, setFormData] = useState({
    name: "",
    specialty: "Cardiology",
    department: "Cardiovascular Sciences",
    hospital_name: "CareBridge General Hospital",
    email: "",
    phone: "",
    city: "New Delhi",
    license_number: "",
    experience_years: 10,
    consultation_fee: 800,
    room_number: "OPD-101",
    bio: "",
    status: "AVAILABLE",
    available_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  });
  const [formErrors, setFormErrors] = useState({});

  // Debounce search (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Toast Helper
  const showToast = (message, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Fetch Doctors
  const fetchDoctors = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        specialty: specialtyFilter !== "All" ? specialtyFilter : undefined,
        status: statusFilter,
      };

      const res = await api.get("/doctors/", { params });
      const data = res.data || {};

      if (Array.isArray(data)) {
        setDoctors(data);
        setTotalCount(data.length);
        setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
      } else {
        setDoctors(data.doctors || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.pages || 1);
        if (data.stats) setStats(data.stats);
      }

      if (isRefresh) {
        showToast("Doctors directory refreshed.", "info");
      }
    } catch (err) {
      console.error("Doctor fetch error:", err);
      setError("Failed to fetch doctors list from backend.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize, debouncedSearch, specialtyFilter, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      name: "",
      specialty: "Cardiology",
      department: "Cardiovascular Sciences",
      hospital_name: "CareBridge General Hospital",
      email: "",
      phone: "",
      city: "New Delhi",
      license_number: "",
      experience_years: 8,
      consultation_fee: 700,
      room_number: "OPD-202",
      bio: "",
      status: "AVAILABLE",
      available_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (doctor) => {
    setSelectedDoctor(doctor);
    setFormData({
      name: doctor.name || "",
      specialty: doctor.specialty || "General Medicine",
      department: doctor.department || doctor.specialty || "General Medicine",
      hospital_name: doctor.hospital_name || doctor.hospital || "CareBridge General Hospital",
      email: doctor.email || "",
      phone: doctor.phone || "",
      city: doctor.city || "New Delhi",
      license_number: doctor.license_number || "",
      experience_years: doctor.experience_years || 10,
      consultation_fee: doctor.consultation_fee || 800,
      room_number: doctor.room_number || "OPD-101",
      bio: doctor.bio || "",
      status: doctor.status || "AVAILABLE",
      available_days: doctor.available_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  // Open View Modal
  const openViewModal = (doctor) => {
    setSelectedDoctor(doctor);
    setShowViewModal(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Doctor full name is required.";
    if (!formData.specialty.trim()) errors.specialty = "Specialty is required.";
    if (!formData.hospital_name.trim()) errors.hospital_name = "Hospital facility is required.";
    if (formData.email && !formData.email.includes("@")) errors.email = "Please enter a valid email address.";
    return errors;
  };

  // Handle Add Doctor Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setActionLoading(true);

    try {
      await api.post("/doctors/", formData);
      showToast(`Doctor ${formData.name} added to directory!`, "success");
      setShowAddModal(false);
      fetchDoctors();
    } catch (err) {
      console.error("Add doctor error:", err);
      showToast(err.response?.data?.detail || "Failed to add doctor.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Doctor Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!selectedDoctor) return;
    setActionLoading(true);

    try {
      const docId = selectedDoctor._id || selectedDoctor.id;
      await api.put(`/doctors/${docId}`, formData);
      showToast(`Doctor profile for ${formData.name} updated!`, "success");
      setShowEditModal(false);
      setSelectedDoctor(null);
      fetchDoctors();
    } catch (err) {
      console.error("Edit doctor error:", err);
      showToast(err.response?.data?.detail || "Failed to update doctor profile.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Doctor Verification
  const handleToggleVerification = async (doctor) => {
    const docId = doctor._id || doctor.id;
    const nextStatus = doctor.verification_status === "Verified" ? "Unverified" : "Verified";
    try {
      setActionLoading(true);
      await api.put(`/doctors/${docId}`, { verification_status: nextStatus });
      showToast(`Doctor marked as ${nextStatus}.`, "success");
      fetchDoctors();
    } catch (err) {
      console.error("Verification toggle error:", err);
      showToast(err.response?.data?.detail || "Failed to update verification status.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Doctor Availability (AVAILABLE / ON_LEAVE)
  const handleToggleAvailability = async (doctor) => {
    const docId = doctor._id || doctor.id;
    const nextStatus = doctor.status === "AVAILABLE" ? "ON_LEAVE" : "AVAILABLE";
    try {
      setActionLoading(true);
      await api.put(`/doctors/${docId}`, { status: nextStatus });
      showToast(`Doctor status changed to ${nextStatus === "AVAILABLE" ? "Available" : "On Leave"}.`, "success");
      fetchDoctors();
    } catch (err) {
      console.error("Availability toggle error:", err);
      showToast(err.response?.data?.detail || "Failed to update availability status.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete / Deactivate Doctor
  const handleDeleteDoctor = async (doctor) => {
    const docId = doctor._id || doctor.id;
    if (!window.confirm(`Are you sure you want to deactivate and remove Dr. ${doctor.name} from the directory?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await api.delete(`/doctors/${docId}`);
      showToast(`Dr. ${doctor.name} removed from registry.`, "info");
      fetchDoctors();
    } catch (err) {
      console.error("Delete doctor error:", err);
      showToast(err.response?.data?.detail || "Failed to delete doctor record.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to toggle available day in form
  const handleToggleDay = (day) => {
    const current = formData.available_days || [];
    if (current.includes(day)) {
      setFormData({ ...formData, available_days: current.filter((d) => d !== day) });
    } else {
      setFormData({ ...formData, available_days: [...current, day] });
    }
  };

  return (
    <div className="staff-doctors-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`staff-doc-toast toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Header with High-Contrast Text */}
      <section className="staff-doc-hero">
        <div className="hero-content">
          <div className="hero-tag">
            <Stethoscope size={14} />
            <span>CLINICAL SPECIALIST DIRECTORY</span>
          </div>
          <h1 className="hero-title">Doctors Directory</h1>
          <p className="hero-subtitle">
            Manage hospital doctors, departments, specialist credentials, consultation schedules, and availability status.
          </p>
        </div>

        <div className="hero-actions">
          <button
            className={`hero-btn-refresh ${isRefreshing ? "spinning" : ""}`}
            onClick={() => fetchDoctors(true)}
            disabled={isRefreshing || loading}
            title="Refresh Doctors Directory"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          <button
            className="hero-btn-primary"
            onClick={openAddModal}
          >
            <Plus size={16} />
            <span>Add Doctor</span>
          </button>
        </div>
      </section>

      {/* 4 Responsive Stat Cards */}
      <section className="staff-doc-stats-grid">
        {DOCTOR_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = statusFilter === tab.key;
          const count = stats[tab.countKey] || 0;

          return (
            <div
              key={tab.key}
              className={`doc-stat-card card-${tab.color} ${isActive ? "doc-stat-card-active" : ""}`}
              onClick={() => {
                setStatusFilter(tab.key);
                setCurrentPage(1);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="doc-stat-icon">
                <Icon size={22} />
              </div>
              <div className="doc-stat-body">
                <span className="doc-stat-label">{tab.label}</span>
                <strong className="doc-stat-value">{count}</strong>
              </div>
              <div className="doc-stat-indicator" />
            </div>
          );
        })}
      </section>

      {/* Main Table Card */}
      <section className="staff-doc-main-card">
        {/* Toolbar with Multi-Filters */}
        <div className="doc-card-toolbar">
          <div className="doc-search-box">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search by doctor name, specialty, hospital, city, license..."
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

          <div className="doc-filter-group">
            {/* Specialty Filter */}
            <div className="filter-select-wrapper">
              <Filter size={15} />
              <select
                value={specialtyFilter}
                onChange={(e) => {
                  setSpecialtyFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {SPECIALTY_OPTIONS.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec === "All" ? "All Specialties" : spec}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            {(search || specialtyFilter !== "All" || statusFilter !== "ALL") && (
              <button
                className="btn-clear-filters"
                onClick={() => {
                  setSearch("");
                  setSpecialtyFilter("All");
                  setStatusFilter("ALL");
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="doc-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="doc-loading-state">
            <Loader2 size={36} className="spinner-loader" />
            <p>Loading clinical directory...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && doctors.length === 0 && (
          <div className="doc-empty-state">
            <div className="empty-icon-wrap">
              <Stethoscope size={42} />
            </div>
            <h3>No doctors found</h3>
            <p>
              {search || specialtyFilter !== "All" || statusFilter !== "ALL"
                ? "No specialists match your search criteria. Try clearing or relaxing filters."
                : "No doctors are currently registered in the system."}
            </p>
            <button
              className="btn-create-first"
              onClick={openAddModal}
            >
              <Plus size={16} />
              <span>Add New Doctor</span>
            </button>
          </div>
        )}

        {/* Desktop Table View */}
        {!loading && doctors.length > 0 && (
          <div className="doc-table-wrapper">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Doctor Name & Specialty</th>
                  <th>Hospital & Facility</th>
                  <th>Experience & Fee</th>
                  <th>Availability Days</th>
                  <th>Status</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doc) => {
                  const docId = doc._id || doc.id;
                  const name = doc.name || "Doctor";
                  const specialty = doc.specialty || "General Medicine";
                  const hospital = doc.hospital_name || doc.hospital || "CareBridge Hospital";
                  const city = doc.city || "New Delhi";
                  const exp = doc.experience_years ? `${doc.experience_years} yrs` : "10 yrs";
                  const fee = doc.consultation_fee ? `₹${doc.consultation_fee}` : "₹800";
                  const status = (doc.status || "AVAILABLE").toUpperCase();
                  const isVerified = doc.verification_status === "Verified";
                  const isAvailable = status === "AVAILABLE";

                  return (
                    <tr key={docId} className="doc-table-row">
                      {/* Doctor Name & Specialty */}
                      <td className="td-doctor-info">
                        <div className="doc-avatar-meta">
                          <div className="doc-avatar">
                            {name.replace("Dr.", "").trim().slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="doc-name-line">
                              <strong className="doc-name">{name}</strong>
                              {isVerified && (
                                <span className="verified-badge-mini" title="Verified Specialist">
                                  <ShieldCheck size={13} />
                                </span>
                              )}
                            </div>
                            <span className="doc-spec-text">{specialty}</span>
                          </div>
                        </div>
                      </td>

                      {/* Hospital & City */}
                      <td className="td-hospital">
                        <div className="hospital-meta">
                          <strong className="hospital-name">{hospital}</strong>
                          <span className="city-text"><MapPin size={11} /> {city}</span>
                        </div>
                      </td>

                      {/* Experience & Fee */}
                      <td className="td-exp-fee">
                        <div className="exp-fee-meta">
                          <span className="fee-tag">{fee}</span>
                          <span className="exp-text"><Award size={11} /> {exp}</span>
                        </div>
                      </td>

                      {/* Availability Days */}
                      <td className="td-days">
                        <div className="days-pills-wrap">
                          {(doc.available_days || ["Mon", "Tue", "Wed", "Thu", "Fri"]).map((d, i) => (
                            <span key={i} className="day-pill">{d.slice(0, 3)}</span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="td-status">
                        <span className={`doc-status-pill ${isAvailable ? "status-avail" : "status-leave"}`}>
                          {isAvailable ? "Available" : "On Leave"}
                        </span>
                      </td>

                      {/* Row Actions */}
                      <td className="td-actions">
                        <div className="row-actions-group">
                          <button
                            className="action-btn btn-view"
                            title="View Full Profile"
                            onClick={() => openViewModal(doc)}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            className="action-btn btn-edit"
                            title="Edit Doctor Details"
                            onClick={() => openEditModal(doc)}
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            className="action-btn btn-verify"
                            title={isVerified ? "Mark Unverified" : "Verify Doctor"}
                            onClick={() => handleToggleVerification(doc)}
                          >
                            <ShieldCheck size={15} />
                          </button>

                          <button
                            className="action-btn btn-toggle-avail"
                            title={isAvailable ? "Mark On Leave" : "Mark Available"}
                            onClick={() => handleToggleAvailability(doc)}
                          >
                            {isAvailable ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>

                          <button
                            className="action-btn btn-delete"
                            title="Deactivate Doctor"
                            onClick={() => handleDeleteDoctor(doc)}
                          >
                            <Trash2 size={15} />
                          </button>
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
        {!loading && doctors.length > 0 && (
          <div className="doc-mobile-cards-grid">
            {doctors.map((doc) => {
              const docId = doc._id || doc.id;
              const name = doc.name || "Doctor";
              const specialty = doc.specialty || "General Medicine";
              const hospital = doc.hospital_name || doc.hospital || "CareBridge Hospital";
              const city = doc.city || "New Delhi";
              const exp = doc.experience_years ? `${doc.experience_years} yrs` : "10 yrs";
              const fee = doc.consultation_fee ? `₹${doc.consultation_fee}` : "₹800";
              const status = (doc.status || "AVAILABLE").toUpperCase();
              const isVerified = doc.verification_status === "Verified";
              const isAvailable = status === "AVAILABLE";

              return (
                <div key={docId} className="doc-mobile-card">
                  <div className="mobile-card-top">
                    <div className="doc-name-line">
                      <strong>{name}</strong>
                      {isVerified && <ShieldCheck size={14} className="verified-icon" />}
                    </div>
                    <span className={`doc-status-pill ${isAvailable ? "status-avail" : "status-leave"}`}>
                      {isAvailable ? "Available" : "On Leave"}
                    </span>
                  </div>

                  <div className="mobile-card-body">
                    <div className="mobile-info-row">
                      <Stethoscope size={14} className="info-icon" />
                      <span>{specialty}</span>
                    </div>

                    <div className="mobile-info-row">
                      <Building size={14} className="info-icon" />
                      <span>{hospital} ({city})</span>
                    </div>

                    <div className="mobile-info-row">
                      <DollarSign size={14} className="info-icon" />
                      <span>Fee: <strong>{fee}</strong> • Exp: <strong>{exp}</strong></span>
                    </div>
                  </div>

                  <div className="mobile-card-actions">
                    <button className="m-btn btn-m-view" onClick={() => openViewModal(doc)}>
                      <Eye size={13} /> View
                    </button>
                    <button className="m-btn btn-m-edit" onClick={() => openEditModal(doc)}>
                      <Edit2 size={13} /> Edit
                    </button>
                    <button className="m-btn btn-m-avail" onClick={() => handleToggleAvailability(doc)}>
                      {isAvailable ? "Set Leave" : "Set Available"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Card Footer & Pagination */}
        {!loading && doctors.length > 0 && (
          <div className="doc-card-footer">
            <div className="footer-count">
              Showing <strong>{doctors.length}</strong> of <strong>{totalCount}</strong> specialists
            </div>

            <div className="doc-pagination">
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
      {/* MODAL: ADD / EDIT DOCTOR */}
      {/* ============================================================ */}
      {(showAddModal || showEditModal) && (
        <div
          className="staff-doc-modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
          }}
        >
          <div className="staff-doc-modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Stethoscope size={20} className="modal-icon" />
                <h2>{showEditModal ? "Edit Doctor Profile" : "Add Specialist to Directory"}</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={showEditModal ? handleEditSubmit : handleAddSubmit} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Doctor Full Name <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Rajesh Mehta"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={formErrors.name ? "input-error" : ""}
                    required
                  />
                  {formErrors.name && <span className="field-err">{formErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label>Specialty <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Interventional Cardiology"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    className={formErrors.specialty ? "input-error" : ""}
                    required
                  />
                  {formErrors.specialty && <span className="field-err">{formErrors.specialty}</span>}
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Hospital / Facility <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. CareBridge Super Specialty"
                    value={formData.hospital_name}
                    onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                    className={formErrors.hospital_name ? "input-error" : ""}
                    required
                  />
                  {formErrors.hospital_name && <span className="field-err">{formErrors.hospital_name}</span>}
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    placeholder="e.g. New Delhi"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Consultation Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.consultation_fee}
                    onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Room / OPD No.</label>
                  <input
                    type="text"
                    placeholder="e.g. OPD-304"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    placeholder="e.g. doctor@carebridge.ai"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={formErrors.email ? "input-error" : ""}
                  />
                  {formErrors.email && <span className="field-err">{formErrors.email}</span>}
                </div>
              </div>

              {/* Availability Days Selection */}
              <div className="form-group">
                <label>Available Consultation Days</label>
                <div className="days-picker-group">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = (formData.available_days || []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`day-toggle-btn ${isSelected ? "day-selected" : ""}`}
                        onClick={() => handleToggleDay(day)}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bio */}
              <div className="form-group">
                <label>Professional Bio / Profile Summary</label>
                <textarea
                  rows={3}
                  placeholder="Summary of qualifications, fellowship, and clinical focus areas..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 size={16} className="spinner-loader" /> : <Check size={16} />}
                  <span>{showEditModal ? "Save Changes" : "Register Doctor"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: VIEW DOCTOR PROFILE */}
      {/* ============================================================ */}
      {showViewModal && selectedDoctor && (
        <div className="staff-doc-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="staff-doc-modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Stethoscope size={20} className="modal-icon" />
                <h2>Doctor Profile: {selectedDoctor.name}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowViewModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-details-body">
              <div className="doc-profile-header-card">
                <div className="doc-avatar-large">
                  {selectedDoctor.name.replace("Dr.", "").trim().slice(0, 2).toUpperCase()}
                </div>
                <div className="doc-profile-header-text">
                  <h3>{selectedDoctor.name}</h3>
                  <p className="doc-profile-spec">{selectedDoctor.specialty}</p>
                  <p className="doc-profile-hosp">{selectedDoctor.hospital_name || selectedDoctor.hospital || "CareBridge Hospital"}</p>
                </div>
              </div>

              <div className="details-grid-2">
                <div className="detail-card">
                  <h4><Building size={16} /> Clinical Information</h4>
                  <p><strong>Department:</strong> {selectedDoctor.department || selectedDoctor.specialty}</p>
                  <p><strong>Room / OPD:</strong> {selectedDoctor.room_number || "OPD-101"}</p>
                  <p><strong>Experience:</strong> {selectedDoctor.experience_years || 10} Years</p>
                  <p><strong>Fee:</strong> ₹{selectedDoctor.consultation_fee || 800}</p>
                  <p><strong>License:</strong> {selectedDoctor.license_number || "Verified Registry"}</p>
                </div>

                <div className="detail-card">
                  <h4><Calendar size={16} /> Schedule & Availability</h4>
                  <p><strong>Status:</strong> {selectedDoctor.status === "AVAILABLE" ? "Available Today" : "On Leave"}</p>
                  <p><strong>Days:</strong> {(selectedDoctor.available_days || []).join(", ") || "Mon - Fri"}</p>
                  <p><strong>Slots:</strong> {(selectedDoctor.available_slots || ["09:00 AM - 05:00 PM"]).join(", ")}</p>
                </div>
              </div>

              {selectedDoctor.bio && (
                <div className="detail-card-full">
                  <h4><Award size={16} /> Professional Bio</h4>
                  <p>{selectedDoctor.bio}</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-modal-secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
              <button
                className="btn-modal-primary"
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(selectedDoctor);
                }}
              >
                <Edit2 size={16} /> Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}