import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock3,
  XCircle,
  UserRound,
  CalendarDays,
  Stethoscope,
  FileText,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { patientService } from "../../services/patientService";
import "./Approval.css";

function Approval() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchApprovals = async () => {
    setLoading(true);
    setError("");
    try {
      const patientId = patientService.getCurrentPatientId();
      const [approvalsRes, appointmentsRes] = await Promise.all([
        patientService.getPatientApprovals(patientId),
        patientService.getAppointments(patientId)
      ]);

      const approvals = Array.isArray(approvalsRes) ? approvalsRes : [];
      const appointments = Array.isArray(appointmentsRes) ? appointmentsRes : [];

      // Combine approvals and appointment approval requests
      const pendingAppts = appointments
        .filter(a => String(a.status || "").toLowerCase() === "pending" || String(a.status || "").toLowerCase() === "requested")
        .map(a => ({
          id: a._id || a.id,
          doctor: a.doctor_name || (a.doctor_id ? `Doctor (ID: ${a.doctor_id})` : "Assigned Practitioner"),
          specialty: a.specialty || "Clinical Consultation",
          hospital: a.hospital_name || (a.hospital_id ? `Hospital (${a.hospital_id})` : "CareBridge Center"),
          date: a.appointment_date || a.date || "Scheduled Soon",
          time: a.appointment_time || a.time || "Pending Time",
          type: a.reason || "Consultation Request",
          status: "Pending",
          raw: a
        }));

      const pendingFromApprovals = approvals
        .filter(appr => String(appr.status || "").toLowerCase() === "pending")
        .map(appr => ({
          id: appr._id || appr.id,
          doctor: appr.doctor_name || "Assigned Practitioner",
          specialty: appr.request_type || "Clearance Request",
          hospital: appr.hospital_name || "CareBridge Medical Hub",
          date: appr.created_at ? new Date(appr.created_at).toLocaleDateString() : "Today",
          time: appr.created_at ? new Date(appr.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Pending",
          type: appr.reason || appr.description || "Healthcare Request",
          status: "Pending",
          raw: appr
        }));

      // Combine unique pending requests
      const combinedPending = [...pendingAppts, ...pendingFromApprovals];
      setPendingRequests(combinedPending);

      // Process History
      const historyAppts = appointments
        .filter(a => String(a.status || "").toLowerCase() !== "pending" && String(a.status || "").toLowerCase() !== "requested")
        .map(a => ({
          id: a._id || a.id,
          doctor: a.doctor_name || "Medical Officer",
          type: a.reason || "General Consultation",
          date: a.appointment_date || a.date || "Past Session",
          status: ["completed", "approved", "confirmed"].includes(String(a.status || "").toLowerCase()) ? "Approved" : "Cancelled",
          raw: a
        }));

      const historyFromApprovals = approvals
        .filter(appr => String(appr.status || "").toLowerCase() !== "pending")
        .map(appr => ({
          id: appr._id || appr.id,
          doctor: appr.doctor_name || "Medical Officer",
          type: appr.request_type || appr.reason || "Medical Clearance",
          date: appr.updated_at || appr.created_at ? new Date(appr.updated_at || appr.created_at).toLocaleDateString() : "Recent",
          status: String(appr.status || "").toLowerCase() === "approved" ? "Approved" : "Rejected",
          raw: appr
        }));

      setApprovalHistory([...historyAppts, ...historyFromApprovals]);
    } catch (err) {
      console.error("Failed to load patient approvals:", err);
      setError("Unable to load approval statuses. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleCancelRequest = async (id) => {
    if (!window.confirm("Are you sure you want to withdraw this consultation/approval request?")) return;
    setCancellingId(id);
    try {
      await patientService.cancelAppointment(id);
      await fetchApprovals();
    } catch (err) {
      console.error("Error cancelling request:", err);
      alert("Failed to cancel request. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  const approvedCount = approvalHistory.filter(h => h.status === "Approved").length;
  const rejectedCount = approvalHistory.filter(h => h.status === "Rejected" || h.status === "Cancelled").length;

  return (
    <div className="approval-page">
      {/* HEADER */}
      <div className="approval-header">
        <div>
          <span className="approval-kicker">PATIENT SERVICES</span>
          <h1>Clinical Approvals</h1>
          <p>Track your appointment verifications and healthcare clearance requests in real-time.</p>
        </div>

        <div className="approval-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="patient-btn-outline" 
            onClick={fetchApprovals} 
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
            Refresh
          </button>
          <div className="approval-header-icon">
            <CheckCircle2 size={28} />
          </div>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="approval-summary">
        <div className="approval-summary-card pending">
          <div className="summary-icon">
            <Clock3 size={22} />
          </div>
          <div>
            <span>Pending Review</span>
            <strong>{loading ? "..." : pendingRequests.length}</strong>
          </div>
        </div>

        <div className="approval-summary-card approved">
          <div className="summary-icon">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span>Approved / Confirmed</span>
            <strong>{loading ? "..." : approvedCount}</strong>
          </div>
        </div>

        <div className="approval-summary-card rejected">
          <div className="summary-icon">
            <XCircle size={22} />
          </div>
          <div>
            <span>Declined / Cancelled</span>
            <strong>{loading ? "..." : rejectedCount}</strong>
          </div>
        </div>
      </div>

      {/* PENDING APPROVALS */}
      <section className="approval-section">
        <div className="section-heading">
          <div>
            <h2>Pending Approvals</h2>
            <p>Requests currently queued with doctors or facility administration.</p>
          </div>
          <span className="section-count">
            {pendingRequests.length} {pendingRequests.length === 1 ? 'request' : 'requests'}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <RefreshCw size={24} className="spin-icon" style={{ marginBottom: '8px' }} />
            <p>Checking latest approval statuses...</p>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <CheckCircle2 size={32} color="#0d9488" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ color: '#0f172a', margin: '0 0 6px' }}>No Pending Requests</h4>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>All your consultations and medical requests have been processed.</p>
          </div>
        ) : (
          <div className="approval-list">
            {pendingRequests.map((request) => (
              <article className="approval-request" key={request.id}>
                <div className="doctor-avatar">
                  <Stethoscope size={22} />
                </div>

                <div className="request-main">
                  <div className="request-title-row">
                    <div>
                      <h3>{request.doctor}</h3>
                      <p>{request.specialty}</p>
                    </div>

                    <span className="status-badge pending-badge">
                      <Clock3 size={14} />
                      Pending Approval
                    </span>
                  </div>

                  <div className="request-details">
                    <span>
                      <UserRound size={15} />
                      {request.hospital}
                    </span>
                    <span>
                      <CalendarDays size={15} />
                      {request.date}
                    </span>
                    <span>
                      <Clock3 size={15} />
                      {request.time}
                    </span>
                    <span>
                      <FileText size={15} />
                      {request.type}
                    </span>
                  </div>

                  <div className="request-actions">
                    <button 
                      className="approval-primary-btn"
                      onClick={() => setSelectedRequest(request)}
                    >
                      View details
                      <ArrowRight size={16} />
                    </button>

                    <button 
                      className="approval-secondary-btn"
                      onClick={() => handleCancelRequest(request.id)}
                      disabled={cancellingId === request.id}
                    >
                      {cancellingId === request.id ? "Cancelling..." : "Cancel request"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* HISTORY */}
      <section className="approval-section history-section">
        <div className="section-heading">
          <div>
            <h2>Approval & Consultation History</h2>
            <p>Archived record of all previously processed healthcare requests.</p>
          </div>
        </div>

        {approvalHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#64748b', margin: 0 }}>No past approval history found.</p>
          </div>
        ) : (
          <div className="history-card">
            {approvalHistory.map((item) => (
              <div className="history-row" key={item.id}>
                <div className="history-doctor">
                  <div className="history-avatar">
                    <Stethoscope size={18} />
                  </div>
                  <div>
                    <strong>{item.doctor}</strong>
                    <span>{item.type}</span>
                  </div>
                </div>

                <div className="history-date">
                  {item.date}
                </div>

                <div>
                  {item.status === "Approved" ? (
                    <span className="status-badge approved-badge">
                      <CheckCircle2 size={14} />
                      Approved
                    </span>
                  ) : (
                    <span className="status-badge rejected-badge">
                      <XCircle size={14} />
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* VIEW DETAILS MODAL */}
      {selectedRequest && (
        <div className="modal-backdrop" onClick={() => setSelectedRequest(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px', color: '#0f172a' }}>Approval Request Details</h3>
            <div style={{ display: 'grid', gap: '12px', fontSize: '0.95rem', color: '#334155' }}>
              <div><strong>Practitioner / Doctor:</strong> {selectedRequest.doctor}</div>
              <div><strong>Specialty / Department:</strong> {selectedRequest.specialty}</div>
              <div><strong>Facility:</strong> {selectedRequest.hospital}</div>
              <div><strong>Scheduled Date:</strong> {selectedRequest.date}</div>
              <div><strong>Scheduled Time:</strong> {selectedRequest.time}</div>
              <div><strong>Reason / Clinical Context:</strong> {selectedRequest.type}</div>
              <div><strong>Status:</strong> <span style={{ color: '#d97706', fontWeight: 600 }}>Under Review</span></div>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedRequest(null)}
                style={{ padding: '8px 20px', borderRadius: '8px', background: '#0f172a', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Approval;