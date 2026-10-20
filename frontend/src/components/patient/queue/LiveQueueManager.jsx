import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Volume2,
  VolumeX,
  Navigation,
  LogOut,
  X,
  AlertTriangle,
  Sparkles,
  Check,
  Calendar,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import patientService from "../../../services/patientService";
import api from "../../../services/api";
import {
  calculateQueueState,
  isAppointmentToday,
  formatAppointmentDateTime,
  formatRelativeTime,
} from "../../../utils/queueCalculations";
import "./liveQueueManager.css";

function LiveQueueManager() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const appointmentIdParam = searchParams.get("appointmentId");

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [patientAppointment, setPatientAppointment] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [rawQueueData, setRawQueueData] = useState(null);

  // Network & Connectivity States
  const [connectionStatus, setConnectionStatus] = useState("live"); // 'live' | 'reconnecting' | 'offline'
  const [lastSyncTime, setLastSyncTime] = useState(() => Date.now());
  const [relativeTimeLabel, setRelativeTimeLabel] = useState("Just now");
  const reconnectAttemptRef = useRef(0);

  // User Interactive States
  const [lateBufferMinutes, setLateBufferMinutes] = useState(0);
  const [isLateActive, setIsLateActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [notifyOnTwoAhead, setNotifyOnTwoAhead] = useState(true);
  const [proximityAlert, setProximityAlert] = useState(null);

  // Action Modals & Drawers
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState(null); // 'completed' | 'serving' | 'you' | 'upcoming'
  const [checkingIn, setCheckingIn] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Audio Context Ref
  const audioContextRef = useRef(null);
  const prevPatientsAheadRef = useRef(null);
  const prevServingTokenRef = useRef(null);

  // Web Audio Chime Synthesizer
  const playChime = useCallback(() => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // Harmonic 2-tone chime: D5 (587.33 Hz) to A5 (880 Hz)
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);

      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (_) {}
  }, [isMuted]);

  // Toast Helper
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Request Browser Notification Permission
  const requestBrowserNotificationPermission = useCallback(async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        return perm === "granted";
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  // Dispatch Native Browser Notification
  const triggerBrowserNotification = useCallback((title, body) => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted" &&
      !isMuted
    ) {
      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "carebridge-live-queue",
        });
      } catch (_) {}
    }
  }, [isMuted]);

  // Main Telemetry Fetcher
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

      setAllAppointments(appointments);

      // Select target appointment: explicitly by URL param, or current approved/confirmed/pending
      let targetApt = null;
      if (appointmentIdParam) {
        targetApt = appointments.find((a) => (a._id || a.id) === appointmentIdParam);
      }
      if (!targetApt) {
        // Prioritize today's appointments first, then approved/confirmed
        const todayApt = appointments.find(
          (a) =>
            isAppointmentToday(a.appointment_date) &&
            ["APPROVED", "CONFIRMED", "PENDING"].includes((a.status || "").toUpperCase())
        );
        targetApt = todayApt || appointments.find(
          (a) => ["APPROVED", "CONFIRMED", "PENDING"].includes((a.status || "").toUpperCase())
        ) || appointments[0] || null;
      }

      setPatientAppointment(targetApt);

      if (targetApt) {
        const aptId = targetApt._id || targetApt.id;
        const doc = allDocs.find((d) => (d._id || d.id) === targetApt.doctor_id);
        const hosp = allHosps.find((h) => (h._id || h.id) === targetApt.hospital_id);
        setDoctor(doc || null);
        setHospital(hosp || null);

        // Fetch live queue telemetry from backend
        try {
          const liveState = await patientService.getLiveQueueState(aptId, targetApt.doctor_id);
          if (liveState) {
            setRawQueueData(liveState);
            setLastSyncTime(Date.now());
            setConnectionStatus("live");
            reconnectAttemptRef.current = 0;
          }
        } catch (queueErr) {
          console.warn("Could not fetch queue live-state:", queueErr?.message);
          // Still preserve targetApt so user sees appointment details
          setConnectionStatus("reconnecting");
        }
      } else {
        setRawQueueData(null);
      }
    } catch (err) {
      console.error("Failed to load queue telemetry:", err);
      setError("Unable to synchronize live queue telemetry. Please check your connection.");
      setConnectionStatus("offline");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, appointmentIdParam]);

  // Single Source of Truth Queue Calculation
  const queueState = useMemo(() => {
    const rawMyToken = rawQueueData?.my_token?.token_number ?? rawQueueData?.my_token ?? 1;
    const rawNowServing = rawQueueData?.now_serving_token ?? rawQueueData?.current_serving ?? 1;
    const rawAvgConsult = rawQueueData?.average_consultation_time ?? rawQueueData?.avg_consultation_time ?? 10;
    const rawStatus = rawQueueData?.my_token?.status ?? rawQueueData?.queue_status ?? (patientAppointment?.status || "WAITING");

    return calculateQueueState({
      nowServing: rawNowServing,
      myToken: rawMyToken,
      avgConsultMinutes: rawAvgConsult,
      status: rawStatus,
      completedCount: rawQueueData?.completed_count,
      upcomingCount: rawQueueData?.waiting_count,
      lateBufferMinutes,
      lastUpdated: rawQueueData?.last_updated || lastSyncTime,
    });
  }, [rawQueueData, patientAppointment, lateBufferMinutes, lastSyncTime]);

  // Appointment Date Gating Check
  const appointmentIsToday = useMemo(() => {
    if (!patientAppointment) return true; // Default fallback to active if no appointment date specified
    return isAppointmentToday(patientAppointment.appointment_date, "Asia/Kolkata");
  }, [patientAppointment]);

  const formattedAppointmentDate = useMemo(() => {
    return formatAppointmentDateTime(
      patientAppointment?.appointment_date,
      patientAppointment?.appointment_time,
      "Asia/Kolkata"
    );
  }, [patientAppointment]);

  // Proximity Alert & Chime Triggers
  useEffect(() => {
    if (!appointmentIsToday || loading || !patientAppointment) return;

    const ahead = queueState.patientsAhead;
    const prevAhead = prevPatientsAheadRef.current;
    const currServing = queueState.nowServingNumber;
    const prevServing = prevServingTokenRef.current;

    // Trigger proximity alert when hitting 0 (You're Next) or 2 patients ahead
    if (ahead === 0 && (queueState.status === "YOU_ARE_NEXT" || queueState.isMyTurn)) {
      const msg = queueState.isMyTurn
        ? "It's your turn! Please proceed into the consultation room immediately."
        : "You're Next! Only the current patient is inside. Please proceed to the room entrance.";
      setProximityAlert(msg);

      if (prevAhead !== 0 || prevServing !== currServing) {
        playChime();
        triggerBrowserNotification("CareBridge AI - Your Turn Now!", msg);
      }
    } else if (ahead === 2 && notifyOnTwoAhead) {
      const msg = `Attention: Only 2 patients ahead of you in line. Please move towards Room ${doctor?.room_number || "4"}.`;
      setProximityAlert(msg);

      if (prevAhead !== 2) {
        playChime();
        triggerBrowserNotification("CareBridge AI - 2 Patients Ahead", msg);
      }
    } else if (ahead === 1) {
      setProximityAlert(`Attention: Only 1 patient ahead of you. Prepare for consultation.`);
    } else {
      setProximityAlert(null);
    }

    prevPatientsAheadRef.current = ahead;
    prevServingTokenRef.current = currServing;
  }, [
    appointmentIsToday,
    loading,
    patientAppointment,
    queueState.patientsAhead,
    queueState.status,
    queueState.isMyTurn,
    queueState.nowServingNumber,
    notifyOnTwoAhead,
    doctor?.room_number,
    playChime,
    triggerBrowserNotification,
  ]);

  // Real-time Polling with Tab Visibility Pause & Auto-Reconnect
  useEffect(() => {
    loadQueueData(false);

    let pollInterval = null;

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(() => {
        // Only poll if tab is active and visible
        if (!document.hidden) {
          loadQueueData(true);
        }
      }, 10000); // 10s live queue polling
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Tab is now visible again: fetch fresh data immediately and resume polling
        loadQueueData(true);
        startPolling();
      }
    };

    const handleOnline = () => {
      setConnectionStatus("live");
      loadQueueData(true);
      startPolling();
    };

    const handleOffline = () => {
      setConnectionStatus("offline");
      stopPolling();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadQueueData]);

  // Relative Time Label Updater (Updates relative text every 3s)
  useEffect(() => {
    const timer = setInterval(() => {
      setRelativeTimeLabel(formatRelativeTime(lastSyncTime));
    }, 3000);
    return () => clearInterval(timer);
  }, [lastSyncTime]);

  // Handlers
  const handleCheckIn = async () => {
    if (!patientAppointment) return;
    try {
      setCheckingIn(true);
      await patientService.checkInQueue(patientAppointment._id || patientAppointment.id);
      showToast("Checked in successfully! You are now active in the live queue.");
      await loadQueueData(true);
    } catch (err) {
      console.error("Check-in error:", err);
      showToast("Check-in could not be processed at this time.");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleToggleRunningLate = () => {
    if (isLateActive) {
      setLateBufferMinutes(0);
      setIsLateActive(false);
      showToast("Running late buffer removed.");
    } else {
      setLateBufferMinutes(15);
      setIsLateActive(true);
      showToast("Hospital notified! +15 minutes buffer added to your estimated wait.");
    }
  };

  const handleToggleNotifyTwoAhead = async () => {
    if (!notifyOnTwoAhead) {
      const granted = await requestBrowserNotificationPermission();
      setNotifyOnTwoAhead(true);
      showToast(granted ? "Proximity notifications active!" : "Audio chime active for proximity alerts.");
    } else {
      setNotifyOnTwoAhead(false);
      showToast("Proximity notification disabled.");
    }
  };

  const handleLeaveQueueConfirm = async () => {
    setIsLeaving(true);
    try {
      if (rawQueueData?.my_token?._id) {
        await api.put(`/queue/${rawQueueData.my_token._id}`, { status: "CANCELLED" });
      }
      setShowLeaveModal(false);
      showToast("You have left the live queue. Token cancelled.");
      await loadQueueData(true);
    } catch (err) {
      console.error("Leave queue error:", err);
      setShowLeaveModal(false);
      showToast("Unable to leave queue right now.");
    } finally {
      setIsLeaving(false);
    }
  };

  // Staff simulation action for quick demo testing
  const handleStaffSimAction = async (action) => {
    if (!patientAppointment) return;
    try {
      await patientService.staffQueueAction(action, null, patientAppointment.doctor_id);
      await loadQueueData(true);
    } catch (err) {
      console.warn("Staff sim action note:", err?.message);
      // Fallback reload
      await loadQueueData(true);
    }
  };

  const aptId = patientAppointment?._id || patientAppointment?.id;

  return (
    <div className="queue-page">
      {/* TOAST POPUP */}
      {toastMessage && (
        <div className="queue-toast" role="status" aria-live="polite">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <header className="queue-header">
        <div>
          <span className="queue-kicker">REAL-TIME OPD TELEMETRY</span>
          <h1>Live Hospital Queue</h1>
          <p>
            Track your consultation token position, doctor room status, and estimated waiting time in real time.
          </p>
        </div>

        <div className="queue-header-actions">
          {/* Audio Chime Mute Button */}
          <button
            type="button"
            className={`queue-mute-btn ${isMuted ? "muted" : ""}`}
            onClick={() => setIsMuted((prev) => !prev)}
            aria-label={isMuted ? "Unmute Audio Announcements" : "Mute Audio Announcements"}
            title={isMuted ? "Unmute Audio Announcements" : "Mute Audio Announcements"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{isMuted ? "Alerts Muted" : "Alerts Active"}</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            className={`queue-refresh-btn ${isRefreshing ? "refreshing" : ""}`}
            onClick={() => loadQueueData(false)}
            disabled={loading || isRefreshing}
            aria-label="Synchronize live queue telemetry"
            title="Refresh Queue Data"
          >
            <RefreshCw size={16} className={isRefreshing ? "spin-icon" : ""} />
            <span>{isRefreshing ? "Syncing..." : "Refresh Queue"}</span>
          </button>
        </div>
      </header>

      {/* CONNECTION STATUS & LIVE PULSE PILL */}
      <div className="queue-connection-bar" aria-live="polite">
        <div className="connection-pill-group">
          <div className={`connection-status-pill ${connectionStatus}`}>
            <span className="status-dot" />
            <span className="status-text">
              {connectionStatus === "live"
                ? "Live Telemetry"
                : connectionStatus === "reconnecting"
                ? "Reconnecting..."
                : "Offline"}
            </span>
          </div>

          <span className="connection-meta-divider" />
          <span className="connection-updated-label">
            Updated {relativeTimeLabel} &middot; Doctor Room Active
          </span>
        </div>

        <div className="connection-hospital-tag">
          <Building size={14} />
          <span>{hospital?.name || "CareBridge Medical Center"}</span>
        </div>
      </div>

      {/* PROXIMITY ALERT BANNER */}
      {proximityAlert && (
        <div className="proximity-alert-banner" role="alert" aria-live="assertive">
          <div className="proximity-alert-icon">
            <Bell size={18} className="spin-icon" />
          </div>
          <div className="proximity-alert-content">
            <strong>Proximity Notice</strong>
            <span>{proximityAlert}</span>
          </div>
        </div>
      )}

      {/* LOADING STATE SKELETON */}
      {loading && (
        <div className="queue-loading-skeleton" aria-label="Loading live queue data">
          <Loader2 size={36} className="spinner-icon" />
          <p>Connecting to hospital live queue telemetry...</p>
          <span className="skeleton-sub">Retrieving token sync &middot; Room status</span>
        </div>
      )}

      {/* ERROR BANNER WITH RETRY */}
      {error && !loading && (
        <div className="queue-error-banner" role="alert">
          <AlertCircle size={22} />
          <div className="error-text">
            <strong>Connection Disruption</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="error-retry-btn" onClick={() => loadQueueData(false)}>
            Retry
          </button>
        </div>
      )}

      {/* EMPTY STATE: NO APPOINTMENT AT ALL */}
      {!loading && !error && !patientAppointment && (
        <div className="queue-empty-state">
          <Users size={52} />
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

      {/* ========================================================================= */}
      {/* APPOINTMENT DATE GATING: GUARD STATE (IF APPOINTMENT IS NOT TODAY)        */}
      {/* ========================================================================= */}
      {!loading && !error && patientAppointment && !appointmentIsToday && (
        <div className="queue-inactive-guard-card">
          <div className="guard-icon-box">
            <CalendarDays size={42} />
          </div>

          <div className="guard-content">
            <span className="guard-kicker">QUEUE NOT ACTIVE YET</span>
            <h2>Appointment Scheduled for Future Date</h2>
            <p className="guard-main-message">
              Your appointment is on <strong>{formattedAppointmentDate}</strong>. Live queue opens on the day of your visit.
            </p>

            <div className="guard-details-pill-row">
              <div className="guard-pill">
                <Stethoscope size={15} />
                <span>Dr. {doctor?.name || "Specialist Physician"}</span>
              </div>
              <div className="guard-pill">
                <Building size={15} />
                <span>{doctor?.specialization || "Clinical Outpatient Unit"}</span>
              </div>
              <div className="guard-pill">
                <MapPin size={15} />
                <span>Room {doctor?.room_number || "204"} &middot; Floor 2</span>
              </div>
            </div>

            <div className="guard-instructions-box">
              <h4>What happens on the day of your visit?</h4>
              <ul>
                <li>Self Check-In opens 60 minutes before your scheduled slot.</li>
                <li>Your queue token (e.g. CB-01) will be generated and tracked live on this screen.</li>
                <li>You will receive real-time notifications as the doctor progresses through patients ahead of you.</li>
              </ul>
            </div>

            <div className="guard-actions-row">
              {aptId && (
                <Link to={`/patient/opd-pass?appointmentId=${aptId}`} className="queue-primary-cta">
                  <Ticket size={17} />
                  <span>Open Digital OPD Pass</span>
                </Link>
              )}
              <Link to="/patient/appointments" className="queue-secondary-btn">
                <Calendar size={17} />
                <span>Reschedule Appointment</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN ACTIVE LIVE QUEUE CONTENT (ONLY WHEN APPOINTMENT IS TODAY)            */}
      {/* ========================================================================= */}
      {!loading && !error && patientAppointment && appointmentIsToday && (
        <>
          {/* QUICK ACTIONS BAR */}
          <div className="queue-quick-actions-bar" aria-label="Queue quick actions">
            {/* Notify Me When 2 Ahead */}
            <button
              type="button"
              className={`quick-action-chip ${notifyOnTwoAhead ? "active" : ""}`}
              onClick={handleToggleNotifyTwoAhead}
              title="Toggle proximity alert when 2 patients are ahead of you"
            >
              {notifyOnTwoAhead ? <Bell size={15} /> : <BellOff size={15} />}
              <span>{notifyOnTwoAhead ? "Alert at 2 Ahead: ON" : "Alert at 2 Ahead: OFF"}</span>
            </button>

            {/* I'm Running Late */}
            <button
              type="button"
              className={`quick-action-chip ${isLateActive ? "warning-active" : ""}`}
              onClick={handleToggleRunningLate}
              title="Alert the clinic and add +15 min buffer to wait time"
            >
              <Clock3 size={15} />
              <span>{isLateActive ? "Running Late (+15m Active)" : "I'm Running Late"}</span>
            </button>

            {/* Leave Queue Button */}
            <button
              type="button"
              className="quick-action-chip danger"
              onClick={() => setShowLeaveModal(true)}
              title="Cancel your position in the live queue"
            >
              <LogOut size={15} />
              <span>Leave Queue</span>
            </button>
          </div>

          {/* TWO COLUMN GRID: HERO & TOKEN CARD */}
          <div className="queue-main-grid">
            {/* 1. HERO POSITION CARD */}
            <section className="queue-hero-card" aria-label="Queue Position and Telemetry">
              <div className="hero-top-row">
                <div>
                  <span className="small-label">LIVE QUEUE TELEMETRY</span>
                  <h2>
                    {queueState.status === "IN_CONSULTATION"
                      ? "In Consultation Room"
                      : queueState.status === "YOU_ARE_NEXT"
                      ? "You're Next!"
                      : queueState.patientsAhead <= 2
                      ? "Almost Ready"
                      : "In Waiting Queue"}
                  </h2>
                </div>

                <div className={`status-chip ${queueState.statusBadgeColor}`}>
                  <span className="status-chip-dot" />
                  <span>{queueState.statusBadgeLabel}</span>
                </div>
              </div>

              {/* Large Token & Position Display */}
              <div className="hero-token-display">
                <div className="token-massive-badge">
                  <span className="token-label">YOUR TOKEN</span>
                  <div className="token-code-massive">{queueState.myToken}</div>
                </div>

                <div className="hero-position-details">
                  <div className="hero-position-row">
                    <span className="detail-key">Current Position in Line:</span>
                    <strong className="detail-val">
                      {queueState.isMyTurn
                        ? "Currently Inside"
                        : queueState.isPassed
                        ? "Consultation Completed"
                        : `#${queueState.queuePosition}`}
                    </strong>
                  </div>

                  <div className="hero-position-row">
                    <span className="detail-key">Patients Ahead:</span>
                    <strong className="detail-val">
                      {queueState.patientsAhead} {queueState.patientsAhead === 1 ? "patient" : "patients"}
                    </strong>
                  </div>

                  <div className="hero-position-row">
                    <span className="detail-key">Doctor Status:</span>
                    <strong className="detail-val text-amber">
                      Now Serving #{queueState.nowServing}
                    </strong>
                  </div>
                </div>
              </div>

              {/* PROGRESS BAR (Label strictly above 10px track with proper margin) */}
              <div className="queue-progress-container">
                <div className="queue-progress-label-row">
                  <span className="progress-title">Queue Progress</span>
                  <span className="progress-percentage">{queueState.progressPercent}%</span>
                </div>

                <div
                  className="queue-progress-track"
                  role="progressbar"
                  aria-valuenow={queueState.progressPercent}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label="Queue consultation progress bar"
                >
                  <div
                    className="queue-progress-fill"
                    style={{ width: `${queueState.progressPercent}%` }}
                  />
                </div>

                <div className="queue-progress-sub-row">
                  <span>Now Serving: Token #{queueState.nowServing}</span>
                  <span>{queueState.completedRangeLabel}</span>
                </div>
              </div>

              {/* ESTIMATED WAIT TIME & CLOCK TIME (Never "~ 0 Minutes") */}
              <div className="hero-wait-banner">
                <div className="wait-icon-box">
                  <Clock3 size={22} />
                </div>
                <div className="wait-text-col">
                  <span className="wait-title">Estimated Waiting Time</span>
                  <strong className="wait-amount">{queueState.estimatedWaitText}</strong>
                  {queueState.expectedClockTime && queueState.expectedClockTime !== "Now" && (
                    <span className="wait-clock-eta">
                      Expected call around {queueState.expectedClockTime}
                    </span>
                  )}
                  {isLateActive && (
                    <span className="wait-late-tag">+15 min late buffer applied</span>
                  )}
                </div>
              </div>

              {/* Hero Primary CTA */}
              <div className="hero-actions">
                {patientAppointment && !patientAppointment.checked_in && !rawQueueData?.my_token?.checked_in_at ? (
                  <button
                    type="button"
                    className="hero-pass-btn checkin-style"
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                  >
                    {checkingIn ? (
                      <>
                        <Loader2 size={17} className="spin-icon" />
                        <span>Checking In...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={17} />
                        <span>Self Check-In to Queue</span>
                        <ChevronRight size={17} />
                      </>
                    )}
                  </button>
                ) : (
                  aptId && (
                    <Link to={`/patient/opd-pass?appointmentId=${aptId}`} className="hero-pass-btn">
                      <Ticket size={17} />
                      <span>Open Digital OPD Pass</span>
                      <ChevronRight size={17} />
                    </Link>
                  )
                )}
              </div>
            </section>

            {/* 2. DOCTOR & ROOM CARD */}
            <section className="queue-doctor-card" aria-label="Consulting Doctor and Room Location">
              <div className="doctor-card-header">
                <div className="doctor-avatar-circle">
                  {doctor?.avatar || doctor?.photo ? (
                    <img src={doctor.avatar || doctor.photo} alt={doctor.name || "Doctor"} />
                  ) : (
                    <span>{doctor?.name ? doctor.name.replace(/^Dr\.\s*/i, "").charAt(0).toUpperCase() : "D"}</span>
                  )}
                </div>

                <div className="doctor-meta-col">
                  <span className="small-label">TREATING CLINICIAN</span>
                  <h3>{doctor?.name ? (doctor.name.startsWith("Dr.") ? doctor.name : `Dr. ${doctor.name}`) : "Specialist Physician"}</h3>
                  <span className="doctor-specialty-pill">
                    {doctor?.specialization || "General Medicine & Outpatient"}
                  </span>
                </div>
              </div>

              <div className="card-divider" />

              {/* Room, Floor & Hospital Details */}
              <div className="doctor-loc-grid">
                <div className="loc-item">
                  <MapPin size={17} className="text-cyan" />
                  <div>
                    <span className="loc-title">Room & Floor</span>
                    <strong className="loc-val">
                      Room {doctor?.room_number || "204"} &middot; Floor {doctor?.floor || "2"}
                    </strong>
                  </div>
                </div>

                <div className="loc-item">
                  <Building size={17} className="text-cyan" />
                  <div>
                    <span className="loc-title">Hospital Wing</span>
                    <strong className="loc-val">
                      {doctor?.department || "OPD Block B, Specialist Wing"}
                    </strong>
                  </div>
                </div>

                <div className="loc-item">
                  <CalendarDays size={17} className="text-cyan" />
                  <div>
                    <span className="loc-title">Scheduled Slot</span>
                    <strong className="loc-val">{formattedAppointmentDate}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Get Directions & OPD Pass */}
              <div className="doctor-card-actions">
                <button
                  type="button"
                  className="doctor-directions-btn"
                  onClick={() => setShowDirectionsModal(true)}
                >
                  <Navigation size={16} />
                  <span>Get Directions to Room</span>
                </button>
              </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* HORIZONTAL STEPPER / QUEUE TIMELINE (REPLACING 4 BATCH CARDS)             */}
          {/* ========================================================================= */}
          <section className="queue-stepper-card" aria-label="Interactive Queue Timeline">
            <div className="stepper-header">
              <div>
                <span className="small-label">LIVE FLOW MONITOR</span>
                <h2>Queue Timeline & Progression</h2>
              </div>
              <span className="stepper-live-badge">
                <span className="pulse-dot" />
                Live Sequence
              </span>
            </div>

            <p className="stepper-subtext">
              Click any step to inspect batch details, room status, or waiting counts.
            </p>

            <div className="timeline-stepper">
              {/* Step 1: Completed */}
              <button
                type="button"
                className={`timeline-step completed ${activeStepTab === "completed" ? "selected" : ""}`}
                onClick={() => setActiveStepTab(activeStepTab === "completed" ? null : "completed")}
                aria-expanded={activeStepTab === "completed"}
              >
                <div className="step-circle">
                  <CheckCircle2 size={16} />
                </div>
                <div className="step-content">
                  <strong className="step-title">{queueState.completedRangeLabel}</strong>
                  <span className="step-caption">{queueState.completedCount} Consultation{queueState.completedCount === 1 ? "" : "s"} Completed</span>
                </div>
              </button>

              <div className="step-connector completed" />

              {/* Step 2: Now Serving (Highlighted Amber) */}
              <button
                type="button"
                className={`timeline-step serving ${activeStepTab === "serving" ? "selected" : ""}`}
                onClick={() => setActiveStepTab(activeStepTab === "serving" ? null : "serving")}
                aria-expanded={activeStepTab === "serving"}
              >
                <div className="step-circle amber-glow">
                  #{queueState.nowServingNumber}
                </div>
                <div className="step-content">
                  <strong className="step-title text-amber">Now Serving</strong>
                  <span className="step-caption">Token {queueState.nowServing} (In Room)</span>
                </div>
              </button>

              <div className="step-connector active" />

              {/* Step 3: You (Highlighted Blue/Teal) */}
              <button
                type="button"
                className={`timeline-step you ${activeStepTab === "you" ? "selected" : ""}`}
                onClick={() => setActiveStepTab(activeStepTab === "you" ? null : "you")}
                aria-expanded={activeStepTab === "you"}
              >
                <div className="step-circle teal-glow">
                  {queueState.myToken}
                </div>
                <div className="step-content">
                  <strong className="step-title text-cyan">Your Token ({queueState.myToken})</strong>
                  <span className="step-caption">
                    {queueState.isMyTurn
                      ? "In Consultation Room"
                      : queueState.patientsAhead === 0
                      ? "You're Next!"
                      : `Position #${queueState.queuePosition} (${queueState.patientsAhead} ahead)`}
                  </span>
                </div>
              </button>

              <div className="step-connector" />

              {/* Step 4: Upcoming */}
              <button
                type="button"
                className={`timeline-step upcoming ${activeStepTab === "upcoming" ? "selected" : ""}`}
                onClick={() => setActiveStepTab(activeStepTab === "upcoming" ? null : "upcoming")}
                aria-expanded={activeStepTab === "upcoming"}
              >
                <div className="step-circle">
                  +{queueState.upcomingCount}
                </div>
                <div className="step-content">
                  <strong className="step-title">Upcoming Queue</strong>
                  <span className="step-caption">{queueState.upcomingCount} Patients In Lobby</span>
                </div>
              </button>
            </div>

            {/* EXPANDED STEP DETAILS CARD */}
            {activeStepTab && (
              <div className="step-expanded-details animate-slide-down">
                <div className="expanded-top">
                  <strong>
                    {activeStepTab === "completed" && "Completed Patient Consultations"}
                    {activeStepTab === "serving" && `Now In Consultation: Token #${queueState.nowServing}`}
                    {activeStepTab === "you" && `Your Consultation Status: Token ${queueState.myToken}`}
                    {activeStepTab === "upcoming" && "Waiting Area Progression"}
                  </strong>
                  <button
                    type="button"
                    className="close-expanded-btn"
                    onClick={() => setActiveStepTab(null)}
                    aria-label="Close step details"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="expanded-body">
                  {activeStepTab === "completed" && (
                    <p>
                      {queueState.completedCount > 0
                        ? `A total of ${queueState.completedCount} patient consultations have been completed today by Dr. ${doctor?.name || "the specialist"}. Average time per patient has been ~${queueState.avgConsultMinutes} minutes.`
                        : "No patient consultations have been concluded yet today for this OPD station."}
                    </p>
                  )}

                  {activeStepTab === "serving" && (
                    <p>
                      Token <strong>#{queueState.nowServing}</strong> is currently inside Room {doctor?.room_number || "204"}. Once their consultation concludes, the doctor will call token #{queueState.nowServingNumber + 1}.
                    </p>
                  )}

                  {activeStepTab === "you" && (
                    <p>
                      You are holding token <strong>{queueState.myToken}</strong>. {queueState.patientsAhead === 0
                        ? "You are next in line! Stay directly outside the door and listen for the audio chime."
                        : `There are ${queueState.patientsAhead} patient(s) ahead of you. Estimated wait: ${queueState.estimatedWaitText}.`}
                    </p>
                  )}

                  {activeStepTab === "upcoming" && (
                    <p>
                      There are approximately <strong>{queueState.upcomingCount}</strong> other scheduled or walk-in patients registered for today's OPD clinic after your token.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* CLINIC GUIDANCE & TELEMETRY SUMMARY                                      */}
          {/* ========================================================================= */}
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
              <div className="summary-stat-cell">
                <span className="summary-stat-label">Now Serving</span>
                <strong className="summary-stat-val text-amber">Token #{queueState.nowServing}</strong>
              </div>
              <div className="summary-stat-cell">
                <span className="summary-stat-label">Patients Ahead</span>
                <strong className="summary-stat-val">{queueState.patientsAhead}</strong>
              </div>
              <div className="summary-stat-cell">
                <span className="summary-stat-label">Avg. Consultation</span>
                <strong className="summary-stat-val">~ {queueState.avgConsultMinutes} min</strong>
              </div>
              {queueState.expectedClockTime && queueState.expectedClockTime !== "Now" && (
                <div className="summary-stat-cell">
                  <span className="summary-stat-label">Expected Call</span>
                  <strong className="summary-stat-val text-cyan">{queueState.expectedClockTime}</strong>
                </div>
              )}
            </section>
          </div>

          {/* SIMULATE STAFF CALL ACTIONS (FOR TESTING/DEMO) */}
          <section className="staff-sim-panel" aria-label="Staff Station Simulation">
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

      {/* ========================================================================= */}
      {/* MODAL 1: GET DIRECTIONS MODAL                                             */}
      {/* ========================================================================= */}
      {showDirectionsModal && (
        <div className="queue-modal-overlay" onClick={() => setShowDirectionsModal(false)}>
          <div
            className="queue-modal-box directions-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="directions-modal-title"
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <Navigation size={20} className="text-cyan" />
                <h3 id="directions-modal-title">Directions to Consultation Room</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowDirectionsModal(false)}
                aria-label="Close directions modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="directions-destination-banner">
                <div>
                  <span className="dest-label">DESTINATION</span>
                  <strong className="dest-title">
                    Room {doctor?.room_number || "204"} &middot; Dr. {doctor?.name || "Specialist"}
                  </strong>
                  <span className="dest-sub">
                    Floor {doctor?.floor || "2"}, {doctor?.department || "Outpatient Clinical Unit"}
                  </span>
                </div>
                <div className="dest-time-badge">
                  <Clock3 size={15} />
                  <span>~2 min walk</span>
                </div>
              </div>

              {/* Step-by-Step Wayfinding */}
              <div className="wayfinding-steps">
                <div className="wayfinding-step">
                  <div className="step-num">1</div>
                  <div className="step-desc">
                    <strong>Main Hospital Atrium</strong>
                    <p>Enter through the hospital main reception and head towards Central Elevator Core B.</p>
                  </div>
                </div>

                <div className="wayfinding-step">
                  <div className="step-num">2</div>
                  <div className="step-desc">
                    <strong>Elevator / Stairs to Level 2</strong>
                    <p>Take Elevator B or the central glass staircase to Floor 2 (Specialist Outpatient Wing).</p>
                  </div>
                </div>

                <div className="wayfinding-step">
                  <div className="step-num">3</div>
                  <div className="step-desc">
                    <strong>Turn Right into Corridor 2B</strong>
                    <p>Follow the overhead blue signage marked "Consultation Suites 201–215".</p>
                  </div>
                </div>

                <div className="wayfinding-step">
                  <div className="step-num">4</div>
                  <div className="step-desc">
                    <strong>Room {doctor?.room_number || "204"} (Triage Lobby)</strong>
                    <p>
                      Room door is on your left with Dr. {doctor?.name || "Physician"}'s digital door display. Take a seat in Waiting Lobby B.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="queue-primary-cta"
                onClick={() => setShowDirectionsModal(false)}
              >
                <Check size={16} /> Got It, Thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LEAVE QUEUE CONFIRMATION MODAL                                   */}
      {/* ========================================================================= */}
      {showLeaveModal && (
        <div className="queue-modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div
            className="queue-modal-box leave-modal"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="leave-modal-title"
          >
            <div className="modal-header">
              <div className="modal-title-group text-danger">
                <AlertTriangle size={20} />
                <h3 id="leave-modal-title">Leave Live Queue?</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowLeaveModal(false)}
                aria-label="Cancel leaving queue"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to surrender token <strong>{queueState.myToken}</strong>?
              </p>
              <p className="leave-warning-note">
                Leaving the queue will cancel your current position (Position #{queueState.queuePosition}). You will need to check in again or contact hospital reception to receive a new token.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="queue-secondary-btn"
                onClick={() => setShowLeaveModal(false)}
                disabled={isLeaving}
              >
                Stay in Queue
              </button>

              <button
                type="button"
                className="queue-danger-btn"
                onClick={handleLeaveQueueConfirm}
                disabled={isLeaving}
              >
                {isLeaving ? "Cancelling..." : "Confirm & Leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveQueueManager;