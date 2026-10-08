import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Clock3,
  Search,
  Users,
  RefreshCw,
  Loader2,
  AlertCircle,
  PhoneCall,
  Check,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import patientService from "../../services/patientService";
import doctorService from "../../services/doctorService";
import api from "../../services/api";
import "./Queue.css";

function Queue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const loadQueueData = useCallback(async () => {
    try {
      setError(null);
      const [queueRes, aptsRes, docsRes] = await Promise.allSettled([
        patientService.getQueue(),
        doctorService.getAppointments(),
        doctorService.getDoctors(),
      ]);

      const queueList = queueRes.status === "fulfilled" && Array.isArray(queueRes.value) ? queueRes.value : [];
      const aptsList = aptsRes.status === "fulfilled" && Array.isArray(aptsRes.value) ? aptsRes.value : [];
      const docsList = docsRes.status === "fulfilled" && Array.isArray(docsRes.value) ? docsRes.value : [];

      const docMap = {};
      docsList.forEach((d) => {
        docMap[d._id || d.id] = d;
      });

      // Consolidate queue entries
      let consolidated = [...queueList];

      // If queue is empty or has fewer entries than active appointments, populate from appointments
      if (aptsList.length > 0) {
        aptsList.forEach((apt, idx) => {
          const aptId = apt._id || apt.id;
          const exists = consolidated.some((q) => q.appointment_id === aptId || q._id === aptId);
          if (!exists) {
            const doc = docMap[apt.doctor_id] || {};
            consolidated.push({
              _id: aptId,
              id: `Q-${String(aptId).slice(-4).toUpperCase()}`,
              token: `T-${idx + 101}`,
              patient: apt.patient_name || `Patient #${String(apt.patient_id || "").slice(-6)}`,
              patientId: `P-${String(apt.patient_id || "").slice(-5)}`,
              doctor: doc.name || "Specialist Doctor",
              department: doc.specialty || doc.specialization || "Clinical OPD",
              appointment: apt.appointment_time || "10:00 AM",
              status: apt.status === "COMPLETED" ? "Completed" : apt.status === "APPROVED" ? "In Consultation" : "Waiting",
              priority: (apt.reason || "").toLowerCase().includes("emergency") ? "Emergency" : "Normal",
              wait: `${(idx + 1) * 8} min`,
            });
          }
        });
      }

      setQueue(consolidated);
    } catch (err) {
      console.error("Failed to load queue data:", err);
      setError("Failed to retrieve live OPD queue from backend.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadQueueData();
  }, [loadQueueData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadQueueData();
  };

  const updateQueueStatus = async (itemId, newStatus) => {
    try {
      // Try updating via queue endpoint
      try {
        await api.put(`/queue/${itemId}`, { status: newStatus.toUpperCase().replace(/\s+/g, "_") });
      } catch (e) {
        // Fallback update appointment status
        await doctorService.updateAppointment(itemId, { status: newStatus.toUpperCase().replace(/\s+/g, "_") });
      }

      setQueue((currentQueue) =>
        currentQueue.map((item) =>
          (item._id || item.id) === itemId
            ? { ...item, status: newStatus }
            : item
        )
      );

      setToastMessage(`Patient token updated to ${newStatus}.`);
      setTimeout(() => setToastMessage(""), 3000);
    } catch (err) {
      console.error("Queue status update failed:", err);
      alert("Failed to update queue token status.");
    }
  };

  const callNextPatient = () => {
    const nextPatient = queue.find((item) => item.status === "Waiting");
    if (!nextPatient) {
      alert("No waiting patients in current queue.");
      return;
    }
    updateQueueStatus(nextPatient._id || nextPatient.id, "In Consultation");
  };

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const matchesFilter = filter === "All" || item.status === filter;
      const query = search.toLowerCase().trim();

      const matchesSearch =
        !query ||
        (item.patient || "").toLowerCase().includes(query) ||
        (item.patientId || "").toLowerCase().includes(query) ||
        (item.token || "").toLowerCase().includes(query) ||
        (item.doctor || "").toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [queue, filter, search]);

  const waitingCount = queue.filter((item) => item.status === "Waiting").length;
  const consultationCount = queue.filter((item) => item.status === "In Consultation").length;
  const completedCount = queue.filter((item) => item.status === "Completed").length;
  const emergencyCount = queue.filter((item) => item.priority === "Emergency").length;

  return (
    <div className="staff-queue-page">
      {/* Header */}
      <section className="queue-header">
        <div>
          <span className="queue-eyebrow">CAREBRIDGE AI — LIVE OUTPATIENT SURVEILLANCE</span>
          <h1>Live OPD Queue Management</h1>
          <p>
            Monitor patient token sequencing, consultation room occupancy, waiting times, and urgent patient triage.
          </p>
        </div>

        <div className="header-btn-row">
          <button
            className={`refresh-btn-secondary ${isRefreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            title="Refresh Live Queue"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
          </button>

          <button className="call-patient-btn" onClick={callNextPatient}>
            <PhoneCall size={16} />
            <span>Call Next Patient</span>
          </button>
        </div>
      </section>

      {toastMessage && (
        <div className="staff-queue-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="staff-queue-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Statistics */}
      <section className="queue-stats">
        <div className="queue-stat-card">
          <span>Waiting Patients</span>
          <strong>{waitingCount}</strong>
          <small>In lobby</small>
        </div>

        <div className="queue-stat-card">
          <span>In Consultation</span>
          <strong>{consultationCount}</strong>
          <small>Active in rooms</small>
        </div>

        <div className="queue-stat-card">
          <span>Completed Today</span>
          <strong>{completedCount}</strong>
          <small>Concluded visits</small>
        </div>

        <div className="queue-stat-card emergency">
          <span>Emergency Triage</span>
          <strong>{emergencyCount}</strong>
          <small>Priority handling</small>
        </div>
      </section>

      {/* Main Panel */}
      <section className="queue-panel">
        <div className="panel-header">
          <div>
            <h2>Active Queue Tokens</h2>
            <p>{filteredQueue.length} tokens listed</p>
          </div>

          <div className="panel-actions">
            <div className="queue-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search token, patient, doctor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="queue-filter"
            >
              <option value="All">All Statuses</option>
              <option value="Waiting">Waiting</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="queue-loading-box">
            <Loader2 size={32} className="spinner-icon" />
            <p>Loading real-time token telemetry...</p>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="queue-table-wrapper">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient</th>
                  <th>Doctor / Dept</th>
                  <th>Appointment</th>
                  <th>Est. Wait</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredQueue.map((item) => {
                  const itemId = item._id || item.id;
                  return (
                    <tr key={itemId}>
                      <td>
                        <strong className="token-badge">{item.token}</strong>
                      </td>

                      <td>
                        <div className="patient-cell">
                          <strong>{item.patient}</strong>
                          <span>{item.patientId}</span>
                        </div>
                      </td>

                      <td>
                        <div className="doctor-cell">
                          <strong>{item.doctor}</strong>
                          <span>{item.department}</span>
                        </div>
                      </td>

                      <td>{item.appointment}</td>

                      <td>{item.wait}</td>

                      <td>
                        <span
                          className={`priority-badge ${
                            item.priority === "Emergency"
                              ? "emergency"
                              : item.priority === "High"
                              ? "high"
                              : "normal"
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-pill ${item.status
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons-group">
                          {item.status === "Waiting" && (
                            <button
                              className="serve-btn"
                              onClick={() => updateQueueStatus(itemId, "In Consultation")}
                              title="Start Consultation"
                            >
                              Call In
                            </button>
                          )}

                          {item.status === "In Consultation" && (
                            <button
                              className="complete-btn"
                              onClick={() => updateQueueStatus(itemId, "Completed")}
                              title="Conclude Consultation"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredQueue.length === 0 && (
              <div className="empty-queue">
                <Clock3 size={38} className="text-muted" />
                <h3>No queue entries found</h3>
                <p>No patients currently in the live OPD queue.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Queue;
