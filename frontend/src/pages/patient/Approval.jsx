import {
  CheckCircle2,
  Clock3,
  XCircle,
  UserRound,
  CalendarDays,
  Stethoscope,
  FileText,
  ArrowRight,
} from "lucide-react";

import "./Approval.css";

function Approval() {
  const pendingRequests = [
    {
      id: 1,
      doctor: "Dr. Ananya Sharma",
      specialty: "General Physician",
      hospital: "CareBridge City Hospital",
      date: "02 Oct 2026",
      time: "11:30 AM",
      type: "Consultation",
      status: "Pending",
    },
    {
      id: 2,
      doctor: "Dr. Rahul Mehta",
      specialty: "Cardiology",
      hospital: "Apollo Care Center",
      date: "04 Oct 2026",
      time: "02:00 PM",
      type: "Follow-up",
      status: "Pending",
    },
  ];

  const approvalHistory = [
    {
      id: 1,
      doctor: "Dr. Priya Nair",
      type: "General Consultation",
      date: "28 Sep 2026",
      status: "Approved",
    },
    {
      id: 2,
      doctor: "Dr. Arjun Rao",
      type: "Health Checkup",
      date: "21 Sep 2026",
      status: "Rejected",
    },
  ];

  return (
    <div className="approval-page">

      {/* HEADER */}
      <div className="approval-header">
        <div>
          <span className="approval-kicker">
            PATIENT SERVICES
          </span>

          <h1>Approvals</h1>

          <p>
            Track your appointment and healthcare approval requests.
          </p>
        </div>

        <div className="approval-header-icon">
          <CheckCircle2 size={28} />
        </div>
      </div>


      {/* SUMMARY CARDS */}
      <div className="approval-summary">

        <div className="approval-summary-card pending">
          <div className="summary-icon">
            <Clock3 size={22} />
          </div>

          <div>
            <span>Pending</span>
            <strong>2</strong>
          </div>
        </div>

        <div className="approval-summary-card approved">
          <div className="summary-icon">
            <CheckCircle2 size={22} />
          </div>

          <div>
            <span>Approved</span>
            <strong>8</strong>
          </div>
        </div>

        <div className="approval-summary-card rejected">
          <div className="summary-icon">
            <XCircle size={22} />
          </div>

          <div>
            <span>Rejected</span>
            <strong>1</strong>
          </div>
        </div>

      </div>


      {/* PENDING APPROVALS */}
      <section className="approval-section">

        <div className="section-heading">
          <div>
            <h2>Pending approvals</h2>
            <p>Requests waiting for confirmation.</p>
          </div>

          <span className="section-count">
            {pendingRequests.length} requests
          </span>
        </div>


        <div className="approval-list">

          {pendingRequests.map((request) => (
            <article
              className="approval-request"
              key={request.id}
            >

              <div className="doctor-avatar">
                <Stethoscope size={22} />
              </div>


              <div className="request-main">

                <div className="request-title-row">
                  <div>
                    <h3>{request.doctor}</h3>

                    <p>
                      {request.specialty}
                    </p>
                  </div>

                  <span className="status-badge pending-badge">
                    <Clock3 size={14} />
                    Pending
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

                  <button className="approval-primary-btn">
                    View details
                    <ArrowRight size={16} />
                  </button>

                  <button className="approval-secondary-btn">
                    Cancel request
                  </button>

                </div>

              </div>

            </article>
          ))}

        </div>

      </section>


      {/* HISTORY */}
      <section className="approval-section history-section">

        <div className="section-heading">
          <div>
            <h2>Approval history</h2>
            <p>Previously processed healthcare requests.</p>
          </div>
        </div>


        <div className="history-card">

          {approvalHistory.map((item) => (
            <div
              className="history-row"
              key={item.id}
            >

              <div className="history-doctor">

                <div className="history-avatar">
                  <Stethoscope size={18} />
                </div>

                <div>
                  <strong>{item.doctor}</strong>

                  <span>
                    {item.type}
                  </span>
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
                    Rejected
                  </span>
                )}
              </div>

            </div>
          ))}

        </div>

      </section>

    </div>
  );
}

export default Approval;