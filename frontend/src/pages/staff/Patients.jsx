import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  X,
  CheckCircle2,
  Phone,
  Mail,
  Heart,
  Droplets,
  Calendar,
  Key,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Filter,
  ArrowUpDown,
  UserCheck,
  Activity,
  Clock,
  FileText,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import patientService from "../../services/patientService";
import { useAuth } from "../../context/AuthContext";
import "./Patients.css";

const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STATUS_OPTIONS = ["All", "Active", "Pending", "Inactive"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name_asc", label: "Name (A – Z)" },
  { value: "name_desc", label: "Name (Z – A)" },
];

function Patients() {
  const { user } = useAuth();

  // Data & Pagination State
  const [patients, setPatients] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [stats, setStats] = useState({ total: 0, active: 0, telemetry: 0 });

  // Filter & Search State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Interaction States
  const [highlightedId, setHighlightedId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Toast Notification State
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Add Patient Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    email: "",
    age: "",
    gender: "Male",
    blood_group: "O+",
    emergency_contact: "",
    allergies: "",
    medical_history: "",
    status: "Active",
    create_account: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [addLoading, setAddLoading] = useState(false);

  // Newly Created Credentials Modal
  const [newCredentials, setNewCredentials] = useState(null);
  const [credCopied, setCredCopied] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Show Toast Helper
  const showToast = useCallback((type, message, duration = 4000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  // Fetch Patients from Server API
  const fetchPatients = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter !== "All" ? statusFilter : undefined,
        sort: sortBy,
      };

      const res = await patientService.getPatients(params);

      if (res && res.patients) {
        setPatients(Array.isArray(res.patients) ? res.patients : []);
        setTotalCount(res.total || 0);
        setTotalPages(res.total_pages || 1);
        if (res.stats) {
          setStats(res.stats);
        }
      } else if (Array.isArray(res)) {
        // Fallback for array response
        setPatients(res);
        setTotalCount(res.length);
        setTotalPages(Math.ceil(res.length / pageSize) || 1);
        setStats({
          total: res.length,
          active: res.filter((p) => (p.status || "Active").toLowerCase() === "active").length,
          telemetry: res.filter((p) => p.blood_group || p.allergies?.length).length,
        });
      } else {
        setPatients([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to load staff patients:", err);
      const msg = err.response?.data?.detail || "Failed to load patient records from backend.";
      setError(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter, sortBy, showToast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Handle Manual Refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPatients(true).then(() => {
      showToast("info", "Patient directory refreshed successfully.");
    });
  };

  // Client-Side Validation for Add Form
  const validateForm = () => {
    const errors = {};

    // 1. Name validation (letters only, min 2 chars, reject 'string')
    const nameTrim = addForm.name.trim();
    if (!nameTrim) {
      errors.name = "Full name is required.";
    } else if (nameTrim.toLowerCase() === "string" || nameTrim.length < 2) {
      errors.name = "Name must be at least 2 characters.";
    } else if (!/^[a-zA-Z\s\.\'-]{2,80}$/.test(nameTrim)) {
      errors.name = "Name can only contain letters, spaces, dots, and hyphens.";
    }

    // 2. Phone validation (10 digits)
    const rawDigits = addForm.phone.replace(/\D/g, "");
    const cleanDigits = rawDigits.startsWith("91") && rawDigits.length === 12 ? rawDigits.slice(2) : rawDigits;
    if (!addForm.phone.trim()) {
      errors.phone = "Mobile phone number is required.";
    } else if (addForm.phone.toLowerCase() === "string" || cleanDigits.length !== 10) {
      errors.phone = "Please enter a valid 10-digit mobile number.";
    }

    // 3. Email validation
    if (addForm.email.trim()) {
      const emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
      if (addForm.email.toLowerCase() === "string" || !emailPattern.test(addForm.email.trim())) {
        errors.email = "Please enter a valid email address.";
      }
    } else if (addForm.create_account) {
      errors.email = "Email is required to create a patient login account.";
    }

    // 4. Age validation
    if (addForm.age !== "" && addForm.age !== null) {
      const ageNum = Number(addForm.age);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
        errors.age = "Age must be a number between 0 and 120.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit New Patient
  const handleAddPatientSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    if (!validateForm()) {
      showToast("error", "Please fix the highlighted validation errors.");
      return;
    }

    try {
      setAddLoading(true);

      const rawDigits = addForm.phone.replace(/\D/g, "");
      const cleanDigits = rawDigits.startsWith("91") && rawDigits.length === 12 ? rawDigits.slice(2) : rawDigits;
      const formattedPhone = `+91 ${cleanDigits}`;

      const payload = {
        name: addForm.name.trim(),
        phone: formattedPhone,
        email: addForm.email.trim() ? addForm.email.trim().toLowerCase() : undefined,
        age: addForm.age !== "" ? parseInt(addForm.age, 10) : undefined,
        gender: addForm.gender,
        blood_group: addForm.blood_group,
        status: addForm.status || "Active",
        emergency_contact: addForm.emergency_contact.trim() || undefined,
        allergies: addForm.allergies
          ? addForm.allergies.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        medical_history: addForm.medical_history
          ? addForm.medical_history.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        create_account: addForm.create_account,
      };

      const response = await patientService.createPatientProfile(payload);

      const newId = response.patient_id || response.patient?._id || response._id;
      const patientCode = response.patientId || response.patient?.patientId || `PT-${String(newId).slice(-6).toUpperCase()}`;

      // Reset form & close modal immediately
      setShowAddModal(false);
      setAddForm({
        name: "",
        phone: "",
        email: "",
        age: "",
        gender: "Male",
        blood_group: "O+",
        emergency_contact: "",
        allergies: "",
        medical_history: "",
        status: "Active",
        create_account: false,
      });

      // Show success toast with Patient ID
      showToast("success", `Patient created successfully (ID #${patientCode})`);

      // If temporary account credentials were created, show credentials modal
      if (response.account_created && response.temp_password) {
        setNewCredentials({
          name: payload.name,
          email: payload.email,
          temp_password: response.temp_password,
          patientId: patientCode,
        });
      }

      // Switch to page 1, newest sort, and refresh list
      setSortBy("newest");
      setCurrentPage(1);
      await fetchPatients(true);

      // Highlight the new patient row for 3.5 seconds
      if (newId) {
        setHighlightedId(String(newId));
        setTimeout(() => {
          setHighlightedId(null);
        }, 3500);
      }
    } catch (err) {
      console.error("Failed to create patient:", err);
      const data = err.response?.data;
      if (data?.fields) {
        setFieldErrors(data.fields);
      }
      const errorMsg = data?.detail || data?.error || "Failed to create patient record in database.";
      showToast("error", errorMsg);
    } finally {
      setAddLoading(false);
    }
  };

  // Copy to Clipboard Utility
  const copyToClipboard = (text, type = "id") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } else if (type === "credentials") {
      setCredCopied(true);
      setTimeout(() => setCredCopied(false), 2500);
    }
    showToast("info", "Copied to clipboard!");
  };

  return (
    <main className="staff-patients-page">
      {/* GLOBAL TOAST NOTIFICATION */}
      {toast && (
        <div className={`patients-toast toast-${toast.type}`} role="alert">
          {toast.type === "success" && <CheckCircle2 size={18} />}
          {toast.type === "error" && <AlertCircle size={18} />}
          {toast.type === "info" && <ShieldCheck size={18} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Close notification">
            <X size={14} />
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <section className="patients-hero-header">
        <div className="header-left-col">
          <div className="eyebrow-badge">
            <Sparkles size={13} className="sparkle-icon" />
            <span>CareBridge AI Clinical Platform</span>
          </div>
          <h1>Patient Records & Profiles</h1>
          <p className="hero-subtitle">
            Manage hospital registrations, clinical demographics, baseline physiological data, and consultation intake.
          </p>
        </div>

        <div className="header-right-col">
          <button
            className={`btn-action-refresh ${isRefreshing ? "is-spinning" : ""}`}
            onClick={handleRefresh}
            title="Refresh Directory"
            disabled={isRefreshing || loading}
            aria-label="Refresh Directory"
          >
            <RefreshCw size={17} />
            <span>Refresh</span>
          </button>

          <button
            className="btn-action-primary"
            onClick={() => {
              setFieldErrors({});
              setShowAddModal(true);
            }}
            id="btn-add-patient-open"
          >
            <Plus size={18} />
            <span>Add Patient</span>
          </button>
        </div>
      </section>

      {/* LIVE STATS CARDS */}
      <section className="patient-kpi-grid">
        <div className="kpi-card blue-theme">
          <div className="kpi-icon-wrap">
            <Users size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Patients</span>
            <strong className="kpi-number">{stats.total || totalCount}</strong>
            <span className="kpi-subtext">Clinical MongoDB Registry</span>
          </div>
        </div>

        <div className="kpi-card green-theme">
          <div className="kpi-icon-wrap">
            <UserCheck size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Active Patients</span>
            <strong className="kpi-number">{stats.active || patients.filter((p) => (p.status || "Active") === "Active").length}</strong>
            <span className="kpi-subtext">Intake & Care Active</span>
          </div>
        </div>

        <div className="kpi-card purple-theme">
          <div className="kpi-icon-wrap">
            <Activity size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Telemetry Monitored</span>
            <strong className="kpi-number">{stats.telemetry || patients.length}</strong>
            <span className="kpi-subtext">Baseline Vitals & History</span>
          </div>
        </div>
      </section>

      {/* ERROR BANNER */}
      {error && (
        <div className="patients-error-banner" role="alert">
          <AlertCircle size={20} className="error-icon" />
          <div className="error-text-wrap">
            <strong>Error Connecting to Database</strong>
            <span>{error}</span>
          </div>
          <button className="btn-retry" onClick={() => fetchPatients(false)}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* MAIN DATA PANEL */}
      <section className="patients-directory-panel">
        {/* PANEL CONTROLS */}
        <div className="directory-toolbar">
          <div className="toolbar-left">
            <div className="search-input-wrapper">
              <Search size={17} className="search-lens-icon" />
              <input
                type="text"
                placeholder="Search by name, ID, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search patients"
                id="staff-patient-search-input"
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

            <div className="filter-group">
              <Filter size={15} className="filter-icon" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="select-status-filter"
                aria-label="Filter by status"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "All" ? "All Statuses" : `${opt} Only`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="toolbar-right">
            <div className="sort-group">
              <ArrowUpDown size={15} className="sort-icon" />
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="select-sort-filter"
                aria-label="Sort patients list"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <span className="results-badge">
              {totalCount} {totalCount === 1 ? "Record" : "Records"}
            </span>
          </div>
        </div>

        {/* LOADING SKELETONS */}
        {loading && (
          <div className="patients-skeleton-container">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton-avatar skeleton-pulse" />
                <div className="skeleton-line lg skeleton-pulse" />
                <div className="skeleton-line sm skeleton-pulse" />
                <div className="skeleton-line md skeleton-pulse" />
                <div className="skeleton-line btn skeleton-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* DESKTOP TABLE VIEW */}
        {!loading && patients.length > 0 && (
          <div className="patients-table-container desktop-only">
            <table className="patients-data-table">
              <thead>
                <tr>
                  <th>Patient Name & Email</th>
                  <th>Patient ID</th>
                  <th>Age / Gender</th>
                  <th>Blood Group</th>
                  <th>Phone Number</th>
                  <th>Status</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => {
                  const pid = String(patient._id || patient.id || "");
                  const formattedCode = patient.patientId || `PT-${pid.slice(-6).toUpperCase()}`;
                  const isHighlighted = highlightedId === pid;
                  const status = patient.status || "Active";
                  const bloodGroup = patient.blood_group || "—";
                  const ageText = patient.age ? `${patient.age} yrs` : "—";
                  const genderText = patient.gender || "—";

                  return (
                    <tr
                      key={pid || Math.random()}
                      className={`patient-row ${isHighlighted ? "row-highlighted" : ""}`}
                    >
                      {/* Name & Avatar */}
                      <td>
                        <div className="patient-identity-cell">
                          <div
                            className={`avatar-circle avatar-${(patient.gender || "male").toLowerCase()}`}
                          >
                            {(patient.name || "P").charAt(0).toUpperCase()}
                          </div>
                          <div className="name-email-wrap">
                            <strong className="patient-fullname">
                              {patient.name || "Unnamed Patient"}
                            </strong>
                            <span className="patient-email">
                              {patient.email || "—"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Patient ID */}
                      <td>
                        <div className="patient-id-tag-wrap">
                          <span className="patient-id-tag">#{formattedCode}</span>
                          <button
                            className="btn-copy-id"
                            onClick={() => copyToClipboard(formattedCode, "id")}
                            title="Copy Patient ID"
                          >
                            {copiedId === formattedCode ? (
                              <Check size={12} className="text-success" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Age / Gender */}
                      <td>
                        <span className="text-demographics">
                          {ageText} <span className="demographics-slash">/</span> {genderText}
                        </span>
                      </td>

                      {/* Blood Group */}
                      <td>
                        {bloodGroup !== "—" ? (
                          <span className="blood-group-chip">
                            <Droplets size={12} />
                            {bloodGroup}
                          </span>
                        ) : (
                          <span className="text-muted-dash">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td>
                        <span className="phone-cell">
                          {patient.phone ? (
                            <>
                              <Phone size={13} className="phone-icon-muted" />
                              {patient.phone}
                            </>
                          ) : (
                            "—"
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-pill pill-${status.toLowerCase()}`}>
                          <span className="status-dot" />
                          {status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="td-actions">
                        <button
                          className="btn-view-dossier"
                          onClick={() => setSelectedPatient(patient)}
                          title="View Clinical Dossier"
                        >
                          <Eye size={15} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* MOBILE / TABLET STACKED CARDS VIEW */}
        {!loading && patients.length > 0 && (
          <div className="patients-card-list mobile-tablet-only">
            {patients.map((patient) => {
              const pid = String(patient._id || patient.id || "");
              const formattedCode = patient.patientId || `PT-${pid.slice(-6).toUpperCase()}`;
              const isHighlighted = highlightedId === pid;
              const status = patient.status || "Active";

              return (
                <article
                  key={pid || Math.random()}
                  className={`patient-card-tile ${isHighlighted ? "row-highlighted" : ""}`}
                >
                  <div className="card-tile-top">
                    <div className="card-avatar-group">
                      <div
                        className={`avatar-circle avatar-${(patient.gender || "male").toLowerCase()}`}
                      >
                        {(patient.name || "P").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="card-patient-name">{patient.name || "Unnamed Patient"}</h3>
                        <span className="card-patient-email">{patient.email || "—"}</span>
                      </div>
                    </div>

                    <span className={`status-pill pill-${status.toLowerCase()}`}>
                      <span className="status-dot" />
                      {status}
                    </span>
                  </div>

                  <div className="card-tile-meta-grid">
                    <div className="meta-item">
                      <span className="meta-k">Patient ID</span>
                      <div className="meta-v id-wrap">
                        <span>#{formattedCode}</span>
                        <button
                          className="btn-copy-id-sm"
                          onClick={() => copyToClipboard(formattedCode, "id")}
                        >
                          {copiedId === formattedCode ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>

                    <div className="meta-item">
                      <span className="meta-k">Age / Gender</span>
                      <span className="meta-v">
                        {patient.age ? `${patient.age} yrs` : "—"} / {patient.gender || "—"}
                      </span>
                    </div>

                    <div className="meta-item">
                      <span className="meta-k">Blood Group</span>
                      <span className="meta-v">
                        {patient.blood_group ? (
                          <span className="blood-group-chip sm">
                            <Droplets size={11} />
                            {patient.blood_group}
                          </span>
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>

                    <div className="meta-item">
                      <span className="meta-k">Phone</span>
                      <span className="meta-v phone-v">{patient.phone || "—"}</span>
                    </div>
                  </div>

                  <div className="card-tile-bottom">
                    <button
                      className="btn-card-dossier"
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <Eye size={15} />
                      <span>View Full Profile</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && patients.length === 0 && (
          <div className="patients-empty-state">
            <div className="empty-icon-circle">
              <Users size={36} />
            </div>
            <h3>No patients found</h3>
            <p>
              {search || statusFilter !== "All"
                ? "No registered patients match your active search filter or status selection."
                : "No patient records exist in the database yet. Click below to add your first patient profile."}
            </p>
            <div className="empty-actions-row">
              {(search || statusFilter !== "All") && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("All");
                  }}
                >
                  Clear Filters
                </button>
              )}
              <button
                className="btn-action-primary"
                onClick={() => {
                  setFieldErrors({});
                  setShowAddModal(true);
                }}
              >
                <Plus size={16} />
                <span>Add Patient</span>
              </button>
            </div>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {!loading && totalCount > 0 && (
          <footer className="directory-pagination-bar">
            <div className="pagination-info">
              Showing{" "}
              <strong>
                {Math.min((currentPage - 1) * pageSize + 1, totalCount)}
              </strong>{" "}
              –{" "}
              <strong>
                {Math.min(currentPage * pageSize, totalCount)}
              </strong>{" "}
              of <strong>{totalCount}</strong> patients
            </div>

            <div className="pagination-buttons">
              <button
                className="btn-page-arrow"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              <div className="page-numbers-list">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // Show current, first, last, and immediate neighbours
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        className={`btn-page-number ${
                          currentPage === pageNum ? "active-page" : ""
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return (
                      <span key={pageNum} className="pagination-ellipsis">
                        …
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                className="btn-page-arrow"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next Page"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>

      {/* ========================================================================= */}
      {/* ADD PATIENT MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div
          className="patients-modal-overlay"
          onClick={() => !addLoading && setShowAddModal(false)}
        >
          <div
            className="patients-modal-container add-patient-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="add-patient-modal-title"
          >
            {/* STICKY MODAL HEADER */}
            <div className="modal-header-bar">
              <div className="modal-header-titles">
                <div className="modal-header-icon-pill">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h2 id="add-patient-modal-title">Register New Patient</h2>
                  <p>Add clinical demographics, contact information, and medical baseline</p>
                </div>
              </div>
              <button
                className="modal-close-icon-btn"
                onClick={() => setShowAddModal(false)}
                disabled={addLoading}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            {/* SCROLLABLE MODAL BODY */}
            <form id="add-patient-form" onSubmit={handleAddPatientSubmit} noValidate>
              <div className="modal-scrollable-body">
                {/* SECTION 1: PERSONAL DEMOGRAPHICS */}
                <fieldset className="modal-form-section">
                  <legend className="section-legend">
                    <span className="legend-num">1</span>
                    <span>Personal Demographics</span>
                  </legend>

                  <div className="form-field-group">
                    <label htmlFor="pname" className="field-label required">
                      Full Name *
                    </label>
                    <input
                      id="pname"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Ananya Sharma"
                      value={addForm.name}
                      onChange={(e) => {
                        setAddForm({ ...addForm, name: e.target.value });
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: null });
                      }}
                      className={fieldErrors.name ? "input-error" : ""}
                      required
                    />
                    {fieldErrors.name && (
                      <span className="field-error-msg">{fieldErrors.name}</span>
                    )}
                  </div>

                  <div className="form-grid-3">
                    <div className="form-field-group">
                      <label htmlFor="page" className="field-label">
                        Age (Years)
                      </label>
                      <input
                        id="page"
                        type="number"
                        min="0"
                        max="120"
                        placeholder="e.g. 34"
                        value={addForm.age}
                        onChange={(e) => {
                          setAddForm({ ...addForm, age: e.target.value });
                          if (fieldErrors.age) setFieldErrors({ ...fieldErrors, age: null });
                        }}
                        className={fieldErrors.age ? "input-error" : ""}
                      />
                      {fieldErrors.age && (
                        <span className="field-error-msg">{fieldErrors.age}</span>
                      )}
                    </div>

                    <div className="form-field-group">
                      <label htmlFor="pgender" className="field-label">
                        Gender
                      </label>
                      <select
                        id="pgender"
                        value={addForm.gender}
                        onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                      >
                        {GENDERS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field-group">
                      <label htmlFor="pblood" className="field-label">
                        Blood Group
                      </label>
                      <select
                        id="pblood"
                        value={addForm.blood_group}
                        onChange={(e) => setAddForm({ ...addForm, blood_group: e.target.value })}
                      >
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </fieldset>

                {/* SECTION 2: CONTACT & EMERGENCY */}
                <fieldset className="modal-form-section">
                  <legend className="section-legend">
                    <span className="legend-num">2</span>
                    <span>Contact & Emergency</span>
                  </legend>

                  <div className="form-grid-2">
                    <div className="form-field-group">
                      <label htmlFor="pphone" className="field-label required">
                        Mobile Phone Number *
                      </label>
                      <input
                        id="pphone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="e.g. 9876543210"
                        value={addForm.phone}
                        onChange={(e) => {
                          setAddForm({ ...addForm, phone: e.target.value });
                          if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: null });
                        }}
                        className={fieldErrors.phone ? "input-error" : ""}
                        required
                      />
                      {fieldErrors.phone && (
                        <span className="field-error-msg">{fieldErrors.phone}</span>
                      )}
                    </div>

                    <div className="form-field-group">
                      <label htmlFor="pemail" className="field-label">
                        Email Address {addForm.create_account && "*"}
                      </label>
                      <input
                        id="pemail"
                        type="email"
                        autoComplete="email"
                        placeholder="patient@example.com"
                        value={addForm.email}
                        onChange={(e) => {
                          setAddForm({ ...addForm, email: e.target.value });
                          if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
                        }}
                        className={fieldErrors.email ? "input-error" : ""}
                      />
                      {fieldErrors.email && (
                        <span className="field-error-msg">{fieldErrors.email}</span>
                      )}
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="pemerg" className="field-label">
                      Emergency Contact (Name & Phone)
                    </label>
                    <input
                      id="pemerg"
                      type="text"
                      placeholder="e.g. +91 9876543199 (Spouse)"
                      value={addForm.emergency_contact}
                      onChange={(e) =>
                        setAddForm({ ...addForm, emergency_contact: e.target.value })
                      }
                    />
                  </div>
                </fieldset>

                {/* SECTION 3: CLINICAL BASELINE */}
                <fieldset className="modal-form-section">
                  <legend className="section-legend">
                    <span className="legend-num">3</span>
                    <span>Clinical History & Baseline</span>
                  </legend>

                  <div className="form-field-group">
                    <label htmlFor="pallergies" className="field-label">
                      Known Allergies (Comma-separated)
                    </label>
                    <input
                      id="pallergies"
                      type="text"
                      placeholder="e.g. Penicillin, Peanuts, Sulfa"
                      value={addForm.allergies}
                      onChange={(e) =>
                        setAddForm({ ...addForm, allergies: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="pmedhistory" className="field-label">
                      Medical History / Chronic Conditions
                    </label>
                    <input
                      id="pmedhistory"
                      type="text"
                      placeholder="e.g. Hypertension (2019), Type 2 Diabetes"
                      value={addForm.medical_history}
                      onChange={(e) =>
                        setAddForm({ ...addForm, medical_history: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="pstatus" className="field-label">
                      Initial Clinical Status
                    </label>
                    <select
                      id="pstatus"
                      value={addForm.status}
                      onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                    >
                      <option value="Active">Active (Under Continuous Surveillance)</option>
                      <option value="Pending">Pending (Awaiting Intake Verification)</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </fieldset>

                {/* SECTION 4: PATIENT PORTAL ACCOUNT */}
                <div className="portal-account-card">
                  <label className="checkbox-control">
                    <input
                      type="checkbox"
                      id="create_account_checkbox"
                      checked={addForm.create_account}
                      onChange={(e) =>
                        setAddForm({ ...addForm, create_account: e.target.checked })
                      }
                    />
                    <span className="checkbox-custom" />
                    <div className="checkbox-label-text">
                      <strong>Create patient login account</strong>
                      <span>
                        Generates secure temporary credentials linked to this clinical record. Force password change will be required on first sign-in.
                      </span>
                    </div>
                  </label>
                  {addForm.create_account && (
                    <div className="account-info-alert">
                      <Key size={14} className="text-primary" />
                      <span>
                        An email address is required. Temporary credentials will be generated and displayed upon profile creation.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* STICKY MODAL FOOTER */}
              <div className="modal-sticky-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowAddModal(false)}
                  disabled={addLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={addLoading}
                  id="btn-create-patient-submit"
                >
                  {addLoading ? (
                    <>
                      <Loader2 size={16} className="btn-spinner" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Create Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NEW CREDENTIALS POPUP MODAL */}
      {/* ========================================================================= */}
      {newCredentials && (
        <div className="patients-modal-overlay" onClick={() => setNewCredentials(null)}>
          <div
            className="patients-modal-container credentials-popup-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="cred-popup-header">
              <div className="cred-icon-circle">
                <Key size={24} />
              </div>
              <h3>Patient Login Account Created</h3>
              <p>
                Provide these temporary credentials to <strong>{newCredentials.name}</strong>. The patient will be prompted to set a new password upon first sign-in.
              </p>
            </div>

            <div className="cred-box">
              <div className="cred-row">
                <span className="cred-k">Patient ID:</span>
                <strong className="cred-v">#{newCredentials.patientId}</strong>
              </div>
              <div className="cred-row">
                <span className="cred-k">Login Email:</span>
                <strong className="cred-v">{newCredentials.email}</strong>
              </div>
              <div className="cred-row">
                <span className="cred-k">Temporary Password:</span>
                <code className="cred-password-code">{newCredentials.temp_password}</code>
              </div>
            </div>

            <div className="cred-actions">
              <button
                className="btn-copy-creds"
                onClick={() => {
                  const txt = `CareBridge AI Patient Portal\nEmail: ${newCredentials.email}\nTemporary Password: ${newCredentials.temp_password}\nPatient ID: #${newCredentials.patientId}`;
                  copyToClipboard(txt, "credentials");
                }}
              >
                {credCopied ? <Check size={16} /> : <Copy size={16} />}
                <span>{credCopied ? "Copied Credentials!" : "Copy Login Details"}</span>
              </button>
              <button
                className="btn-done-creds"
                onClick={() => setNewCredentials(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW PATIENT CLINICAL DOSSIER MODAL */}
      {/* ========================================================================= */}
      {selectedPatient && (
        <div className="patients-modal-overlay" onClick={() => setSelectedPatient(null)}>
          <div
            className="patients-modal-container dossier-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            {/* DOSSIER HEADER */}
            <div className="modal-header-bar dossier-header-bar">
              <div className="modal-header-titles">
                <div
                  className={`avatar-circle lg avatar-${(selectedPatient.gender || "male").toLowerCase()}`}
                >
                  {(selectedPatient.name || "P").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2>{selectedPatient.name}</h2>
                  <div className="dossier-id-row">
                    <span className="patient-id-tag">
                      #{selectedPatient.patientId || `PT-${String(selectedPatient._id || selectedPatient.id).slice(-6).toUpperCase()}`}
                    </span>
                    <span className={`status-pill pill-${(selectedPatient.status || "Active").toLowerCase()}`}>
                      <span className="status-dot" />
                      {selectedPatient.status || "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="modal-close-icon-btn"
                onClick={() => setSelectedPatient(null)}
                aria-label="Close dossier"
              >
                <X size={19} />
              </button>
            </div>

            {/* DOSSIER BODY */}
            <div className="modal-scrollable-body dossier-body">
              {/* PRIMARY DEMOGRAPHICS GRID */}
              <div className="dossier-stats-grid">
                <div className="dossier-stat-item">
                  <span className="dstat-k">Age</span>
                  <strong className="dstat-v">
                    {selectedPatient.age ? `${selectedPatient.age} Years` : "—"}
                  </strong>
                </div>

                <div className="dossier-stat-item">
                  <span className="dstat-k">Gender</span>
                  <strong className="dstat-v">{selectedPatient.gender || "—"}</strong>
                </div>

                <div className="dossier-stat-item">
                  <span className="dstat-k">Blood Group</span>
                  <strong className="dstat-v text-red">
                    {selectedPatient.blood_group || "—"}
                  </strong>
                </div>

                <div className="dossier-stat-item">
                  <span className="dstat-k">Registered Date</span>
                  <strong className="dstat-v">
                    {selectedPatient.created_at || selectedPatient.createdAt
                      ? new Date(selectedPatient.created_at || selectedPatient.createdAt).toLocaleDateString()
                      : "—"}
                  </strong>
                </div>
              </div>

              {/* CONTACT DETAILS CARD */}
              <div className="dossier-card-section">
                <h4>Contact & Communications</h4>
                <div className="contact-list">
                  <div className="contact-item">
                    <Phone size={15} className="text-primary" />
                    <span>{selectedPatient.phone || "No phone listed"}</span>
                  </div>
                  <div className="contact-item">
                    <Mail size={15} className="text-primary" />
                    <span>{selectedPatient.email || "No email listed"}</span>
                  </div>
                  <div className="contact-item">
                    <AlertTriangle size={15} className="text-warning" />
                    <span>
                      Emergency Contact:{" "}
                      <strong>{selectedPatient.emergency_contact || "—"}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* ALLERGIES CARD */}
              <div className="dossier-card-section">
                <h4>Allergies & Contraindications</h4>
                {selectedPatient.allergies &&
                (Array.isArray(selectedPatient.allergies)
                  ? selectedPatient.allergies.length > 0
                  : Boolean(selectedPatient.allergies)) ? (
                  <div className="tags-wrap">
                    {(Array.isArray(selectedPatient.allergies)
                      ? selectedPatient.allergies
                      : String(selectedPatient.allergies).split(",")
                    ).map((al, idx) => (
                      <span key={idx} className="allergy-tag">
                        {al.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="dossier-empty-note">No recorded drug or environmental allergies.</p>
                )}
              </div>

              {/* MEDICAL HISTORY CARD */}
              <div className="dossier-card-section">
                <h4>Clinical History & Diagnoses</h4>
                {selectedPatient.medical_history &&
                (Array.isArray(selectedPatient.medical_history)
                  ? selectedPatient.medical_history.length > 0
                  : Boolean(selectedPatient.medical_history)) ? (
                  <div className="tags-wrap">
                    {(Array.isArray(selectedPatient.medical_history)
                      ? selectedPatient.medical_history
                      : String(selectedPatient.medical_history).split(",")
                    ).map((mh, idx) => (
                      <span key={idx} className="history-tag">
                        {mh.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="dossier-empty-note">No chronic medical history on file.</p>
                )}
              </div>
            </div>

            {/* DOSSIER FOOTER */}
            <div className="modal-sticky-footer">
              <button
                className="btn-modal-cancel"
                onClick={() => setSelectedPatient(null)}
              >
                Close Dossier
              </button>
              <button
                className="btn-modal-submit"
                onClick={() => {
                  const code = selectedPatient.patientId || `PT-${String(selectedPatient._id || selectedPatient.id).slice(-6).toUpperCase()}`;
                  copyToClipboard(code, "id");
                }}
              >
                <Copy size={15} />
                <span>Copy Patient ID</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Patients;
