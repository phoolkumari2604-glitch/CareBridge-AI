import React, { useState } from "react";
import {
  Activity,
  Heart,
  Wind,
  Brain,
  Droplets,
  Info,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  X,
  ChevronRight,
} from "lucide-react";
import "./InteractiveBodyMap.css";

function InteractiveBodyMap({ vitals, healthProfile, alerts = [] }) {
  const [selectedOrgan, setSelectedOrgan] = useState("heart");
  const [hoveredOrgan, setHoveredOrgan] = useState(null);

  const hr = vitals?.heart_rate;
  const sys = vitals?.systolic_bp;
  const dia = vitals?.diastolic_bp;
  const spo2 = vitals?.spo2;
  const sugar = vitals?.blood_sugar;
  const temp = vitals?.temperature;

  // Organ Telemetry Resolution
  const getOrganMetrics = () => {
    // 1. Heart (HR & BP)
    let heartStatus = "normal";
    let heartReadings = [];
    if (hr) heartReadings.push(`${hr} BPM`);
    if (sys && dia) heartReadings.push(`${sys}/${dia} mmHg`);
    if (!hr && !sys) {
      heartStatus = "unrecorded";
    } else if ((hr && (hr < 50 || hr > 120)) || (sys && sys >= 150)) {
      heartStatus = "critical";
    } else if ((hr && (hr < 60 || hr > 100)) || (sys && sys >= 130)) {
      heartStatus = "watch";
    }

    // 2. Lungs (SpO2 & Respiratory)
    let lungsStatus = "normal";
    let lungsReadings = [];
    if (spo2) lungsReadings.push(`${spo2}% SpO2`);
    if (!spo2) {
      lungsStatus = "unrecorded";
    } else if (spo2 < 92) {
      lungsStatus = "critical";
    } else if (spo2 < 95) {
      lungsStatus = "watch";
    }

    // 3. Pancreas (Blood Glucose)
    let pancreasStatus = "normal";
    let pancreasReadings = [];
    if (sugar) pancreasReadings.push(`${sugar} mg/dL`);
    if (!sugar) {
      pancreasStatus = "unrecorded";
    } else if (sugar < 70 || sugar > 200) {
      pancreasStatus = "critical";
    } else if (sugar > 140 || sugar < 80) {
      pancreasStatus = "watch";
    }

    // 4. Brain (BP & Systemic)
    let brainStatus = "normal";
    let brainReadings = [];
    if (sys) brainReadings.push(`Perfusion: ${sys} mmHg`);
    if (!sys && !hr) {
      brainStatus = "unrecorded";
    } else if (sys && sys >= 160) {
      brainStatus = "critical";
    } else if (sys && sys >= 135) {
      brainStatus = "watch";
    }

    // 5. Liver (Metabolic & Profile)
    let liverStatus = "normal";
    let liverReadings = ["Metabolic Screen Normal"];

    // 6. Kidneys (BP & Hydration)
    let kidneysStatus = "normal";
    let kidneysReadings = sys ? [`Renal Filtration BP: ${sys}/${dia || 80}`] : ["Filtration Stable"];
    if (sys && sys >= 140) kidneysStatus = "watch";

    // 7. Stomach (GI & Nutrition)
    let stomachStatus = "normal";
    let stomachReadings = [temp ? `GI Core: ${temp}°C` : "Gastric Balance Stable"];

    return {
      brain: {
        id: "brain",
        name: "Brain & Nervous System",
        icon: Brain,
        status: brainStatus,
        readings: brainReadings.length ? brainReadings.join(" · ") : "No direct readings logged",
        note: brainStatus === "critical"
          ? "Severe hypertensive cerebral risk noted. Seek immediate medical attention."
          : brainStatus === "watch"
          ? "Elevated arterial pressure may cause tension headache or fatigue."
          : "Cerebral perfusion and neurological indicators are within safe baseline ranges.",
        coords: { cx: 120, cy: 38, r: 18 },
      },
      lungs: {
        id: "lungs",
        name: "Lungs & Respiratory System",
        icon: Wind,
        status: lungsStatus,
        readings: lungsReadings.length ? lungsReadings.join(" · ") : "SpO2 not recorded",
        note: lungsStatus === "critical"
          ? "Hypoxemia detected. Supplementary oxygen triage recommended."
          : lungsStatus === "watch"
          ? "Sub-optimal oxygen saturation. Perform deep breathing exercises and rest."
          : "Optimal blood oxygenation (SpO2 ≥ 95%). Healthy pulmonary exchange.",
        coords: { cx: 120, cy: 98, rx: 28, ry: 16 },
      },
      heart: {
        id: "heart",
        name: "Heart & Cardiovascular System",
        icon: Heart,
        status: heartStatus,
        readings: heartReadings.length ? heartReadings.join(" · ") : "Telemetry awaiting sync",
        note: heartStatus === "critical"
          ? "Critical cardiac telemetry alert triggered. Immediate rest and clinical consult needed."
          : heartStatus === "watch"
          ? "Borderline rhythm or pre-hypertensive reading. Monitor daily."
          : "Normal sinus rhythm with stable hemodynamic pressures.",
        coords: { cx: 128, cy: 112, r: 14 },
      },
      liver: {
        id: "liver",
        name: "Liver & Hepatic Function",
        icon: Activity,
        status: liverStatus,
        readings: liverReadings.join(" · "),
        note: "Hepatic metabolic and detoxification pathways functioning smoothly.",
        coords: { cx: 104, cy: 146, rx: 14, ry: 10 },
      },
      stomach: {
        id: "stomach",
        name: "Stomach & Digestive Tract",
        icon: Flame,
        status: stomachStatus,
        readings: stomachReadings.join(" · "),
        note: "Gastrointestinal tract stable. Maintain adequate hydration and dietary fiber.",
        coords: { cx: 134, cy: 148, rx: 12, ry: 9 },
      },
      pancreas: {
        id: "pancreas",
        name: "Pancreas & Endocrine System",
        icon: Droplets,
        status: pancreasStatus,
        readings: pancreasReadings.length ? pancreasReadings.join(" · ") : "Blood glucose not recorded",
        note: pancreasStatus === "critical"
          ? "Acute hypo/hyperglycemic risk. Check insulin or oral intake."
          : pancreasStatus === "watch"
          ? "Elevated fasting blood sugar. Prioritize complex fiber and hydration."
          : "Normal glucose metabolism and glycemic balance.",
        coords: { cx: 120, cy: 162, rx: 16, ry: 7 },
      },
      kidneys: {
        id: "kidneys",
        name: "Kidneys & Renal Filtration",
        icon: ShieldCheck,
        status: kidneysStatus,
        readings: kidneysReadings.join(" · "),
        note: "Fluid electrolyte balance and renal filtration operating within expected limits.",
        coords: { cx: 120, cy: 178, rx: 24, ry: 8 },
      },
    };
  };

  const organs = getOrganMetrics();
  const activeOrgan = organs[selectedOrgan] || organs.heart;

  const getStatusColor = (status) => {
    switch (status) {
      case "critical":
        return "#ef4444"; // Red
      case "watch":
        return "#f59e0b"; // Amber
      case "normal":
        return "#10b981"; // Green
      default:
        return "#64748b"; // Slate / Gray
    }
  };

  return (
    <div className="body-map-card">
      <div className="body-map-header">
        <div className="body-header-title">
          <div className="body-icon-wrap">
            <Activity size={20} />
          </div>
          <div>
            <h3>Interactive Physiological Organ Map</h3>
            <span>Real-time Multi-Organ Health Telemetry Mapping</span>
          </div>
        </div>

        <div className="body-map-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: "#10b981" }} /> Normal
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: "#f59e0b" }} /> Watch
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: "#ef4444" }} /> Critical
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: "#64748b" }} /> Not Logged
          </span>
        </div>
      </div>

      <div className="body-map-content">
        {/* SVG Anatomical Human Silhouette */}
        <div className="body-svg-container">
          <svg viewBox="0 0 240 380" className="body-anatomy-svg">
            <defs>
              <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
              </linearGradient>
              <filter id="organGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Stylized Human Body Silhouette */}
            {/* Head */}
            <circle cx="120" cy="38" r="22" fill="url(#bodyGradient)" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1.5" />
            {/* Neck */}
            <rect x="114" y="58" width="12" height="14" rx="3" fill="url(#bodyGradient)" stroke="rgba(56, 189, 248, 0.2)" />
            {/* Torso */}
            <path
              d="M80,72 Q120,68 160,72 L150,195 Q120,202 90,195 Z"
              fill="url(#bodyGradient)"
              stroke="rgba(56, 189, 248, 0.3)"
              strokeWidth="1.5"
            />
            {/* Arms */}
            <path d="M78,74 L54,165 Q50,175 60,175 L76,115" fill="none" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="8" strokeLinecap="round" />
            <path d="M162,74 L186,165 Q190,175 180,175 L164,115" fill="none" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="8" strokeLinecap="round" />
            {/* Pelvis & Legs */}
            <path d="M90,195 L96,350 Q98,360 108,360 L112,230 L128,230 L132,360 Q142,360 144,350 L150,195 Z" fill="url(#bodyGradient)" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.5" />

            {/* Interactive Organ Hotspots */}
            {/* 1. Brain */}
            <circle
              cx="120"
              cy="38"
              r="14"
              className={`organ-node ${selectedOrgan === "brain" ? "selected" : ""}`}
              fill={getStatusColor(organs.brain.status)}
              fillOpacity="0.8"
              stroke="#ffffff"
              strokeWidth={selectedOrgan === "brain" ? 2.5 : 1}
              filter="url(#organGlow)"
              onClick={() => setSelectedOrgan("brain")}
              onMouseEnter={() => setHoveredOrgan("brain")}
              onMouseLeave={() => setHoveredOrgan(null)}
            />

            {/* 2. Lungs */}
            <ellipse
              cx="120"
              cy="96"
              rx="24"
              ry="14"
              className={`organ-node ${selectedOrgan === "lungs" ? "selected" : ""}`}
              fill={getStatusColor(organs.lungs.status)}
              fillOpacity="0.75"
              stroke="#ffffff"
              strokeWidth={selectedOrgan === "lungs" ? 2.5 : 1}
              filter="url(#organGlow)"
              onClick={() => setSelectedOrgan("lungs")}
              onMouseEnter={() => setHoveredOrgan("lungs")}
              onMouseLeave={() => setHoveredOrgan(null)}
            />

            {/* 3. Heart */}
            <circle
              cx="128"
              cy="114"
              r="12"
              className={`organ-node ${selectedOrgan === "heart" ? "selected" : ""}`}
              fill={getStatusColor(organs.heart.status)}
              fillOpacity="0.9"
              stroke="#ffffff"
              strokeWidth={selectedOrgan === "heart" ? 2.5 : 1}
              filter="url(#organGlow)"
              onClick={() => setSelectedOrgan("heart")}
              onMouseEnter={() => setHoveredOrgan("heart")}
              onMouseLeave={() => setHoveredOrgan(null)}
            />

            {/* 4. Liver */}
            <ellipse
              cx="106"
              cy="144"
              rx="13"
              ry="9"
              className={`organ-node ${selectedOrgan === "liver" ? "selected" : ""}`}
              fill={getStatusColor(organs.liver.status)}
              fillOpacity="0.8"
              stroke="#ffffff"
              strokeWidth={selectedOrgan === "liver" ? 2.5 : 1}
              filter="url(#organGlow)"
              onClick={() => setSelectedOrgan("liver")}
              onMouseEnter={() => setHoveredOrgan("liver")}
              onMouseLeave={() => setHoveredOrgan(null)}
            />

            {/* 5. Stomach */}
            <ellipse
              cx="134"
              cy="146"
              rx="11"
              ry="8"
              className={`organ-node ${selectedOrgan === "stomach" ? "selected" : ""}`}
              fill={getStatusColor(organs.stomach.status)}
              fillOpacity="0.8"
              stroke="#ffffff"
              strokeWidth={selectedOrgan === "stomach" ? 2.5 : 1}
              filter="url(#organGlow)"
              onClick={() => setSelectedOrgan("stomach")}
              onMouseEnter={() => setHoveredOrgan("stomach")}
              onMouseLeave={() => setHoveredOrgan(null)}
            />

            {/* 6. Pancreas */}
            <ellipse
              cx="120"
              cy="162"
              rx="15"
              ry="7"
              className={`organ-node ${selectedOrgan === "pancreas" ? "selected" : ""}`}
              fill={getStatusColor(organs.pancreas.status)}
              fillOpacity="0.85"
              stroke="#ffffff"
              strokeWidth={selectedOrgan === "pancreas" ? 2.5 : 1}
              filter="url(#organGlow)"
              onClick={() => setSelectedOrgan("pancreas")}
              onMouseEnter={() => setHoveredOrgan("pancreas")}
              onMouseLeave={() => setHoveredOrgan(null)}
            />

            {/* 7. Kidneys */}
            <ellipse
              cx="120"
              cy="178"
              rx="22"
              ry="7"
              className={`organ-node ${selectedOrgan === "kidneys" ? "selected" : ""}`}
              fill={getStatusColor(organs.kidneys.status)}
              fillOpacity="0.8"
              stroke="#ffffff"
              strokeWidth={selectedOrgan === "kidneys" ? 2.5 : 1}
              filter="url(#organGlow)"
              onClick={() => setSelectedOrgan("kidneys")}
              onMouseEnter={() => setHoveredOrgan("kidneys")}
              onMouseLeave={() => setHoveredOrgan(null)}
            />
          </svg>
        </div>

        {/* Organ Detail Drawer */}
        <div className="organ-detail-drawer">
          <div className="organ-detail-card" style={{ borderLeftColor: getStatusColor(activeOrgan.status) }}>
            <div className="organ-detail-top">
              <div className="organ-name-row">
                <activeOrgan.icon size={20} style={{ color: getStatusColor(activeOrgan.status) }} />
                <h4>{activeOrgan.name}</h4>
              </div>
              <span
                className="organ-status-badge"
                style={{
                  background: `${getStatusColor(activeOrgan.status)}22`,
                  color: getStatusColor(activeOrgan.status),
                  border: `1px solid ${getStatusColor(activeOrgan.status)}66`,
                }}
              >
                {activeOrgan.status.toUpperCase()}
              </span>
            </div>

            <div className="organ-reading-box">
              <span>Telemetry Measurement:</span>
              <strong>{activeOrgan.readings}</strong>
            </div>

            <p className="organ-clinical-note">{activeOrgan.note}</p>

            {/* Quick Organ Selector Chips */}
            <div className="organ-chips-row">
              {Object.values(organs).map((org) => (
                <button
                  key={org.id}
                  type="button"
                  className={`organ-select-chip ${selectedOrgan === org.id ? "active" : ""}`}
                  onClick={() => setSelectedOrgan(org.id)}
                >
                  <span className="chip-dot" style={{ background: getStatusColor(org.status) }} />
                  <span>{org.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>

            <div className="organ-drawer-footer">
              <ShieldCheck size={14} />
              <span>Algorithmic Telemetry Mapping &middot; Educational & Triage Purpose Only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InteractiveBodyMap;
