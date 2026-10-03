import {
  CheckCircle2,
  Clock3,
  FileText,
  Search,
  XCircle,
  UserRound,
  CalendarDays,
} from "lucide-react";

import "./Approvals.css";

function Approvals() {
  const approvalRequests = [
    {
      id: 1,
      patient: "Ananya Sharma",
      patientId: "PT-10482",
      type: "Appointment Request",
      department: "Cardiology",
      date: "02 Oct 2026",
      time: "10:30 AM",
      status: "Pending",
      reason: "Routine cardiac consultation",
    },
    {
      id: 2,
      patient: "Rahul Verma",
      patientId: "PT-10921",
      type: "Health Record Access",
      department: "General Medicine",
      date: "02 Oct 2026",
      time: "11:15 AM",
      status: "Pending",
      reason: "Requested access to previous medical records",
    },
    {
      id: 3,
      patient: "Priya Reddy",
      patientId: "PT-10234",
      type: "Appointment Request",
      department: "Dermatology",
      date: "03 Oct 2026",
      time: "09:45 AM",
      status: "Approved",
      reason: "Skin consultation",
    },
    {
      id: 4,
      patient: "Arjun Kumar",
      patientId: "PT-10761",
      type: "Follow-up Request",
      department: "Orthopedics",
      date: "03 Oct 2026",
      time: "02:00 PM",
      status: "Rejected",
      reason: "Follow-up consultation",
    },
  ];

  const pendingCount = approvalRequests.filter(
    (item) => item.status === "Pending"
  ).length;

  const approvedCount = approvalRequests.filter(
    (item) => item.status === "Approved"
  ).length;

  const rejectedCount = approvalRequests.filter(
    (item) => item.status === "Rejected"
  ).length;

  const handleApprove = (patient) => {
    console.log(`Approved request for ${patient}`);
  };

  const handleReject = (patient) => {
    console.log(`Rejected request for ${patient}`);
  };

  return (
    <main className="approvals-page">
      {/* HEADER */}
      <section className="approvals-header">
        <div>
          <span className="approvals-kicker">DOCTOR PORTAL</span>

          <h1>Approvals</h1>

          <p>
            Review and manage patient requests, appointments and
            healthcare access permissions.
          </p>
        </div>

        <div className="approval-header-icon">
          <FileText size={28} />
        </div>
      </section>

      {/* SUMMARY CARDS */}
      <section className="approval-stats">
        <div className="approval-stat-card pending">
          <div className="approval-stat-icon">
            <Clock3 size={21} />
          </div>

          <div>
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>

        <div className="approval-stat-card approved">
          <div className="approval-stat-icon">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>Approved</span>
            <strong>{approvedCount}</strong>
          </div>
        </div>

        <div className="approval-stat-card rejected">
          <div className="approval-stat-icon">
            <XCircle size={21} />
          </div>

          <div>
            <span>Rejected</span>
            <strong>{rejectedCount}</strong>
          </div>
        </div>

        <div className="approval-stat-card total">
          <div className="approval-stat-icon">
            <FileText size={21} />
          </div>

          <div>
            <span>Total Requests</span>
            <strong>{approvalRequests.length}</strong>
          </div>
        </div>
      </section>

      {/* TOOLBAR */}
      <section className="approval-toolbar">
        <div className="approval-search">
          <Search size={19} />

          <input
            type="search"
            placeholder="Search patient or request..."
            aria-label="Search approval requests"
          />
        </div>

        <div className="approval-filters">
          <button className="filter-btn active">
            All
          </button>

          <button className="filter-btn">
            Pending
          </button>

          <button className="filter-btn">
            Approved
          </button>

          <button className="filter-btn">
            Rejected
          </button>
        </div>
      </section>

      {/* REQUEST LIST */}
      <section className="approval-panel">
        <div className="approval-panel-header">
          <div>
            <h2>Request Management</h2>
            <p>Review recent patient requests</p>
          </div>

          <span className="request-count">
            {approvalRequests.length} requests
          </span>
        </div>

        <div className="approval-list">
          {approvalRequests.map((request) => (
            <article
              className="approval-request"
              key={request.id}
            >
              {/* PATIENT */}
              <div className="request-patient">
                <div className="patient-avatar">
                  <UserRound size={21} />
                </div>

                <div>
                  <h3>{request.patient}</h3>

                  <span>{request.patientId}</span>
                </div>
              </div>

              {/* REQUEST DETAILS */}
              <div className="request-details">
                <div className="request-type">
                  <strong>{request.type}</strong>

                  <span className="department">
                    {request.department}
                  </span>
                </div>

                <p>{request.reason}</p>

                <div className="request-meta">
                  <span>
                    <CalendarDays size={15} />
                    {request.date}
                  </span>

                  <span>
                    <Clock3 size={15} />
                    {request.time}
                  </span>
                </div>
              </div>

              {/* STATUS */}
              <div className="request-status">
                <span
                  className={`status-badge ${request.status.toLowerCase()}`}
                >
                  {request.status}
                </span>
              </div>

              {/* ACTIONS */}
              <div className="request-actions">
                {request.status === "Pending" ? (
                  <>
                    <button
                      className="approval-action approve"
                      onClick={() =>
                        handleApprove(request.patient)
                      }
                    >
                      <CheckCircle2 size={17} />
                      Approve
                    </button>

                    <button
                      className="approval-action reject"
                      onClick={() =>
                        handleReject(request.patient)
                      }
                    >
                      <XCircle size={17} />
                      Reject
                    </button>
                  </>
                ) : (
                  <button className="view-request">
                    View Details
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Approvals;