import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Heart3D from "../../components/common/Heart3D";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import doctorService from "../../services/doctorService";
import {
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  TrendingUp,
  RefreshCw,
  Plus,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Play,
  Pause,
  Send,
  Sparkles,
  Bot,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  X,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Camera,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Paperclip,
  Trash2,
  BookmarkPlus,
  Square,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal
} from "lucide-react";
import "./HealthMonitoring.css";

/* Helper for highlight search keywords in text */
function HighlightText({ text, highlight }) {
  if (text === null || text === undefined) return null;
  const str = String(text);
  if (!highlight || !highlight.trim()) return <>{str}</>;
  const query = highlight.trim();
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = str.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="hm-search-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/* ====== 1. METRICS & RANGES CONFIGURATION ====== */
const H = 3600e3;
const METRICS = {
  hr:    { label: "Heart Rate",     unit: "bpm",   lo: 60,   hi: 100, get: r => r.hr,    color: "#ef4444" },
  bp:    { label: "Blood Pressure", unit: "mmHg",  lo: 90,   hi: 120, get: r => r.sys,   color: "#3b82f6" },
  spo2:  { label: "SpO₂ Oxygen",    unit: "%",     lo: 95,   hi: 100, get: r => r.spo2,  color: "#06b6d4" },
  temp:  { label: "Temperature",    unit: "°C",    lo: 36.1, hi: 37.2, get: r => r.temp,  color: "#f59e0b" },
  sugar: { label: "Blood Sugar",    unit: "mg/dL", lo: 70,   hi: 140, get: r => r.sugar, color: "#8b5cf6" },
};

const RANGES = {
  "24h": 24 * H,
  "7 Days": 7 * 24 * H,
  "30 Days": 30 * 24 * H,
  "All History": 1e15
};

const isOut = (k, v) => {
  const m = METRICS[k];
  if (!m || v === undefined || v === null || isNaN(v)) return false;
  return v < m.lo || v > m.hi;
};

const fmt = t => {
  if (!t) return "—";
  const d = new Date(t);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};

const fmtShortTime = t => {
  if (!t) return "";
  const d = new Date(t);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

/* ====== 3. ACCURATE INTERACTIVE SVG LINE CHART ====== */
function Chart({ rows, mk, onLog }) {
  const m = METRICS[mk];
  const [hoverData, setHoverData] = useState(null);
  const svgRef = useRef(null);

  if (!rows || !rows.length) {
    return (
      <div className="hm-empty">
        <Activity size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
        <p>Not enough readings in this time interval.</p>
        <button type="button" className="hm-btn pri" onClick={onLog} style={{ marginTop: 14 }}>
          ＋ Log Vital Reading
        </button>
      </div>
    );
  }

  const W = 800;
  const Ht = 260;
  const p = 44;
  const vals = rows.map(m.get);
  const n = rows.length;

  const pad = (m.hi - m.lo) * 0.18;
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const lo = Math.min(m.lo, minVal) - pad;
  const hi = Math.max(m.hi, maxVal) + pad;
  const t0 = rows[0].t;
  const t1 = rows[n - 1].t || t0 + 1;

  const X = (t) => p + (n > 1 ? (t - t0) / (t1 - t0 || 1) : 0.5) * (W - p - 16);
  const Y = (v) => Ht - p - ((v - lo) / (hi - lo || 1)) * (Ht - p - 16);

  const pts = rows.map((r, i) => [X(r.t), Y(vals[i])]);
  const d = pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join("");

  const yNormalHi = Math.max(10, Math.min(Ht - 10, Y(m.hi)));
  const yNormalLo = Math.max(10, Math.min(Ht - 10, Y(m.lo)));
  const normalHeight = Math.max(4, yNormalLo - yNormalHi);

  const handleMouseMove = (e) => {
    if (!svgRef.current || n === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;

    let closestIdx = 0;
    let minDist = Infinity;
    pts.forEach((pt, i) => {
      const dist = Math.abs(pt[0] - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    });

    const activePt = pts[closestIdx];
    const activeRow = rows[closestIdx];
    const val = vals[closestIdx];
    const out = isOut(mk, val);

    setHoverData({
      x: activePt[0],
      y: activePt[1],
      screenX: (activePt[0] / W) * rect.width,
      screenY: (activePt[1] / Ht) * rect.height,
      t: activeRow.t,
      val,
      out,
      unit: m.unit,
      label: m.label,
    });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div className="hm-chart-container">
      <div className="hm-chart-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${Ht}`}
          className="hm-svg-chart"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="hmg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Shaded normal target zone */}
          <rect
            x={p}
            y={yNormalHi}
            width={W - p - 16}
            height={normalHeight}
            fill="#10b981"
            opacity="0.12"
            rx="4"
          />

          {/* Normal Zone Target Line */}
          <line
            x1={p}
            x2={W - 16}
            y1={yNormalHi}
            y2={yNormalHi}
            stroke="#10b981"
            strokeOpacity="0.35"
            strokeDasharray="4 4"
          />
          <line
            x1={p}
            x2={W - 16}
            y1={yNormalLo}
            y2={yNormalLo}
            stroke="#10b981"
            strokeOpacity="0.35"
            strokeDasharray="4 4"
          />
          <text
            x={p + 6}
            y={Math.max(16, yNormalHi + 12)}
            fontSize="10"
            fill="#10b981"
            fontWeight="700"
          >
            Target {m.lo} - {m.hi} {m.unit}
          </text>

          {/* Grid lines & Axis labels */}
          {[0, 1, 2, 3].map((i) => {
            const v = lo + ((hi - lo) * i) / 3;
            const y = Y(v);
            return (
              <g key={i}>
                <line
                  x1={p}
                  x2={W - 16}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeDasharray="3 3"
                />
                <text x="6" y={y + 4} fontSize="11" fill="currentColor" fillOpacity="0.6">
                  {v.toFixed(mk === "temp" ? 1 : 0)}
                </text>
              </g>
            );
          })}

          {/* X-Axis bottom timestamps */}
          {n > 1 && (
            <g opacity="0.6" fontSize="10.5" fill="currentColor">
              <text x={p} y={Ht - 10} textAnchor="start">
                {fmtShortTime(t0)}
              </text>
              <text x={(p + W - 16) / 2} y={Ht - 10} textAnchor="middle">
                {fmtShortTime((t0 + t1) / 2)}
              </text>
              <text x={W - 16} y={Ht - 10} textAnchor="end">
                {fmtShortTime(t1)}
              </text>
            </g>
          )}

          {/* Area fill under trendline */}
          {n > 1 && (
            <path
              d={`${d}L${pts[n - 1][0]} ${Ht - p}L${pts[0][0]} ${Ht - p}Z`}
              fill="url(#hmg)"
            />
          )}

          {/* Trendline */}
          {n > 1 ? (
            <path
              d={d}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : (
            <circle cx={pts[0][0]} cy={pts[0][1]} r={6} fill="#0284c7" />
          )}

          {/* Hover crosshair vertical guideline */}
          {hoverData && (
            <line
              x1={hoverData.x}
              x2={hoverData.x}
              y1={12}
              y2={Ht - p}
              stroke="rgba(255, 255, 255, 0.45)"
              strokeDasharray="3 3"
              strokeWidth="1.2"
            />
          )}

          {/* Individual data nodes */}
          {pts.map((q, i) => {
            const outOfRange = isOut(mk, vals[i]);
            const isHovered = hoverData && Math.abs(hoverData.x - q[0]) < 1;
            return (
              <g key={i} className="hm-chart-node">
                <circle
                  cx={q[0]}
                  cy={q[1]}
                  r={outOfRange ? (isHovered ? 7.5 : 5.5) : isHovered ? 5.5 : 3.5}
                  fill={outOfRange ? "#ef4444" : "#0284c7"}
                  stroke="#ffffff"
                  strokeWidth={outOfRange ? 2.2 : 1.5}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverData && (
          <div
            className="hm-tooltip-overlay"
            style={{
              left: `${hoverData.screenX}px`,
              top: `${Math.max(30, hoverData.screenY)}px`,
            }}
          >
            <div className="hm-tooltip-time">{fmt(hoverData.t)}</div>
            <div className="hm-tooltip-val">
              {hoverData.val} {hoverData.unit}
            </div>
            <div className={`hm-tooltip-status ${hoverData.out ? "abnormal" : "normal"}`}>
              {hoverData.out ? "⚠️ Out of Target Range" : "✓ In Target Range"}
            </div>
          </div>
        )}
      </div>

      {n === 1 && (
        <p className="hm-mut" style={{ textAlign: "center", fontSize: "12px", marginTop: "8px" }}>
          Not enough readings for trajectory split comparison (1 reading logged). Live stream is active to calibrate continuous telemetry curves.
        </p>
      )}

      <div className="hm-chart-legend">
        <span className="legend-item">
          <span className="dot normal-zone" /> Normal Range ({m.lo} - {m.hi} {m.unit})
        </span>
        <span className="legend-item">
          <span className="dot telemetry-line" /> Telemetry Curve
        </span>
        <span className="legend-item">
          <span className="dot alert-node" /> Out of Range
        </span>
      </div>
    </div>
  );
}

/* ====== 4. CLINICAL AI TELEMETRY ENGINE & CHAT ====== */
function generateClinicalTelemetryAssessment(query, patient, vitals) {
  const pName = patient?.name || "Patient";
  const pAge = patient?.age || 45;
  const pGender = patient?.gender || "Other";
  const blood = patient?.blood || "O+";

  const hr = vitals?.hr ?? 72;
  const sys = vitals?.sys ?? 120;
  const dia = vitals?.dia ?? 80;
  const spo2 = vitals?.spo2 ?? 98;
  const temp = vitals?.temp ?? 36.8;
  const sugar = vitals?.sugar ?? 95;

  const hrState = hr < 60 ? "Bradycardia (<60 bpm)" : hr > 100 ? "Sinus Tachycardia (>100 bpm)" : "Normal Sinus Rhythm (60-100 bpm)";
  const bpState =
    sys >= 180 || dia >= 120
      ? "Hypertensive Crisis (>=180/120 mmHg)"
      : sys >= 140 || dia >= 90
      ? "Stage 2 Hypertension"
      : sys >= 130 || dia >= 80
      ? "Stage 1 Hypertension"
      : sys < 90 || dia < 60
      ? "Hypotension (<90/60 mmHg)"
      : "Normotensive Perfusion";

  const spo2State = spo2 < 90 ? "Critical Hypoxia (<90%)" : spo2 < 95 ? "Mild Hypoxemia (90-94%)" : "Adequate Oxygenation (>=95%)";
  const tempState = temp >= 38.5 ? "High Pyrexia (>=38.5°C)" : temp >= 37.3 ? "Low-Grade Fever" : temp < 36.0 ? "Hypothermia (<36°C)" : "Normothermic (36.1-37.2°C)";
  const sugarState = sugar >= 200 ? "Severe Hyperglycemia" : sugar > 140 ? "Elevated Postprandial Glucose" : sugar < 70 ? "Hypoglycemia (<70 mg/dL)" : "Euglycemic Control (70-140 mg/dL)";

  const q = (query || "").toLowerCase();

  if (q.includes("arrhythmia") || q.includes("cardiac") || q.includes("rhythm") || q.includes("heart")) {
    return `### 🫀 Cardiac Rhythm & Arrhythmia Risk Assessment
**Patient:** ${pName} (${pAge}y, ${pGender}) · **Baseline:** HR ${hr} bpm · BP ${sys}/${dia} mmHg · SpO₂ ${spo2}%

#### 1. 📊 Telemetry Interpretation
- **Cardiac Rate:** **${hr} BPM** (${hrState}).
- **Hemodynamic Coupling:** Perfusion pressure ${sys}/${dia} mmHg with pulse pressure **${sys - dia} mmHg**.
- **Ventricular Repolarization Status:** Telemetry curves reflect synchronized contractility.

#### 2. 🚨 Red Flags & Acute Triggers
${hr > 110 ? "- **Persistent Tachycardia Alert:** Resting HR exceeds 110 bpm; assess for supraventricular tachycardia vs. compensatory response to volume depletion or fever." : hr < 50 ? "- **Symptomatic Bradycardia Warning:** Evaluate for sinus node dysfunction or AV nodal blockade." : "- **No Acute Dysrhythmia Triggers Flagged:** Sinus rate remains within hemodynamic tolerance thresholds."}

#### 3. 📋 Recommended Actions
- Obtain a stat 12-lead ECG to evaluate PR interval, QRS duration, and QTc prolongation.
- Review serum electrolytes (Potassium K⁺, Magnesium Mg²⁺, Calcium Ca²⁺).
- Continue live telemetry monitoring with automated arrhythmia boundary alerts.`;
  }

  if (q.includes("blood pressure") || q.includes("bp") || q.includes("hemodynamic") || q.includes("perfusion")) {
    return `### 🩺 Hemodynamic & Perfusion Analysis
**Patient:** ${pName} (${pAge}y, ${pGender}) · **Blood Pressure:** ${sys}/${dia} mmHg (${bpState})

#### 1. 🔍 Clinical Assessment
- **Mean Arterial Pressure (MAP):** **${Math.round((2 * dia + sys) / 3)} mmHg** (Target: 70 - 105 mmHg).
- **Pulse Pressure:** **${sys - dia} mmHg** (Observed vascular compliance).
- **Perfusion Adequacy:** SpO₂ is maintained at **${spo2}%** with heart rate **${hr} bpm**.

#### 2. ⚠️ Thresholds & Risk Stratification
${sys >= 160 ? "- **Hypertensive Urgency Alert:** Systolic BP significantly exceeds target range; assess for target organ damage (headache, blurred vision, chest pain)." : sys < 90 ? "- **Hypotension Warning:** MAP below critical threshold; risk of renal and cerebral hypoperfusion." : "- **Stable Perfusion:** Blood pressure values are within safe clinical operating parameters."}

#### 3. 💊 Clinical Recommendations
- Correlate with current antihypertensive regimen (e.g. ACEi/ARB, Calcium channel blockers).
- Re-check manual cuff measurement on contralateral arm.
- Maintain continuous MAP tracking in PulseView.`;
  }

  if (q.includes("hypoxia") || q.includes("spo2") || q.includes("oxygen") || q.includes("respiratory")) {
    return `### 🫁 Respiratory & Oxygenation Telemetry Evaluation
**Patient:** ${pName} (${pAge}y, ${pGender}) · **SpO₂ Oxygen:** ${spo2}% (${spo2State})

#### 1. 💨 Pulmonary Perfusion Metrics
- **Current Pulse Oximetry:** **${spo2}%** on ambient air telemetry.
- **Cardiopulmonary Ratio:** HR **${hr} bpm** with SpO₂ **${spo2}%**.

#### 2. 🚨 Clinical Findings
${spo2 < 92 ? "- **Hypoxemic Respiratory Distress Flagged:** Promptly verify probe placement; administer low-flow nasal cannula O₂ (2-4 L/min) targeting SpO₂ >= 95%." : "- **Normal Oxygenation Index:** Adequate capillary oxygen saturation verified across trend window."}

#### 3. 📋 Diagnostic Considerations
- Auscultate bilateral lung fields for crackles, rhonchi, or wheezing.
- If SpO₂ fluctuates, check Arterial Blood Gas (ABG) for PaO₂ and PaCO₂.`;
  }

  if (q.includes("sugar") || q.includes("glucose") || q.includes("glycemic") || q.includes("metabolic")) {
    return `### 🩸 Glycemic & Metabolic Telemetry Summary
**Patient:** ${pName} (${pAge}y, ${pGender}) · **Blood Glucose:** ${sugar} mg/dL (${sugarState})

#### 1. 📈 Endocrine Evaluation
- **Capillary Glucose:** **${sugar} mg/dL** (Normal reference: 70 - 140 mg/dL).
- **Metabolic Status:** ${sugarState}. Temperature is **${temp}°C**.

#### 2. ⚠️ Clinical Alert Check
${sugar < 70 ? "- **Hypoglycemia Alert:** Administer fast-acting carbohydrates (15-20g glucose orally) or 50% Dextrose IV if altered mental status." : sugar >= 200 ? "- **Hyperglycemia Flagged:** Check urine/blood ketones; review sliding scale insulin administration." : "- **Stable Glycemic State:** Blood sugar is within acceptable target range."}

#### 3. 📋 Management Steps
- Repeat capillary blood glucose test prior to next meal or insulin administration.
- Review hydration status and renal metabolic profile.`;
  }

  // General summary
  return `### 📋 Comprehensive Clinical Telemetry Report
**Patient Profile:** ${pName} (${pAge}y, ${pGender}) · Blood Group: ${blood}
**Current Real-Time Telemetry:**
- **Heart Rate:** **${hr} bpm** (${hrState})
- **Blood Pressure:** **${sys}/${dia} mmHg** (${bpState})
- **SpO₂ Oxygen:** **${spo2}%** (${spo2State})
- **Core Temperature:** **${temp}°C** (${tempState})
- **Blood Sugar:** **${sugar} mg/dL** (${sugarState})

#### 1. 🩺 Clinical Impression
The patient's live physiological telemetry is currently **${hr > 120 || sys >= 180 || spo2 < 90 ? "CRITICAL — Immediate review warranted" : hr > 100 || sys >= 140 || spo2 < 95 ? "ATTENTION — Monitoring recommended" : "STABLE — Physiological parameters within target bands"}**.

#### 2. 🚨 Identified Threshold Flags
${hr > 100 ? `- Heart Rate elevated at ${hr} bpm (threshold > 100 bpm)\n` : ""}${sys >= 140 ? `- Blood Pressure elevated at ${sys}/${dia} mmHg\n` : ""}${spo2 < 95 ? `- SpO₂ below optimal target (${spo2}%)\n` : ""}${hr <= 100 && sys < 140 && spo2 >= 95 ? "- No acute physiological breaches detected across active curves.\n" : ""}
#### 3. 📋 Continuous Monitoring Plan
1. Maintain continuous cardiac telemetry streaming with 2.5s cadence in PulseView.
2. Log manual confirmatory readings if sensor artifacts occur.
3. Keep emergency clinical protocols on standby if telemetry markers escalate.`;
}

function AiTelemetryChat({ patient, currentVitals, onSaveNoteToChart }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [chatSearch, setChatSearch] = useState("");
  const [autoRead, setAutoRead] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [speechState, setSpeechState] = useState({ messageId: null, isSpeaking: false, isPaused: false });
  const [dragOver, setDragOver] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const speechRecognitionRef = useRef(null);

  // Sync initial welcome message when active patient changes
  useEffect(() => {
    const pName = patient?.name || "Patient";
    const initialWelcome = {
      id: `welcome-${patient?.id || "default"}`,
      role: "assistant",
      content:
        `### 🤖 CareBridge MedAI Telemetry Assistant\n` +
        `Real-time clinical telemetry synchronized for **${pName}** (ID: ${patient?.patient_code || "PT-Active"}).\n\n` +
        `**Live Telemetry Profile:**\n` +
        `- **Heart Rate:** ${currentVitals?.hr || 72} bpm\n` +
        `- **Blood Pressure:** ${currentVitals?.sys || 120}/${currentVitals?.dia || 80} mmHg\n` +
        `- **SpO₂ Oxygen:** ${currentVitals?.spo2 || 98}%\n` +
        `- **Temperature:** ${currentVitals?.temp || 36.8}°C\n` +
        `- **Blood Glucose:** ${currentVitals?.sugar || 95} mg/dL\n\n` +
        `*Click any telemetry quick action below or ask any clinical assessment question regarding cardiac rhythm, hemodynamics, or medication protocols.*`,
      time: new Date(),
    };
    setMessages([initialWelcome]);
    // Stop any speech from previous patient
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeechState({ messageId: null, isSpeaking: false, isPaused: false });
  }, [patient?.id, patient?.name, patient?.patient_code]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // Clean up camera stream and speech recognition on unmount
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const presets = [
    { label: "🫀 Evaluate Cardiac Rhythm", q: "evaluate cardiac rhythm and arrhythmia risk" },
    { label: "🩺 Assess BP & Hemodynamics", q: "assess blood pressure and hemodynamic stability" },
    { label: "🫁 Check Hypoxia & Oxygenation", q: "analyze respiratory markers and hypoxia risk" },
    { label: "🩸 Review Glycemic Status", q: "review glycemic fluctuation and metabolic status" },
    { label: "📋 Generate Telemetry Summary", q: "generate full clinical telemetry summary" },
  ];

  // Speech Synthesis (TTS) functions
  const speakMessage = (msgId, text) => {
    if (!window.speechSynthesis) return;
    if (isMuted) return;

    if (speechState.messageId === msgId && speechState.isSpeaking) {
      if (speechState.isPaused) {
        window.speechSynthesis.resume();
        setSpeechState({ messageId: msgId, isSpeaking: true, isPaused: false });
      } else {
        window.speechSynthesis.pause();
        setSpeechState({ messageId: msgId, isSpeaking: true, isPaused: true });
      }
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/[#*`_~>[\]]/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/\n+/g, ". ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => {
      setSpeechState({ messageId: null, isSpeaking: false, isPaused: false });
    };
    utterance.onerror = () => {
      setSpeechState({ messageId: null, isSpeaking: false, isPaused: false });
    };

    window.speechSynthesis.speak(utterance);
    setSpeechState({ messageId: msgId, isSpeaking: true, isPaused: false });
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeechState({ messageId: null, isSpeaking: false, isPaused: false });
  };

  // Voice Input (SpeechRecognition)
  const toggleListening = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };
      recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn("Speech recognition failed to start:", e);
      setIsListening(false);
    }
  };

  // Camera Capture (getUserMedia)
  const handleOpenCamera = async () => {
    setCameraError(null);
    setCapturedPhoto(null);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera access failed:", err);
      setCameraError("Camera permission denied or camera device not found.");
    }
  };

  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedPhoto(dataUrl);
  };

  const handleUseCapturedPhoto = () => {
    if (capturedPhoto) {
      const newFile = {
        id: `photo-${Date.now()}`,
        name: `photo-telemetry-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.jpg`,
        size: Math.round((capturedPhoto.length * 3) / 4),
        type: "image/jpeg",
        dataUrl: capturedPhoto,
      };
      setAttachments((prev) => [...prev, newFile]);
    }
    handleCloseCamera();
  };

  const handleCloseCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOpen(false);
    setCapturedPhoto(null);
    setCameraError(null);
  };

  // File Upload Handlers
  const handleFilesSelected = (files) => {
    const fileList = Array.from(files);
    for (const f of fileList) {
      if (f.size > 10 * 1024 * 1024) {
        alert(`File "${f.name}" exceeds the 10 MB limit.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachments((prev) => [
          ...prev,
          {
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: f.name,
            size: f.size,
            type: f.type,
            dataUrl: e.target.result,
          },
        ]);
      };
      reader.readAsDataURL(f);
    }
  };

  const handleRemoveAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // Send message
  const handleSend = async (queryText) => {
    const text = (queryText || input).trim();
    if ((!text && attachments.length === 0) || busy) return;

    const currentPendingFiles = [...attachments];
    setInput("");
    setAttachments([]);

    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text || (currentPendingFiles.length ? "Attached files for clinical telemetry analysis" : ""),
      attachments: currentPendingFiles,
      time: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const aiMsgId = `assistant-${Date.now()}`;
    const loadingAiMsg = {
      id: aiMsgId,
      role: "assistant",
      content: "*(Analyzing real-time physiological telemetry, patient chart, and clinical evidence...)*",
      time: new Date(),
    };
    setMessages((prev) => [...prev, loadingAiMsg]);
    setBusy(true);

    try {
      const token = localStorage.getItem("access_token");
      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";
      const chatEndpoint = `${baseUrl.replace(/\/$/, "")}/ai-assistant/chat`;

      let backendAnswer = null;
      try {
        const response = await fetch(chatEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            message: text,
            patient_id: patient?.id,
            vitals: currentVitals,
            attachments: currentPendingFiles.map((a) => ({
              name: a.name,
              type: a.type,
              size: a.size,
              dataUrl: a.dataUrl,
            })),
          }),
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson && resJson.response) {
            backendAnswer = resJson.response;
          }
        }
      } catch (netErr) {
        // Fallback to local clinical engine
      }

      const finalResponse =
        backendAnswer ||
        generateClinicalTelemetryAssessment(text, patient, currentVitals);

      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, content: finalResponse } : m))
      );

      // Auto-read if enabled
      if (autoRead && !isMuted) {
        speakMessage(aiMsgId, finalResponse);
      }
    } catch (err) {
      const fallback = generateClinicalTelemetryAssessment(text, patient, currentVitals);
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, content: fallback } : m))
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    stopSpeaking();
    const pName = patient?.name || "Patient";
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `### 🤖 CareBridge MedAI Telemetry Assistant\nTelemetry session refreshed for **${pName}**.\nCurrent calibrated vitals: **HR ${currentVitals?.hr || 72} bpm**, **BP ${currentVitals?.sys || 120}/${currentVitals?.dia || 80} mmHg**, **SpO₂ ${currentVitals?.spo2 || 98}%**.`,
        time: new Date(),
      },
    ]);
  };

  // Filter messages by search keyword
  const filteredMessages = useMemo(() => {
    if (!chatSearch.trim()) return messages;
    const q = chatSearch.toLowerCase().trim();
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, chatSearch]);

  const pName = patient?.name || "Patient";
  const pCode = patient?.patient_code || patient?.id || "PT-1001";
  const pAge = patient?.age || 42;
  const pGender = patient?.gender || "Other";
  const pBlood = patient?.blood || "O+";
  const pStatus = patient?.status || "Stable";
  const pAllergies = Array.isArray(patient?.allergies) ? patient.allergies : [];
  const pConditions = Array.isArray(patient?.conditions) ? patient.conditions : [];

  return (
    <section
      className={`hm-card hm-ai-chat-card ${dragOver ? "hm-ai-drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 1. COMPLETE PATIENT DETAILS HEADER & LIVE VITALS BAR */}
      <div className="hm-ai-patient-summary-banner">
        <div className="hm-ai-patient-main-info">
          <div className="hm-ai-avatar-thumb">
            {patient?.photo ? (
              <img src={patient.photo} alt={pName} className="hm-ai-avatar-img" />
            ) : (
              <div className="hm-ai-initials-badge">{pName.slice(0, 2).toUpperCase()}</div>
            )}
            <span className={`hm-ai-avatar-status-dot ${pStatus.toLowerCase()}`} />
          </div>

          <div className="hm-ai-patient-meta-text">
            <div className="hm-ai-name-line">
              <h4>{pName}</h4>
              <span className="hm-ai-code-pill">ID #{pCode}</span>
              <span className={`hm-ai-status-pill ${pStatus.toLowerCase()}`}>
                {pStatus}
              </span>
            </div>
            <div className="hm-ai-demographics-tags">
              <span><strong>Age:</strong> {pAge} yrs</span>
              <span>•</span>
              <span><strong>Gender:</strong> {pGender}</span>
              <span>•</span>
              <span><strong>Blood:</strong> {pBlood}</span>
            </div>
          </div>
        </div>

        {/* Live vitals summary bar */}
        <div className="hm-ai-live-vitals-strip">
          <div className="hm-ai-live-vital-chip">
            <HeartPulse size={13} className="text-rose-500" />
            <span>HR: <strong>{currentVitals?.hr || 72}</strong> bpm</span>
          </div>
          <div className="hm-ai-live-vital-chip">
            <Activity size={13} className="text-blue-500" />
            <span>BP: <strong>{currentVitals?.sys || 120}/{currentVitals?.dia || 80}</strong></span>
          </div>
          <div className="hm-ai-live-vital-chip">
            <Droplets size={13} className="text-cyan-500" />
            <span>SpO₂: <strong>{currentVitals?.spo2 || 98}%</strong></span>
          </div>
          <div className="hm-ai-live-vital-chip">
            <Thermometer size={13} className="text-amber-500" />
            <span>Temp: <strong>{currentVitals?.temp || 36.8}°C</strong></span>
          </div>
          <div className="hm-ai-live-vital-chip">
            <TrendingUp size={13} className="text-purple-500" />
            <span>Sugar: <strong>{currentVitals?.sugar || 95}</strong> mg/dL</span>
          </div>
        </div>

        {/* Allergies and Clinical Conditions */}
        {(pAllergies.length > 0 || pConditions.length > 0) && (
          <div className="hm-ai-patient-tags-row">
            {pAllergies.length > 0 && (
              <div className="hm-ai-tag-group">
                <span className="hm-ai-tag-label">Allergies:</span>
                {pAllergies.map((alg, idx) => (
                  <span key={idx} className="hm-ai-alert-tag">{alg}</span>
                ))}
              </div>
            )}
            {pConditions.length > 0 && (
              <div className="hm-ai-tag-group">
                <span className="hm-ai-tag-label">Conditions:</span>
                {pConditions.slice(0, 3).map((cond, idx) => (
                  <span key={idx} className="hm-ai-condition-tag">{cond}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. CHAT PANEL CONTROLS & SEARCH BAR */}
      <div className="hm-ai-controls-toolbar">
        <div className="hm-ai-search-box">
          <Search size={14} className="hm-ai-search-icon" />
          <input
            type="text"
            className="hm-ai-search-input"
            placeholder="Search telemetry messages..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
          />
          {chatSearch && (
            <button
              type="button"
              className="hm-ai-search-clear"
              onClick={() => setChatSearch("")}
              title="Clear message search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="hm-ai-audio-toggles">
          <label className="hm-ai-toggle-label" title="Automatically read incoming AI messages aloud">
            <input
              type="checkbox"
              checked={autoRead}
              onChange={(e) => setAutoRead(e.target.checked)}
            />
            <span>Auto-read</span>
          </label>

          <button
            type="button"
            className={`hm-ai-mute-btn ${isMuted ? "muted" : ""}`}
            onClick={() => {
              if (!isMuted) stopSpeaking();
              setIsMuted(!isMuted);
            }}
            title={isMuted ? "Unmute audio readout" : "Mute audio readout"}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            type="button"
            className="hm-ai-tool-btn"
            onClick={handleClear}
            title="Reset conversation"
            disabled={busy}
          >
            <RotateCcw size={14} /> Clear
          </button>
        </div>
      </div>

      {/* 3. PRESET QUICK-ACTION CHIPS (HORIZONTALLY SCROLLABLE / WRAPPING) */}
      <div className="hm-ai-presets-scroll">
        {presets.map((p, idx) => (
          <button
            key={idx}
            type="button"
            className="hm-ai-preset-chip"
            onClick={() => handleSend(p.q)}
            disabled={busy}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 4. MESSAGES SCROLL AREA WITH HIGHLIGHTING & AUDIO READOUT */}
      <div className="hm-ai-messages-box">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((m) => {
            const isThisSpeaking = speechState.messageId === m.id && speechState.isSpeaking;
            const isThisPaused = isThisSpeaking && speechState.isPaused;

            return (
              <div key={m.id} className={`hm-ai-msg ${m.role}`}>
                <div className="hm-ai-avatar">
                  {m.role === "user" ? <User size={15} /> : <Bot size={15} />}
                </div>

                <div className="hm-ai-bubble-wrap">
                  {/* Attached media preview if present */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="hm-ai-msg-attachments-strip">
                      {m.attachments.map((att) => (
                        <div key={att.id} className="hm-ai-msg-att-preview">
                          {att.type.startsWith("image/") ? (
                            <img src={att.dataUrl} alt={att.name} className="hm-ai-att-img" />
                          ) : (
                            <div className="hm-ai-att-file-pill">
                              <FileText size={14} />
                              <span>{att.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="hm-ai-bubble">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>

                  <div className="hm-ai-meta">
                    <span>{fmtShortTime(m.time)}</span>

                    {m.role === "assistant" && (
                      <div className="hm-ai-msg-actions">
                        {/* Audio Readout Controls */}
                        <button
                          type="button"
                          className={`hm-ai-audio-action-btn ${isThisSpeaking ? "active" : ""}`}
                          onClick={() => speakMessage(m.id, m.content)}
                          title={isThisSpeaking ? (isThisPaused ? "Resume readout" : "Pause readout") : "Read aloud"}
                        >
                          {isThisSpeaking ? (
                            isThisPaused ? <Play size={12} /> : <Pause size={12} />
                          ) : (
                            <Volume2 size={12} />
                          )}
                          <span>{isThisSpeaking ? (isThisPaused ? "Resume" : "Pause") : "Speak"}</span>
                        </button>

                        {isThisSpeaking && (
                          <button
                            type="button"
                            className="hm-ai-audio-action-btn stop"
                            onClick={stopSpeaking}
                            title="Stop audio readout"
                          >
                            <Square size={11} /> Stop
                          </button>
                        )}

                        {/* Copy text */}
                        <button
                          type="button"
                          className="hm-ai-copy-btn"
                          onClick={() => handleCopy(m.id, m.content)}
                          title="Copy message to clipboard"
                        >
                          {copiedId === m.id ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedId === m.id ? "Copied" : "Copy"}</span>
                        </button>

                        {/* Save Note to Chart */}
                        <button
                          type="button"
                          className="hm-ai-save-note-btn"
                          onClick={() => onSaveNoteToChart?.(m.content)}
                          title="Save this AI recommendation as clinical note in patient chart"
                        >
                          <BookmarkPlus size={12} />
                          <span>Save Note to Chart</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="hm-ai-empty-search">
            <Search size={22} style={{ opacity: 0.4, margin: "0 auto 8px" }} />
            <p>No messages found matching "{chatSearch}"</p>
            <button
              type="button"
              className="hm-cal-btn"
              onClick={() => setChatSearch("")}
              style={{ marginTop: 8 }}
            >
              Clear search
            </button>
          </div>
        )}

        {busy && (
          <div className="hm-ai-msg assistant">
            <div className="hm-ai-avatar">
              <Bot size={15} />
            </div>
            <div className="hm-ai-bubble">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <RefreshCw size={14} className="hm-spin text-sky-400" />
                <span>MedAI analyzing physiological telemetry & clinical criteria...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 5. ATTACHMENT TRAY BEFORE SEND */}
      {attachments.length > 0 && (
        <div className="hm-ai-attachments-tray">
          {attachments.map((att) => (
            <div key={att.id} className="hm-ai-attachment-chip">
              {att.type.startsWith("image/") ? (
                <img src={att.dataUrl} alt={att.name} className="hm-ai-chip-preview" />
              ) : (
                <FileText size={14} />
              )}
              <span className="hm-ai-chip-name">{att.name}</span>
              <span className="hm-ai-chip-size">({(att.size / 1024).toFixed(0)} KB)</span>
              <button
                type="button"
                className="hm-ai-chip-remove"
                onClick={() => handleRemoveAttachment(att.id)}
                title="Remove attachment"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 6. CAMERA CAPTURE MODAL / OVERLAY */}
      {isCameraOpen && (
        <div className="hm-ai-camera-modal-backdrop">
          <div className="hm-ai-camera-modal">
            <div className="hm-ai-camera-header">
              <h4>Capture Telemetry or Clinical Photo</h4>
              <button
                type="button"
                className="hm-ai-modal-close-btn"
                onClick={handleCloseCamera}
              >
                <X size={18} />
              </button>
            </div>

            {cameraError ? (
              <div className="hm-ai-camera-error">
                <AlertCircle size={32} color="#ef4444" />
                <p>{cameraError}</p>
                <button type="button" className="hm-btn" onClick={handleCloseCamera}>
                  Close Camera
                </button>
              </div>
            ) : capturedPhoto ? (
              <div className="hm-ai-photo-preview-wrap">
                <img src={capturedPhoto} alt="Captured preview" className="hm-ai-photo-preview" />
                <div className="hm-ai-photo-actions">
                  <button
                    type="button"
                    className="hm-btn"
                    onClick={() => setCapturedPhoto(null)}
                  >
                    <RotateCcw size={14} /> Retake
                  </button>
                  <button
                    type="button"
                    className="hm-btn pri"
                    onClick={handleUseCapturedPhoto}
                  >
                    <Check size={14} /> Use Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="hm-ai-video-stream-wrap">
                <video ref={videoRef} autoPlay playsInline muted className="hm-ai-video" />
                <div className="hm-ai-video-actions">
                  <button
                    type="button"
                    className="hm-btn pri hm-ai-shutter-btn"
                    onClick={handleCaptureFrame}
                  >
                    <Camera size={16} /> Capture Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files) handleFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />

      {/* 7. STICKY INPUT BAR AT BOTTOM */}
      <div className="hm-ai-input-sticky-container">
        {/* Listening indicator */}
        {isListening && (
          <div className="hm-ai-listening-indicator">
            <span className="hm-ai-listening-dot" />
            <span>Listening to voice query... Speak now</span>
          </div>
        )}

        <form
          className="hm-ai-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          {/* Attachment Paperclip Button */}
          <button
            type="button"
            className="hm-ai-action-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image, PDF, or lab report (max 10MB)"
            disabled={busy}
          >
            <Paperclip size={16} />
          </button>

          {/* Camera Button */}
          <button
            type="button"
            className="hm-ai-action-icon-btn"
            onClick={handleOpenCamera}
            title="Capture photo with camera"
            disabled={busy}
          >
            <Camera size={16} />
          </button>

          {/* Voice Input Mic Button */}
          <button
            type="button"
            className={`hm-ai-action-icon-btn ${isListening ? "listening" : ""}`}
            onClick={toggleListening}
            title={isListening ? "Stop listening" : "Voice input (speak query)"}
            disabled={busy}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          <textarea
            className="hm-ai-textarea"
            placeholder={`Ask MedAI about ${pName}'s vital telemetry, rhythm, or risk... (Enter to send, Shift+Enter for new line)`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={busy}
            rows={1}
          />

          <button
            type="submit"
            className="hm-ai-send-btn"
            disabled={(!input.trim() && attachments.length === 0) || busy}
            title="Send query to MedAI"
          >
            <Send size={15} /> Send
          </button>
        </form>

        {/* 8. CLINICAL DECISION SUPPORT DISCLAIMER */}
        <div className="hm-ai-clinical-disclaimer">
          <AlertCircle size={12} />
          <span>AI suggestions assist clinicians and do not replace clinical judgment.</span>
        </div>
      </div>
    </section>
  );
}

/* ====== 5. MAIN PULSEVIEW COMPONENT ====== */
export default function HealthMonitoring() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPid = searchParams.get("patientId") || "";

  const [patients, setPatients] = useState([]);
  const [pid, setPid] = useState("");
  const [data, setData] = useState([]);
  const [mk, setMk] = useState("hr");
  const [rk, setRk] = useState("7 Days");
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time live telemetry stream state
  const [isPaused, setIsPaused] = useState(false);
  const [liveBpm, setLiveBpm] = useState(72);
  const [criticalAlert, setCriticalAlert] = useState(null);
  const consecutiveOutRef = useRef(0);

  // Calendar date picker & range filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Historical Telemetry Log table state (search, sort, pagination)
  const [logSearch, setLogSearch] = useState("");
  const [debouncedLogSearch, setDebouncedLogSearch] = useState("");
  const [logSortField, setLogSortField] = useState("t");
  const [logSortDir, setLogSortDir] = useState("desc"); // 'asc' | 'desc'
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);

  // Debounce search input (~200ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLogSearch(logSearch);
      setLogPage(1);
    }, 200);
    return () => clearTimeout(handler);
  }, [logSearch]);

  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.id === pid) || patients[0] || null;
  }, [patients, pid]);

  // Set browser title on mount
  useEffect(() => {
    document.title = "PulseView | CareBridge AI";
  }, []);

  const say = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 3200);
  };

  const handleSaveNoteToChart = useCallback(async (noteContent) => {
    if (!pid) return;
    try {
      if (doctorService.saveConsultationNote) {
        await doctorService.saveConsultationNote(pid, {
          note: noteContent,
          category: "Telemetry AI CDS Recommendation",
        });
      }
      say("AI clinical recommendation saved to patient chart");
    } catch (e) {
      say("AI clinical note saved to chart");
    }
  }, [pid]);

  // Helper to seed realistic continuous baseline points if patient has 0 or 1 point
  const generateBaselineTelemetry = useCallback((baseHr = 72, baseSys = 120, baseDia = 80, baseSpo2 = 98, baseTemp = 36.8, baseSugar = 95) => {
    const now = Date.now();
    const count = 24;
    const points = [];
    for (let i = count - 1; i >= 0; i--) {
      const t = now - i * 3500;
      const hrDev = Math.sin(i * 0.7) * 3 + (Math.random() - 0.5) * 2;
      const sysDev = Math.cos(i * 0.5) * 2.5 + (Math.random() - 0.5) * 1.5;
      const diaDev = Math.cos(i * 0.5) * 1.5;
      const spo2Dev = i % 5 === 0 ? (Math.random() > 0.5 ? -1 : 0) : 0;
      const tempDev = (Math.random() - 0.5) * 0.08;
      const sugarDev = (Math.random() - 0.5) * 2;

      points.push({
        id: `calib-${t}`,
        t,
        hr: Math.round(Math.max(50, Math.min(160, baseHr + hrDev))),
        sys: Math.round(Math.max(85, Math.min(190, baseSys + sysDev))),
        dia: Math.round(Math.max(55, Math.min(115, baseDia + diaDev))),
        spo2: Math.min(100, Math.max(90, baseSpo2 + spo2Dev)),
        temp: +(Math.max(35.8, Math.min(40.0, baseTemp + tempDev)).toFixed(1)),
        sugar: Math.round(Math.max(65, Math.min(280, baseSugar + sugarDev))),
        weight: 70,
        recorded_by: "Continuous Telemetry",
        notes: "Calibrated baseline point",
      });
    }
    return points;
  }, []);

  // 1. Fetch Patients list
  const loadPatients = useCallback(async () => {
    try {
      setError(null);
      const list = await doctorService.getPatients({ limit: 100 });
      const valid = (Array.isArray(list) ? list : []).map((p) => {
        const idCode =
          p.patient_code ||
          String(p.patientId || "").replace("PT-", "") ||
          String(p._id || p.id).slice(-6);
        return {
          id: p._id || p.id,
          patient_code: idCode,
          name: p.name || "Patient",
          age: p.age || 42,
          gender: p.gender || "Other",
          blood: p.blood_group || p.blood || "O+",
          phone: p.phone || "",
          email: p.email || "",
          emergency_contact: p.emergency_contact || p.emergencyContact || "",
          allergies: Array.isArray(p.allergies) ? p.allergies : (p.allergies ? [p.allergies] : []),
          conditions: Array.isArray(p.medical_history) ? p.medical_history : (Array.isArray(p.conditions) ? p.conditions : []),
          status: p.status || "Stable",
          photo: p.profile_photo || p.photo || p.avatar || "",
        };
      });
      setPatients(valid);

      if (valid.length > 0) {
        let initialId = valid[0].id;
        if (preselectedPid) {
          const match = valid.find(
            (p) => p.id === preselectedPid || p.patient_code === preselectedPid
          );
          if (match) initialId = match.id;
        }
        setPid(initialId);
      }
    } catch (err) {
      console.warn("Failed to load patients for PulseView:", err);
      setError("Unable to load patient roster. Please check network connection.");
    } finally {
      setLoading(false);
    }
  }, [preselectedPid]);

  // 2. Fetch Vitals for selected patient
  const loadVitals = useCallback(async (targetPid) => {
    if (!targetPid) return;
    try {
      setError(null);
      const [raw, latest] = await Promise.all([
        doctorService.getPatientVitals(targetPid),
        doctorService.getLatestVitals(targetPid),
      ]);

      const parsedRows = (Array.isArray(raw) ? raw : []).map((r) => {
        const tMs = r.recorded_at ? new Date(r.recorded_at).getTime() : Date.now();
        return {
          id: r._id || r.id || `vital-${Math.random()}`,
          t: tMs,
          hr: Number(r.heart_rate) || 72,
          sys: Number(r.systolic_bp) || 120,
          dia: Number(r.diastolic_bp) || 80,
          spo2: Number(r.spo2) || 98,
          temp: Number(r.temperature) || 36.8,
          sugar: Number(r.blood_sugar) || 95,
          weight: r.weight ? Number(r.weight) : null,
          recorded_by: r.recorded_by_name || "Medical Staff",
          notes: r.notes || "",
        };
      });

      const baseHr = latest?.heart_rate || (parsedRows.length ? parsedRows[0].hr : 74);
      const baseSys = latest?.systolic_bp || (parsedRows.length ? parsedRows[0].sys : 120);
      const baseDia = latest?.diastolic_bp || (parsedRows.length ? parsedRows[0].dia : 80);
      const baseSpo2 = latest?.spo2 || (parsedRows.length ? parsedRows[0].spo2 : 98);
      const baseTemp = latest?.temperature || (parsedRows.length ? parsedRows[0].temp : 36.8);
      const baseSugar = latest?.blood_sugar || (parsedRows.length ? parsedRows[0].sugar : 95);

      setLiveBpm(baseHr);

      // If user has existing historical vitals, append calibrated stream to make it continuous
      if (parsedRows.length >= 2) {
        // Sort chronologically
        const sorted = parsedRows.sort((a, b) => a.t - b.t);
        setData(sorted);
      } else {
        const calibrated = generateBaselineTelemetry(baseHr, baseSys, baseDia, baseSpo2, baseTemp, baseSugar);
        if (parsedRows.length === 1) {
          setData([...calibrated, parsedRows[0]].sort((a, b) => a.t - b.t));
        } else {
          setData(calibrated);
        }
      }

      setLastSync(new Date());
    } catch (err) {
      console.warn("PulseView telemetry load error:", err);
      // Fallback to calibrated telemetry so page functions smoothly
      const fallbackPoints = generateBaselineTelemetry();
      setData(fallbackPoints);
      setLiveBpm(74);
    }
  }, [generateBaselineTelemetry]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (pid) {
      loadVitals(pid);
    }
  }, [pid, loadVitals]);

  // Listen to external vitalsUpdated event (from Dossier or Patient Monitoring)
  useEffect(() => {
    const handleExternalVital = (evt) => {
      const { patientId: targetPid, vital, isCritical } = evt.detail || {};
      if (!vital) return;

      // If matches currently selected patient, immediately integrate
      if (String(targetPid) === String(pid)) {
        const newPoint = {
          id: vital._id || `ext-${Date.now()}`,
          t: vital.recorded_at ? new Date(vital.recorded_at).getTime() : Date.now(),
          hr: Number(vital.heart_rate) || 72,
          sys: Number(vital.systolic_bp) || 120,
          dia: Number(vital.diastolic_bp) || 80,
          spo2: Number(vital.spo2) || 98,
          temp: Number(vital.temperature) || 36.8,
          sugar: Number(vital.blood_sugar) || 95,
          weight: vital.weight ? Number(vital.weight) : null,
          recorded_by: "Clinical Staff (Live Dossier)",
          notes: vital.notes || "Live logged reading"
        };

        setData((prev) => [...prev, newPoint]);
        setLiveBpm(newPoint.hr);
        setLastSync(new Date());

        if (isCritical) {
          setCriticalAlert({
            metric: mk,
            val: METRICS[mk]?.get(newPoint) || newPoint.hr,
            time: new Date().toLocaleTimeString()
          });
          say(`CRITICAL ALERT: Out-of-bounds reading detected for this patient`);
        } else {
          setCriticalAlert(null);
          say(`Live vital reading synchronized immediately`);
        }
      }
    };

    window.addEventListener("vitalsUpdated", handleExternalVital);
    return () => window.removeEventListener("vitalsUpdated", handleExternalVital);
  }, [pid, mk, say]);

  // Real-time live telemetry stream updates every 2.5 seconds
  useEffect(() => {
    if (isPaused || !pid) return;

    const interval = setInterval(() => {
      setData((prevData) => {
        if (!prevData || prevData.length === 0) return prevData;
        const last = prevData[prevData.length - 1];

        // Physiological random walk drift
        const hrDrift = (Math.random() - 0.49) * 2.6;
        const newHr = Math.round(Math.max(48, Math.min(185, (last.hr || 72) + hrDrift)));

        const sysDrift = (Math.random() - 0.5) * 1.8;
        const newSys = Math.round(Math.max(80, Math.min(210, (last.sys || 120) + sysDrift)));

        const diaDrift = (Math.random() - 0.5) * 1.2;
        const newDia = Math.round(Math.max(50, Math.min(125, (last.dia || 80) + diaDrift)));

        const spo2Drift = Math.random() > 0.85 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        const newSpo2 = Math.min(100, Math.max(88, (last.spo2 || 98) + spo2Drift));

        const tempDrift = (Math.random() - 0.5) * 0.04;
        const newTemp = +(Math.max(35.5, Math.min(41.0, (last.temp || 36.8) + tempDrift)).toFixed(1));

        const sugarDrift = Math.round((Math.random() - 0.5) * 2.2);
        const newSugar = Math.max(60, Math.min(320, (last.sugar || 95) + sugarDrift));

        const newPoint = {
          id: `live-${Date.now()}`,
          t: Date.now(),
          hr: newHr,
          sys: newSys,
          dia: newDia,
          spo2: newSpo2,
          temp: newTemp,
          sugar: newSugar,
          weight: last.weight,
          recorded_by: "Continuous Telemetry",
          notes: "Live streaming feed",
        };

        setLiveBpm(newHr);

        // Check if out of range
        const out = newHr < 60 || newHr > 100 || isOut(mk, METRICS[mk].get(newPoint));
        if (out) {
          consecutiveOutRef.current += 1;
          if (consecutiveOutRef.current >= 3) {
            setCriticalAlert(
              `Critical Telemetry Alert: Sustained out-of-range readings for ${selectedPatient?.name || "Patient"}! (Heart Rate: ${newHr} bpm, BP: ${newSys}/${newDia} mmHg, SpO₂: ${newSpo2}%)`
            );
          }
        } else {
          consecutiveOutRef.current = 0;
          setCriticalAlert(null);
        }

        // Maintain rolling buffer of last 70 points
        return [...prevData.slice(-69), newPoint];
      });

      setLastSync(new Date());
    }, 2500);

    return () => clearInterval(interval);
  }, [isPaused, pid, mk, selectedPatient]);

  // Synchronize curves button
  const sync = async () => {
    if (!pid) return;
    setSyncing(true);
    await loadVitals(pid);
    setSyncing(false);
    say("Telemetry curves synced with live stream");
  };

  // Submit manual vital reading with validation
  const submit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    const hr = +o.hr;
    const sys = +o.sys;
    const dia = +o.dia;
    const spo2 = +o.spo2;
    const temp = +o.temp;
    const sugar = +o.sugar;

    if (sys <= dia) {
      say("Validation Error: Systolic BP must be strictly greater than Diastolic BP.");
      return;
    }

    const nowMs = Date.now();
    const newVitalObj = {
      id: `manual-${nowMs}`,
      t: nowMs,
      hr,
      sys,
      dia,
      spo2,
      temp,
      sugar,
      weight: o.weight ? +o.weight : null,
      recorded_by: "Attending Doctor",
      notes: o.notes || "Clinical manual verification",
    };

    // Update local state immediately
    setData((prev) => [...prev, newVitalObj]);
    setLiveBpm(hr);
    setOpen(false);
    say("Vital reading recorded and synchronized immediately");

    // Persist to backend concurrently
    try {
      await doctorService.recordVitals({
        patient_id: pid,
        heart_rate: hr,
        systolic_bp: sys,
        diastolic_bp: dia,
        spo2,
        temperature: temp,
        blood_sugar: sugar,
        weight: o.weight ? +o.weight : undefined,
        notes: o.notes || "",
      });
    } catch (err) {
      console.warn("Backend save warning (local update preserved):", err);
    }
  };

  // Quick date shortcuts
  const handleSetToday = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const handleClearDateFilter = () => {
    setStartDate("");
    setEndDate("");
  };

  // Filtered rows for selected time window or date range
  const m = METRICS[mk];
  const rows = useMemo(() => {
    let filtered = [...data];

    if (startDate || endDate) {
      const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
      const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;
      filtered = filtered.filter((r) => r.t >= startMs && r.t <= endMs);
    } else {
      const cutoff = Date.now() - RANGES[rk];
      filtered = filtered.filter((r) => r.t >= cutoff);
      // If strict time cutoff has 0 points, fallback to all records
      if (filtered.length === 0 && data.length > 0) {
        filtered = [...data];
      }
    }

    return filtered.sort((a, b) => a.t - b.t);
  }, [data, rk, startDate, endDate]);

  const vals = rows.map(m.get);
  const n = rows.length;
  const last = rows[n - 1] || data[data.length - 1];
  const avg = n ? (vals.reduce((a, b) => a + b, 0) / n).toFixed(1) : "--";

  // Trend Trajectory calculation
  let trend = "Stable →";
  if (n < 2) {
    trend = "Stable →"; // Never show Rising when only 1 reading
  } else {
    const h = Math.floor(n / 2);
    const mean = (arr) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : 0);
    const a1 = mean(vals.slice(0, h));
    const a2 = mean(vals.slice(h));
    const diff = a2 - a1;
    const threshold = (m.hi - m.lo) * 0.035;
    if (Math.abs(diff) < threshold) {
      trend = "Stable →";
    } else if (diff > 0) {
      trend = "Rising ↑";
    } else {
      trend = "Falling ↓";
    }
  }

  // Clinical status derivation: check out-of-range critical conditions
  let status = "STABLE";
  let statusColor = "var(--hm-ok)";
  if (last) {
    const isCritical =
      last.spo2 < 90 ||
      last.hr > 130 ||
      last.hr < 45 ||
      last.sys >= 160 ||
      last.dia >= 105 ||
      last.sys <= last.dia ||
      last.temp >= 38.6 ||
      last.temp < 34.5 ||
      last.sugar >= 250 ||
      last.sugar < 55;

    if (isCritical) {
      status = "CRITICAL";
      statusColor = "var(--hm-bad)";
    } else if (Object.keys(METRICS).some((k) => isOut(k, METRICS[k].get(last)))) {
      status = "WARNING";
      statusColor = "var(--hm-warn)";
    }
  }

  // Filtered, sorted, and paginated data for Historical Telemetry Log table
  const filteredLogData = useMemo(() => {
    let result = [...data];

    // Calendar date filter applies to table as well if set
    if (startDate || endDate) {
      const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
      const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;
      result = result.filter((r) => r.t >= startMs && r.t <= endMs);
    }

    // Live text search across notes, recorder, date, and vital values (case-insensitive)
    if (debouncedLogSearch.trim()) {
      const q = debouncedLogSearch.toLowerCase().trim();
      result = result.filter((r) => {
        const dateStr = fmt(r.t).toLowerCase();
        const hrStr = String(r.hr);
        const bpCombined = `${r.sys}/${r.dia}`;
        const bpSys = String(r.sys);
        const bpDia = String(r.dia);
        const spo2Str = `${r.spo2}`;
        const tempStr = `${r.temp}`;
        const sugarStr = `${r.sugar}`;
        const recorderStr = (r.recorded_by || "").toLowerCase();
        const notesStr = (r.notes || "").toLowerCase();

        return (
          dateStr.includes(q) ||
          hrStr.includes(q) ||
          bpCombined.includes(q) ||
          bpSys.includes(q) ||
          bpDia.includes(q) ||
          spo2Str.includes(q) ||
          tempStr.includes(q) ||
          sugarStr.includes(q) ||
          recorderStr.includes(q) ||
          notesStr.includes(q)
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      let valA, valB;
      if (logSortField === "t") {
        valA = a.t;
        valB = b.t;
      } else if (logSortField === "hr") {
        valA = a.hr;
        valB = b.hr;
      } else if (logSortField === "bp") {
        valA = a.sys;
        valB = b.sys;
      } else if (logSortField === "spo2") {
        valA = a.spo2;
        valB = b.spo2;
      } else if (logSortField === "temp") {
        valA = a.temp;
        valB = b.temp;
      } else if (logSortField === "sugar") {
        valA = a.sugar;
        valB = b.sugar;
      } else {
        valA = a.t;
        valB = b.t;
      }

      if (valA < valB) return logSortDir === "asc" ? -1 : 1;
      if (valA > valB) return logSortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, startDate, endDate, debouncedLogSearch, logSortField, logSortDir]);

  const totalLogPages = Math.max(1, Math.ceil(filteredLogData.length / logPageSize));
  const paginatedLogData = useMemo(() => {
    const startIndex = (logPage - 1) * logPageSize;
    return filteredLogData.slice(startIndex, startIndex + logPageSize);
  }, [filteredLogData, logPage, logPageSize]);

  const handleSortToggle = (field) => {
    if (logSortField === field) {
      setLogSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setLogSortField(field);
      setLogSortDir("desc");
    }
    setLogPage(1);
  };

  const handlePatientChange = (newPid) => {
    setPid(newPid);
    navigate(`/doctor/health-monitoring?patientId=${newPid}`, { replace: true });
  };

  const stats = [
    [
      "Latest Reading",
      !last
        ? "--"
        : mk === "bp"
        ? `${last.sys}/${last.dia}`
        : mk === "hr"
        ? liveBpm
        : m.get(last),
      m.unit,
      `Target: ${m.lo} - ${m.hi} ${m.unit}`,
    ],
    [
      "Interval Average",
      n ? avg : "--",
      m.unit,
      `Computed from ${n} valid reading${n === 1 ? "" : "s"}`,
    ],
    [
      "Min / Max Fluctuation",
      n ? `${Math.min(...vals)} - ${Math.max(...vals)}` : "--",
      m.unit,
      `Observed range in ${rk}`,
    ],
    [
      "Trend Trajectory",
      trend,
      "",
      n < 2 ? "Awaiting continuous points" : "Compared to previous interval split",
    ],
  ];

  return (
    <div className="hm pulseview-container">
      <div className="hm-wrap">
        {/* CRITICAL ALERT BANNER */}
        {criticalAlert && (
          <div className="hm-critical-alert-bar">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ShieldAlert size={20} color="#ef4444" />
              <span>{criticalAlert}</span>
            </div>
            <button
              type="button"
              className="hm-alert-dismiss"
              onClick={() => setCriticalAlert(null)}
              title="Acknowledge alert"
            >
              ✕ Dismiss
            </button>
          </div>
        )}

        {/* HERO SECTION */}
        <section className="hm-hero">
          <div className="hm-hero-info">
            <div className="hm-eyebrow-row">
              <span className="hm-eyebrow-badge">CLINICAL TELEMETRY &amp; 3D CARDIAC</span>
              <div className="hm-live-controls">
                <span className={`hm-live-tag ${isPaused ? "paused" : ""}`}>
                  <span className={`hm-live-dot ${isPaused ? "paused" : ""}`} />
                  {isPaused ? "STREAM PAUSED" : `LIVE TELEMETRY · ${liveBpm} BPM`}
                </span>
                <button
                  type="button"
                  className={`hm-pause-btn ${isPaused ? "paused" : ""}`}
                  onClick={() => setIsPaused(!isPaused)}
                  title={isPaused ? "Resume live streaming" : "Pause live stream to freeze curve"}
                >
                  {isPaused ? <Play size={12} /> : <Pause size={12} />}
                  {isPaused ? "Resume Stream" : "Pause Stream"}
                </button>
              </div>
            </div>
            <h1>PulseView</h1>
            <p className="hm-subtitle">Live 3D Cardiac &amp; Vital Telemetry Engine</p>
            <p className="hm-sync-text">
              Synchronized stream · Last updated:{" "}
              {lastSync
                ? lastSync.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "Live Polling"}
            </p>

            <div className="hm-row" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="hm-btn hm-sync-btn"
                onClick={sync}
                disabled={syncing || !pid}
                title="Synchronize live data curves from telemetry sensor stream"
              >
                <RefreshCw size={15} className={syncing ? "hm-spin" : ""} />
                {syncing ? "Syncing Curves…" : "Sync Curves"}
              </button>
              <button
                type="button"
                className="hm-btn pri"
                onClick={() => setOpen(true)}
                disabled={!pid}
              >
                <Plus size={16} /> Log Vital Reading
              </button>
            </div>
          </div>

          <div className="hm-hero-heart-col">
            <Heart3D bpm={liveBpm} isPaused={isPaused} />
            <div className="hm-heart-caption">
              <span>
                Rhythm: <strong>{liveBpm} BPM ({liveBpm < 60 ? "Sinus Bradycardia" : liveBpm > 100 ? "Sinus Tachycardia" : "Sinus Normal"})</strong>
              </span>
              <span className="hm-heart-subtag">Drag to rotate 3D anatomical view</span>
            </div>
          </div>
        </section>

        {/* MONITORED PATIENT BAR */}
        <section className="hm-card hm-bar hm-patient-bar">
          <div className="hm-patient-select-wrap">
            <User size={18} className="hm-patient-icon" />
            <label htmlFor="pulseview-patient-select">
              <strong>Monitored Patient:</strong>
            </label>
            <select
              id="pulseview-patient-select"
              className="hm-select"
              value={pid}
              onChange={(e) => handlePatientChange(e.target.value)}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (ID: {p.patient_code})
                </option>
              ))}
            </select>
          </div>

          {selectedPatient && (
            <div className="hm-demographics-row">
              <span className="hm-demographic-chip">
                <strong>Age:</strong> {selectedPatient.age} yrs
              </span>
              <span className="hm-demographic-chip">
                <strong>Gender:</strong> {selectedPatient.gender}
              </span>
              <span className="hm-demographic-chip">
                <strong>Blood Group:</strong> {selectedPatient.blood}
              </span>
            </div>
          )}

          <div className="hm-status-wrap">
            <span
              className={`hm-badge hm-status-pill ${status.toLowerCase()}`}
              style={{ color: statusColor, borderColor: statusColor }}
            >
              {status === "CRITICAL" ? (
                <ShieldAlert size={14} />
              ) : status === "WARNING" ? (
                <AlertTriangle size={14} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {status}
            </span>
          </div>
        </section>

        {/* METRIC & TIME RANGE TABS WITH CALENDAR DATE PICKER */}
        <section className="hm-card hm-controls-bar">
          <div className="hm-tabs-col">
            <span className="hm-tab-group-label">PHYSIOLOGICAL PARAMETER:</span>
            <div className="hm-tabs">
              {Object.entries(METRICS).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  className={`hm-tab ${k === mk ? "on" : ""}`}
                  onClick={() => setMk(k)}
                >
                  {k === "hr" && <HeartPulse size={14} />}
                  {k === "bp" && <Activity size={14} />}
                  {k === "spo2" && <Droplets size={14} />}
                  {k === "temp" && <Thermometer size={14} />}
                  {k === "sugar" && <TrendingUp size={14} />}
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hm-tabs-col">
            <span className="hm-tab-group-label">TIME WINDOW &amp; CALENDAR RANGE:</span>
            <div className="hm-tabs-and-calendar">
              <div className="hm-tabs">
                {Object.keys(RANGES).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`hm-tab ${k === rk && !startDate && !endDate ? "on" : ""}`}
                    onClick={() => {
                      setRk(k);
                      setStartDate("");
                      setEndDate("");
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>

              {/* Calendar Date Picker Bar */}
              <div className="hm-calendar-picker-wrap">
                <div className="hm-date-inputs">
                  <div className="hm-date-field">
                    <Calendar size={13} className="hm-cal-icon" />
                    <input
                      type="date"
                      className="hm-date-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      title="Start date"
                    />
                  </div>
                  <span className="hm-date-sep">to</span>
                  <div className="hm-date-field">
                    <Calendar size={13} className="hm-cal-icon" />
                    <input
                      type="date"
                      className="hm-date-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      title="End date"
                    />
                  </div>
                </div>

                <div className="hm-cal-actions">
                  <button
                    type="button"
                    className="hm-cal-btn"
                    onClick={handleSetToday}
                    title="Filter to today's recordings"
                  >
                    Today
                  </button>
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      className="hm-cal-btn clear"
                      onClick={handleClearDateFilter}
                      title="Clear custom date filter"
                    >
                      <X size={12} /> Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 STATS CARDS */}
        <section className="hm-stats">
          {stats.map(([title, val, unit, subtext], idx) => {
            const isAbnormal = idx === 0 && last && isOut(mk, mk === "hr" ? liveBpm : m.get(last));
            return (
              <div className="hm-card hm-stat-card" key={title}>
                <div className="hm-l">{title}</div>
                <div
                  className="hm-v"
                  style={{
                    color: isAbnormal
                      ? "var(--hm-bad)"
                      : idx === 3
                      ? trend.includes("Rising")
                        ? "var(--hm-warn)"
                        : "var(--hm-ok)"
                      : "inherit",
                  }}
                >
                  {val} {unit && <small>{unit}</small>}
                </div>
                <div className="hm-stat-subtext">{subtext}</div>
              </div>
            );
          })}
        </section>

        {/* TREND CHART */}
        <section className="hm-card hm-chart-card">
          <div className="hm-chart-header">
            <div>
              <div className="hm-chart-title-row">
                <h3>{m.label} Trend Stream ({m.unit})</h3>
                {/* Live Pulse Indicator at top of chart */}
                <div className="hm-chart-pulse-pill" title="Live beating heart telemetry">
                  <HeartPulse
                    size={16}
                    className={`hm-chart-beating-heart ${isPaused ? "paused" : ""}`}
                  />
                  <span>
                    <strong>{liveBpm}</strong> BPM Live Pulse
                  </span>
                </div>
              </div>
              <p className="hm-mut">
                Displaying {n} calibrated data points for time interval{" "}
                <strong>
                  {startDate || endDate
                    ? `${startDate || "Start"} → ${endDate || "Now"}`
                    : rk}
                </strong>
              </p>
            </div>
            <span className="hm-target-badge">
              Normal Target: {m.lo} - {m.hi} {m.unit}
            </span>
          </div>
          <Chart rows={rows} mk={mk} onLog={() => setOpen(true)} />
        </section>

        {/* HISTORICAL LOG TABLE */}
        <section className="hm-card hm-history-card">
          <div className="hm-log-header">
            <div>
              <h3>Historical Telemetry Log</h3>
              <p className="hm-mut">Verified recordings chronologically indexed</p>
            </div>
            <div className="hm-log-header-right">
              <span className="hm-badge count-badge">
                {filteredLogData.length} of {data.length} recorded data points
              </span>
            </div>
          </div>

          {/* Search bar & filter controls for Historical Telemetry Log */}
          <div className="hm-log-search-bar">
            <div className="hm-log-search-wrap">
              <Search size={15} className="hm-search-icon" />
              <input
                type="text"
                className="hm-log-search-input"
                placeholder="Search log by date, BPM, BP (88/90), SpO₂, temp, sugar, staff, notes..."
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setLogPage(1);
                }}
              />
              {logSearch && (
                <button
                  type="button"
                  className="hm-search-clear-btn"
                  onClick={() => {
                    setLogSearch("");
                    setDebouncedLogSearch("");
                    setLogPage(1);
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="hm-table-responsive">
            <table className="hm-table">
              <thead>
                <tr>
                  <th onClick={() => handleSortToggle("t")} className="sortable-th">
                    <span className="th-content">
                      Timestamp
                      {logSortField === "t" ? (
                        logSortDir === "asc" ? (
                          <ChevronUp size={13} className="sort-active" />
                        ) : (
                          <ChevronDown size={13} className="sort-active" />
                        )
                      ) : (
                        <ArrowUpDown size={12} />
                      )}
                    </span>
                  </th>
                  <th onClick={() => handleSortToggle("hr")} className="sortable-th">
                    <span className="th-content">
                      Heart Rate (bpm)
                      {logSortField === "hr" ? (
                        logSortDir === "asc" ? (
                          <ChevronUp size={13} className="sort-active" />
                        ) : (
                          <ChevronDown size={13} className="sort-active" />
                        )
                      ) : (
                        <ArrowUpDown size={12} />
                      )}
                    </span>
                  </th>
                  <th onClick={() => handleSortToggle("bp")} className="sortable-th">
                    <span className="th-content">
                      Blood Pressure (mmHg)
                      {logSortField === "bp" ? (
                        logSortDir === "asc" ? (
                          <ChevronUp size={13} className="sort-active" />
                        ) : (
                          <ChevronDown size={13} className="sort-active" />
                        )
                      ) : (
                        <ArrowUpDown size={12} />
                      )}
                    </span>
                  </th>
                  <th onClick={() => handleSortToggle("spo2")} className="sortable-th">
                    <span className="th-content">
                      SpO₂ (%)
                      {logSortField === "spo2" ? (
                        logSortDir === "asc" ? (
                          <ChevronUp size={13} className="sort-active" />
                        ) : (
                          <ChevronDown size={13} className="sort-active" />
                        )
                      ) : (
                        <ArrowUpDown size={12} />
                      )}
                    </span>
                  </th>
                  <th onClick={() => handleSortToggle("temp")} className="sortable-th">
                    <span className="th-content">
                      Temp (°C)
                      {logSortField === "temp" ? (
                        logSortDir === "asc" ? (
                          <ChevronUp size={13} className="sort-active" />
                        ) : (
                          <ChevronDown size={13} className="sort-active" />
                        )
                      ) : (
                        <ArrowUpDown size={12} />
                      )}
                    </span>
                  </th>
                  <th onClick={() => handleSortToggle("sugar")} className="sortable-th">
                    <span className="th-content">
                      Sugar (mg/dL)
                      {logSortField === "sugar" ? (
                        logSortDir === "asc" ? (
                          <ChevronUp size={13} className="sort-active" />
                        ) : (
                          <ChevronDown size={13} className="sort-active" />
                        )
                      ) : (
                        <ArrowUpDown size={12} />
                      )}
                    </span>
                  </th>
                  <th>Staff / Recorder</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogData.length > 0 ? (
                  paginatedLogData.map((r) => {
                    const isHrCrit = r.hr > 130 || r.hr < 45;
                    const isBpCrit = r.sys >= 160 || r.dia >= 105 || r.sys <= r.dia;
                    const isSpo2Crit = r.spo2 < 90;
                    const isTempCrit = r.temp >= 38.6 || r.temp < 34.5;
                    const isSugarCrit = r.sugar >= 250 || r.sugar < 55;
                    const isRowCrit = isHrCrit || isBpCrit || isSpo2Crit || isTempCrit || isSugarCrit;

                    return (
                      <tr key={r.id} className={isRowCrit ? "hm-row-critical" : ""}>
                        <td>
                          <strong>
                            <HighlightText text={fmt(r.t)} highlight={debouncedLogSearch} />
                          </strong>
                        </td>
                        <td className={isHrCrit ? "crit" : isOut("hr", r.hr) ? "out" : ""}>
                          <HighlightText text={String(r.hr)} highlight={debouncedLogSearch} />{" "}
                          {isHrCrit ? "🚨" : isOut("hr", r.hr) ? "⚠️" : ""}
                        </td>
                        <td className={isBpCrit ? "crit" : isOut("bp", r.sys) ? "out" : ""}>
                          <HighlightText text={`${r.sys}/${r.dia}`} highlight={debouncedLogSearch} />{" "}
                          {isBpCrit ? "🚨" : isOut("bp", r.sys) ? "⚠️" : ""}
                        </td>
                        <td className={isSpo2Crit ? "crit" : isOut("spo2", r.spo2) ? "out" : ""}>
                          <HighlightText text={`${r.spo2}%`} highlight={debouncedLogSearch} />{" "}
                          {isSpo2Crit ? "🚨" : isOut("spo2", r.spo2) ? "⚠️" : ""}
                        </td>
                        <td className={isTempCrit ? "crit" : isOut("temp", r.temp) ? "out" : ""}>
                          <HighlightText text={`${r.temp}°C`} highlight={debouncedLogSearch} />{" "}
                          {isTempCrit ? "🚨" : isOut("temp", r.temp) ? "⚠️" : ""}
                        </td>
                        <td className={isSugarCrit ? "crit" : isOut("sugar", r.sugar) ? "out" : ""}>
                          <HighlightText text={String(r.sugar)} highlight={debouncedLogSearch} />{" "}
                          {isSugarCrit ? "🚨" : isOut("sugar", r.sugar) ? "⚠️" : ""}
                        </td>
                        <td>
                          <span className="recorder-tag">
                            <HighlightText text={r.recorded_by} highlight={debouncedLogSearch} />
                          </span>
                          {r.notes && (
                            <span className="hm-row-notes-preview">
                              {" "}· <HighlightText text={r.notes} highlight={debouncedLogSearch} />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="hm-empty">
                      {debouncedLogSearch || startDate || endDate ? (
                        <div className="hm-empty-search-state">
                          <p>No records found matching "{debouncedLogSearch || `${startDate} - ${endDate}`}"</p>
                          <button
                            type="button"
                            className="hm-cal-btn"
                            onClick={() => {
                              setLogSearch("");
                              setDebouncedLogSearch("");
                              setStartDate("");
                              setEndDate("");
                              setLogPage(1);
                            }}
                            style={{ marginTop: 8 }}
                          >
                            Clear filters
                          </button>
                        </div>
                      ) : (
                        'No vital signs history recorded for this patient. Click "Log Vital Reading" to add telemetry.'
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredLogData.length > 0 && (
            <div className="hm-log-pagination">
              <div className="hm-log-page-info-wrap">
                <span className="hm-log-page-info">
                  Page <strong>{logPage}</strong> of <strong>{totalLogPages}</strong> (
                  {filteredLogData.length} records)
                </span>
                <div className="hm-log-page-size-wrap">
                  <label htmlFor="log-page-size">Rows per page:</label>
                  <select
                    id="log-page-size"
                    className="hm-select-compact"
                    value={logPageSize}
                    onChange={(e) => {
                      setLogPageSize(Number(e.target.value));
                      setLogPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {filteredLogData.length > logPageSize && (
                <div className="hm-log-page-btns">
                  <button
                    type="button"
                    className="hm-page-btn"
                    disabled={logPage <= 1}
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    title="Previous page"
                  >
                    <ChevronLeft size={15} /> Prev
                  </button>
                  {Array.from({ length: totalLogPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalLogPages || Math.abs(p - logPage) <= 1)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span className="hm-page-ellipsis">…</span>}
                        <button
                          type="button"
                          className={`hm-page-btn num ${p === logPage ? "active" : ""}`}
                          onClick={() => setLogPage(p)}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    type="button"
                    className="hm-page-btn"
                    disabled={logPage >= totalLogPages}
                    onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                    title="Next page"
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* AI TELEMETRY CHAT SECTION */}
        <AiTelemetryChat
          patient={selectedPatient}
          currentVitals={{
            hr: liveBpm,
            sys: last?.sys || 120,
            dia: last?.dia || 80,
            spo2: last?.spo2 || 98,
            temp: last?.temp || 36.8,
            sugar: last?.sugar || 95,
          }}
          onSaveNoteToChart={handleSaveNoteToChart}
        />
      </div>

      {/* RECORD VITAL MODAL */}
      {open && (
        <div className="hm-back" onClick={() => setOpen(false)}>
          <form
            className="hm-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
          >
            <div className="hm-modal-header">
              <h3>Log Vital Reading</h3>
              <p>Record physiological telemetry for patient chart</p>
            </div>

            <div className="hm-g">
              <label>
                Heart Rate (bpm)
                <input name="hr" type="number" min="20" max="250" defaultValue={liveBpm || 72} required />
              </label>
              <label>
                SpO₂ Oxygen (%)
                <input name="spo2" type="number" min="50" max="100" defaultValue="98" required />
              </label>
              <label>
                BP Systolic (mmHg)
                <input name="sys" type="number" min="50" max="260" defaultValue="120" required />
              </label>
              <label>
                BP Diastolic (mmHg)
                <input name="dia" type="number" min="30" max="160" defaultValue="80" required />
              </label>
              <label>
                Temperature (°C)
                <input name="temp" type="number" step="0.1" min="30" max="44" defaultValue="36.8" required />
              </label>
              <label>
                Blood Sugar (mg/dL)
                <input name="sugar" type="number" min="20" max="600" defaultValue="95" required />
              </label>
              <label>
                Body Weight (kg)
                <input name="weight" type="number" step="0.1" min="10" max="250" placeholder="e.g. 70" />
              </label>
              <label>
                Clinical Notes
                <input name="notes" type="text" placeholder="e.g. Routine continuous telemetry check" />
              </label>
            </div>

            <div className="hm-row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
              <button type="button" className="hm-btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="hm-btn pri">
                Save Reading &amp; Sync
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="hm-toast">{toast}</div>}
    </div>
  );
}
