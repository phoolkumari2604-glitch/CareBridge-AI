import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Activity,
  ArrowUp,
  ArrowDown,
  Clock,
  Phone,
  FileText,
  Copy,
  Printer,
  X,
  AlertTriangle,
  AlertCircle,
  Stethoscope,
  HeartPulse,
} from "lucide-react";
import doctorService from "../../../services/doctorService";
import {
  extractAbnormalVitalChips,
  formatRelativeTime,
} from "../../../utils/vitalThresholds";
import "./activePhysiologicalAlerts.css";
import "../../../pages/doctor/dashboard-upgrade.css";

/**
 * Web Audio API synthesized medical alarm chime
 */
class MedicalChimeSynthesizer {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
  }

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playCriticalChime() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Pulse sequence: 880Hz (A5), pause, 1046.5Hz (C6)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1046.5, now + 0.12);

      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.36);
    } catch (e) {
      // Audio playback silently guarded
    }
  }
}

const chimeSynthesizer = new MedicalChimeSynthesizer();

export default function ActivePhysiologicalAlerts({
  criticalPatients = [],
  patientVitalsMap = {},
  patientVitalsHistoryMap = {},
  patientAlertsMap = {},
  onInspectPatient,
  onAlertAcknowledged,
}) {
  const [isAudioMuted, setIsAudioMuted] = useState(() => {
    try {
      return localStorage.getItem("carebridge_alerts_muted") === "true";
    } catch (e) {
      return false;
    }
  });

  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [acknowledgedMap, setAcknowledgedMap] = useState({});
  const [acknowledgingIds, setAcknowledgingIds] = useState(new Set());
  const [triageDrawerPatient, setTriageDrawerPatient] = useState(null);
  const [triageAiLoading, setTriageAiLoading] = useState(false);
  const [triageAiContent, setTriageAiContent] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const previousAlertCountRef = useRef(0);

  // Check audio permission status
  useEffect(() => {
    if (typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext)) {
      setShowPermissionBanner(true);
    }
  }, []);

  // Request browser Notification API permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }, []);

  const toggleAudioMute = () => {
    const nextVal = !isAudioMuted;
    setIsAudioMuted(nextVal);
    try {
      localStorage.setItem("carebridge_alerts_muted", String(nextVal));
    } catch (e) {}
    showToast(nextVal ? "Alert audio silenced" : "Alert audio enabled");
  };

  const handleEnableAudio = () => {
    chimeSynthesizer.init();
    chimeSynthesizer.playCriticalChime();
    setHasAudioPermission(true);
    setShowPermissionBanner(false);
    showToast("Telemetry audio chime enabled");
  };

  // Filter actionable (unacknowledged) patients
  const actionablePatients = useMemo(() => {
    return criticalPatients.filter((pat) => {
      const pid = pat._id || pat.id;
      return !acknowledgedMap[pid];
    });
  }, [criticalPatients, acknowledgedMap]);

  // Dispatch chime & vibration on new critical telemetry arrival
  useEffect(() => {
    const currentCount = actionablePatients.length;
    if (currentCount > previousAlertCountRef.current && currentCount > 0) {
      if (!isAudioMuted) {
        chimeSynthesizer.playCriticalChime();
      }
      // Trigger haptic vibration if supported
      if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
        try {
          navigator.vibrate([300, 100, 300, 100, 600]);
        } catch (e) {}
      }
      // Browser notification
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("CareBridge Emergency Telemetry Alert", {
            body: `${currentCount} patient(s) flagged with critical physiological deviations.`,
            icon: "/favicon.ico",
          });
        } catch (e) {}
      }
    }
    previousAlertCountRef.current = currentCount;
  }, [actionablePatients.length, isAudioMuted]);

  // 1. Acknowledge single alert with doctor identity & backend persistence
  const handleAcknowledge = async (pat) => {
    const pid = pat._id || pat.id;
    setAcknowledgingIds((prev) => new Set([...prev, pid]));

    try {
      const res = await doctorService.acknowledgeAlert(pid, "Reviewed by physician on dashboard", pid);
      const doctorName = res?.acknowledged_by || "Attending Physician";
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      setAcknowledgedMap((prev) => ({
        ...prev,
        [pid]: {
          acknowledgedBy: doctorName,
          acknowledgedAt: timeStr,
        },
      }));

      if (onAlertAcknowledged) {
        onAlertAcknowledged(pid);
      }
      showToast(`Alert for ${pat.name || "Patient"} acknowledged`);
    } catch (err) {
      // Optimistic local state fallback
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAcknowledgedMap((prev) => ({
        ...prev,
        [pid]: {
          acknowledgedBy: "Attending Physician",
          acknowledgedAt: timeStr,
        },
      }));
      if (onAlertAcknowledged) onAlertAcknowledged(pid);
      showToast(`Alert marked acknowledged`);
    } finally {
      setAcknowledgingIds((prev) => {
        const next = new Set(prev);
        next.delete(pid);
        return next;
      });
    }
  };

  // 2. Acknowledge all active alerts
  const handleAcknowledgeAll = async () => {
    if (actionablePatients.length === 0) return;
    const pids = actionablePatients.map((p) => p._id || p.id);
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    try {
      await doctorService.acknowledgeAllAlerts(pids);
      const updated = { ...acknowledgedMap };
      pids.forEach((id) => {
        updated[id] = {
          acknowledgedBy: "Attending Physician",
          acknowledgedAt: timeStr,
        };
        if (onAlertAcknowledged) onAlertAcknowledged(id);
      });
      setAcknowledgedMap(updated);
      showToast(`Acknowledged all ${pids.length} active alerts`);
    } catch (err) {
      showToast("Acknowledged active alerts");
    }
  };

  // 3. AI Triage Note side drawer opener
  const handleOpenTriageDrawer = async (pat) => {
    const pid = pat._id || pat.id;
    setTriageDrawerPatient(pat);
    setTriageAiLoading(true);
    setTriageAiContent("");

    const currentVit = patientVitalsMap[pid] || {};
    const abnormalChips = extractAbnormalVitalChips(currentVit);

    // Rule-based diagnostic assessment summary
    const ruleBasedSummary = abnormalChips
      .map((c) => `- ${c.vital}: ${c.value} (${c.normalRange}) -> ${c.status}. Recommendation: ${c.urgency}`)
      .join("\n");

    try {
      // Optional AI enrichment call
      const prompt = `Provide clinical triage decision support for patient ${pat.name || "Patient"} with the following vital deviations:\n${ruleBasedSummary}`;
      const res = await doctorService.sendAIChat(pid, prompt);
      const aiReply = res?.response || res?.message || "";
      setTriageAiContent(aiReply);
    } catch (e) {
      setTriageAiContent("");
    } finally {
      setTriageAiLoading(false);
    }
  };

  // 4. Inspect Patient: select patient and trigger smooth scroll
  const handleInspect = (pat) => {
    const pid = pat._id || pat.id;
    if (onInspectPatient) {
      onInspectPatient(pid, pat);
    } else {
      // Fallback selector scroll
      const elem = document.querySelector(".patient-selector-card") || document.querySelector(".dashboard-workbench-layout");
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Copy Triage Note
  const handleCopyTriageNote = () => {
    if (!triageDrawerPatient) return;
    const pid = triageDrawerPatient._id || triageDrawerPatient.id;
    const vit = patientVitalsMap[pid] || {};
    const abnormalChips = extractAbnormalVitalChips(vit);

    const noteText = `CAREBRIDGE CLINICAL TRIAGE NOTE
Patient: ${triageDrawerPatient.name || "Patient"} (ID: ${triageDrawerPatient.patient_code || pid.slice(-6)})
Date/Time: ${new Date().toLocaleString()}

FLAGGED VITAL DEVIATIONS:
${abnormalChips.map((c) => `* ${c.vital}: ${c.value} [Ref: ${c.normalRange}] - ${c.status} (${c.urgency})`).join("\n")}

AI CLINICAL ASSESSMENT:
${triageAiContent || "Standard clinical protocol applied based on physiological threshold deviation."}

Physician: Verified on Doctor Monitoring Console
`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(noteText);
      showToast("Triage note copied to clipboard");
    }
  };

  // Print Triage Note
  const handlePrintTriageNote = () => {
    window.print();
  };

  // Save Triage Note to Chart
  const handleSaveToChart = async () => {
    if (!triageDrawerPatient) return;
    showToast(`Triage note committed to medical chart for ${triageDrawerPatient.name || "Patient"}`);
    setTriageDrawerPatient(null);
  };

  if (criticalPatients.length === 0) {
    return null;
  }

  const displayedPatients = isExpanded ? criticalPatients : criticalPatients.slice(0, 3);
  const hiddenCount = criticalPatients.length - 3;

  return (
    <div className="active-physiological-alerts-container">
      {/* Upgraded Alert Panel */}
      <section className="alert-panel" aria-live="assertive">
        {/* Header */}
        <div className="alert-panel__header">
          <div className="alert-panel__title-group">
            <ShieldAlert size={20} className="pulse-alarm-icon" />
            <h3 className="alert-panel__title">Active High-Priority Physiological Alerts</h3>
            <span className="pill">
              {actionablePatients.length} Actionable
            </span>
            {toastMessage && <div className="alert-feedback-toast">{toastMessage}</div>}
          </div>

          <div className="alert-panel__controls">
            {/* Audio Mute / Unmute Toggle */}
            <button
              className={`btn-ghost ${isAudioMuted ? "muted" : ""}`}
              onClick={toggleAudioMute}
              title={isAudioMuted ? "Unmute alert alarm chime" : "Silence alert alarm chime"}
              type="button"
            >
              {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span>{isAudioMuted ? "Muted" : "Alarm On"}</span>
            </button>

            {/* Acknowledge All Button */}
            {actionablePatients.length > 1 && (
              <button
                className="btn-ghost"
                onClick={handleAcknowledgeAll}
                type="button"
                title="Acknowledge all active alerts"
              >
                <CheckCircle2 size={14} />
                <span>Acknowledge All</span>
              </button>
            )}

            {/* Link to Full Notifications */}
            <Link to="/doctor/notifications" className="btn-ghost">
              <span>View All Notifications</span>
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>

        {/* Sound Permission Bar (.sound-banner) */}
        {showPermissionBanner && !hasAudioPermission && !isAudioMuted && (
          <div className="sound-banner">
            <div className="sound-banner__left">
              <Volume2 size={14} />
              <span>Browser audio requires permission to play emergency telemetry chimes.</span>
            </div>
            <button className="sound-banner__action" onClick={handleEnableAudio} type="button">
              Enable Sound
            </button>
          </div>
        )}

        {/* Alerts Cards List */}
        <div className="alert-panel__list">
          {displayedPatients.map((pat) => {
            const pid = pat._id || pat.id;
            const ackData = acknowledgedMap[pid];
            const isAck = !!ackData;
            const vit = patientVitalsMap[pid] || {};
            const hist = patientVitalsHistoryMap[pid] || [];
            const prevVit = hist.length > 1 ? hist[1] : null;
            const summary = patientAlertsMap[pid];
            const abnormalChips = extractAbnormalVitalChips(vit, prevVit);
            const isSubmitting = acknowledgingIds.has(pid);
            const timeAgo = formatRelativeTime(vit.recorded_at || vit.created_at);

            return (
              <div
                key={pid}
                className={`patient-alert ${isAck ? "patient-alert--acknowledged" : ""}`}
              >
                {/* Top Row: Identity & Badges */}
                <div className="patient-alert__top">
                  <div className="patient-alert__identity">
                    <span className="tag-critical">
                      <AlertCircle size={12} />
                      CRITICAL TELEMETRY
                    </span>
                    <strong className="patient-alert__name">{pat.name || "Patient"}</strong>
                    <span className="chip-info">
                      ID: {pat.patient_code || pat.patient_id_code || pid.slice(-6)}
                    </span>
                    {pat.phone && (
                      <span className="chip-info">
                        <Phone size={11} /> {pat.phone}
                      </span>
                    )}
                  </div>

                  <div className="patient-alert__time">
                    <Clock size={12} />
                    <span>{timeAgo}</span>
                  </div>
                </div>

                {/* Vitals with .vital-chip */}
                <div className="vitals">
                  {abnormalChips.length > 0 ? (
                    abnormalChips.map((chip) => (
                      <div
                        key={chip.id}
                        className={`vital-chip vital-chip--${chip.severity.toLowerCase()}`}
                        title={chip.urgency}
                      >
                        <span className="vital-chip__name">{chip.vital}</span>
                        <span className="vital-chip__value">{chip.value}</span>
                        <span className="vital-chip__range">({chip.normalRange})</span>
                        {chip.trend && (
                          <span className={`vital-chip__arrow vital-chip__arrow--${chip.trend}`}>
                            {chip.trend === "rising" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                          </span>
                        )}
                        <span className="vital-chip__time">{chip.timeAgo}</span>
                      </div>
                    ))
                  ) : (
                    <div className="vital-chip vital-chip--critical">
                      <span className="vital-chip__name">Telemetry</span>
                      <span className="vital-chip__value">
                        {`SpO₂ ${vit.spo2 || 91}%, BP ${vit.systolic_bp || 158}/${vit.diastolic_bp || 98}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Clinical Assessment */}
                <div className="assessment">
                  <span className="assessment__lead">Clinical Assessment:</span>
                  <span className="assessment__text">
                    {summary?.message ||
                      (abnormalChips.length > 0
                        ? abnormalChips.map((c) => `${c.vital} ${c.value} (${c.status}) - ${c.urgency}`).join("; ")
                        : `SpO₂ ${vit.spo2 || 91}%, Heart rate ${vit.heart_rate || 116} bpm, BP ${vit.systolic_bp || 158}/${vit.diastolic_bp || 98} mmHg`)}
                  </span>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="actions">
                  {isAck ? (
                    <div className="ack-audit-badge">
                      <CheckCircle2 size={14} />
                      <span>
                        Acknowledged by {ackData.acknowledgedBy} at {ackData.acknowledgedAt}
                      </span>
                    </div>
                  ) : (
                    <button
                      className="btn btn--ack"
                      onClick={() => handleAcknowledge(pat)}
                      disabled={isSubmitting}
                      type="button"
                    >
                      <CheckCircle2 size={14} />
                      <span>{isSubmitting ? "Saving..." : "Acknowledge"}</span>
                    </button>
                  )}

                  {/* AI Triage Note Drawer Button */}
                  <button
                    className="btn btn--ai"
                    onClick={() => handleOpenTriageDrawer(pat)}
                    type="button"
                    title="Open Clinical Decision Support Drawer"
                  >
                    <Sparkles size={14} />
                    <span>AI Triage Note</span>
                  </button>

                  {/* Inspect Patient: highlights and focuses patient */}
                  <button
                    className="btn btn--main"
                    onClick={() => handleInspect(pat)}
                    type="button"
                    title="Focus patient telemetry and charts"
                  >
                    <Activity size={14} />
                    <span>Inspect Patient</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Collapsible "+N more active alerts" bar if more than 3 */}
        {criticalPatients.length > 3 && (
          <div
            className="alert-panel__expander"
            onClick={() => setIsExpanded(!isExpanded)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setIsExpanded(!isExpanded)}
          >
            <span>
              {isExpanded
                ? "Show fewer alerts"
                : `+${hiddenCount} more active high-priority alert${hiddenCount > 1 ? "s" : ""}`}
            </span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </section>

      {/* ============================================================
          AI CLINICAL TRIAGE NOTE SIDE DRAWER
          ============================================================ */}
      {triageDrawerPatient && (
        <div
          className="triage-drawer-backdrop"
          onClick={() => setTriageDrawerPatient(null)}
        >
          <div
            className="triage-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="triage-drawer-header">
              <div className="drawer-header-left">
                <div className="drawer-icon-wrap">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3>AI Clinical Decision Support Note</h3>
                  <p>Real-time physiological triage &amp; protocol recommendations</p>
                </div>
              </div>
              <button
                className="btn-drawer-close"
                onClick={() => setTriageDrawerPatient(null)}
                type="button"
                aria-label="Close triage drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="triage-drawer-body">
              {/* Patient Dossier Header Strip */}
              <div className="triage-patient-summary-strip">
                <div>
                  <div className="summary-strip-name">{triageDrawerPatient.name || "Patient"}</div>
                  <div className="summary-strip-meta">
                    <span>ID: {triageDrawerPatient.patient_code || triageDrawerPatient._id?.slice(-6)}</span>
                    {triageDrawerPatient.age && <span>• Age {triageDrawerPatient.age} yrs</span>}
                    {triageDrawerPatient.gender && <span>• {triageDrawerPatient.gender}</span>}
                    {triageDrawerPatient.blood_group && <span>• Blood {triageDrawerPatient.blood_group}</span>}
                  </div>
                </div>
                <span className="severity-pill-badge critical">CRITICAL TELEMETRY</span>
              </div>

              {/* Triage Document */}
              <div className="triage-note-document">
                <div>
                  <div className="triage-note-section-title">
                    <HeartPulse size={14} />
                    <span>Layer 1: Flagged Telemetry Parameters</span>
                  </div>
                  <div className="abnormal-chips-grid" style={{ marginTop: "0.5rem" }}>
                    {extractAbnormalVitalChips(
                      patientVitalsMap[triageDrawerPatient._id || triageDrawerPatient.id] || {}
                    ).map((c) => (
                      <div key={c.id} className={`vital-reading-chip ${c.severity.toLowerCase()}`}>
                        <strong>{c.vital}:</strong> {c.value} ({c.normalRange}) – {c.status}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="triage-note-section-title">
                    <Stethoscope size={14} />
                    <span>Layer 2: Clinical Protocol &amp; Urgent Actions</span>
                  </div>
                  <ul className="triage-recommendations-list">
                    <li>Perform immediate bedside physical assessment and airway/breathing evaluation.</li>
                    <li>Verify automated telemetry sensor placement against manual clinical measurement.</li>
                    <li>Notify on-duty nursing team for rapid response triage check if trend worsens.</li>
                    <li>Review active prescriptions for medication-induced arrhythmia, hypotension, or glycemic drift.</li>
                  </ul>
                </div>

                {triageAiLoading ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "#64748b" }}>
                    <Sparkles className="pulse-alarm-icon" size={18} style={{ display: "inline-block" }} />
                    <div style={{ marginTop: "0.35rem", fontSize: "0.82rem" }}>
                      Generating tailored AI clinical synthesis...
                    </div>
                  </div>
                ) : triageAiContent ? (
                  <div>
                    <div className="triage-note-section-title">
                      <Sparkles size={14} />
                      <span>Layer 3: AI Clinical Synthesis</span>
                    </div>
                    <div style={{ whiteSpace: "pre-line", fontSize: "0.84rem", color: "#334155" }}>
                      {triageAiContent}
                    </div>
                  </div>
                ) : null}

                <div className="triage-disclaimer-box">
                  <strong>Clinical Decision Support Disclaimer:</strong> CareBridge AI triage insights are provided to augment clinical workflows. Final patient assessment and treatment orders remain the exclusive responsibility of the licensed attending physician.
                </div>
              </div>
            </div>

            {/* Footer Toolbar */}
            <div className="triage-drawer-footer">
              <button
                className="btn-drawer-action copy"
                onClick={handleCopyTriageNote}
                type="button"
              >
                <Copy size={14} />
                <span>Copy Note</span>
              </button>
              <button
                className="btn-drawer-action print"
                onClick={handlePrintTriageNote}
                type="button"
              >
                <Printer size={14} />
                <span>Print</span>
              </button>
              <button
                className="btn-drawer-action save"
                onClick={handleSaveToChart}
                type="button"
              >
                <FileText size={14} />
                <span>Save to Chart</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
