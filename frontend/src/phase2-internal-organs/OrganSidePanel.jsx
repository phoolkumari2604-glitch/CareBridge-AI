import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bot,
  FileText,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ChevronRight,
  ExternalLink,
  Info,
  CheckCircle2,
  Stethoscope,
  HeartPulse,
} from "lucide-react";
import { getOrganConfig } from "./organs.config.js";

export function OrganSidePanel({
  organId,
  organStatus,
  patientData = {},
  onSelectOrgan,
}) {
  const navigate = useNavigate();
  const config = getOrganConfig(organId);

  if (!config) {
    return (
      <div className="organ-side-panel empty">
        <p>Please select an organ to inspect clinical telemetry.</p>
      </div>
    );
  }

  const { status, label, color, bg, border, badgeClass, summary, indicators = [], disclaimer } =
    organStatus || {};

  // Find linked health records from patient EHR dossier
  const healthRecords = Array.isArray(patientData.healthRecords) ? patientData.healthRecords : [];
  const linkedRecords = healthRecords.filter((rec) => {
    const text = `${rec.title || ""} ${rec.diagnosis || ""} ${rec.record_type || ""}`.toLowerCase();
    if (organId === "stomach") return text.includes("stomach") || text.includes("gastric") || text.includes("gi") || text.includes("dyspepsia");
    if (organId === "pancreas") return text.includes("pancreas") || text.includes("glucose") || text.includes("hba1c") || text.includes("diabetes");
    if (organId === "thyroid") return text.includes("thyroid") || text.includes("tsh") || text.includes("endocrine");
    if (organId === "intestines") return text.includes("intestine") || text.includes("colon") || text.includes("bowel") || text.includes("digestive");
    return false;
  });

  // Handle Ask CareBridge AI
  const handleAskAI = () => {
    const defaultPrompt =
      config.aiPromptSuggestion ||
      `Explain my ${config.name} clinical status and what I should watch.`;
    navigate("/patient/ai-assistant", {
      state: { prefilledPrompt: defaultPrompt, organ: config.name, status: label },
    });
  };

  return (
    <div
      className="organ-side-panel"
      style={{
        borderLeftColor: color,
        boxShadow: `0 10px 30px rgba(0, 0, 0, 0.4), inset 0 0 24px ${color}11`,
      }}
      aria-label={`${config.name} Clinical Dossier`}
    >
      {/* 1. HEADER */}
      <div className="panel-header">
        <div className="panel-header-left">
          <div
            className="panel-icon-box"
            style={{
              backgroundColor: bg,
              color: color,
              borderColor: border,
            }}
          >
            <Activity size={22} />
          </div>
          <div>
            <h3 className="panel-organ-title">{config.name}</h3>
            <span className="panel-organ-subtitle">{config.subtitle}</span>
          </div>
        </div>

        {/* Dynamic Status Badge */}
        <div
          className={`panel-status-badge ${badgeClass || "badge-nodata"}`}
          style={{
            backgroundColor: bg,
            color: color,
            borderColor: border,
          }}
        >
          <span className="status-badge-dot" style={{ backgroundColor: color }} />
          <span>{label ? label.toUpperCase() : "NO DATA YET"}</span>
        </div>
      </div>

      {/* 2. PLAIN-LANGUAGE PATIENT-FRIENDLY DESCRIPTION */}
      <div className="panel-section-box">
        <span className="panel-box-kicker">ABOUT THIS ORGAN</span>
        <p className="panel-description-text">{config.description}</p>
      </div>

      {/* 3. WHAT IT DOES */}
      <div className="panel-section-box">
        <span className="panel-box-kicker">PHYSIOLOGICAL FUNCTION</span>
        <p className="panel-what-it-does-text">{config.whatItDoes}</p>
      </div>

      {/* 4. RELATED TELEMETRY INDICATORS */}
      <div className="panel-section-box">
        <div className="panel-indicators-header">
          <span className="panel-box-kicker">RELATED TELEMETRY INDICATORS</span>
          <span className="telemetry-disclaimer-tag">
            <Info size={11} /> Related indicator, not a diagnosis
          </span>
        </div>

        {indicators.length === 0 ? (
          <div className="panel-no-indicators">
            <Clock size={15} />
            <span>No immediate telemetry measurements recorded for this cycle.</span>
          </div>
        ) : (
          <div className="panel-indicators-list">
            {indicators.map((ind, i) => (
              <div key={i} className="panel-indicator-row">
                <div className="indicator-row-top">
                  <span className="ind-label">{ind.label}</span>
                  <div className="ind-val-group">
                    <strong className="ind-value">{ind.value}</strong>
                    {ind.unit && <small className="ind-unit">{ind.unit}</small>}
                  </div>
                </div>

                <div className="indicator-row-bottom">
                  <span className="ind-range">Safe bounds: {ind.normalRange}</span>
                  <span className="ind-time">
                    <Clock size={11} /> {ind.timestamp}
                  </span>
                </div>

                {ind.note && <div className="ind-note">{ind.note}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Clinical Summary */}
        {summary && (
          <div className="panel-clinical-summary-bubble" style={{ borderLeftColor: color }}>
            <span className="summary-title">Clinical State:</span>
            <p>{summary}</p>
          </div>
        )}
      </div>

      {/* 5. LINKED ELECTRONIC HEALTH REPORTS */}
      <div className="panel-section-box">
        <div className="panel-indicators-header">
          <span className="panel-box-kicker">LINKED MEDICAL REPORTS</span>
          <span className="count-chip">{linkedRecords.length} on file</span>
        </div>

        {linkedRecords.length === 0 ? (
          <div className="panel-no-indicators">
            <FileText size={15} />
            <span>No direct diagnostic pathology reports uploaded for {config.name}.</span>
          </div>
        ) : (
          <div className="panel-linked-records-list">
            {linkedRecords.map((rec) => (
              <div key={rec._id || rec.id} className="panel-record-item">
                <FileText size={16} className="record-item-icon" />
                <div className="record-item-info">
                  <span className="record-item-title">{rec.title}</span>
                  <small className="record-item-date">
                    {rec.record_date || new Date(rec.created_at).toLocaleDateString()} · {rec.record_type}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. AI INSIGHT PLACEHOLDER */}
      <div className="panel-ai-insight-box">
        <div className="ai-insight-header">
          <Sparkles size={16} className="text-cyan" />
          <span>CareBridge AI Clinical Insight</span>
        </div>
        <p className="ai-insight-content">
          AI insights for your {config.name.toLowerCase()} will appear here as ongoing telemetry and diagnostic lab panels sync with your clinical profile.
        </p>
      </div>

      {/* 7. ASK CAREBRIDGE AI BUTTON */}
      <button
        type="button"
        className="ask-carebridge-ai-btn"
        onClick={handleAskAI}
        title={`Ask CareBridge AI Assistant about your ${config.name}`}
      >
        <Bot size={18} />
        <span>Ask CareBridge AI about this</span>
        <ChevronRight size={16} className="chevron" />
      </button>

      {/* 8. MEDICAL DISCLAIMER */}
      <div className="panel-disclaimer-footer">
        <ShieldCheck size={13} className="disclaimer-shield" />
        <span>For information only. Not a diagnosis. Consult your attending physician.</span>
      </div>
    </div>
  );
}

export default OrganSidePanel;
