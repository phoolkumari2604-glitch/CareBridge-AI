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
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View details modal state
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);

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

  // Silent 30-second auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      loadApprovalsData();
    }, 30000);
    return () => clearInterval(timer);
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
      await doctorService.updateApproval(approvalId, action, rejectionReason.trim());
      const label = action === "APPROVED" ? "approved" : "rejected";
      setToastMessage(`Consultation request for ${patientName} has been ${label}.`);
      setTimeout(() => setToastMessage(""), 4000);

      setApprovals((prev) =>
        prev.map((app) =>
          (app._id || app.id) === approvalId
            ? { ...app, status: action, rejection_reason: rejectionReason, updated_at: new Date().toISOString() }
            : app
        )
      );

      setConfirmAction(null);
      setRejectionReason("");
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
    const patientName = app.patient_name || patient?.name || "";
    const pCode = app.patient_code || patient?.patient_code || String(patient?.patientId || "").replace("PT-", "") || "";
    const reason = app.reason || appointment?.reason || "";
    const appId = String(app._id || app.id || "");
    const bookingId = app.booking_id || appointment?.booking_id || "";
    const phone = patient?.phone || app.patient_phone || "";
    const email = patient?.email || app.patient_email || "";

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      patientName.toLowerCase().includes(query) ||
      pCode.toLowerCase().includes(query) ||
      reason.toLowerCase().includes(query) ||
      appId.toLowerCase().includes(query) ||
      bookingId.toLowerCase().includes(query) ||
      phone.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query);

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
            type="text"
            placeholder="Search patient name, ID, phone, or clinical reason..."
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
                <h3>{searchQuery ? "No matching requests" : "No approval requests in this view"}</h3>
                <p>
                  {searchQuery
                    ? `No clinical requests matched "${searchQuery}". Try adjusting your keywords or clearing the filter.`
                    : "All clinical consultation requests have been triaged or none match your filter."}
                </p>
              </div>
            ) : (
              filteredApprovals.map((request) => {
                const patient = patientsMap[request.patient_id];
                const appointment = appointmentsMap[request.appointment_id];
                const patientName = request.patient_name || patient?.name || "Patient Record";
                const pCode = request.patient_code || patient?.patient_code || String(patient?.patientId || "").replace("PT-", "") || String(request.patient_id || "").slice(-6);
                const statusUpper = (request.status || "PENDING").toUpperCase();

                const age = request.age || patient?.age;
                const gender = request.gender || patient?.gender;
                const bloodGroup = request.blood_group || patient?.blood_group;
                const phone = request.patient_phone || patient?.phone;
                const requestedDate = request.appointment_date || appointment?.appointment_date || "Date Pending";
                const requestedTime = request.appointment_time || appointment?.appointment_time || "Time Pending";
                const reason = request.reason || appointment?.reason || "Patient requested scheduled consultation slot.";

                return (
                  <article className="approval-request" key={request._id || request.id}>
                    {/* PATIENT */}
                    <div className="request-patient">
                      <div className="patient-avatar">
                        <UserRound size={21} />
                      </div>

                      <div>
                        <h3>{patientName}</h3>
                        <div className="patient-demographics-row">
                          <span className="patient-code-tag">ID: {pCode}</span>
                          {bloodGroup && <span className="blood-chip">{bloodGroup}</span>}
                        </div>
                        <div className="patient-sub-details">
                          {age && gender && (
                            <span className="age-gender-text">
                              {age} yrs • {gender}
                            </span>
                          )}
                          {phone && (
                            <small className="phone-line">{phone}</small>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* REQUEST DETAILS */}
                    <div className="request-details">
                      <div className="request-type">
                        <strong>Consultation Approval</strong>
                        <span className="department">
                          {requestedTime !== "Time Pending" ? `Slot: ${requestedTime}` : "Clinical Slot"}
                        </span>
                      </div>

                      <p className="request-reason-text">{reason}</p>

                      <div className="request-meta">
                        <span>
                          <CalendarDays size={14} />
                          {requestedDate}
                        </span>
                        <span>
                          <Clock3 size={14} />
                          {requestedTime}
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
                      <button
                        type="button"
                        className="approval-action view-details-btn"
                        onClick={() => setSelectedRequestDetails({ ...request, patient, appointment })}
                        title="View patient history and vitals"
                      >
                        <FileText size={15} />
                        View Details
                      </button>

                      {statusUpper === "PENDING" ? (
                        <>
                          <button
                            className="approval-action approve"
                            onClick={() => {
                              setConfirmAction({
                                approvalId: request._id || request.id,
                                patientName,
                                action: "APPROVED",
                              });
                              setRejectionReason("");
                            }}
                          >
                            <Check size={16} />
                            Approve
                          </button>

                          <button
                            className="approval-action reject"
                            onClick={() => {
                              setConfirmAction({
                                approvalId: request._id || request.id,
                                patientName,
                                action: "REJECTED",
                              });
                              setRejectionReason("");
                            }}
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

      {/* VIEW DETAILS MODAL */}
      {selectedRequestDetails && (
        <div className="approval-modal-overlay" onClick={() => setSelectedRequestDetails(null)}>
          <div className="approval-modal-box details-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-teal-600" />
                <h3>Patient Clinical Profile & Consultation</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedRequestDetails(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body details-modal-body">
              <div className="details-patient-banner">
                <div className="patient-avatar large">
                  <UserRound size={26} />
                </div>
                <div>
                  <h4>{selectedRequestDetails.patient_name || selectedRequestDetails.patient?.name || "Patient Record"}</h4>
                  <p className="details-subtext">
                    ID: {selectedRequestDetails.patient_code || selectedRequestDetails.patient?.patient_code || "—"} •{" "}
                    {selectedRequestDetails.age || selectedRequestDetails.patient?.age || 45} yrs •{" "}
                    {selectedRequestDetails.gender || selectedRequestDetails.patient?.gender || "Other"} • Blood Group:{" "}
                    <strong className="text-teal-700">{selectedRequestDetails.blood_group || selectedRequestDetails.patient?.blood_group || "O+"}</strong>
                  </p>
                  <p className="details-contact">
                    Phone: {selectedRequestDetails.patient_phone || selectedRequestDetails.patient?.phone || "—"} • Email:{" "}
                    {selectedRequestDetails.patient_email || selectedRequestDetails.patient?.email || "—"}
                  </p>
                </div>
              </div>

              {/* CONSULTATION REASON */}
              <div className="details-section">
                <h5>Requested Consultation Reason</h5>
                <p className="reason-box">
                  {selectedRequestDetails.reason || selectedRequestDetails.appointment?.reason || "General Consultation Review"}
                </p>
              </div>

              {/* ALLERGIES */}
              <div className="details-section">
                <h5>Known Allergies</h5>
                {((selectedRequestDetails.allergies && selectedRequestDetails.allergies.length > 0) ||
                  (selectedRequestDetails.patient?.allergies && selectedRequestDetails.patient.allergies.length > 0)) ? (
                  <div className="allergies-tag-list">
                    {(selectedRequestDetails.allergies || selectedRequestDetails.patient?.allergies || []).map((alg, i) => (
                      <span key={i} className="allergy-tag">
                        ⚠️ {alg}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="details-empty-note">No active allergies documented.</p>
                )}
              </div>

              {/* MEDICAL HISTORY */}
              <div className="details-section">
                <h5>Medical History & Chronic Conditions</h5>
                {((selectedRequestDetails.medical_history && selectedRequestDetails.medical_history.length > 0) ||
                  (selectedRequestDetails.patient?.medical_history && selectedRequestDetails.patient.medical_history.length > 0)) ? (
                  <ul className="history-bullets">
                    {(selectedRequestDetails.medical_history || selectedRequestDetails.patient?.medical_history || []).map((med, i) => (
                      <li key={i}>{med}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="details-empty-note">No chronic medical history on file.</p>
                )}
              </div>

              {/* RECENT VITALS */}
              <div className="details-section">
                <h5>Recent Vitals Telemetry</h5>
                {selectedRequestDetails.latest_vitals ? (
                  <div className="vitals-quick-grid">
                    <div className="vital-item">
                      <span className="vital-label">Heart Rate</span>
                      <strong className="vital-val">{selectedRequestDetails.latest_vitals.heart_rate || "--"} bpm</strong>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">Blood Pressure</span>
                      <strong className="vital-val">
                        {selectedRequestDetails.latest_vitals.systolic_bp || "--"}/{selectedRequestDetails.latest_vitals.diastolic_bp || "--"} mmHg
                      </strong>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">SpO2</span>
                      <strong className="vital-val">{selectedRequestDetails.latest_vitals.spo2 || "--"}%</strong>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">Temperature</span>
                      <strong className="vital-val">{selectedRequestDetails.latest_vitals.temperature || "--"} °C</strong>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">Blood Sugar</span>
                      <strong className="vital-val">{selectedRequestDetails.latest_vitals.blood_sugar || "--"} mg/dL</strong>
                    </div>
                  </div>
                ) : (
                  <p className="details-empty-note">No recent vitals logged yet for this patient.</p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal-cancel" onClick={() => setSelectedRequestDetails(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                This will automatically update the patient's appointment and notify the patient.
              </p>

              {confirmAction.action === "REJECTED" && (
                <div className="rejection-reason-block">
                  <label htmlFor="rejection-reason" className="rejection-label">
                    Reason for Rejection (Optional):
                  </label>
                  <textarea
                    id="rejection-reason"
                    rows={3}
                    placeholder="Enter clinical rationale or alternative instructions for patient..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="rejection-textarea"
                  />
                </div>
              )}
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