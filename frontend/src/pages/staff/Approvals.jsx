import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
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
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  History,
} from "lucide-react";
import api from "../../services/api";
import "./Approvals.css";

const APPROVAL_TABS = [
  { key: "ALL", label: "Total Requests", countKey: "total", icon: FileCheck2, color: "blue" },
  { key: "PENDING", label: "Pending Clearance", countKey: "pending", icon: Clock, color: "amber" },
  { key: "APPROVED", label: "Approved", countKey: "approved", icon: CheckCircle2, color: "green" },
  { key: "REJECTED", label: "Rejected", countKey: "rejected", icon: XCircle, color: "red" },
];

export default function Approvals() {
  // Data & Pagination
  const [approvals, setApprovals] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Auto-refresh (30s)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(30);

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Modals & Drawers
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeApproval, setActiveApproval] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [isBulkReject, setIsBulkReject] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Fetch Approvals
  const fetchApprovals = useCallback(async (isRefresh = false) => {
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

      const res = await api.get("/approvals/", { params });
      const data = res.data || {};

      if (Array.isArray(data)) {
        setApprovals(data);
        setTotalCount(data.length);
        setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
      } else {
        setApprovals(data.approvals || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.pages || 1);
        if (data.stats) setStats(data.stats);
      }

      setSecondsUntilRefresh(30);
      if (isRefresh) {
        showToast("Approvals list refreshed.", "info");
      }
    } catch (err) {
      console.error("Approvals fetch error:", err);
      setError("Failed to fetch approvals data from backend.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Auto-refresh loop
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          fetchApprovals(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, fetchApprovals]);

  // Selection Checkbox Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allCurrentIds = approvals.map((a) => a._id || a.id);
      setSelectedIds(allCurrentIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Single Approve
  const handleSingleApprove = async (approvalId) => {
    try {
      setActionLoading(true);
      await api.put(`/approvals/${approvalId}`, { status: "APPROVED" });
      showToast(`Request #${approvalId.slice(-6).toUpperCase()} approved.`, "success");
      if (showViewModal) setShowViewModal(false);
      fetchApprovals();
    } catch (err) {
      console.error("Approve error:", err);
      showToast(err.response?.data?.detail || "Failed to approve request.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Reject Modal
  const openRejectModal = (approval = null, bulk = false) => {
    setActiveApproval(approval);
    setIsBulkReject(bulk);
    setRejectReason("");
    setRejectReasonError("");
    setShowRejectModal(true);
  };

  // Confirm Reject (Single or Bulk)
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setRejectReasonError("Please provide a clinical or administrative reason for rejection.");
      return;
    }

    try {
      setActionLoading(true);
      if (isBulkReject) {
        await api.post("/approvals/bulk-reject", {
          approval_ids: selectedIds,
          reason: rejectReason.trim(),
        });
        showToast(`Bulk rejected ${selectedIds.length} requests.`, "success");
        setSelectedIds([]);
      } else if (activeApproval) {
        const aid = activeApproval._id || activeApproval.id;
        await api.put(`/approvals/${aid}`, {
          status: "REJECTED",
          rejection_reason: rejectReason.trim(),
        });
        showToast(`Request #${aid.slice(-6).toUpperCase()} rejected.`, "success");
      }

      setShowRejectModal(false);
      if (showViewModal) setShowViewModal(false);
      fetchApprovals();
    } catch (err) {
      console.error("Rejection error:", err);
      showToast(err.response?.data?.detail || "Failed to reject clearance request.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      await api.post("/approvals/bulk-approve", { approval_ids: selectedIds });
      showToast(`Successfully approved ${selectedIds.length} requests!`, "success");
      setSelectedIds([]);
      fetchApprovals();
    } catch (err) {
      console.error("Bulk approve error:", err);
      showToast(err.response?.data?.detail || "Failed to bulk approve requests.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open View Modal
  const openView = (approval) => {
    setActiveApproval(approval);
    setShowViewModal(true);
  };

  // Status Badge Formatter
  const renderStatusBadge = (status) => {
    const st = (status || "PENDING").toUpperCase();
    if (st === "APPROVED") {
      return <span className="app-badge badge-approved"><CheckCircle2 size={12} /> Approved</span>;
    }
    if (st === "REJECTED") {
      return <span className="app-badge badge-rejected"><XCircle size={12} /> Rejected</span>;
    }
    return <span className="app-badge badge-pending"><Clock size={12} /> Pending Review</span>;
  };

  return (
    <div className="staff-approvals-container">
      {/* Toast */}
      {toast && (
        <div className={`staff-app-toast toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Header */}
      <section className="staff-app-hero">
        <div className="hero-content">
          <div className="hero-tag">
            <ShieldCheck size={14} />
            <span>CLINICAL CLEARANCE & AUTHORIZATION</span>
          </div>
          <h1 className="hero-title">Approvals</h1>
          <p className="hero-subtitle">
            Review triage requests, authorize consultation appointments, manage clearance workflows, and log clinical justifications.
          </p>

          <div className="hero-live-meta">
            <span>Sync countdown: <strong>{secondsUntilRefresh}s</strong></span>
            {selectedIds.length > 0 && (
              <>
                <span className="meta-divider">•</span>
                <span className="meta-selected-count"><strong>{selectedIds.length}</strong> items selected</span>
              </>
            )}
          </div>
        </div>

        <div className="hero-actions">
          <button
            className={`hero-btn-refresh ${isRefreshing ? "spinning" : ""}`}
            onClick={() => fetchApprovals(true)}
            disabled={isRefreshing || loading}
            title="Refresh Approvals"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* 4 Stat Cards */}
      <section className="staff-app-stats-grid">
        {APPROVAL_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = statusFilter === tab.key;
          const count = stats[tab.countKey] || 0;

          return (
            <div
              key={tab.key}
              className={`app-stat-card card-${tab.color} ${isActive ? "app-stat-card-active" : ""}`}
              onClick={() => {
                setStatusFilter(tab.key);
                setCurrentPage(1);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="app-stat-icon">
                <Icon size={22} />
              </div>
              <div className="app-stat-body">
                <span className="app-stat-label">{tab.label}</span>
                <strong className="app-stat-value">{count}</strong>
              </div>
              <div className="app-stat-indicator" />
            </div>
          );
        })}
      </section>

      {/* Bulk Action Sticky Bar */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-bar">
          <div className="bulk-info">
            <CheckCircle2 size={16} className="bulk-icon" />
            <span><strong>{selectedIds.length}</strong> requests selected for batch action</span>
          </div>

          <div className="bulk-btns">
            <button
              className="btn-bulk-approve"
              onClick={handleBulkApprove}
              disabled={actionLoading}
            >
              <Check size={15} />
              <span>Approve Selected</span>
            </button>

            <button
              className="btn-bulk-reject"
              onClick={() => openRejectModal(null, true)}
              disabled={actionLoading}
            >
              <X size={15} />
              <span>Reject Selected</span>
            </button>

            <button
              className="btn-bulk-cancel"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Main Approvals Card */}
      <section className="staff-app-main-card">
        {/* Toolbar */}
        <div className="app-card-toolbar">
          <div className="app-search-box">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search by patient, doctor, hospital, booking code..."
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

          <div className="app-toolbar-right">
            <label className="toggle-autorefresh">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
              />
              <span>30s Auto Sync</span>
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
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Clearance</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="app-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="app-loading-state">
            <Loader2 size={36} className="spinner-loader" />
            <p>Loading clearance ledger...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && approvals.length === 0 && (
          <div className="app-empty-state">
            <div className="empty-icon-wrap">
              <FileCheck2 size={42} />
            </div>
            <h3>No approval requests found</h3>
            <p>
              {search || statusFilter !== "ALL"
                ? "No clearance items match your search and filter criteria."
                : "All incoming requests have been reviewed and resolved."}
            </p>
          </div>
        )}

        {/* Desktop Table View */}
        {!loading && approvals.length > 0 && (
          <div className="app-table-wrapper">
            <table className="app-table">
              <thead>
                <tr>
                  <th className="th-checkbox">
                    <input
                      type="checkbox"
                      checked={approvals.length > 0 && selectedIds.length === approvals.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Request ID</th>
                  <th>Patient Details</th>
                  <th>Attending Doctor</th>
                  <th>Slot / Schedule</th>
                  <th>Consultation Purpose</th>
                  <th>Status</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((app) => {
                  const aid = app._id || app.id;
                  const reqCode = app.booking_id || `APP-${String(aid).slice(-6).toUpperCase()}`;
                  const isSelected = selectedIds.includes(aid);
                  const patientName = app.patient_name || "—";
                  const patientPhone = app.patient_phone || "—";
                  const doctorName = app.doctor_name || "—";
                  const dateStr = app.appointment_date || "—";
                  const timeStr = app.appointment_time || "—";
                  const reasonStr = app.reason || "Clinical Consultation";
                  const status = (app.status || "PENDING").toUpperCase();

                  return (
                    <tr
                      key={aid}
                      className={`app-table-row ${isSelected ? "row-selected" : ""}`}
                    >
                      <td className="td-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(aid)}
                        />
                      </td>

                      <td className="td-code">
                        <span className="app-tag">{reqCode}</span>
                      </td>

                      <td className="td-patient">
                        <div className="patient-meta">
                          <strong className="patient-name">{patientName}</strong>
                          {patientPhone !== "—" && (
                            <span className="patient-phone"><Phone size={11} /> {patientPhone}</span>
                          )}
                        </div>
                      </td>

                      <td className="td-doctor">
                        <strong className="doctor-name">{doctorName}</strong>
                      </td>

                      <td className="td-datetime">
                        <div className="datetime-meta">
                          <span className="dt-time"><Clock size={12} /> {timeStr}</span>
                          <span className="dt-date"><Calendar size={12} /> {dateStr}</span>
                        </div>
                      </td>

                      <td className="td-reason">
                        <span className="reason-text" title={reasonStr}>
                          {reasonStr}
                        </span>
                      </td>

                      <td className="td-status">
                        {renderStatusBadge(status)}
                      </td>

                      <td className="td-actions">
                        <div className="row-actions-group">
                          <button
                            className="action-btn btn-view"
                            title="View Full Clearance Dossier"
                            onClick={() => openView(app)}
                          >
                            <Eye size={15} />
                          </button>

                          {status === "PENDING" && (
                            <>
                              <button
                                className="action-btn btn-approve"
                                title="Approve Clearance"
                                onClick={() => handleSingleApprove(aid)}
                                disabled={actionLoading}
                              >
                                <Check size={15} />
                              </button>

                              <button
                                className="action-btn btn-reject"
                                title="Reject with Clinical Note"
                                onClick={() => openRejectModal(app, false)}
                                disabled={actionLoading}
                              >
                                <X size={15} />
                              </button>
                            </>
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
        {!loading && approvals.length > 0 && (
          <div className="app-mobile-cards-grid">
            {approvals.map((app) => {
              const aid = app._id || app.id;
              const reqCode = app.booking_id || `APP-${String(aid).slice(-6).toUpperCase()}`;
              const isSelected = selectedIds.includes(aid);
              const patientName = app.patient_name || "—";
              const patientPhone = app.patient_phone || "—";
              const doctorName = app.doctor_name || "—";
              const dateStr = app.appointment_date || "—";
              const timeStr = app.appointment_time || "—";
              const reasonStr = app.reason || "Clinical Consultation";
              const status = (app.status || "PENDING").toUpperCase();

              return (
                <div key={aid} className={`app-mobile-card ${isSelected ? "m-selected" : ""}`}>
                  <div className="mobile-card-top">
                    <div className="m-select-tag">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(aid)}
                      />
                      <span className="app-tag">{reqCode}</span>
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

                    {app.rejection_reason && (
                      <div className="mobile-rejection-box">
                        <span className="reject-label">Rejection Justification:</span>
                        <p>{app.rejection_reason}</p>
                      </div>
                    )}
                  </div>

                  <div className="mobile-card-actions">
                    <button
                      className="m-btn btn-m-view"
                      onClick={() => openView(app)}
                    >
                      <Eye size={14} /> View
                    </button>

                    {status === "PENDING" && (
                      <>
                        <button
                          className="m-btn btn-m-approve"
                          onClick={() => handleSingleApprove(aid)}
                        >
                          <Check size={14} /> Approve
                        </button>

                        <button
                          className="m-btn btn-m-reject"
                          onClick={() => openRejectModal(app, false)}
                        >
                          <X size={14} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Card Footer & Pagination */}
        {!loading && approvals.length > 0 && (
          <div className="app-card-footer">
            <div className="footer-count">
              Showing <strong>{approvals.length}</strong> of <strong>{totalCount}</strong> clearance requests
            </div>

            <div className="app-pagination">
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
      {/* MODAL: VIEW APPROVAL DOSSIER */}
      {/* ============================================================ */}
      {showViewModal && activeApproval && (
        <div className="staff-app-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="staff-app-modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <FileCheck2 size={20} className="modal-icon" />
                <h2>Clearance Dossier #{activeApproval.booking_id || (activeApproval._id || "").slice(-6).toUpperCase()}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowViewModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-details-body">
              <div className="details-grid-2">
                <div className="detail-card">
                  <h4><User size={16} /> Patient Information</h4>
                  <p><strong>Name:</strong> {activeApproval.patient_name || "—"}</p>
                  <p><strong>Phone:</strong> {activeApproval.patient_phone || "—"}</p>
                  <p><strong>Email:</strong> {activeApproval.patient_email || "—"}</p>
                </div>

                <div className="detail-card">
                  <h4><Stethoscope size={16} /> Clinical Specialist</h4>
                  <p><strong>Doctor:</strong> {activeApproval.doctor_name || "—"}</p>
                  <p><strong>Hospital:</strong> {activeApproval.hospital_name || "CareBridge General Hospital"}</p>
                </div>
              </div>

              <div className="detail-card-full">
                <h4><Calendar size={16} /> Schedule & Clinical Notes</h4>
                <div className="details-schedule-row">
                  <div><strong>Date:</strong> {activeApproval.appointment_date || "—"}</div>
                  <div><strong>Time:</strong> {activeApproval.appointment_time || "—"}</div>
                  <div><strong>Status:</strong> {renderStatusBadge(activeApproval.status)}</div>
                </div>

                <div className="details-reason-box">
                  <strong>Consultation Purpose:</strong>
                  <p>{activeApproval.reason || "Clinical examination & review"}</p>
                </div>

                {activeApproval.rejection_reason && (
                  <div className="details-rejection-box">
                    <strong>Rejection Clinical Justification:</strong>
                    <p>{activeApproval.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-modal-secondary"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>

              {activeApproval.status === "PENDING" && (
                <>
                  <button
                    className="btn-modal-reject"
                    onClick={() => openRejectModal(activeApproval, false)}
                  >
                    <X size={16} /> Reject Request
                  </button>

                  <button
                    className="btn-modal-primary"
                    onClick={() => handleSingleApprove(activeApproval._id || activeApproval.id)}
                  >
                    <Check size={16} /> Authorize Clearance
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: REJECT JUSTIFICATION */}
      {/* ============================================================ */}
      {showRejectModal && (
        <div className="staff-app-modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="staff-app-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <AlertTriangle size={20} className="modal-icon-warn" />
                <h2>Reject Clearance Request</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowRejectModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="modal-form">
              <p className="reject-intro">
                {isBulkReject
                  ? `You are about to reject ${selectedIds.length} clearance requests in batch.`
                  : `Please provide a reason for rejecting the clearance request for ${activeApproval?.patient_name || "this patient"}.`}
              </p>

              <div className="form-group">
                <label>Clinical or Administrative Justification <span className="req">*</span></label>
                <textarea
                  rows={4}
                  placeholder="e.g., Slot unavailable, required lab panels incomplete, doctor emergency surgery..."
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectReasonError) setRejectReasonError("");
                  }}
                  className={rejectReasonError ? "input-error" : ""}
                  required
                />
                {rejectReasonError && <span className="field-err">{rejectReasonError}</span>}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-reject"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 size={16} className="spinner-loader" /> : <XCircle size={16} />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}