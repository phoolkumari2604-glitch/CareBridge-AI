import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Clock3,
  MapPin,
  RefreshCw,
  Users,
  Bell,
  BellOff,
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
  Volume2,
  VolumeX,
  Phone,
  Navigation,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import patientService from "../../../services/patientService";
import "./liveQueueManager.css";

function LiveQueueManager() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const appointmentIdParam = searchParams.get("appointmentId");

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [patientAppointment, setPatientAppointment] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [hospital, setHospital] = useState(null);

  // Derived queue telemetry
  const [myToken, setMyToken] = useState(null);
  const [currentServingToken, setCurrentServingToken] = useState(1);
  const [patientsAhead, setPatientsAhead] = useState(0);
  const [queuePosition, setQueuePosition] = useState(1);
  const [estimatedWaitMin, setEstimatedWaitMin] = useState(10);
  const [averageConsultMin, setAverageConsultMin] = useState(10);
  const [queueStatus, setQueueStatus] = useState("WAITING");
  const [estimatedClockTime, setEstimatedClockTime] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [proximityAlert, setProximityAlert] = useState(null);

  // Audio Context Chime ref
  const audioContextRef = useRef(null);
  const prevServingTokenRef = useRef(null);

  const playChime = useCallback(() => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);

      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (_) {}
  }, [isMuted]);

  const loadQueueData = useCallback(async (isSilent = false) => {
    if (!user?.patient_id) {
      setLoading(false);
      return;
    }

    try {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const [aptsData, docsData, hospsData] = await Promise.allSettled([
        patientService.getPatientAppointments(user.patient_id),
        patientService.getDoctors({ all: true }),
        patientService.getHospitals(),
      ]);

      const appointments = aptsData.status === "fulfilled" ? aptsData.value || [] : [];
      const allDocs = docsData.status === "fulfilled" ? docsData.value || [] : [];
      const allHosps = hospsData.status === "fulfilled" ? hospsData.value || [] : [];

      let targetApt = null;
      if (appointmentIdParam) {
        targetApt = appointments.find((a) => (a._id || a.id) === appointmentIdParam);
      }
      if (!targetApt) {
        targetApt = appointments.find(
          (a) =>
            (a.status || "").toUpperCase() === "APPROVED" ||
            (a.status || "").toUpperCase() === "CONFIRMED" ||
            (a.status || "").toUpperCase() === "PENDING"
        );
      }

      setPatientAppointment(targetApt);

      if (targetApt) {
        const aptId = targetApt._id || targetApt.id;
        const doc = allDocs.find((d) => (d._id || d.id) === targetApt.doctor_id);
        const hosp = allHosps.find((h) => (h._id || h.id) === targetApt.hospital_id);
        setDoctor(doc || null);
        setHospital(hosp || null);

        // Fetch live state from backend endpoint
        const liveState = await patientService.getLiveQueueState(aptId, targetApt.doctor_id);
        if (liveState) {
          const myTok = liveState.my_token || 1;
          const currServing = liveState.current_serving || 1;
          const ahead = liveState.patients_ahead !== undefined ? liveState.patients_ahead : Math.max(0, myTok - currServing);
          const avgConsult = liveState.avg_consultation_time || 10;
          const estWait = liveState.estimated_wait_minutes !== undefined ? liveState.estimated_wait_minutes : ahead * avgConsult;

          setMyToken(myTok);
          setCurrentServingToken(currServing);
          setPatientsAhead(ahead);
          setQueuePosition(ahead + 1);
          setAverageConsultMin(avgConsult);
          setEstimatedWaitMin(estWait);
          setQueueStatus(liveState.queue_status || "WAITING");
          setEstimatedClockTime(liveState.estimated_clock_time || "");
          setCheckedIn(Boolean(liveState.checked_in));
          setCanCheckIn(Boolean(liveState.can_check_in));

          // Check for proximity triggers
          if (ahead === 0) {
            setProximityAlert("It's your turn! Please proceed inside the doctor consultation room immediately.");
            if (prevServingTokenRef.current !== currServing) playChime();
          } else if (ahead <= 3) {
            setProximityAlert(`Attention: Only ${ahead} patient${ahead > 1 ? "s" : ""} ahead of you. Please wait near Room ${doc?.room_number || "4"}.`);
            if (prevServingTokenRef.current !== currServing) playChime();
          } else {
            setProximityAlert(null);
          }
          prevServingTokenRef.current = currServing;
        }
      }
    } catch (err) {
      console.error("Failed to load live queue data:", err);
      setError("Unable to synchronize live queue telemetry.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, appointmentIdParam, playChime]);

  useEffect(() => {
    loadQueueData();
    // 10s live queue polling
    const interval = setInterval(() => {
      loadQueueData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadQueueData]);

  const handleCheckIn = async () => {
    if (!patientAppointment) return;
    try {
      setCheckingIn(true);
      await patientService.checkInQueue(patientAppointment._id || patientAppointment.id);
      setCheckedIn(true);
      await loadQueueData(true);
    } catch (err) {
      console.error("Check-in error:", err);
      alert("Check-in could not be processed at this time.");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleStaffSimAction = async (action) => {
    if (!patientAppointment) return;
    try {
      await patientService.staffQueueAction(action, null, patientAppointment.doctor_id);
      await loadQueueData(true);
    } catch (err) {
      console.error("Staff sim action error:", err);
    }
  };


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

        <div className="queue-header-actions">
          <button
            className={`queue-mute-btn ${isMuted ? "muted" : ""}`}
            onClick={() => setIsMuted((prev) => !prev)}
            title={isMuted ? "Unmute Audio Announcements" : "Mute Audio Announcements"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{isMuted ? "Alerts Muted" : "Alerts Active"}</span>
          </button>

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
      </div>

      {/* PROXIMITY ALERT BANNER */}
      {proximityAlert && (
        <div className="proximity-alert-banner" role="alert">
          <Bell size={20} className="spin-icon" />
          <span>{proximityAlert}</span>
        </div>
      )}

      {/* CHECK-IN BANNER */}
      {patientAppointment && !checkedIn && canCheckIn && (
        <div className="queue-checkin-banner">
          <div>
            <strong>Self Check-In is Available for Today's Visit</strong>
            <p>You can check into the doctor's queue 60 minutes before your appointment slot.</p>
          </div>
          <button
            className="queue-checkin-btn"
            onClick={handleCheckIn}
            disabled={checkingIn}
          >
            {checkingIn ? "Checking In..." : "Check In Now"}
          </button>
        </div>
      )}

      {/* LIVE STATUS BANNER */}
      <div className="queue-live-banner">
        <div className="queue-live-left">
          <div className="live-pulse">
            <span />
          </div>
          <div>
            <strong>Live Telemetry Connected (10s Polling)</strong>
            <span>Doctor Room Active &middot; {hospital?.name || "CareBridge Hospital"}</span>
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
                <strong>~ {averageConsultMin} min</strong>
              </div>
              {estimatedClockTime && (
                <div>
                  <span>Est. Consultation Time</span>
                  <strong>{estimatedClockTime}</strong>
                </div>
              )}
            </section>
          </div>

          {/* SIMULATE STAFF CALL ACTIONS */}
          <section className="staff-sim-panel">
            <span>Hospital Staff / Doctor Station Simulation</span>
            <div className="staff-sim-buttons">
              <button
                type="button"
                className="staff-action-pill"
                onClick={() => handleStaffSimAction("call_next")}
                title="Simulate Doctor Calling Next Patient"
              >
                Call Next Token
              </button>
              <button
                type="button"
                className="staff-action-pill"
                onClick={() => handleStaffSimAction("skip")}
                title="Skip Current Absent Patient"
              >
                Skip Token
              </button>
              <button
                type="button"
                className="staff-action-pill"
                onClick={() => handleStaffSimAction("complete")}
                title="Complete Consultation"
              >
                Complete Token
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default LiveQueueManager;