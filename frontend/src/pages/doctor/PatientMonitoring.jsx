import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  FileText,
  Sparkles,
  Loader2,
  RefreshCw,
  X,
  Plus,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  ArrowUpDown,
  Filter,
  User,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import patientService from "../../services/patientService";
import doctorService from "../../services/doctorService";
import "./PatientMonitoring.css";

function formatTimeAgo(dateStr) {
  if (!dateStr) return "No vitals logged";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    if (diffSec < 172800) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function PatientMonitoring() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  // Data & Pagination State
  const [patients, setPatients] = useState([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [stats, setStats] = useState({ total: 0, critical: 0, attention: 0, stable: 0 });

  // Filter & Search State
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all"); // all, critical, attention, stable
  const [sortBy, setSortBy] = useState("newest");

  // Loading & Refresh State
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Toast Notification State
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Selected Patient Details Drawer / Modal
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Record Vitals Modal State
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    patient_id: "",
    systolic_bp: "",
    diastolic_bp: "",
    heart_rate: "",
    spo2: "",
    temperature: "",
    blood_sugar: "",
    notes: "",
  });
  const [vitalsErrors, setVitalsErrors] = useState({});
  const [savingVitals, setSavingVitals] = useState(false);

  // Show Toast
  const showToast = useCallback((type, message, duration = 4000) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Load Patients from API
  const loadPatientsData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        sort: sortBy,
      };

      const res = await patientService.getPatients(params);

      if (res && res.patients) {
        // Filter out any junk placeholder records named "string"
        const cleanList = (Array.isArray(res.patients) ? res.patients : []).filter(
          (p) => (p.name || "").toLowerCase() !== "string"
        );
        setPatients(cleanList);
        setTotalPatients(res.total || cleanList.length);
        setTotalPages(res.total_pages || 1);
        if (res.stats) {
          setStats(res.stats);
        }
      } else if (Array.isArray(res)) {
        const cleanList = res.filter((p) => (p.name || "").toLowerCase() !== "string");
        setPatients(cleanList);
        setTotalPatients(cleanList.length);
        setTotalPages(Math.ceil(cleanList.length / pageSize) || 1);
      } else {
        setPatients([]);
        setTotalPatients(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error loading patient monitoring data:", err);
      const msg = err.response?.data?.detail || "Failed to load patient monitoring registry.";
      setError(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter, sortBy, showToast]);

  useEffect(() => {
    loadPatientsData();
  }, [loadPatientsData]);

  // Silent 30-second telemetry polling
  useEffect(() => {
    const timer = setInterval(() => {
      loadPatientsData(false);
    }, 30000);
    return () => clearInterval(timer);
  }, [loadPatientsData]);

  // Refresh Handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPatientsData(true).then(() => {
      showToast("info", "Patient telemetry registry refreshed.");
    });
  };

  // Open Full Patient Profile / Dossier
  const handleOpenPatientProfile = async (patient) => {
    setSelectedPatient(patient);
    setLoadingDetails(true);
    const pid = patient._id || patient.id;

    try {
      const history = await doctorService.getPatientVitals(pid);
      setVitalsHistory(Array.isArray(history) ? history : []);
    } catch (e) {
      console.warn("Failed to load vitals history:", e);
      setVitalsHistory([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Record Vitals Modal
  const handleOpenRecordVitals = (patient = null) => {
    setVitalsErrors({});
    if (patient) {
      const pid = patient._id || patient.id;
      setVitalsForm({
        patient_id: pid,
        systolic_bp: patient.latest_vital?.systolic_bp || "",
        diastolic_bp: patient.latest_vital?.diastolic_bp || "",
        heart_rate: patient.latest_vital?.heart_rate || "",
        spo2: patient.latest_vital?.spo2 || "",
        temperature: patient.latest_vital?.temperature || "",
        blood_sugar: patient.latest_vital?.blood_sugar || "",
        notes: "",
      });
    } else {
      setVitalsForm({
        patient_id: patients[0]?._id || patients[0]?.id || "",
        systolic_bp: "",
        diastolic_bp: "",
        heart_rate: "",
        spo2: "",
        temperature: "",
        blood_sugar: "",
        notes: "",
      });
    }
    setShowVitalsModal(true);
  };

  // Validate Vitals Form
  const validateVitalsForm = () => {
    const errs = {};
    if (!vitalsForm.patient_id) {
      errs.patient_id = "Please select a patient.";
    }

    const sbp = Number(vitalsForm.systolic_bp);
    if (!vitalsForm.systolic_bp || isNaN(sbp) || sbp < 50 || sbp > 260) {
      errs.systolic_bp = "Systolic BP must be between 50 and 260 mmHg.";
    }

    const dbp = Number(vitalsForm.diastolic_bp);
    if (!vitalsForm.diastolic_bp || isNaN(dbp) || dbp < 30 || dbp > 160) {
      errs.diastolic_bp = "Diastolic BP must be between 30 and 160 mmHg.";
    }

    const hr = Number(vitalsForm.heart_rate);
    if (!vitalsForm.heart_rate || isNaN(hr) || hr < 30 || hr > 220) {
      errs.heart_rate = "Heart rate must be between 30 and 220 BPM.";
    }

    const spo2 = Number(vitalsForm.spo2);
    if (!vitalsForm.spo2 || isNaN(spo2) || spo2 < 50 || spo2 > 100) {
      errs.spo2 = "SpO2 must be between 50% and 100%.";
    }

    if (vitalsForm.temperature) {
      const temp = Number(vitalsForm.temperature);
      if (isNaN(temp) || temp < 30.0 || temp > 45.0) {
        errs.temperature = "Temperature must be between 30.0°C and 45.0°C.";
      }
    }

    setVitalsErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Vitals Form
  const handleVitalsSubmit = async (e) => {
    e.preventDefault();
    if (!validateVitalsForm()) {
      showToast("error", "Please correct the highlighted vitals values.");
      return;
    }

    try {
      setSavingVitals(true);
      const payload = {
        patient_id: vitalsForm.patient_id,
        systolic_bp: parseInt(vitalsForm.systolic_bp, 10),
        diastolic_bp: parseInt(vitalsForm.diastolic_bp, 10),
        heart_rate: parseInt(vitalsForm.heart_rate, 10),
        spo2: parseFloat(vitalsForm.spo2),
        temperature: vitalsForm.temperature ? parseFloat(vitalsForm.temperature) : undefined,
        blood_sugar: vitalsForm.blood_sugar ? parseFloat(vitalsForm.blood_sugar) : undefined,
        notes: vitalsForm.notes?.trim() || undefined,
      };

      await doctorService.recordVitals(payload);

      const targetPatient = patients.find(
        (p) => (p._id || p.id) === vitalsForm.patient_id
      );
      const name = targetPatient?.name || "Patient";

      setShowVitalsModal(false);
      showToast("success", `Vitals recorded successfully for ${name}`);
      await loadPatientsData(true);

      // If drawer is open for this patient, update history
      if (selectedPatient && (selectedPatient._id || selectedPatient.id) === vitalsForm.patient_id) {
        const history = await doctorService.getPatientVitals(vitalsForm.patient_id);
        setVitalsHistory(Array.isArray(history) ? history : []);
      }
    } catch (err) {
      console.error("Failed to save vitals:", err);
      const msg = err.response?.data?.detail || "Failed to record vital signs.";
      showToast("error", msg);
    } finally {
      setSavingVitals(false);
    }
  };

  // Copy ID helper
  const copyPatientId = (idText) => {
    if (!idText) return;
    navigator.clipboard.writeText(idText);
    setCopiedId(idText);
    setTimeout(() => setCopiedId(null), 2000);
    showToast("info", "Patient ID copied to clipboard!");
  };

  return (
    <div className="patient-monitoring-page">
      {/* GLOBAL TOAST */}
      {toast && (
        <div className={`monitoring-toast toast-${toast.type}`} role="alert">
          {toast.type === "success" && <CheckCircle2 size={18} />}
          {toast.type === "error" && <AlertCircle size={18} />}
          {toast.type === "info" && <ShieldCheck size={18} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Close">
            <X size={14} />
          </button>
        </div>
      )}

      {/* HERO BANNER */}
      <section className="monitoring-hero-banner">
        <div className="hero-banner-content">
          <div className="platform-eyebrow-pill">
            <Sparkles size={13} />
            <span>CareBridge AI Clinical Platform</span>
          </div>
          <h1 className="hero-banner-title">
            Patient Monitoring: Real-time Telemetry & Patient Registry
          </h1>
          <p className="hero-banner-desc">
            Continuous physiological surveillance of active hospital registrations, vital parameters, critical alerts, and longitudinal health records.
          </p>
        </div>

        <div className="hero-banner-actions">
          <button
            className={`btn-sync-registry ${isRefreshing ? "is-spinning" : ""}`}
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            title="Refresh Telemetry Registry"
          >
            <RefreshCw size={16} />
            <span>{isRefreshing ? "Syncing..." : "Refresh Registry"}</span>
          </button>

          <button
            className="btn-record-vital-primary"
            onClick={() => handleOpenRecordVitals()}
            id="btn-open-vitals-modal"
          >
            <Plus size={17} />
            <span>Record Patient Vitals</span>
          </button>
        </div>
      </section>

      {/* 4-COLUMN STAT GRID (ALL, CRITICAL, NEEDS ATTENTION, STABLE) */}
      {(() => {
        const totalCount = stats.total || totalPatients || 0;
        const critCount = stats.critical || 0;
        const attnCount = stats.attention || 0;
        const stableCount = stats.stable || 0;
        const critPct = totalCount > 0 ? Math.round((critCount / totalCount) * 100) : 0;
        const attnPct = totalCount > 0 ? Math.round((attnCount / totalCount) * 100) : 0;
        const stablePct = totalCount > 0 ? Math.round((stableCount / totalCount) * 100) : 0;

        return (
          <section className="monitoring-stat-grid">
            {/* ALL PATIENTS */}
            <button
              className={`stat-kpi-card card-all ${statusFilter === "all" ? "is-active" : ""}`}
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
            >
              <div className="stat-card-icon-wrap">
                <Users size={20} />
              </div>
              <div className="stat-card-text">
                <span className="stat-card-label">All Monitored</span>
                <strong className="stat-card-count">{totalCount}</strong>
                <span className="stat-card-sub">100% Active Roster</span>
              </div>
            </button>

            {/* CRITICAL ALERTS */}
            <button
              className={`stat-kpi-card card-critical ${statusFilter === "critical" ? "is-active" : ""}`}
              onClick={() => {
                setStatusFilter("critical");
                setCurrentPage(1);
              }}
            >
              <div className="stat-card-icon-wrap">
                <ShieldAlert size={20} />
              </div>
              <div className="stat-card-text">
                <span className="stat-card-label">Critical Alerts</span>
                <strong className="stat-card-count text-critical">{critCount} ({critPct}%)</strong>
                <span className="stat-card-sub">Acute Breaches</span>
              </div>
            </button>

            {/* NEEDS ATTENTION */}
            <button
              className={`stat-kpi-card card-attention ${statusFilter === "attention" ? "is-active" : ""}`}
              onClick={() => {
                setStatusFilter("attention");
                setCurrentPage(1);
              }}
            >
              <div className="stat-card-icon-wrap">
                <AlertTriangle size={20} />
              </div>
              <div className="stat-card-text">
                <span className="stat-card-label">Needs Attention</span>
                <strong className="stat-card-count text-attention">{attnCount} ({attnPct}%)</strong>
                <span className="stat-card-sub">Borderline Readings</span>
              </div>
            </button>

            {/* STABLE BASELINE */}
            <button
              className={`stat-kpi-card card-stable ${statusFilter === "stable" ? "is-active" : ""}`}
              onClick={() => {
                setStatusFilter("stable");
                setCurrentPage(1);
              }}
            >
              <div className="stat-card-icon-wrap">
                <CheckCircle2 size={20} />
              </div>
              <div className="stat-card-text">
                <span className="stat-card-label">Stable Baseline</span>
                <strong className="stat-card-count text-stable">{stableCount} ({stablePct}%)</strong>
                <span className="stat-card-sub">Normal Parameters</span>
              </div>
            </button>
          </section>
        );
      })()}

      {/* ERROR NOTICE */}
      {error && (
        <div className="monitoring-error-banner" role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>Error Loading Telemetry Data</strong>
            <span>{error}</span>
          </div>
          <button onClick={() => loadPatientsData(false)}>Retry</button>
        </div>
      )}

      {/* SEARCH AND CONTROLS BAR */}
      <section className="monitoring-controls-bar">
        <div className="search-bar-wrap">
          <Search size={18} className="search-lens" />
          <input
            type="text"
            placeholder="Search by name, patient ID, email address, or phone number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="monitoring-search-input"
            aria-label="Search patients"
          />
          {searchInput && (
            <button
              className="btn-clear-search"
              onClick={() => setSearchInput("")}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="controls-right-wrap">
          <div className="sort-select-wrap">
            <ArrowUpDown size={14} className="sort-icon-muted" />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="select-monitoring-sort"
              aria-label="Sort order"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name (A – Z)</option>
              <option value="name_desc">Name (Z – A)</option>
            </select>
          </div>

          <span className="monitoring-results-pill">
            Showing <strong>{patients.length}</strong> of {totalPatients} patients
          </span>
        </div>
      </section>

      {/* SKELETON LOADERS */}
      {loading && (
        <div className="monitoring-skeletons-wrapper">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="monitoring-skeleton-card">
              <div className="sk-avatar sk-shimmer" />
              <div className="sk-line title sk-shimmer" />
              <div className="sk-line subtitle sk-shimmer" />
              <div className="sk-line vitals sk-shimmer" />
              <div className="sk-line btn sk-shimmer" />
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* DESKTOP TABLE VIEW */}
      {/* ============================================================ */}
      {!loading && patients.length > 0 && (
        <div className="monitoring-table-container monitoring-table-desktop">
          <table className="monitoring-data-table">
            <thead>
              <tr>
                <th>Patient & Demographics</th>
                <th>Patient ID</th>
                <th>Contact (Phone / Email)</th>
                <th>Status</th>
                <th>Latest Telemetry</th>
                <th>Last Reading</th>
                <th className="th-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => {
                const pid = String(patient._id || patient.id || "");
                const formattedId = patient.patient_code || String(patient.patientId || "").replace("PT-", "") || pid.slice(-6);
                const level = patient.telemetry_level || "stable";
                const label = patient.telemetry_label || "Stable";
                const vital = patient.latest_vital;
                const lastTime = formatTimeAgo(patient.last_vitals_time || vital?.recorded_at);

                return (
                  <tr key={pid || Math.random()} className="monitoring-patient-row">
                    {/* Patient & Demographics */}
                    <td>
                      <div className="patient-id-cell">
                        <div className={`avatar-pill avatar-${(patient.gender || "other").toLowerCase()}`}>
                          {(patient.name || "P").charAt(0).toUpperCase()}
                        </div>
                        <div className="patient-text-group">
                          <strong className="p-name">{patient.name || "Unnamed Patient"}</strong>
                          <span className="p-demographics">
                            {patient.age ? `${patient.age} yrs` : "—"} • {patient.gender || "—"} •{" "}
                            <span className="text-bold-bg">{patient.blood_group || "—"}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Patient ID */}
                    <td>
                      <div className="id-copy-group">
                        <span className="id-code-badge monospace-id">{formattedId}</span>
                        <button
                          className="btn-mini-copy"
                          onClick={() => copyPatientId(formattedId)}
                          title="Copy ID"
                        >
                          {copiedId === formattedId ? (
                            <Check size={12} className="text-success" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Phone / Email */}
                    <td>
                      <div className="contact-column">
                        <span className="contact-line">
                          <Phone size={12} className="text-muted" />
                          <span>{patient.phone || "—"}</span>
                        </span>
                        <span className="contact-line email-line">
                          <Mail size={12} className="text-muted" />
                          <span>{patient.email || "—"}</span>
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`status-badge-pill badge-${level}`}>
                        <span className="pulse-indicator-dot" />
                        {label}
                      </span>
                    </td>

                    {/* Latest Telemetry */}
                    <td>
                      {vital ? (
                        <div className="telemetry-badges-row">
                          <span className="vital-chip hr" title="Heart Rate">
                            <HeartPulse size={12} /> {vital.heart_rate || "—"} bpm
                          </span>
                          <span className="vital-chip bp" title="Blood Pressure">
                            <Activity size={12} /> {vital.systolic_bp && vital.diastolic_bp ? `${vital.systolic_bp}/${vital.diastolic_bp}` : "—"}
                          </span>
                          <span className="vital-chip spo2" title="Oxygen Saturation">
                            <Droplets size={12} /> {vital.spo2 ? `${vital.spo2}%` : "—"}
                          </span>
                        </div>
                      ) : (
                        <span className="no-vitals-dash">No vitals on file</span>
                      )}
                    </td>

                    {/* Last Reading Time */}
                    <td>
                      <span className="last-vitals-time">
                        <Clock size={12} className="text-muted" />
                        {lastTime}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="td-action">
                      <div className="row-action-buttons">
                        <button
                          className="btn-quick-log"
                          onClick={() => handleOpenRecordVitals(patient)}
                          title="Record Vitals"
                        >
                          <Plus size={13} />
                          <span>Log Vitals</span>
                        </button>
                        <button
                          className="btn-view-profile"
                          onClick={() => handleOpenPatientProfile(patient)}
                          title="View Patient Dossier"
                        >
                          <span>Profile</span>
                          <ExternalLink size={13} />
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

      {/* ============================================================ */}
      {/* MOBILE / TABLET STACKED CARDS VIEW */}
      {/* ============================================================ */}
      {!loading && patients.length > 0 && (
        <div className="monitoring-cards-mobile">
          {patients.map((patient) => {
            const pid = String(patient._id || patient.id || "");
            const formattedId = patient.patient_code || String(patient.patientId || "").replace("PT-", "") || pid.slice(-6);
            const level = patient.telemetry_level || "stable";
            const label = patient.telemetry_label || "Stable";
            const vital = patient.latest_vital;
            const lastTime = formatTimeAgo(patient.last_vitals_time || vital?.recorded_at);

            return (
              <article key={pid || Math.random()} className={`mobile-patient-tile border-${level}`}>
                <div className="mobile-tile-top">
                  <div className="mobile-avatar-name">
                    <div className={`avatar-pill avatar-${(patient.gender || "other").toLowerCase()}`}>
                      {(patient.name || "P").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="m-patient-name">{patient.name || "Unnamed Patient"}</h3>
                      <span className="m-patient-id monospace-id">{formattedId}</span>
                    </div>
                  </div>

                  <span className={`status-badge-pill badge-${level}`}>
                    <span className="pulse-indicator-dot" />
                    {label}
                  </span>
                </div>

                <div className="mobile-tile-details-grid">
                  <div className="m-detail-item">
                    <span className="m-label">Phone</span>
                    <span className="m-value">{patient.phone || "—"}</span>
                  </div>
                  <div className="m-detail-item">
                    <span className="m-label">Email</span>
                    <span className="m-value m-email">{patient.email || "—"}</span>
                  </div>
                  <div className="m-detail-item">
                    <span className="m-label">Age / Gender / Blood</span>
                    <span className="m-value">
                      {patient.age ? `${patient.age}y` : "—"} / {patient.gender || "—"} /{" "}
                      <strong>{patient.blood_group || "—"}</strong>
                    </span>
                  </div>
                  <div className="m-detail-item">
                    <span className="m-label">Last Telemetry</span>
                    <span className="m-value">{lastTime}</span>
                  </div>
                </div>

                {vital && (
                  <div className="mobile-telemetry-chips">
                    <span className="vital-chip hr">
                      <HeartPulse size={12} /> {vital.heart_rate || "—"} bpm
                    </span>
                    <span className="vital-chip bp">
                      <Activity size={12} /> {vital.systolic_bp && vital.diastolic_bp ? `${vital.systolic_bp}/${vital.diastolic_bp}` : "—"}
                    </span>
                    <span className="vital-chip spo2">
                      <Droplets size={12} /> {vital.spo2 ? `${vital.spo2}%` : "—"}
                    </span>
                  </div>
                )}

                <div className="mobile-tile-actions">
                  <button
                    className="btn-mobile-log-vitals"
                    onClick={() => handleOpenRecordVitals(patient)}
                  >
                    <Plus size={14} />
                    <span>Log Vitals</span>
                  </button>
                  <button
                    className="btn-mobile-view-profile"
                    onClick={() => handleOpenPatientProfile(patient)}
                  >
                    <span>View Profile</span>
                    <ExternalLink size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && patients.length === 0 && (
        <div className="monitoring-empty-state">
          <div className="empty-icon-bubble">
            <Users size={40} />
          </div>
          <h3>No patients found</h3>
          <p>
            {searchInput || statusFilter !== "all"
              ? `No patient records match "${searchInput || statusFilter}". Try adjusting your search query or filter.`
              : "No patient records registered in the clinical telemetry database."}
          </p>
          {(searchInput || statusFilter !== "all") && (
            <button
              className="btn-reset-filters"
              onClick={() => {
                setSearchInput("");
                setStatusFilter("all");
              }}
            >
              Reset Search & Filters
            </button>
          )}
        </div>
      )}

      {/* PAGINATION BAR */}
      {!loading && totalPatients > 0 && (
        <footer className="monitoring-pagination-footer">
          <span className="pagination-counter-text">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
            <strong>{totalPatients}</strong> total patients)
          </span>

          <div className="pagination-control-btns">
            <button
              className="btn-page-step"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div className="page-pill-numbers">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      className={`btn-page-pill ${currentPage === pageNum ? "page-active" : ""}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return (
                    <span key={pageNum} className="page-ellipsis">
                      …
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              className="btn-page-step"
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

      {/* ============================================================ */}
      {/* RECORD VITALS MODAL */}
      {/* ============================================================ */}
      {showVitalsModal && (
        <div className="monitoring-modal-backdrop" onClick={() => !savingVitals && setShowVitalsModal(false)}>
          <div
            className="monitoring-modal-card record-vitals-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="modal-top-bar">
              <div className="modal-title-wrap">
                <div className="modal-icon-pill">
                  <HeartPulse size={18} />
                </div>
                <div>
                  <h2>Record Patient Vitals</h2>
                  <p>Log updated physiological telemetry and threshold parameters</p>
                </div>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setShowVitalsModal(false)}
                disabled={savingVitals}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleVitalsSubmit} className="vitals-form-body">
              <div className="modal-scroll-area">
                {/* PATIENT SELECT */}
                <div className="vitals-form-group">
                  <label htmlFor="vital_patient_id" className="vlabel required">
                    Select Patient *
                  </label>
                  <select
                    id="vital_patient_id"
                    value={vitalsForm.patient_id}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, patient_id: e.target.value })}
                    className={vitalsErrors.patient_id ? "vinput-error" : ""}
                    required
                  >
                    {patients.map((p) => {
                      const pcode = p.patient_code || String(p.patientId || "").replace("PT-", "") || String(p._id || p.id).slice(-6);
                      return (
                        <option key={p._id || p.id} value={p._id || p.id}>
                          {p.name} (ID: {pcode})
                        </option>
                      );
                    })}
                  </select>
                  {vitalsErrors.patient_id && <span className="verror-text">{vitalsErrors.patient_id}</span>}
                </div>

                {/* BLOOD PRESSURE GRID */}
                <div className="vitals-grid-2">
                  <div className="vitals-form-group">
                    <label htmlFor="vital_sbp" className="vlabel required">
                      Systolic BP (mmHg) *
                    </label>
                    <input
                      id="vital_sbp"
                      type="number"
                      placeholder="e.g. 120"
                      value={vitalsForm.systolic_bp}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, systolic_bp: e.target.value })}
                      className={vitalsErrors.systolic_bp ? "vinput-error" : ""}
                      required
                    />
                    {vitalsErrors.systolic_bp && <span className="verror-text">{vitalsErrors.systolic_bp}</span>}
                  </div>

                  <div className="vitals-form-group">
                    <label htmlFor="vital_dbp" className="vlabel required">
                      Diastolic BP (mmHg) *
                    </label>
                    <input
                      id="vital_dbp"
                      type="number"
                      placeholder="e.g. 80"
                      value={vitalsForm.diastolic_bp}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, diastolic_bp: e.target.value })}
                      className={vitalsErrors.diastolic_bp ? "vinput-error" : ""}
                      required
                    />
                    {vitalsErrors.diastolic_bp && <span className="verror-text">{vitalsErrors.diastolic_bp}</span>}
                  </div>
                </div>

                {/* HEART RATE & SPO2 */}
                <div className="vitals-grid-2">
                  <div className="vitals-form-group">
                    <label htmlFor="vital_hr" className="vlabel required">
                      Heart Rate (BPM) *
                    </label>
                    <input
                      id="vital_hr"
                      type="number"
                      placeholder="e.g. 72"
                      value={vitalsForm.heart_rate}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, heart_rate: e.target.value })}
                      className={vitalsErrors.heart_rate ? "vinput-error" : ""}
                      required
                    />
                    {vitalsErrors.heart_rate && <span className="verror-text">{vitalsErrors.heart_rate}</span>}
                  </div>

                  <div className="vitals-form-group">
                    <label htmlFor="vital_spo2" className="vlabel required">
                      SpO2 Saturation (%) *
                    </label>
                    <input
                      id="vital_spo2"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 98.5"
                      value={vitalsForm.spo2}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                      className={vitalsErrors.spo2 ? "vinput-error" : ""}
                      required
                    />
                    {vitalsErrors.spo2 && <span className="verror-text">{vitalsErrors.spo2}</span>}
                  </div>
                </div>

                {/* TEMPERATURE & BLOOD SUGAR */}
                <div className="vitals-grid-2">
                  <div className="vitals-form-group">
                    <label htmlFor="vital_temp" className="vlabel">
                      Temperature (°C)
                    </label>
                    <input
                      id="vital_temp"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 36.8"
                      value={vitalsForm.temperature}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                      className={vitalsErrors.temperature ? "vinput-error" : ""}
                    />
                    {vitalsErrors.temperature && <span className="verror-text">{vitalsErrors.temperature}</span>}
                  </div>

                  <div className="vitals-form-group">
                    <label htmlFor="vital_sugar" className="vlabel">
                      Blood Sugar (mg/dL)
                    </label>
                    <input
                      id="vital_sugar"
                      type="number"
                      step="1"
                      placeholder="e.g. 95"
                      value={vitalsForm.blood_sugar}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, blood_sugar: e.target.value })}
                    />
                  </div>
                </div>

                {/* CLINICAL NOTES */}
                <div className="vitals-form-group">
                  <label htmlFor="vital_notes" className="vlabel">
                    Clinical Observations / Notes
                  </label>
                  <textarea
                    id="vital_notes"
                    rows="2"
                    placeholder="e.g. Patient resting comfortably, regular sinus rhythm"
                    value={vitalsForm.notes}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                  />
                </div>
              </div>

              {/* FOOTER */}
              <div className="modal-bottom-bar">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowVitalsModal(false)}
                  disabled={savingVitals}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-save"
                  disabled={savingVitals}
                  id="btn-submit-vitals"
                >
                  {savingVitals ? (
                    <>
                      <Loader2 size={16} className="spinning" />
                      <span>Saving Vitals...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Save Readings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PATIENT CLINICAL DOSSIER DRAWER / MODAL */}
      {/* ============================================================ */}
      {selectedPatient && (
        <div className="monitoring-modal-backdrop" onClick={() => setSelectedPatient(null)}>
          <div
            className="monitoring-modal-card dossier-drawer-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="modal-top-bar dossier-top">
              <div className="modal-title-wrap">
                <div className={`avatar-pill lg avatar-${(selectedPatient.gender || "other").toLowerCase()}`}>
                  {(selectedPatient.name || "P").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2>{selectedPatient.name}</h2>
                  <div className="dossier-id-chips">
                    <span className="id-code-badge monospace-id">
                      ID: {selectedPatient.patient_code || String(selectedPatient.patientId || "").replace("PT-", "") || String(selectedPatient._id || selectedPatient.id).slice(-6)}
                    </span>
                    <span className={`status-badge-pill badge-${selectedPatient.telemetry_level || "stable"}`}>
                      <span className="pulse-indicator-dot" />
                      {selectedPatient.telemetry_label || "Stable"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setSelectedPatient(null)}
              >
                <X size={19} />
              </button>
            </div>

            <div className="modal-scroll-area dossier-scroll-area">
              {/* PRIMARY STATS GRID */}
              <div className="dossier-quick-stats">
                <div className="dquick-item">
                  <span>Age</span>
                  <strong>{selectedPatient.age ? `${selectedPatient.age} Yrs` : "—"}</strong>
                </div>
                <div className="dquick-item">
                  <span>Gender</span>
                  <strong>{selectedPatient.gender || "—"}</strong>
                </div>
                <div className="dquick-item">
                  <span>Blood Group</span>
                  <strong className="text-red">{selectedPatient.blood_group || "—"}</strong>
                </div>
                <div className="dquick-item">
                  <span>Status</span>
                  <strong>{selectedPatient.status || "Active"}</strong>
                </div>
              </div>

              {/* CONTACT & EMERGENCY */}
              <div className="dossier-info-card">
                <h4>Contact & Emergency</h4>
                <div className="dcontact-grid">
                  <div className="dcontact-line">
                    <Phone size={14} className="text-primary" />
                    <span>{selectedPatient.phone || "No phone listed"}</span>
                  </div>
                  <div className="dcontact-line">
                    <Mail size={14} className="text-primary" />
                    <span>{selectedPatient.email || "No email listed"}</span>
                  </div>
                  <div className="dcontact-line">
                    <AlertTriangle size={14} className="text-warning" />
                    <span>Emergency: <strong>{selectedPatient.emergency_contact || "—"}</strong></span>
                  </div>
                </div>
              </div>

              {/* ALLERGIES & HISTORY */}
              <div className="dossier-info-card">
                <h4>Allergies & Contraindications</h4>
                {selectedPatient.allergies &&
                (Array.isArray(selectedPatient.allergies)
                  ? selectedPatient.allergies.length > 0
                  : Boolean(selectedPatient.allergies)) ? (
                  <div className="tag-badges-wrap">
                    {(Array.isArray(selectedPatient.allergies)
                      ? selectedPatient.allergies
                      : String(selectedPatient.allergies).split(",")
                    ).map((al, idx) => (
                      <span key={idx} className="allergy-chip">
                        {al.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="no-data-note">No allergies documented.</p>
                )}
              </div>

              <div className="dossier-info-card">
                <h4>Medical History & Diagnoses</h4>
                {selectedPatient.medical_history &&
                (Array.isArray(selectedPatient.medical_history)
                  ? selectedPatient.medical_history.length > 0
                  : Boolean(selectedPatient.medical_history)) ? (
                  <div className="tag-badges-wrap">
                    {(Array.isArray(selectedPatient.medical_history)
                      ? selectedPatient.medical_history
                      : String(selectedPatient.medical_history).split(",")
                    ).map((mh, idx) => (
                      <span key={idx} className="history-chip">
                        {mh.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="no-data-note">No chronic medical conditions documented.</p>
                )}
              </div>

              {/* VITALS HISTORY */}
              <div className="dossier-info-card">
                <div className="card-header-flex">
                  <h4>Recorded Vitals History</h4>
                  <button
                    className="btn-card-action-log"
                    onClick={() => {
                      handleOpenRecordVitals(selectedPatient);
                    }}
                  >
                    <Plus size={13} />
                    <span>Log Vitals</span>
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="vitals-loading-spinner">
                    <Loader2 size={24} className="spinning" />
                    <span>Fetching historical telemetry...</span>
                  </div>
                ) : vitalsHistory.length > 0 ? (
                  <div className="vitals-history-table-wrap">
                    <table className="vhistory-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>BP (mmHg)</th>
                          <th>HR (bpm)</th>
                          <th>SpO2</th>
                          <th>Temp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vitalsHistory.slice(0, 5).map((v, i) => (
                          <tr key={v._id || i}>
                            <td>{v.recorded_at ? new Date(v.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                            <td>{v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : "—"}</td>
                            <td>{v.heart_rate || "—"}</td>
                            <td>{v.spo2 ? `${v.spo2}%` : "—"}</td>
                            <td>{v.temperature ? `${v.temperature}°C` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data-note">No prior telemetry history recorded for this patient.</p>
                )}
              </div>
            </div>

            <div className="modal-bottom-bar">
              <button
                className="btn-modal-cancel"
                onClick={() => setSelectedPatient(null)}
              >
                Close Dossier
              </button>
              <button
                className="btn-modal-save"
                onClick={() => handleOpenRecordVitals(selectedPatient)}
              >
                <Plus size={15} />
                <span>Log New Vitals</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientMonitoring;
