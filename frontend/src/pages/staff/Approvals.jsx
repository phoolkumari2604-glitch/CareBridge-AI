import { useMemo, useState } from "react";
import "./Approvals.css";

const initialRequests = [
  {
    id: "APR-1001",
    patient: "Ananya Sharma",
    patientId: "PT-20481",
    doctor: "Dr. Naresh Trehan",
    hospital: "Medanta, Gurugram",
    type: "Appointment",
    date: "02 Oct 2026",
    time: "10:30 AM",
    status: "Pending",
    priority: "High",
  },
  {
    id: "APR-1002",
    patient: "Ravi Kumar",
    patientId: "PT-20482",
    doctor: "Dr. Ashok Seth",
    hospital: "Fortis Escorts Heart Institute",
    type: "OPD Pass",
    date: "02 Oct 2026",
    time: "11:15 AM",
    status: "Pending",
    priority: "Normal",
  },
  {
    id: "APR-1003",
    patient: "Sneha Reddy",
    patientId: "PT-20483",
    doctor: "Dr. Arvinder Singh Soin",
    hospital: "Medanta, Gurugram",
    type: "Appointment",
    date: "02 Oct 2026",
    time: "12:00 PM",
    status: "Approved",
    priority: "Normal",
  },
  {
    id: "APR-1004",
    patient: "Vikram Patel",
    patientId: "PT-20484",
    doctor: "Dr. Sandeep Vaishya",
    hospital: "Fortis Memorial Research Institute",
    type: "Health Record",
    date: "02 Oct 2026",
    time: "01:30 PM",
    status: "Pending",
    priority: "High",
  },
  {
    id: "APR-1005",
    patient: "Meera Nair",
    patientId: "PT-20485",
    doctor: "Dr. P. Raghu Ram",
    hospital: "KIMS Hospitals, Hyderabad",
    type: "Appointment",
    date: "01 Oct 2026",
    time: "04:00 PM",
    status: "Rejected",
    priority: "Normal",
  },
];

function Approvals() {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesFilter =
        filter === "All" || request.status === filter;

      const searchText = search.toLowerCase();

      const matchesSearch =
        request.patient.toLowerCase().includes(searchText) ||
        request.patientId.toLowerCase().includes(searchText) ||
        request.doctor.toLowerCase().includes(searchText) ||
        request.id.toLowerCase().includes(searchText) ||
        request.type.toLowerCase().includes(searchText);

      return matchesFilter && matchesSearch;
    });
  }, [requests, filter, search]);

  const pendingCount = requests.filter(
    (request) => request.status === "Pending"
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === "Approved"
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === "Rejected"
  ).length;

  const updateStatus = (id, status) => {
    setRequests((current) =>
      current.map((request) =>
        request.id === id
          ? { ...request, status }
          : request
      )
    );

    setSelectedRequest(null);
  };

  return (
    <main className="staff-approvals-page">

      {/* HEADER */}
      <section className="approvals-header">
        <div>
          <div className="page-kicker">
            STAFF / ADMIN • OPERATIONS
          </div>

          <h1>Approvals</h1>

          <p>
            Review and manage patient requests, appointments,
            OPD passes and health-related approvals.
          </p>
        </div>

        <div className="header-status">
          <span className="status-dot"></span>
          System Operational
        </div>
      </section>

      {/* SUMMARY CARDS */}
      <section className="approval-stats">

        <div className="approval-stat-card">
          <div className="stat-icon pending-icon">⏳</div>

          <div>
            <span>Pending</span>
            <strong>{pendingCount}</strong>
            <small>Needs review</small>
          </div>
        </div>

        <div className="approval-stat-card">
          <div className="stat-icon approved-icon">✓</div>

          <div>
            <span>Approved</span>
            <strong>{approvedCount}</strong>
            <small>Processed requests</small>
          </div>
        </div>

        <div className="approval-stat-card">
          <div className="stat-icon rejected-icon">×</div>

          <div>
            <span>Rejected</span>
            <strong>{rejectedCount}</strong>
            <small>Declined requests</small>
          </div>
        </div>

        <div className="approval-stat-card">
          <div className="stat-icon total-icon">▣</div>

          <div>
            <span>Total Requests</span>
            <strong>{requests.length}</strong>
            <small>All approval records</small>
          </div>
        </div>

      </section>

      {/* TOOLBAR */}
      <section className="approval-toolbar">

        <div className="approval-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search patient, doctor, request ID..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className="filter-buttons">

          {["All", "Pending", "Approved", "Rejected"].map(
            (status) => (
              <button
                key={status}
                className={
                  filter === status
                    ? "filter-btn active"
                    : "filter-btn"
                }
                onClick={() => setFilter(status)}
              >
                {status}
              </button>
            )
          )}

        </div>

      </section>

      {/* REQUEST TABLE */}
      <section className="approval-panel">

        <div className="panel-heading">
          <div>
            <h2>Approval Requests</h2>
            <p>
              {filteredRequests.length} request
              {filteredRequests.length !== 1 ? "s" : ""} found
            </p>
          </div>

          <button
            className="refresh-btn"
            onClick={() => setRequests(initialRequests)}
          >
            ↻ Refresh
          </button>
        </div>

        <div className="approval-table-wrapper">

          <table className="approval-table">

            <thead>
              <tr>
                <th>Request</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Type</th>
                <th>Date / Time</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="empty-cell"
                  >
                    <div className="empty-state">
                      <div>⌕</div>
                      <h3>No requests found</h3>
                      <p>
                        Try changing your search or filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (

                  <tr key={request.id}>

                    <td>
                      <div className="request-id">
                        {request.id}
                      </div>

                      <div className="hospital-name">
                        {request.hospital}
                      </div>
                    </td>

                    <td>
                      <div className="patient-cell">
                        <div className="avatar">
                          {request.patient
                            .split(" ")
                            .map((name) => name[0])
                            .join("")
                            .slice(0, 2)}
                        </div>

                        <div>
                          <strong>
                            {request.patient}
                          </strong>

                          <span>
                            {request.patientId}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="doctor-name">
                        {request.doctor}
                      </div>
                    </td>

                    <td>
                      <span className="type-badge">
                        {request.type}
                      </span>
                    </td>

                    <td>
                      <div className="date-cell">
                        <strong>{request.date}</strong>
                        <span>{request.time}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={
                          request.priority === "High"
                            ? "priority high"
                            : "priority normal"
                        }
                      >
                        {request.priority}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`approval-status ${request.status.toLowerCase()}`}
                      >
                        <i></i>
                        {request.status}
                      </span>
                    </td>

                    <td>

                      {request.status === "Pending" ? (
                        <div className="action-buttons">

                          <button
                            className="approve-btn"
                            onClick={() =>
                              updateStatus(
                                request.id,
                                "Approved"
                              )
                            }
                            title="Approve request"
                          >
                            ✓
                          </button>

                          <button
                            className="reject-btn"
                            onClick={() =>
                              updateStatus(
                                request.id,
                                "Rejected"
                              )
                            }
                            title="Reject request"
                          >
                            ×
                          </button>

                          <button
                            className="view-btn"
                            onClick={() =>
                              setSelectedRequest(request)
                            }
                            title="View details"
                          >
                            View
                          </button>

                        </div>
                      ) : (
                        <button
                          className="view-btn"
                          onClick={() =>
                            setSelectedRequest(request)
                          }
                        >
                          View
                        </button>
                      )}

                    </td>

                  </tr>

                ))
              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* MOBILE CARDS */}
      <section className="approval-mobile-list">

        {filteredRequests.map((request) => (

          <article
            className="approval-mobile-card"
            key={request.id}
          >

            <div className="mobile-card-top">

              <div>
                <strong>{request.id}</strong>
                <span>{request.type}</span>
              </div>

              <span
                className={`approval-status ${request.status.toLowerCase()}`}
              >
                <i></i>
                {request.status}
              </span>

            </div>

            <div className="mobile-patient">

              <div className="avatar">
                {request.patient
                  .split(" ")
                  .map((name) => name[0])
                  .join("")
                  .slice(0, 2)}
              </div>

              <div>
                <strong>{request.patient}</strong>
                <span>{request.patientId}</span>
              </div>

            </div>

            <div className="mobile-details">

              <div>
                <span>Doctor</span>
                <strong>{request.doctor}</strong>
              </div>

              <div>
                <span>Date</span>
                <strong>{request.date}</strong>
              </div>

              <div>
                <span>Priority</span>
                <strong>{request.priority}</strong>
              </div>

            </div>

            <div className="mobile-actions">

              {request.status === "Pending" && (
                <>
                  <button
                    className="mobile-approve"
                    onClick={() =>
                      updateStatus(
                        request.id,
                        "Approved"
                      )
                    }
                  >
                    ✓ Approve
                  </button>

                  <button
                    className="mobile-reject"
                    onClick={() =>
                      updateStatus(
                        request.id,
                        "Rejected"
                      )
                    }
                  >
                    × Reject
                  </button>
                </>
              )}

              <button
                className="mobile-view"
                onClick={() =>
                  setSelectedRequest(request)
                }
              >
                View
              </button>

            </div>

          </article>

        ))}

      </section>

      {/* MODAL */}
      {selectedRequest && (

        <div
          className="approval-modal-overlay"
          onClick={() => setSelectedRequest(null)}
        >

          <div
            className="approval-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <span>REQUEST DETAILS</span>
                <h2>{selectedRequest.id}</h2>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setSelectedRequest(null)
                }
              >
                ×
              </button>

            </div>

            <div className="modal-status-row">

              <span
                className={`approval-status ${selectedRequest.status.toLowerCase()}`}
              >
                <i></i>
                {selectedRequest.status}
              </span>

              <span
                className={
                  selectedRequest.priority === "High"
                    ? "priority high"
                    : "priority normal"
                }
              >
                {selectedRequest.priority} Priority
              </span>

            </div>

            <div className="modal-details">

              <div>
                <span>Patient</span>
                <strong>
                  {selectedRequest.patient}
                </strong>
              </div>

              <div>
                <span>Patient ID</span>
                <strong>
                  {selectedRequest.patientId}
                </strong>
              </div>

              <div>
                <span>Doctor</span>
                <strong>
                  {selectedRequest.doctor}
                </strong>
              </div>

              <div>
                <span>Hospital</span>
                <strong>
                  {selectedRequest.hospital}
                </strong>
              </div>

              <div>
                <span>Request Type</span>
                <strong>
                  {selectedRequest.type}
                </strong>
              </div>

              <div>
                <span>Schedule</span>
                <strong>
                  {selectedRequest.date} •{" "}
                  {selectedRequest.time}
                </strong>
              </div>

            </div>

            {selectedRequest.status === "Pending" && (

              <div className="modal-actions">

                <button
                  className="modal-reject"
                  onClick={() =>
                    updateStatus(
                      selectedRequest.id,
                      "Rejected"
                    )
                  }
                >
                  × Reject
                </button>

                <button
                  className="modal-approve"
                  onClick={() =>
                    updateStatus(
                      selectedRequest.id,
                      "Approved"
                    )
                  }
                >
                  ✓ Approve Request
                </button>

              </div>

            )}

          </div>

        </div>

      )}

    </main>
  );
}

export default Approvals;