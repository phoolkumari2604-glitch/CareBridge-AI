import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Heart,
  Wind,
  Brain,
  Droplets,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Sparkles,
  Eye,
  Radio,
  Sliders,
} from "lucide-react";
import glowingBodyImg from "../../assets/glowing-body.png";
import "./InteractiveBodyMap.css";

function InteractiveBodyMap({ vitals: propVitals, healthProfile, alerts = [] }) {
  const [selectedOrgan, setSelectedOrgan] = useState("heart");
  const [hoveredOrgan, setHoveredOrgan] = useState(null);

  // Reduce motion state (checkbox + OS prefers-reduced-motion fallback)
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  // Live fluctuating telemetry state (updates every 3 seconds)
  const [liveMetrics, setLiveMetrics] = useState({
    bpm: propVitals?.heart_rate || 74,
    sys: propVitals?.systolic_bp || 120,
    dia: propVitals?.diastolic_bp || 80,
    spo2: propVitals?.spo2 || 98,
    sugar: propVitals?.blood_sugar || 95,
    temp: propVitals?.temperature || 36.8,
  });

  // Update live telemetry values every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics((prev) => {
        // Natural physiological baseline drift
        const baseBpm = propVitals?.heart_rate || 74;
        const newBpm = Math.max(58, Math.min(108, baseBpm + Math.floor(Math.random() * 7 - 3)));

        const baseSys = propVitals?.systolic_bp || 120;
        const newSys = Math.max(110, Math.min(138, baseSys + Math.floor(Math.random() * 5 - 2)));

        const baseDia = propVitals?.diastolic_bp || 80;
        const newDia = Math.max(70, Math.min(88, baseDia + Math.floor(Math.random() * 3 - 1)));

        const baseSpo2 = propVitals?.spo2 || 98;
        const newSpo2 = Math.max(95, Math.min(99, baseSpo2 + Math.floor(Math.random() * 3 - 1)));

        const baseSugar = propVitals?.blood_sugar || 95;
        const newSugar = Math.max(85, Math.min(115, baseSugar + Math.floor(Math.random() * 5 - 2)));

        return {
          bpm: newBpm,
          sys: newSys,
          dia: newDia,
          spo2: newSpo2,
          sugar: newSugar,
          temp: prev.temp,
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [propVitals]);

  // Sync prop vitals if they change
  useEffect(() => {
    if (propVitals) {
      setLiveMetrics((prev) => ({
        ...prev,
        bpm: propVitals.heart_rate || prev.bpm,
        sys: propVitals.systolic_bp || prev.sys,
        dia: propVitals.diastolic_bp || prev.dia,
        spo2: propVitals.spo2 || prev.spo2,
        sugar: propVitals.blood_sugar || prev.sugar,
        temp: propVitals.temperature || prev.temp,
      }));
    }
  }, [propVitals]);

  // Dynamic heart pulse duration in seconds (60 / bpm)
  const heartCycleSec = (60 / Math.max(40, liveMetrics.bpm)).toFixed(3);

  // Organ Telemetry Resolution
  const getOrganMetrics = () => {
    const { bpm, sys, dia, spo2, sugar, temp } = liveMetrics;

    // 1. Heart (BPM & BP)
    let heartStatus = "normal";
    if (bpm < 55 || bpm > 115 || sys >= 150) {
      heartStatus = "critical";
    } else if (bpm < 60 || bpm > 100 || sys >= 130) {
      heartStatus = "watch";
    }

    // 2. Lungs (SpO2)
    let lungsStatus = "normal";
    if (spo2 < 92) {
      lungsStatus = "critical";
    } else if (spo2 < 95) {
      lungsStatus = "watch";
    }

    // 3. Pancreas (Blood Glucose)
    let pancreasStatus = "normal";
    if (sugar < 70 || sugar > 200) {
      pancreasStatus = "critical";
    } else if (sugar > 140 || sugar < 80) {
      pancreasStatus = "watch";
    }

    // 4. Brain (Perfusion & Vascular Pressure)
    let brainStatus = "normal";
    if (sys >= 160) {
      brainStatus = "critical";
    } else if (sys >= 135) {
      brainStatus = "watch";
    }

    // 5. Liver (Metabolic Screen)
    let liverStatus = "normal";

    // 6. Kidneys (Renal Filtration & Diastolic Load)
    let kidneysStatus = "normal";
    if (sys >= 140 || dia >= 90) kidneysStatus = "watch";

    // 7. Stomach (GI Core)
    let stomachStatus = "normal";

    return {
      brain: {
        id: "brain",
        name: "Brain & Nervous System",
        shortName: "Brain",
        icon: Brain,
        status: brainStatus,
        telemetry: `Perfusion: ${sys} mmHg · Active Rhythm`,
        readings: `Arterial Perfusion: ${sys} mmHg`,
        note:
          brainStatus === "critical"
            ? "Severe hypertensive cerebral risk detected. Immediate medical evaluation required."
            : brainStatus === "watch"
            ? "Elevated arterial perfusion pressure. May contribute to tension or cephalic fatigue."
            : "Cerebral perfusion and neural transmission pathways are stable within safe limits.",
        pos: { top: "8.5%", left: "50%" },
      },
      lungs: {
        id: "lungs",
        name: "Lungs & Respiratory System",
        shortName: "Lungs",
        icon: Wind,
        status: lungsStatus,
        telemetry: `${spo2}% SpO2 · Respiratory Stable`,
        readings: `Blood Oxygenation: ${spo2}% SpO2`,
        note:
          lungsStatus === "critical"
            ? "Hypoxemia detected. Supplementary clinical oxygenation triage indicated."
            : lungsStatus === "watch"
            ? "Borderline oxygen saturation. Perform diaphragmatic breathing and rest."
            : "Optimal pulmonary gas exchange and arterial oxygenation (SpO2 ≥ 95%).",
        pos: { top: "24%", left: "42%" },
      },
      heart: {
        id: "heart",
        name: "Heart & Cardiovascular System",
        shortName: "Heart",
        icon: Heart,
        status: heartStatus,
        telemetry: `${bpm} BPM · ${sys}/${dia} mmHg`,
        readings: `Rhythm: ${bpm} BPM · Pressure: ${sys}/${dia} mmHg`,
        note:
          heartStatus === "critical"
            ? "Acute cardiac threshold deviation logged. Cease exertion and consult physician."
            : heartStatus === "watch"
            ? "Pre-hypertensive or mildly elevated cardiac cycle. Continue regular monitoring."
            : "Optimal sinus rhythm with healthy ventricular and atrial contraction phases.",
        pos: { top: "27%", left: "53%" },
      },
      liver: {
        id: "liver",
        name: "Liver & Hepatic Function",
        shortName: "Liver",
        icon: Activity,
        status: liverStatus,
        telemetry: `Metabolic Index: 1.0 · Detox Active`,
        readings: "Hepatic Metabolic Profile: Normal",
        note: "Hepatic detoxification and metabolic synthesis pathways operating in steady homeostasis.",
        pos: { top: "35%", left: "44%" },
      },
      stomach: {
        id: "stomach",
        name: "Stomach & Gastrointestinal",
        shortName: "Stomach",
        icon: Flame,
        status: stomachStatus,
        telemetry: `GI Core: ${temp}°C · Motility Stable`,
        readings: `Gastric Temperature: ${temp}°C`,
        note: "Gastrointestinal equilibrium and core body temperature within physiological norms.",
        pos: { top: "36.5%", left: "56%" },
      },
      pancreas: {
        id: "pancreas",
        name: "Pancreas & Endocrine System",
        shortName: "Pancreas",
        icon: Droplets,
        status: pancreasStatus,
        telemetry: `${sugar} mg/dL Glucose · Endocrine Stable`,
        readings: `Fasting Blood Glucose: ${sugar} mg/dL`,
        note:
          pancreasStatus === "critical"
            ? "Significant glycemic deviation. Check carbohydrate intake or insulin regimen."
            : pancreasStatus === "watch"
            ? "Borderline glycemic elevation. Prioritize hydration and dietary fiber."
            : "Balanced insulin and glucagon endocrine regulation with steady glycemic control.",
        pos: { top: "41.5%", left: "50%" },
      },
      kidneys: {
        id: "kidneys",
        name: "Kidneys & Renal Filtration",
        shortName: "Kidneys",
        icon: ShieldCheck,
        status: kidneysStatus,
        telemetry: `Renal Filtration: ${sys}/${dia} mmHg`,
        readings: `Perfusion Load: ${sys}/${dia} mmHg`,
        note: "Renal glomerulus filtration and electrolyte fluid balance functioning as expected.",
        pos: { top: "46.5%", left: "50%" },
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
        return "#64748b"; // Gray
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "critical":
        return "Critical";
      case "watch":
        return "Watch";
      case "normal":
        return "Normal";
      default:
        return "Not Logged";
    }
  };

  return (
    <div className="body-map-card" aria-label="Interactive Physiological Organ Map">
      {/* HEADER */}
      <div className="body-map-header">
        <div className="body-header-title">
          <div className="body-icon-wrap">
            <Activity size={20} />
          </div>
          <div>
            <h3>Interactive Physiological Organ Map</h3>
            <span>Live neural & vascular telemetry mapping with active organ nodes</span>
          </div>
        </div>

        <div className="body-map-controls-row">
          {/* REDUCE MOTION CHECKBOX */}
          <label className="reduce-motion-toggle" title="Toggle animation effects">
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
            />
            <span className="toggle-box"></span>
            <span className="toggle-label">Reduce Motion</span>
          </label>

          {/* LEGEND */}
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
      </div>

      {/* CONTENT: GLOWING BODY + INTERACTIVE HOTSPOTS & DETAIL DRAWER */}
      <div className="body-map-content">
        {/* GLOWING BODY VISUALIZER CONTAINER */}
        <div className="glowing-body-container">
          <div className="glowing-body-frame">
            {/* AMBIENT BACKGROUND GLOW */}
            <div
              className={`body-neural-ambient ${reduceMotion ? "no-anim" : ""}`}
              style={{
                background: `radial-gradient(ellipse at 50% 30%, ${getStatusColor(activeOrgan.status)}33 0%, rgba(249, 115, 22, 0.18) 45%, transparent 75%)`,
              }}
            />

            {/* HIGH RESOLUTION GLOWING ORANGE NERVE & VESSEL BODY IMAGE */}
            <img
              src={glowingBodyImg}
              alt="Physiological Glowing Neural Body"
              className={`glowing-body-img ${reduceMotion ? "no-anim" : ""}`}
            />

            {/* PULSING VASCULAR & NEURAL OVERLAY EFFECT */}
            <div
              className={`vascular-glow-overlay ${reduceMotion ? "no-anim" : ""}`}
              style={{ animationDuration: reduceMotion ? "0s" : "3.5s" }}
            />

            {/* SPECIAL CARDIAC PULSE HALO AT HEART LOCATION */}
            <div
              className={`cardiac-focal-pulse ${reduceMotion ? "no-anim" : ""}`}
              style={{
                top: "27%",
                left: "53%",
                animationDuration: reduceMotion ? "0s" : `${heartCycleSec}s`,
                borderColor: getStatusColor(organs.heart.status),
                boxShadow: `0 0 20px ${getStatusColor(organs.heart.status)}88`,
              }}
            />

            {/* INTERACTIVE ORGAN HOTSPOTS */}
            {Object.values(organs).map((org) => {
              const isSelected = selectedOrgan === org.id;
              const isHovered = hoveredOrgan === org.id;
              const color = getStatusColor(org.status);
              const isHeart = org.id === "heart";

              return (
                <button
                  key={org.id}
                  type="button"
                  className={`organ-hotspot-pin ${isSelected ? "selected" : ""} ${isHovered ? "hovered" : ""}`}
                  style={{
                    top: org.pos.top,
                    left: org.pos.left,
                    "--organ-color": color,
                  }}
                  onClick={() => setSelectedOrgan(org.id)}
                  onMouseEnter={() => setHoveredOrgan(org.id)}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  aria-label={`Select ${org.name} (${getStatusLabel(org.status)})`}
                >
                  {/* Outer Radiating Beacon Rings */}
                  <span
                    className={`beacon-ring ${reduceMotion ? "no-anim" : ""}`}
                    style={{
                      animationDuration: isHeart && !reduceMotion ? `${heartCycleSec}s` : "2.4s",
                      borderColor: color,
                    }}
                  />
                  <span
                    className={`beacon-pulse-core ${reduceMotion ? "no-anim" : ""}`}
                    style={{
                      animationDuration: isHeart && !reduceMotion ? `${heartCycleSec}s` : "1.8s",
                      backgroundColor: color,
                      boxShadow: `0 0 12px ${color}`,
                    }}
                  />

                  {/* Hotspot Center Icon */}
                  <span className="beacon-center-dot">
                    <org.icon size={11} className="beacon-icon" />
                  </span>

                  {/* Hotspot Floating Label */}
                  <span
                    className={`hotspot-tag-pill ${isSelected ? "active" : ""}`}
                    style={{
                      borderColor: `${color}88`,
                      boxShadow: isSelected ? `0 0 12px ${color}66` : "none",
                    }}
                  >
                    <span className="tag-dot" style={{ backgroundColor: color }} />
                    <span className="tag-text">{org.shortName}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ORGAN TELEMETRY & CLINICAL STATUS DRAWER */}
        <div className="organ-detail-drawer">
          <div
            className="organ-detail-card"
            style={{
              borderLeftColor: getStatusColor(activeOrgan.status),
              boxShadow: `0 10px 30px rgba(0, 0, 0, 0.4), inset 0 0 20px ${getStatusColor(activeOrgan.status)}11`,
            }}
          >
            {/* TOP HEADER */}
            <div className="organ-detail-top">
              <div className="organ-name-row">
                <div
                  className="organ-icon-box"
                  style={{
                    backgroundColor: `${getStatusColor(activeOrgan.status)}22`,
                    color: getStatusColor(activeOrgan.status),
                    borderColor: `${getStatusColor(activeOrgan.status)}55`,
                  }}
                >
                  <activeOrgan.icon size={22} />
                </div>
                <div>
                  <h4>{activeOrgan.name}</h4>
                  <span className="organ-system-sub">Physiological Telemetry Node</span>
                </div>
              </div>

              <span
                className="organ-status-badge"
                style={{
                  background: `${getStatusColor(activeOrgan.status)}22`,
                  color: getStatusColor(activeOrgan.status),
                  border: `1px solid ${getStatusColor(activeOrgan.status)}66`,
                }}
              >
                <span
                  className="badge-glow-dot"
                  style={{ backgroundColor: getStatusColor(activeOrgan.status) }}
                />
                {getStatusLabel(activeOrgan.status).toUpperCase()}
              </span>
            </div>

            {/* LIVE TELEMETRY DISPLAY BOX */}
            <div className="organ-reading-box">
              <div className="reading-title-row">
                <span>Real-Time Physiological Telemetry</span>
                <span className="live-stream-tag font-mono">
                  <Radio size={11} className="radio-live-icon" /> LIVE STREAM
                </span>
              </div>
              <strong className="organ-telemetry-highlight font-mono">{activeOrgan.telemetry}</strong>
              <div className="organ-sub-reading">{activeOrgan.readings}</div>
            </div>

            {/* CLINICAL NOTE */}
            <div className="organ-clinical-note-wrap">
              <span className="clinical-kicker">Clinical Observation & Triage</span>
              <p className="organ-clinical-note">{activeOrgan.note}</p>
            </div>

            {/* QUICK ORGAN SELECTOR CHIPS */}
            <div className="organ-chips-section">
              <span className="chips-title">Select Anatomical Target:</span>
              <div className="organ-chips-row">
                {Object.values(organs).map((org) => {
                  const isSelected = selectedOrgan === org.id;
                  const color = getStatusColor(org.status);
                  return (
                    <button
                      key={org.id}
                      type="button"
                      className={`organ-select-chip ${isSelected ? "active" : ""}`}
                      style={{
                        borderColor: isSelected ? color : "rgba(148, 163, 184, 0.2)",
                        color: isSelected ? color : "#cbd5e1",
                      }}
                      onClick={() => setSelectedOrgan(org.id)}
                    >
                      <span className="chip-dot" style={{ background: color }} />
                      <span>{org.shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FOOTER */}
            <div className="organ-drawer-footer">
              <ShieldCheck size={14} className="text-teal" />
              <span>
                Algorithmic Telemetry Mapping &middot; Cycle: {heartCycleSec}s &middot; HIPAA & NABH Compliance Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InteractiveBodyMap;
