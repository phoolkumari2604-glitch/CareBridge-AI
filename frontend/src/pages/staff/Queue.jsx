import { useMemo, useState } from "react";
import "./Queue.css";

const initialQueue = [
  {
    id: "Q-1024",
    token: "A-104",
    patient: "Ananya Sharma",
    patientId: "P-20451",
    doctor: "Dr. Naresh Trehan",
    department: "Cardiovascular Surgery",
    appointment: "10:30 AM",
    status: "Waiting",
    priority: "Normal",
    wait: "12 min",
  },
  {
    id: "Q-1025",
    token: "A-105",
    patient: "Ravi Kumar",
    patientId: "P-20452",
    doctor: "Dr. Ashok Seth",
    department: "Interventional Cardiology",
    appointment: "10:45 AM",
    status: "In Consultation",
    priority: "High",
    wait: "24 min",
  },
  {
    id: "Q-1026",
    token: "A-106",
    patient: "Meera Singh",
    patientId: "P-20453",
    doctor: "Dr. Arvinder Singh Soin",
    department: "Liver Transplant",
    appointment: "11:00 AM",
    status: "Waiting",
    priority: "Normal",
    wait: "8 min",
  },
  {
    id: "Q-1027",
    token: "A-107",
    patient: "Vikram Patel",
    patientId: "P-20454",
    doctor: "Dr. Sandeep Vaishya",
    department: "Neurosurgery",
    appointment: "11:15 AM",
    status: "Completed",
    priority: "Normal",
    wait: "0 min",
  },
  {
    id: "Q-1028",
    token: "A-108",
    patient: "Sana Khan",
    patientId: "P-20455",
    doctor: "Dr. Naresh Trehan",
    department: "Cardiovascular Surgery",
    appointment: "11:30 AM",
    status: "Waiting",
    priority: "Emergency",
    wait: "3 min",
  },
];

function Queue() {
  const [queue, setQueue] = useState(initialQueue);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const matchesFilter =
        filter === "All" || item.status === filter;

      const query = search.toLowerCase();

      const matchesSearch =
        item.patient.toLowerCase().includes(query) ||
        item.patientId.toLowerCase().includes(query) ||
        item.token.toLowerCase().includes(query) ||
        item.doctor.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [queue, filter, search]);

  const waitingCount = queue.filter(
    (item) => item.status === "Waiting"
  ).length;

  const consultationCount = queue.filter(
    (item) => item.status === "In Consultation"
  ).length;

  const completedCount = queue.filter(
    (item) => item.status === "Completed"
  ).length;

  const emergencyCount = queue.filter(
    (item) => item.priority === "Emergency"
  ).length;

  const callNextPatient = () => {
    const nextPatient = queue.find(
      (item) => item.status === "Waiting"
    );

    if (!nextPatient) return;

    setQueue((currentQueue) =>
      currentQueue.map((item) =>
        item.id === nextPatient.id
          ? {
              ...item,
              status: "In Consultation",
            }
          : item
      )
    );
  };

  const completePatient = (id) => {
    setQueue((currentQueue) =>
      currentQueue.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Completed",
              wait: "0 min",
            }
          : item
      )
    );
  };

  const resetQueue = () => {
    setQueue(initialQueue);
  };

  return (
    <div className="staff-queue-page">

      {/* Header */}
      <section className="queue-header">
        <div>
          <span className="queue-eyebrow">
            STAFF / ADMIN
          </span>

          <h1>Queue Management</h1>

          <p>
            Monitor patient flow, manage waiting queues,
            and coordinate consultations in real time.
          </p>
        </div>

        <div className="queue-header-actions">
          <button
            className="queue-secondary-btn"
            onClick={resetQueue}
          >
            ↻ Reset
          </button>

          <button
            className="queue-primary-btn"
            onClick={callNextPatient}
          >
            + Call Next Patient
          </button>
        </div>
      </section>

      {/* Statistics */}
      <section className="queue-stats">

        <div className="queue-stat-card">
          <div className="stat-icon blue">⌛</div>
          <div>
            <span>Waiting</span>
            <strong>{waitingCount}</strong>
            <small>Patients waiting</small>
          </div>
        </div>

        <div className="queue-stat-card">
          <div className="stat-icon purple">◉</div>
          <div>
            <span>In Consultation</span>
            <strong>{consultationCount}</strong>
            <small>Currently consulting</small>
          </div>
        </div>

        <div className="queue-stat-card">
          <div className="stat-icon green">✓</div>
          <div>
            <span>Completed</span>
            <strong>{completedCount}</strong>
            <small>Today's consultations</small>
          </div>
        </div>

        <div className="queue-stat-card">
          <div className="stat-icon red">!</div>
          <div>
            <span>Priority</span>
            <strong>{emergencyCount}</strong>
            <small>Priority patients</small>
          </div>
        </div>

      </section>

      {/* Current queue */}
      <section className="current-queue-card">

        <div className="queue-card-top">
          <div>
            <h2>Current Queue</h2>
            <p>
              Live patient queue and consultation status
            </p>
          </div>

          <div className="live-indicator">
            <span></span>
            Live
          </div>
        </div>

        {/* Controls */}
        <div className="queue-controls">

          <div className="queue-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search patient, token or doctor..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <div className="queue-filters">
            {[
              "All",
              "Waiting",
              "In Consultation",
              "Completed",
            ].map((item) => (
              <button
                key={item}
                className={
                  filter === item
                    ? "active"
                    : ""
                }
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>

        </div>

        {/* Desktop table */}
        <div className="queue-table-wrapper">
          <table className="queue-table">

            <thead>
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Appointment</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Wait</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredQueue.map((item) => (
                <tr key={item.id}>

                  <td>
                    <span className="token-badge">
                      {item.token}
                    </span>
                  </td>

                  <td>
                    <div className="patient-cell">
                      <div className="patient-avatar">
                        {item.patient
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {item.patient}
                        </strong>

                        <small>
                          {item.patientId}
                        </small>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="doctor-name">
                      {item.doctor}
                    </span>
                  </td>

                  <td>{item.department}</td>

                  <td>{item.appointment}</td>

                  <td>
                    <span
                      className={`priority-badge ${item.priority
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {item.priority}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`status-badge ${item.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      <span></span>
                      {item.status}
                    </span>
                  </td>

                  <td>
                    <strong className="wait-time">
                      {item.wait}
                    </strong>
                  </td>

                  <td>
                    {item.status ===
                      "In Consultation" && (
                      <button
                        className="complete-btn"
                        onClick={() =>
                          completePatient(item.id)
                        }
                      >
                        Complete
                      </button>
                    )}

                    {item.status === "Waiting" && (
                      <button
                        className="call-btn"
                        onClick={() =>
                          setQueue((currentQueue) =>
                            currentQueue.map((patient) =>
                              patient.id === item.id
                                ? {
                                    ...patient,
                                    status:
                                      "In Consultation",
                                  }
                                : patient
                            )
                          )
                        }
                      >
                        Call
                      </button>
                    )}

                    {item.status === "Completed" && (
                      <span className="done-text">
                        Done
                      </span>
                    )}
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

          {filteredQueue.length === 0 && (
            <div className="queue-empty">
              <div>⌕</div>
              <h3>No patients found</h3>
              <p>
                Try changing the search or filter.
              </p>
            </div>
          )}
        </div>

      </section>

      {/* Queue information */}
      <section className="queue-bottom-grid">

        <div className="queue-info-card">
          <div className="info-icon">⚡</div>

          <div>
            <h3>Queue Status</h3>
            <p>
              Patient flow is currently being monitored.
              Staff can call waiting patients and complete
              active consultations.
            </p>
          </div>
        </div>

        <div className="queue-info-card">
          <div className="info-icon emergency">!</div>

          <div>
            <h3>Priority Handling</h3>
            <p>
              Emergency and high-priority patients should
              be handled according to hospital protocols.
            </p>
          </div>
        </div>

      </section>

    </div>
  );
}

export default Queue;

