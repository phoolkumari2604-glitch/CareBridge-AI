import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Clock3,
  XCircle,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Building,
  Check,
  X,
  FileText,
  User,
} from "lucide-react";
import doctorService from "../../services/doctorService";
import api from "../../services/api";
import "./Approvals.css";

function Approvals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadApprovals = useCallback(async () => {
    try {
      setError(null);
      const [approvalsRes, aptsRes, docsRes] = await Promise.allSettled([
        api.get("/approvals/"),
        doctorService.getAppointments(),
        doctorService.getDoctors(),
      ]);

      const approvalsList = approvalsRes.status === "fulfilled" && Array.isArray(approvalsRes.value?.data) ? approvalsRes.value.data : [];
      const aptsList = aptsRes.status === "fulfilled" && Array.isArray(aptsRes.value) ? aptsRes.value : [];
      const docsList = docsRes.status === "fulfilled" && Array.isArray(docsRes.value) ? docsRes.value : [];

      const docMap = {};
      docsList.forEach((d) => {
        docMap[d._id || d.id] = d;
      });

      // Combine structured approval requests
      const consolidated = [];

      // Add from approvals table
      approvalsList.forEach((appr) => {
        consolidated.push({
          id: appr._id || appr.id,
          source: "approval",
          patient: appr.patient_name || `Patient #${String(appr.patient_id || "").slice(-6)}`,
          patientId: `P-${String(appr.patient_id || "").slice(-5)}`,
          doctor: appr.doctor_name || (docMap[appr.doctor_id]?.name || "Assigned Specialist"),
          hospital: appr.hospital_name || (docMap[appr.doctor_id]?.hospital_name || "CareBridge Hospital Hub"),
          type: appr.request_type || appr.type || "Medical Clearance",
          date: appr.created_at ? new Date(appr.created_at).toLocaleDateString() : "Today",
          time: appr.created_at ? new Date(appr.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:00 AM",
          status: appr.status === "APPROVED" ? "Approved" : appr.status === "REJECTED" ? "Rejected" : "Pending",
          priority: "Normal",
          reason: appr.reason || "Outpatient Clinical Request",
        });
      });

      // Add pending appointments as approval requests if not already listed
      aptsList.forEach((apt) => {
        const aptId = apt._id || apt.id;
        const exists = consolidated.some((c) => c.id === aptId);
        if (!exists) {
          const doc = docMap[apt.doctor_id] || {};
          const statusStr = (apt.approval_status || apt.status || "PENDING").toUpperCase();
          consolidated.push({
            id: aptId,
            source: "appointment",
            patient: apt.patient_name || `Patient #${String(apt.patient_id || "").slice(-6)}`,
            patientId: `P-${String(apt.patient_id || "").slice(-5)}`,
            doctor: doc.name || apt.doctor_name || "Specialist Doctor",
            hospital: doc.hospital_name || doc.hospital || "CareBridge Medical Center",
            type: "Appointment Booking",
            date: apt.appointment_date || "Upcoming",
            time: apt.appointment_time || "10:00 AM",
            status: statusStr === "APPROVED" || statusStr === "CONFIRMED" ? "Approved" : statusStr === "REJECTED" || statusStr === "CANCELLED" ? "Rejected" : "Pending",
            priority: (apt.reason || "").toLowerCase().includes("emergency") ? "High" : "Normal",
            reason: apt.reason || "Patient consultation booking request",
          });
        }
      });

      setRequests(consolidated);
    } catch (err) {
      console.error("Failed to load approvals:", err);
      setError("Failed to retrieve clearance approvals from backend.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadApprovals();
  };

  const updateStatus = async (id, status, source) => {
    try {
      const isApproved = status === "Approved";
      if (source === "appointment") {
        await doctorService.updateAppointment(id, {
          approval_status: isApproved ? "APPROVED" : "REJECTED",
          status: isApproved ? "APPROVED" : "CANCELLED",
        });
      } else {
        try {
          await api.put(`/approvals/${id}`, { status: isApproved ? "APPROVED" : "REJECTED" });
        } catch {
          // fallback
          await doctorService.updateAppointment(id, { approval_status: isApproved ? "APPROVED" : "REJECTED" });
        }
      }

      setRequests((current) =>
        current.map((request) =>
          request.id === id ? { ...request, status } : request
        )
      );

      setToastMessage(`Request marked as ${status}.`);
      setTimeout(() => setToastMessage(""), 3500);
      setSelectedRequest(null);
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to update clearance status in database.");
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesFilter = filter === "All" || request.status === filter;
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        (request.patient || "").toLowerCase().includes(searchText) ||
        (request.patientId || "").toLowerCase().includes(searchText) ||
        (request.doctor || "").toLowerCase().includes(searchText) ||
        (request.id || "").toLowerCase().includes(searchText) ||
        (request.type || "").toLowerCase().includes(searchText);

      return matchesFilter && matchesSearch;
    });
  }, [requests, filter, search]);

  const pendingCount = requests.filter((request) => request.status === "Pending").length;
  const approvedCount = requests.filter((request) => request.status === "Approved").length;
  const rejectedCount = requests.filter((request) => request.status === "Rejected").length;

  return (
    <main className="staff-approvals-page">
      {/* HEADER */}
      <section className="approvals-header">
        <div>
          <span className="approvals-eyebrow">CAREBRIDGE AI — CLINICAL CLEARANCE</span>
          <h1>Clearance & Approvals Hub</h1>
          <p>
            Review outpatient appointment bookings, doctor schedule authorizations, and diagnostic intake clearance.
          </p>
        </div>

        <button
          className={`refresh-btn-secondary ${isRefreshing ? "spinning" : ""}`}
          onClick={handleRefresh}
          title="Refresh Approvals"
          disabled={isRefreshing}
        >
          <RefreshCw size={16} />
          <span>Refresh Requests</span>
        </button>
      </section>

      {toastMessage && (
        <div className="staff-approvals-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="staff-approvals-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* METRICS */}
      <section className="approvals-stats">
        <div className="stat-card">
          <span>Total Requests</span>
          <strong>{requests.length}</strong>
          <small>Recorded in system</small>
        </div>

        <div className="stat-card pending">
          <span>Pending Clearance</span>
          <strong>{pendingCount}</strong>
          <small>Awaiting review</small>
        </div>

        <div className="stat-card approved">
          <span>Approved Requests</span>
          <strong>{approvedCount}</strong>
          <small>Granted clearance</small>
        </div>

        <div className="stat-card rejected">
          <span>Rejected Requests</span>
          <strong>{rejectedCount}</strong>
          <small>Declined</small>
        </div>
      </section>

      {/* MAIN PANEL */}
      <section className="approvals-panel">
        <div className="panel-header">
          <div>
            <h2>Clearance Requests</h2>
            <p>{filteredRequests.length} requests displayed</p>
          </div>

          <div className="panel-actions">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search patient, doctor, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Requests</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="approvals-loading-box">
            <Loader2 size={32} className="spinner-icon" />
            <p>Loading clearance requests from CareBridge AI backend...</p>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="approvals-table-container">
            <table className="approvals-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Patient Details</th>
                  <th>Assigned Specialist</th>
                  <th>Type</th>
                  <th>Date / Slot</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <span className="req-id">#{String(request.id).slice(-8).toUpperCase()}</span>
                    </td>

                    <td>
                      <div className="patient-cell">
                        <strong>{request.patient}</strong>
                        <span>{request.patientId}</span>
                      </div>
                    </td>

                    <td>
                      <div className="doctor-cell">
                        <strong>{request.doctor}</strong>
                        <span>{request.hospital}</span>
                      </div>
                    </td>

                    <td>
                      <span className="type-badge">{request.type}</span>
                    </td>

                    <td>
                      <div className="date-cell">
                        <strong>{request.date}</strong>
                        <span>{request.time}</span>
                      </div>
                    </td>

                    <td>
                      <span className={`status-badge ${request.status.toLowerCase()}`}>
                        {request.status}
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons-group">
                        <button
                          className="details-btn"
                          onClick={() => setSelectedRequest(request)}
                          title="View Details"
                        >
                          View
                        </button>

                        {request.status === "Pending" && (
                          <>
                            <button
                              className="approve-btn"
                              onClick={() => updateStatus(request.id, "Approved", request.source)}
                              title="Approve Request"
                            >
                              <Check size={14} />
                            </button>

                            <button
                              className="reject-btn"
                              onClick={() => updateStatus(request.id, "Rejected", request.source)}
                              title="Reject Request"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRequests.length === 0 && (
              <div className="empty-approvals">
                <FileText size={38} className="text-muted" />
                <h3>No clearance requests found</h3>
                <p>
                  {requests.length === 0
                    ? "No pending approvals currently in the system."
                    : "No requests match your current search and filter settings."}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* DETAILS MODAL */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content approval-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Clearance Request Details</h2>
                <p>ID: #{String(selectedRequest.id).slice(-8).toUpperCase()}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedRequest(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-grid-2">
                <div className="modal-info-item">
                  <span>Patient</span>
                  <strong>{selectedRequest.patient}</strong>
                </div>

                <div className="modal-info-item">
                  <span>Doctor</span>
                  <strong>{selectedRequest.doctor}</strong>
                </div>

                <div className="modal-info-item">
                  <span>Hospital Facility</span>
                  <strong>{selectedRequest.hospital}</strong>
                </div>

                <div className="modal-info-item">
                  <span>Request Type</span>
                  <strong>{selectedRequest.type}</strong>
                </div>

                <div className="modal-info-item">
                  <span>Date & Slot</span>
                  <strong>{selectedRequest.date} at {selectedRequest.time}</strong>
                </div>

                <div className="modal-info-item">
                  <span>Current Clearance Status</span>
                  <strong className={`status-text ${selectedRequest.status.toLowerCase()}`}>
                    {selectedRequest.status}
                  </strong>
                </div>
              </div>

              <div className="modal-reason-box">
                <h4>Clinical Purpose / Symptoms</h4>
                <p>{selectedRequest.reason}</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedRequest(null)}>
                Close
              </button>

              {selectedRequest.status === "Pending" && (
                <>
                  <button
                    className="btn-danger"
                    onClick={() => updateStatus(selectedRequest.id, "Rejected", selectedRequest.source)}
                  >
                    Reject Request
                  </button>

                  <button
                    className="btn-primary"
                    onClick={() => updateStatus(selectedRequest.id, "Approved", selectedRequest.source)}
                  >
                    Approve Clearance
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Approvals;