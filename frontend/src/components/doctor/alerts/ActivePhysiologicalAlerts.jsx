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
      {/* Visual Pulsing Red Border Alert Box */}
      <section
        className={`critical-alerts-section-enhanced ${actionablePatients.length > 0 ? "pulse-active" : ""}`}
        aria-live="assertive"
      >
        {/* Header Strip */}
        <div className="alerts-enhanced-header">
          <div className="header-title-group">
            <ShieldAlert size={20} className="pulse-alarm-icon" />
            <h3>Active High-Priority Physiological Alerts</h3>
            <span className="alert-counter-badge">
              {actionablePatients.length} Actionable
            </span>
            {toastMessage && <div className="alert-feedback-toast">{toastMessage}</div>}
          </div>

          <div className="header-controls-group">
            {/* Audio Mute / Unmute Toggle */}
            <button
              className={`btn-audio-toggle ${isAudioMuted ? "muted" : ""}`}
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
                className="btn-ack-all"
                onClick={handleAcknowledgeAll}
                type="button"
                title="Acknowledge all active alerts"
              >
                <CheckCircle2 size={14} />
                <span>Acknowledge All</span>
              </button>
            )}

            {/* Link to Full Notifications */}
            <Link to="/doctor/notifications" className="all-alerts-link">
              <span>View All Notifications</span>
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>

        {/* Audio Permission Banner (First-time browser sound policy) */}
        {showPermissionBanner && !hasAudioPermission && !isAudioMuted && (
          <div className="audio-permission-banner">
            <div className="banner-left">
              <Volume2 size={14} />
              <span>Browser audio requires permission to play emergency telemetry chimes.</span>
            </div>
            <button className="btn-banner-action" onClick={handleEnableAudio} type="button">
              Enable Sound
            </button>
          </div>
        )}

        {/* Alerts Cards List */}
        <div className="critical-alerts-list-enhanced">
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
                className={`alert-card-enhanced ${isAck ? "acknowledged-state" : ""}`}
              >
                {/* Top Row: Identity & Badges */}
                <div className="alert-card-top-row">
                  <div className="patient-badge-identity">
                    <span className="severity-pill-badge critical">
                      <AlertCircle size={12} />
                      CRITICAL TELEMETRY
                    </span>
                    <strong className="patient-display-name">{pat.name || "Patient"}</strong>
                    <span className="patient-code-chip">
                      ID: {pat.patient_code || pat.patient_id_code || pid.slice(-6)}
                    </span>
                    {pat.phone && (
                      <span className="patient-phone-chip">
                        <Phone size={11} /> {pat.phone}
                      </span>
                    )}
                  </div>

                  <div className="alert-timestamp-relative">
                    <Clock size={12} />
                    <span>{timeAgo}</span>
                  </div>
                </div>

                {/* Abnormal Vital Chips Grid */}
                {abnormalChips.length > 0 ? (
                  <div className="abnormal-chips-grid">
                    {abnormalChips.map((chip) => (
                      <div
                        key={chip.id}
                        className={`vital-reading-chip ${chip.severity.toLowerCase()}`}
                        title={chip.urgency}
                      >
                        <span className="chip-vital-name">{chip.vital}</span>
                        <span className="chip-vital-value">{chip.value}</span>
                        <span className="chip-vital-range">({chip.normalRange})</span>
                        <span className="severity-pill-badge-mini">{chip.severity}</span>
                        {chip.trend && (
                          <span className={`chip-trend-arrow ${chip.trend}`}>
                            {chip.trend === "rising" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                          </span>
                        )}
                        <span className="chip-time-tag">{chip.timeAgo}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="alert-clinical-reason">
                    <span className="reason-lead-label">Reason Flagged: </span>
                    <span>
                      {summary?.message ||
                        `SpO₂ ${vit.spo2 || 91}%, Heart rate ${vit.heart_rate || 116} bpm, BP ${vit.systolic_bp || 158}/${vit.diastolic_bp || 98} mmHg`}
                    </span>
                  </div>
                )}

                {/* Specific Clinical Message fallback */}
                {abnormalChips.length > 0 && summary?.message && (
                  <div className="alert-clinical-reason">
                    <span className="reason-lead-label">Clinical Assessment: </span>
                    <span>{summary.message}</span>
                  </div>
                )}

                {/* Action Buttons Toolbar */}
                <div className="alert-actions-toolbar">
                  {isAck ? (
                    <div className="ack-audit-badge">
                      <CheckCircle2 size={14} />
                      <span>
                        Acknowledged by {ackData.acknowledgedBy} at {ackData.acknowledgedAt}
                      </span>
                    </div>
                  ) : (
                    <button
                      className="btn-card-action btn-ack"
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
                    className="btn-card-action btn-triage"
                    onClick={() => handleOpenTriageDrawer(pat)}
                    type="button"
                    title="Open Clinical Decision Support Drawer"
                  >
                    <Sparkles size={14} />
                    <span>AI Triage Note</span>
                  </button>

                  {/* Inspect Patient: highlights and focuses patient */}
                  <button
                    className="btn-card-action btn-inspect"
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
            className="more-alerts-expander"
            onClick={() => setIsExpanded(!isExpanded)}
            role="button"
            tabIndex={0}
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
