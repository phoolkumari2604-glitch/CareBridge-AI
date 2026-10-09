import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Clock,
  Search,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Phone,
  User,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Filter,
  Volume2,
  Play,
  CheckCheck,
  SkipForward,
  AlertTriangle,
  X,
  Flame,
  Radio,
} from "lucide-react";
import api from "../../services/api";
import "./Queue.css";

const QUEUE_TABS = [
  { key: "ALL", label: "All Queue", countKey: "all", icon: Radio, color: "blue" },
  { key: "WAITING", label: "Waiting", countKey: "waiting", icon: Clock, color: "amber" },
  { key: "IN_CONSULTATION", label: "In Consultation", countKey: "in_consultation", icon: Play, color: "purple" },
  { key: "COMPLETED", label: "Completed Today", countKey: "completed_today", icon: CheckCheck, color: "green" },
  { key: "EMERGENCY", label: "Emergency Priority", countKey: "emergency", icon: Flame, color: "red" },
];

export default function Queue() {
  // Queue Data & Pagination
  const [queueItems, setQueueItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [currentToken, setCurrentToken] = useState("T-001");
  const [stats, setStats] = useState({ waiting: 0, in_consultation: 0, completed_today: 0, emergency: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Auto-refresh timer (15 seconds)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(15);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(new Date());

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Modals & Action Loaders
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [callingNext, setCallingNext] = useState(false);

  // Add to Queue Form
  const [addForm, setAddForm] = useState({
    patient_id: "",
    doctor_id: "",
    is_emergency: false,
  });
  const [addErrors, setAddErrors] = useState({});

  // Debounce search (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Toast helper
  const showToast = (message, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Fetch Live Queue
  const fetchQueue = useCallback(async (isRefresh = false) => {
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

      const res = await api.get("/queue/", { params });
      const data = res.data || {};

      if (Array.isArray(data)) {
        setQueueItems(data);
        setTotalCount(data.length);
        setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
      } else {
        setQueueItems(data.queue || []);
        setCurrentToken(data.current_token || "T-001");
        setTotalCount(data.total || 0);
        setTotalPages(data.pages || 1);
        if (data.stats) setStats(data.stats);
      }

      setLastUpdatedTime(new Date());
      setSecondsUntilRefresh(15);

      if (isRefresh) {
        showToast("Live queue refreshed.", "info");
      }
    } catch (err) {
      console.error("Queue fetch error:", err);
      setError("Failed to fetch live queue data from backend.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter]);

  // Initial fetch and auto-refresh timer loop
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          fetchQueue(false);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, fetchQueue]);

  // Load patient & doctor lists for "+ Add to Queue"
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

  // Format Elapsed Wait Time
  const getWaitTime = (createdAt) => {
    if (!createdAt) return "Just now";
    try {
      const created = new Date(createdAt);
      const diffMinutes = Math.floor((new Date() - created) / 60000);
      if (diffMinutes <= 0) return "< 1 min";
      if (diffMinutes < 60) return `${diffMinutes} mins`;
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      return `${hours}h ${mins}m`;
    } catch {
      return "—";
    }
  };

  // Call Next Patient (Prominent Action)
  const handleCallNext = async () => {
    try {
      setCallingNext(true);
      const res = await api.post("/queue/call-next");
      if (res.data?.entry) {
        showToast(res.data.message || "Next patient called into consultation!", "success");
      } else {
        showToast("No waiting patients in the queue.", "info");
      }
      fetchQueue();
    } catch (err) {
      console.error("Call next error:", err);
      showToast(err.response?.data?.detail || "Failed to call next patient.", "error");
    } finally {
      setCallingNext(false);
    }
  };

  // Update Status of a Queue Entry
  const handleUpdateStatus = async (queueId, newStatus) => {
    try {
      setActionLoadingId(queueId);
      await api.put(`/queue/${queueId}`, { status: newStatus });
      showToast(`Token status updated to ${newStatus.replace("_", " ")}.`, "success");
      fetchQueue();
    } catch (err) {
      console.error("Queue update error:", err);
      showToast(err.response?.data?.detail || "Failed to update queue status.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle Emergency Priority
  const handleTogglePriority = async (queueId, currentPriority) => {
    const nextPriority = currentPriority === "EMERGENCY" ? "NORMAL" : "EMERGENCY";
    try {
      setActionLoadingId(queueId);
      await api.put(`/queue/${queueId}`, { priority: nextPriority });
      showToast(`Token priority set to ${nextPriority}.`, nextPriority === "EMERGENCY" ? "error" : "success");
      fetchQueue();
    } catch (err) {
      console.error("Priority toggle error:", err);
      showToast(err.response?.data?.detail || "Failed to update priority.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Add to Queue Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!addForm.patient_id) errors.patient_id = "Please select a patient.";
    if (!addForm.doctor_id) errors.doctor_id = "Please select a doctor.";

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }

    setAddErrors({});
    setActionLoadingId("add_queue");

    try {
      const res = await api.post("/queue/", addForm);
      showToast(`Token #${res.data?.token_code || res.data?.token_number} generated!`, "success");
      setShowAddModal(false);
      setAddForm({ patient_id: "", doctor_id: "", is_emergency: false });
      fetchQueue();
    } catch (err) {
      console.error("Add queue error:", err);
      showToast(err.response?.data?.detail || "Failed to add patient to queue.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Status Badge Formatter
  const renderStatusBadge = (status) => {
    const st = (status || "WAITING").toUpperCase();
    switch (st) {
      case "IN_CONSULTATION":
        return <span className="q-badge badge-consulting"><Play size={12} /> In Consultation</span>;
      case "CALLED":
        return <span className="q-badge badge-called"><Volume2 size={12} /> Called</span>;
      case "COMPLETED":
        return <span className="q-badge badge-completed"><CheckCheck size={12} /> Completed</span>;
      case "SKIPPED":
        return <span className="q-badge badge-skipped"><SkipForward size={12} /> Skipped</span>;
      case "CANCELLED":
        return <span className="q-badge badge-cancelled"><X size={12} /> Cancelled</span>;
      default:
        return <span className="q-badge badge-waiting"><Clock size={12} /> Waiting</span>;
    }
  };

  return (
    <div className="staff-queue-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`staff-q-toast toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Header */}
      <section className="staff-q-hero">
        <div className="hero-content">
          <div className="hero-tag">
            <Radio size={14} className="live-pulse" />
            <span>REAL-TIME OPD TELEMETRY</span>
          </div>
          <h1 className="hero-title">Live Patient Queue</h1>
          <p className="hero-subtitle">
            Orchestrate patient triage flow, call tokens into consultation, monitor wait durations, and handle emergency priority patients.
          </p>

          <div className="hero-live-meta">
            <span className="live-dot" />
            <span>Serving Now: <strong>{currentToken}</strong></span>
            <span className="meta-divider">•</span>
            <span>Auto-refresh: <strong>{secondsUntilRefresh}s</strong></span>
          </div>
        </div>

        <div className="hero-actions">
          <button
            className={`hero-btn-refresh ${isRefreshing ? "spinning" : ""}`}
            onClick={() => fetchQueue(true)}
            disabled={isRefreshing || loading}
            title="Refresh Live Queue"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          <button
            className="hero-btn-call-next"
            onClick={handleCallNext}
            disabled={callingNext || stats.waiting === 0}
            title="Call next patient in queue"
          >
            {callingNext ? <Loader2 size={16} className="spinner-loader" /> : <Volume2 size={16} />}
            <span>Call Next Patient</span>
          </button>

          <button
            className="hero-btn-add"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            <span>Issue Token</span>
          </button>
        </div>
      </section>

      {/* 4 Stat Cards Grid */}
      <section className="staff-q-stats-grid">
        {QUEUE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = statusFilter === tab.key;
          const count = tab.countKey === "all" ? totalCount : (stats[tab.countKey] || 0);

          return (
            <div
              key={tab.key}
              className={`q-stat-card card-${tab.color} ${isActive ? "q-stat-card-active" : ""}`}
              onClick={() => {
                setStatusFilter(tab.key);
                setCurrentPage(1);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="q-stat-icon">
                <Icon size={22} />
              </div>
              <div className="q-stat-body">
                <span className="q-stat-label">{tab.label}</span>
                <strong className="q-stat-value">{count}</strong>
              </div>
              <div className="q-stat-indicator" />
            </div>
          );
        })}
      </section>

      {/* Main Queue Card */}
      <section className="staff-q-main-card">
        {/* Toolbar */}
        <div className="q-card-toolbar">
          <div className="q-search-box">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search patient, token number (e.g., 002), doctor..."
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

          <div className="q-toolbar-right">
            <label className="toggle-autorefresh">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
              />
              <span>15s Live Sync</span>
            </label>

            <div className="filter-select-wrapper">
              <Filter size={15} />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Queue Statuses</option>
                <option value="WAITING">Waiting Only</option>
                <option value="IN_CONSULTATION">In Consultation</option>
                <option value="CALLED">Called</option>
                <option value="COMPLETED">Completed</option>
                <option value="EMERGENCY">Emergency Priority</option>
              </select>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="q-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="q-loading-state">
            <Loader2 size={36} className="spinner-loader" />
            <p>Syncing OPD telemetry roster...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && queueItems.length === 0 && (
          <div className="q-empty-state">
            <div className="empty-icon-wrap">
              <Clock size={42} />
            </div>
            <h3>No queue entries found</h3>
            <p>
              {search || statusFilter !== "ALL"
                ? "No live queue tokens match your search/filter criteria."
                : "All OPD patients have concluded their consultations for today."}
            </p>
            <button
              className="btn-create-first"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} />
              <span>Issue New Token</span>
            </button>
          </div>
        )}

        {/* Desktop Table View */}
        {!loading && queueItems.length > 0 && (
          <div className="q-table-wrapper">
            <table className="q-table">
              <thead>
                <tr>
                  <th>Token #</th>
                  <th>Patient Details</th>
                  <th>Attending Doctor</th>
                  <th>Wait Duration</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th className="th-actions">Queue Actions</th>
                </tr>
              </thead>
              <tbody>
                {queueItems.map((item) => {
                  const qId = item._id || item.id;
                  const tokenCode = item.token_code || `T-${String(item.token_number || 1).zfill(3)}`;
                  const isEmergency = item.priority === "EMERGENCY";
                  const patientName = item.patient_name || "—";
                  const patientPhone = item.patient_phone || "—";
                  const patientCode = item.patient_id_code || "—";
                  const doctorName = item.doctor_name || "—";
                  const specialty = item.specialty || "General Medicine";
                  const status = (item.status || "WAITING").toUpperCase();
                  const waitTime = getWaitTime(item.created_at);

                  return (
                    <tr
                      key={qId}
                      className={`q-table-row ${isEmergency ? "row-emergency" : ""} ${status === "IN_CONSULTATION" ? "row-consulting" : ""}`}
                    >
                      {/* Token Code */}
                      <td className="td-token">
                        <div className="token-pill-wrap">
                          <span className={`token-pill ${isEmergency ? "token-emergency" : ""}`}>
                            {tokenCode}
                          </span>
                          {isEmergency && (
                            <span className="emergency-icon-tag" title="Emergency Priority">
                              <Flame size={12} />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Patient Details */}
                      <td className="td-patient">
                        <div className="patient-meta">
                          <strong className="patient-name">{patientName}</strong>
                          <div className="patient-sub-meta">
                            {patientPhone !== "—" && (
                              <span><Phone size={11} /> {patientPhone}</span>
                            )}
                            {patientCode !== "—" && (
                              <span className="code-tag">{patientCode}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="td-doctor">
                        <div className="doctor-meta">
                          <strong className="doctor-name">{doctorName}</strong>
                          <span className="doctor-spec">{specialty}</span>
                        </div>
                      </td>

                      {/* Wait Duration */}
                      <td className="td-wait-time">
                        <div className="wait-time-meta">
                          <Clock size={12} />
                          <span>{waitTime}</span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="td-priority">
                        <button
                          className={`priority-badge ${isEmergency ? "p-emergency" : "p-normal"}`}
                          onClick={() => handleTogglePriority(qId, item.priority)}
                          title="Click to toggle emergency priority"
                          disabled={actionLoadingId === qId}
                        >
                          {isEmergency ? <Flame size={11} /> : null}
                          <span>{isEmergency ? "EMERGENCY" : "NORMAL"}</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="td-status">
                        {renderStatusBadge(status)}
                      </td>

                      {/* Actions */}
                      <td className="td-actions">
                        <div className="row-actions-group">
                          {status === "WAITING" && (
                            <button
                              className="action-btn btn-call"
                              title="Call Patient"
                              onClick={() => handleUpdateStatus(qId, "CALLED")}
                              disabled={actionLoadingId === qId}
                            >
                              <Volume2 size={14} />
                            </button>
                          )}

                          {(status === "WAITING" || status === "CALLED") && (
                            <button
                              className="action-btn btn-start"
                              title="Start Consultation"
                              onClick={() => handleUpdateStatus(qId, "IN_CONSULTATION")}
                              disabled={actionLoadingId === qId}
                            >
                              <Play size={14} />
                            </button>
                          )}

                          {status === "IN_CONSULTATION" && (
                            <button
                              className="action-btn btn-complete"
                              title="Conclude Consultation"
                              onClick={() => handleUpdateStatus(qId, "COMPLETED")}
                              disabled={actionLoadingId === qId}
                            >
                              <CheckCheck size={14} />
                            </button>
                          )}

                          {status !== "COMPLETED" && status !== "SKIPPED" && (
                            <button
                              className="action-btn btn-skip"
                              title="Skip Patient"
                              onClick={() => handleUpdateStatus(qId, "SKIPPED")}
                              disabled={actionLoadingId === qId}
                            >
                              <SkipForward size={14} />
                            </button>
                          )}

                          {status !== "CANCELLED" && (
                            <button
                              className="action-btn btn-cancel"
                              title="Cancel Queue Entry"
                              onClick={() => handleUpdateStatus(qId, "CANCELLED")}
                              disabled={actionLoadingId === qId}
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
          </div>
        )}

        {/* Mobile Stacked Cards View */}
        {!loading && queueItems.length > 0 && (
          <div className="q-mobile-cards-grid">
            {queueItems.map((item) => {
              const qId = item._id || item.id;
              const tokenCode = item.token_code || `T-${String(item.token_number || 1).zfill(3)}`;
              const isEmergency = item.priority === "EMERGENCY";
              const patientName = item.patient_name || "—";
              const patientPhone = item.patient_phone || "—";
              const doctorName = item.doctor_name || "—";
              const specialty = item.specialty || "General Medicine";
              const status = (item.status || "WAITING").toUpperCase();
              const waitTime = getWaitTime(item.created_at);

              return (
                <div key={qId} className={`q-mobile-card ${isEmergency ? "m-emergency" : ""}`}>
                  <div className="mobile-card-top">
                    <div className="m-token-group">
                      <span className={`token-pill ${isEmergency ? "token-emergency" : ""}`}>
                        {tokenCode}
                      </span>
                      {isEmergency && <span className="m-tag-emergency">EMERGENCY</span>}
                    </div>
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
                        <strong>Wait Time: {waitTime}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mobile-card-actions">
                    {status === "WAITING" && (
                      <button
                        className="m-btn btn-m-call"
                        onClick={() => handleUpdateStatus(qId, "CALLED")}
                      >
                        <Volume2 size={13} /> Call
                      </button>
                    )}

                    {(status === "WAITING" || status === "CALLED") && (
                      <button
                        className="m-btn btn-m-start"
                        onClick={() => handleUpdateStatus(qId, "IN_CONSULTATION")}
                      >
                        <Play size={13} /> Start
                      </button>
                    )}

                    {status === "IN_CONSULTATION" && (
                      <button
                        className="m-btn btn-m-complete"
                        onClick={() => handleUpdateStatus(qId, "COMPLETED")}
                      >
                        <CheckCheck size={13} /> Done
                      </button>
                    )}

                    {status !== "COMPLETED" && (
                      <button
                        className="m-btn btn-m-skip"
                        onClick={() => handleUpdateStatus(qId, "SKIPPED")}
                      >
                        <SkipForward size={13} /> Skip
                      </button>
                    )}

                    <button
                      className="m-btn btn-m-priority"
                      onClick={() => handleTogglePriority(qId, item.priority)}
                    >
                      <Flame size={13} /> {isEmergency ? "Normal" : "Emergency"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Card Footer & Pagination */}
        {!loading && queueItems.length > 0 && (
          <div className="q-card-footer">
            <div className="footer-count">
              Showing <strong>{queueItems.length}</strong> of <strong>{totalCount}</strong> OPD tokens
            </div>

            <div className="q-pagination">
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
      {/* MODAL: ISSUE NEW QUEUE TOKEN */}
      {/* ============================================================ */}
      {showAddModal && (
        <div className="staff-q-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="staff-q-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Radio size={20} className="modal-icon" />
                <h2>Issue OPD Queue Token</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="modal-form">
              <div className="form-group">
                <label>Select Patient <span className="req">*</span></label>
                <select
                  value={addForm.patient_id}
                  onChange={(e) => setAddForm({ ...addForm, patient_id: e.target.value })}
                  className={addErrors.patient_id ? "input-error" : ""}
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name} ({p.phone || "No Phone"} - {p.patient_id_code || p.patientId || "ID"})
                    </option>
                  ))}
                </select>
                {addErrors.patient_id && <span className="field-err">{addErrors.patient_id}</span>}
              </div>

              <div className="form-group">
                <label>Assigned Doctor <span className="req">*</span></label>
                <select
                  value={addForm.doctor_id}
                  onChange={(e) => setAddForm({ ...addForm, doctor_id: e.target.value })}
                  className={addErrors.doctor_id ? "input-error" : ""}
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d._id || d.id} value={d._id || d.id}>
                      {d.name} — {d.specialty || "Specialist"}
                    </option>
                  ))}
                </select>
                {addErrors.doctor_id && <span className="field-err">{addErrors.doctor_id}</span>}
              </div>

              <div className="checkbox-form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addForm.is_emergency}
                    onChange={(e) => setAddForm({ ...addForm, is_emergency: e.target.checked })}
                  />
                  <span>Mark as Emergency / Critical Triage (Bumps to head of queue)</span>
                </label>
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
                  disabled={actionLoadingId === "add_queue"}
                >
                  {actionLoadingId === "add_queue" ? <Loader2 size={16} className="spinner-loader" /> : <Plus size={16} />}
                  <span>Generate Token</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
