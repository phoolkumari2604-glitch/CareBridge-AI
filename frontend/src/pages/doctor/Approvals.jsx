import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Search,
  XCircle,
  UserRound,
  CalendarDays,
  RefreshCw,
  Loader2,
  AlertCircle,
  ClipboardCheck,
  X,
  Check,
} from "lucide-react";
import doctorService from "../../services/doctorService";
import "./Approvals.css";

function Approvals() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const [approvals, setApprovals] = useState([]);
  const [patientsMap, setPatientsMap] = useState({});
  const [appointmentsMap, setAppointmentsMap] = useState({});

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState(null); // { approvalId, patientName, action: 'APPROVED' | 'REJECTED' }
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadApprovalsData = useCallback(async () => {
    try {
      setError(null);
      const [approvalsData, patientsData, appointmentsData] = await Promise.all([
        doctorService.getApprovals(),
        doctorService.getPatients(),
        doctorService.getAppointments(),
      ]);

      setApprovals(Array.isArray(approvalsData) ? approvalsData : []);

      const pMap = {};
      if (Array.isArray(patientsData)) {
        patientsData.forEach((p) => {
          pMap[p._id || p.id] = p;
        });
      }
      setPatientsMap(pMap);

      const aptMap = {};
      if (Array.isArray(appointmentsData)) {
        appointmentsData.forEach((apt) => {
          aptMap[apt._id || apt.id] = apt;
        });
      }
      setAppointmentsMap(aptMap);
    } catch (err) {
      console.error("Error loading approvals:", err);
      setError("Failed to load clinical approval requests.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadApprovalsData();
  }, [loadApprovalsData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadApprovalsData();
  };

  const handleConfirmDecision = async () => {
    if (!confirmAction) return;
    setIsSubmitting(true);
    const { approvalId, action, patientName } = confirmAction;

    try {
      await doctorService.updateApproval(approvalId, action);
      const label = action === "APPROVED" ? "approved" : "rejected";
      setToastMessage(`Consultation request for ${patientName} has been ${label}.`);
      setTimeout(() => setToastMessage(""), 4000);

      setApprovals((prev) =>
        prev.map((app) =>
          (app._id || app.id) === approvalId
            ? { ...app, status: action, updated_at: new Date().toISOString() }
            : app
        )
      );

      setConfirmAction(null);
    } catch (err) {
      console.error("Approval decision failed:", err);
      alert(err.response?.data?.detail || "Failed to submit approval decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredApprovals = approvals.filter((app) => {
    const statusUpper = (app.status || "PENDING").toUpperCase();

    const matchesFilter =
      activeFilter === "all"
        ? true
        : activeFilter === "pending"
        ? statusUpper === "PENDING"
        : activeFilter === "approved"
        ? statusUpper === "APPROVED"
        : activeFilter === "rejected"
        ? statusUpper === "REJECTED"
        : true;

    const patient = patientsMap[app.patient_id];
    const appointment = appointmentsMap[app.appointment_id];
    const patientName = patient?.name || "";
    const reason = appointment?.reason || "";
    const appId = app._id || app.id || "";

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      patientName.toLowerCase().includes(query) ||
      reason.toLowerCase().includes(query) ||
      appId.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const pendingCount = approvals.filter(
    (item) => (item.status || "").toUpperCase() === "PENDING"
  ).length;

  const approvedCount = approvals.filter(
    (item) => (item.status || "").toUpperCase() === "APPROVED"
  ).length;

  const rejectedCount = approvals.filter(
    (item) => (item.status || "").toUpperCase() === "REJECTED"
  ).length;

  return (
    <main className="approvals-page">
      {/* HEADER */}
      <section className="approvals-header">
        <div>
          <span className="approvals-kicker">DOCTOR PORTAL</span>
          <h1>Clinical Approvals & Access Requests</h1>
          <p>
            Review incoming consultation requests, verify clinical eligibility, and grant consultation approvals.
          </p>
        </div>

        <button
          className={`approvals-refresh-btn ${isRefreshing ? "spinning" : ""}`}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} />
          <span>{isRefreshing ? "Refreshing..." : "Refresh Queue"}</span>
        </button>
      </section>

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="approvals-toast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="approvals-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={loadApprovalsData}>Retry</button>
        </div>
      )}

      {/* SUMMARY STATS CARDS */}
      <section className="approval-stats">
        <div
          className={`approval-stat-card pending ${activeFilter === "pending" ? "active-chip" : ""}`}
          onClick={() => setActiveFilter("pending")}
        >
          <div className="approval-stat-icon">
            <Clock3 size={21} />
          </div>
          <div>
            <span>Pending Review</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>

        <div
          className={`approval-stat-card approved ${activeFilter === "approved" ? "active-chip" : ""}`}
          onClick={() => setActiveFilter("approved")}
        >
          <div className="approval-stat-icon">
            <CheckCircle2 size={21} />
          </div>
          <div>
            <span>Approved</span>
            <strong>{approvedCount}</strong>
          </div>
        </div>

        <div
          className={`approval-stat-card rejected ${activeFilter === "rejected" ? "active-chip" : ""}`}
          onClick={() => setActiveFilter("rejected")}
        >
          <div className="approval-stat-icon">
            <XCircle size={21} />
          </div>
          <div>
            <span>Rejected</span>
            <strong>{rejectedCount}</strong>
          </div>
        </div>

        <div
          className={`approval-stat-card total ${activeFilter === "all" ? "active-chip" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          <div className="approval-stat-icon">
            <FileText size={21} />
          </div>
          <div>
            <span>Total Requests</span>
            <strong>{approvals.length}</strong>
          </div>
        </div>
      </section>

      {/* TOOLBAR */}
      <section className="approval-toolbar">
        <div className="approval-search">
          <Search size={19} />
          <input
            type="search"
            placeholder="Search patient name, ID, or clinical reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search approval requests"
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        <div className="approval-filters">
          <button
            className={`filter-btn ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All ({approvals.length})
          </button>

          <button
            className={`filter-btn ${activeFilter === "pending" ? "active" : ""}`}
            onClick={() => setActiveFilter("pending")}
          >
            Pending ({pendingCount})
          </button>

          <button
            className={`filter-btn ${activeFilter === "approved" ? "active" : ""}`}
            onClick={() => setActiveFilter("approved")}
          >
            Approved ({approvedCount})
          </button>

          <button
            className={`filter-btn ${activeFilter === "rejected" ? "active" : ""}`}
            onClick={() => setActiveFilter("rejected")}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </section>

      {/* REQUEST LIST */}
      <section className="approval-panel">
        <div className="approval-panel-header">
          <div>
            <h2>Review Queue</h2>
            <p>Showing {filteredApprovals.length} request{filteredApprovals.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {loading ? (
          <div className="approvals-loading">
            <Loader2 size={32} className="spinning" />
            <span>Loading pending approval requests...</span>
          </div>
        ) : (
          <div className="approval-list">
            {filteredApprovals.length === 0 ? (
              <div className="empty-approvals-box">
                <ClipboardCheck size={40} />
                <h3>No approval requests in this view</h3>
                <p>All clinical consultation requests have been triaged or none match your filter.</p>
              </div>
            ) : (
              filteredApprovals.map((request) => {
                const patient = patientsMap[request.patient_id];
                const appointment = appointmentsMap[request.appointment_id];
                const patientName = patient?.name || "Patient Record";
                const pid = request.patient_id || "";
                const statusUpper = (request.status || "PENDING").toUpperCase();

                return (
                  <article className="approval-request" key={request._id || request.id}>
                    {/* PATIENT */}
                    <div className="request-patient">
                      <div className="patient-avatar">
                        <UserRound size={21} />
                      </div>

                      <div>
                        <h3>{patientName}</h3>
                        <span>{pid ? `ID: ${pid.slice(-6)}` : "Verified Patient"}</span>
                        {patient?.phone && <small className="phone-line">{patient.phone}</small>}
                      </div>
                    </div>

                    {/* REQUEST DETAILS */}
                    <div className="request-details">
                      <div className="request-type">
                        <strong>Consultation Approval</strong>
                        <span className="department">
                          {appointment?.appointment_time ? `Slot: ${appointment.appointment_time}` : "Clinical Slot"}
                        </span>
                      </div>

                      <p className="request-reason-text">
                        {appointment?.reason || "Patient requested scheduled consultation slot."}
                      </p>

                      <div className="request-meta">
                        <span>
                          <CalendarDays size={14} />
                          {appointment?.appointment_date || "Date Pending"}
                        </span>
                        <span>
                          <Clock3 size={14} />
                          {appointment?.appointment_time || "Time Pending"}
                        </span>
                      </div>
                    </div>

                    {/* STATUS */}
                    <div className="request-status">
                      <span className={`status-badge ${statusUpper.toLowerCase()}`}>
                        {statusUpper}
                      </span>
                    </div>

                    {/* ACTIONS */}
                    <div className="request-actions">
                      {statusUpper === "PENDING" ? (
                        <>
                          <button
                            className="approval-action approve"
                            onClick={() =>
                              setConfirmAction({
                                approvalId: request._id || request.id,
                                patientName,
                                action: "APPROVED",
                              })
                            }
                          >
                            <Check size={16} />
                            Approve
                          </button>

                          <button
                            className="approval-action reject"
                            onClick={() =>
                              setConfirmAction({
                                approvalId: request._id || request.id,
                                patientName,
                                action: "REJECTED",
                              })
                            }
                          >
                            <X size={16} />
                            Reject
                          </button>
                        </>
                      ) : (
                        <div className="decision-logged-tag">
                          <span>Decision Finalized</span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* DECISION CONFIRMATION MODAL */}
      {confirmAction && (
        <div className="approval-modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="approval-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Clinical Decision</h3>
              <button className="modal-close-btn" onClick={() => setConfirmAction(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to{" "}
                <strong className={confirmAction.action === "APPROVED" ? "text-green" : "text-red"}>
                  {confirmAction.action === "APPROVED" ? "APPROVE" : "REJECT"}
                </strong>{" "}
                the consultation request for <strong>{confirmAction.patientName}</strong>?
              </p>
              <p className="modal-subtext">
                This will automatically update the patient's appointment and sync the schedule with the backend.
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-modal-cancel"
                onClick={() => setConfirmAction(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className={`btn-modal-submit ${confirmAction.action === "APPROVED" ? "btn-approve" : "btn-reject"}`}
                onClick={handleConfirmDecision}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Processing..."
                  : `Confirm ${confirmAction.action === "APPROVED" ? "Approval" : "Rejection"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Approvals;