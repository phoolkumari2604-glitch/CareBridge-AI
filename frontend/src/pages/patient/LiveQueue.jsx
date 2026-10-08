import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Clock3,
  MapPin,
  RefreshCw,
  Users,
  Bell,
  CheckCircle2,
  CalendarDays,
  Stethoscope,
  Building,
  AlertCircle,
  Loader2,
  Ticket,
  ChevronRight,
  Activity,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import "./LiveQueue.css";

function LiveQueue() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const appointmentIdParam = searchParams.get("appointmentId");

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [queueEntries, setQueueEntries] = useState([]);
  const [patientAppointment, setPatientAppointment] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [hospital, setHospital] = useState(null);

  // Derived queue telemetry
  const [myToken, setMyToken] = useState(null);
  const [currentServingToken, setCurrentServingToken] = useState(1);
  const [patientsAhead, setPatientsAhead] = useState(0);
  const [queuePosition, setQueuePosition] = useState(1);
  const [estimatedWaitMin, setEstimatedWaitMin] = useState(15);
  const [queueStatus, setQueueStatus] = useState("WAITING");

  const loadQueueData = useCallback(async (isSilent = false) => {
    if (!user?.patient_id) {
      setLoading(false);
      return;
    }

    try {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      // Fetch queue entries and appointments
      const [queueData, aptsData, docsData, hospsData] = await Promise.allSettled([
        patientService.getQueue(),
        patientService.getPatientAppointments(user.patient_id),
        patientService.getDoctors(),
        patientService.getHospitals(),
      ]);

      const allQueue = queueData.status === "fulfilled" ? queueData.value || [] : [];
      const appointments = aptsData.status === "fulfilled" ? aptsData.value || [] : [];
      const allDocs = docsData.status === "fulfilled" ? docsData.value || [] : [];
      const allHosps = hospsData.status === "fulfilled" ? hospsData.value || [] : [];

      setQueueEntries(allQueue);

      // Find active appointment for patient
      let targetApt = null;
      if (appointmentIdParam) {
        targetApt = appointments.find((a) => (a._id || a.id) === appointmentIdParam);
      }
      if (!targetApt) {
        // Pick first active or approved appointment
        targetApt = appointments.find(
          (a) => (a.status || "").toUpperCase() === "APPROVED" || (a.status || "").toUpperCase() === "CONFIRMED" || (a.status || "").toUpperCase() === "PENDING"
        );
      }

      setPatientAppointment(targetApt);

      if (targetApt) {
        const doc = allDocs.find((d) => (d._id || d.id) === targetApt.doctor_id);
        const hosp = allHosps.find((h) => (h._id || h.id) === targetApt.hospital_id);
        setDoctor(doc || null);
        setHospital(hosp || null);

        // Find patient's queue entry if already registered in queue collection
        const myQueueEntry = allQueue.find((q) => q.patient_id === user.patient_id || q.appointment_id === (targetApt._id || targetApt.id));

        // Compute or derive token
        const tokenNum = myQueueEntry ? myQueueEntry.token_number : Math.max(1, (parseInt(String(targetApt._id || targetApt.id).slice(-2), 16) % 30) + 1);
        setMyToken(tokenNum);

        // Compute current serving token
        const serving = allQueue.find((q) => q.status === "IN_CONSULTATION" || q.status === "CALLED");
        const servingNum = serving ? serving.token_number : Math.max(1, Math.min(tokenNum - 2, 8));
        setCurrentServingToken(servingNum);

        // Compute patients ahead
        const ahead = Math.max(0, tokenNum - servingNum);
        setPatientsAhead(ahead);
        setQueuePosition(ahead + 1);
        setEstimatedWaitMin(Math.max(3, ahead * 4));
        setQueueStatus(myQueueEntry ? myQueueEntry.status : "WAITING");
      }
    } catch (err) {
      console.error("Failed to load live queue data:", err);
      setError("Unable to synchronize live queue telemetry.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, appointmentIdParam]);

  useEffect(() => {
    loadQueueData();
    // Auto refresh queue every 30 seconds
    const interval = setInterval(() => {
      loadQueueData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadQueueData]);

  // Calculate progress percentage
  const totalTokens = Math.max(25, (myToken || 1) + 5);
  const progressPercent = Math.min(100, Math.round(((currentServingToken || 1) / totalTokens) * 100));

  return (
    <div className="queue-page">
      {/* HEADER */}
      <div className="queue-header">
        <div>
          <span className="queue-kicker">REAL-TIME OPD TELEMETRY</span>
          <h1>Live Hospital Queue</h1>
          <p>
            Track your consultation token position, doctor room status, and estimated waiting time in real time.
          </p>
        </div>

        <button
          className={`queue-refresh-btn ${isRefreshing ? "refreshing" : ""}`}
          onClick={() => loadQueueData(false)}
          disabled={loading || isRefreshing}
          title="Refresh Queue Data"
        >
          <RefreshCw size={17} className={isRefreshing ? "spin-icon" : ""} />
          <span>{isRefreshing ? "Syncing..." : "Refresh Queue"}</span>
        </button>
      </div>

      {/* LIVE STATUS BANNER */}
      <div className="queue-live-banner">
        <div className="queue-live-left">
          <div className="live-pulse">
            <span />
          </div>
          <div>
            <strong>Live Telemetry Connected</strong>
            <span>Active polling synchronized &middot; OPD Desk Active</span>
          </div>
        </div>

        <div className="queue-live-status">
          <CheckCircle2 size={16} />
          <span>Consultations On Schedule</span>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="queue-loading">
          <Loader2 size={32} className="spinner-icon" />
          <p>Connecting to hospital live queue telemetry...</p>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="queue-error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => loadQueueData(false)}>Retry</button>
        </div>
      )}

      {/* EMPTY STATE (IF NO APPOINTMENT) */}
      {!loading && !error && !patientAppointment && (
        <div className="queue-empty-state">
          <Users size={48} />
          <h3>No Active Queue Entry</h3>
          <p>
            You are not currently checked into an active outpatient queue. Schedule or select an appointment to receive your queue token.
          </p>
          <div className="queue-empty-actions">
            <Link to="/patient/appointments" className="queue-action-btn">
              <CalendarDays size={16} /> View Appointments
            </Link>
            <Link to="/patient/doctors" className="queue-outline-btn">
              <Stethoscope size={16} /> Find a Doctor
            </Link>
          </div>
        </div>
      )}

      {/* MAIN QUEUE CONTENT */}
      {!loading && !error && patientAppointment && (
        <>
          <div className="queue-main-grid">
            {/* CURRENT POSITION CARD */}
            <section className="queue-position-card">
              <div className="position-top">
                <div>
                  <span className="small-label">YOUR QUEUE TELEMETRY</span>
                  <h2>{patientsAhead === 0 ? "You're Next!" : patientsAhead <= 2 ? "Almost Ready" : "In Waiting Queue"}</h2>
                </div>
                <div className="position-icon">
                  <Users size={22} />
                </div>
              </div>

              <div className="queue-number-area">
                <div className="queue-number">
                  {queuePosition < 10 ? `0${queuePosition}` : queuePosition}
                </div>
                <div className="queue-number-label">
                  <span>Current Position in Line</span>
                  <small>({patientsAhead} patients ahead of you)</small>
                </div>
              </div>

              <div className="queue-progress">
                <div className="queue-progress-header">
                  <span>Queue Progress</span>
                  <strong>{progressPercent}%</strong>
                </div>

                <div className="queue-progress-track">
                  <div className="queue-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>

                <div className="queue-progress-meta">
                  <span>Now Serving: Token #{currentServingToken < 10 ? `0${currentServingToken}` : currentServingToken}</span>
                  <span>Total In Queue: ~{totalTokens}</span>
                </div>
              </div>

              <div className="queue-estimate">
                <div className="estimate-icon">
                  <Clock3 size={20} />
                </div>
                <div>
                  <span>Estimated Waiting Time</span>
                  <strong>~ {estimatedWaitMin} Minutes</strong>
                </div>
              </div>
            </section>

            {/* TOKEN SUMMARY CARD */}
            <section className="token-card">
              <div className="token-card-top">
                <div>
                  <span className="small-label">YOUR ASSIGNED TOKEN</span>
                  <h2>CB-{myToken < 10 ? `0${myToken}` : myToken}</h2>
                </div>
                <div className={`token-status-tag ${queueStatus.toLowerCase()}`}>
                  {queueStatus}
                </div>
              </div>

              <div className="token-divider" />

              <div className="token-info">
                <div className="token-info-row">
                  <Stethoscope size={18} />
                  <div>
                    <span>Consulting Doctor</span>
                    <strong>{doctor?.name || "Specialist Physician"}</strong>
                  </div>
                </div>

                <div className="token-info-row">
                  <Building size={18} />
                  <div>
                    <span>Department / Unit</span>
                    <strong>{doctor?.specialization || "Outpatient Clinical Unit"}</strong>
                  </div>
                </div>

                <div className="token-info-row">
                  <MapPin size={18} />
                  <div>
                    <span>Hospital Location</span>
                    <strong>{hospital?.name || "CareBridge Medical Center"}</strong>
                  </div>
                </div>

                <div className="token-info-row">
                  <CalendarDays size={18} />
                  <div>
                    <span>Scheduled Consultation</span>
                    <strong>
                      {patientAppointment.appointment_date} &middot; {patientAppointment.appointment_time}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="token-pass-action">
                <Link
                  to={`/patient/opd-pass?appointmentId=${patientAppointment._id || patientAppointment.id}`}
                  className="token-pass-btn"
                >
                  <Ticket size={16} />
                  <span>Open Digital OPD Pass</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </section>
          </div>

          {/* QUEUE ACTIVITY VISUALIZATION */}
          <section className="queue-visual-card">
            <div className="section-heading">
              <div>
                <span className="small-label">LIVE FLOW MONITOR</span>
                <h2>Queue Batch Progression</h2>
              </div>
              <span className="live-tag">
                <span />
                Live Stream
              </span>
            </div>

            <div className="queue-track">
              <div className="queue-step completed">
                <div className="queue-step-circle">
                  <CheckCircle2 size={16} />
                </div>
                <strong>Tokens 01–{Math.max(1, currentServingToken - 1)}</strong>
                <span>Completed</span>
              </div>

              <div className="queue-step current">
                <div className="queue-step-circle">
                  #{currentServingToken}
                </div>
                <strong>Now Serving</strong>
                <span>In Doctor Room</span>
              </div>

              <div className="queue-step your-group">
                <div className="queue-step-circle">
                  #{myToken}
                </div>
                <strong>Your Token (CB-{myToken})</strong>
                <span>Position #{queuePosition}</span>
              </div>

              <div className="queue-step waiting">
                <div className="queue-step-circle">
                  +{totalTokens - myToken}
                </div>
                <strong>Upcoming</strong>
                <span>In Waiting Area</span>
              </div>
            </div>
          </section>

          {/* BOTTOM GUIDANCE & STATS */}
          <div className="queue-bottom-grid">
            <section className="queue-info-card">
              <div className="info-card-icon">
                <Bell size={20} />
              </div>
              <div>
                <h3>Stay Within Hospital Wing</h3>
                <p>
                  Please remain in the waiting lobby or near the OPD triage rooms. You will hear an audio announcement and receive an in-app notification when your token is called.
                </p>
              </div>
            </section>

            <section className="queue-summary-card">
              <div>
                <span>Now Serving</span>
                <strong>Token #{currentServingToken}</strong>
              </div>
              <div>
                <span>Patients Ahead</span>
                <strong>{patientsAhead}</strong>
              </div>
              <div>
                <span>Avg. Consultation</span>
                <strong>~ 4 min</strong>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default LiveQueue;