import React, { useState, useMemo } from "react";
import {
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
  Brain,
  Flame,
  Droplets,
  Wind,
  CircleDot,
  Radio,
  Eye,
  ChevronRight,
} from "lucide-react";
import { getRegisteredSystems, getSystemGroup } from "./systemRegistry.js";
import { getOrganConfig } from "./organs.config.js";
import { getOrganStatus } from "./getOrganStatus.js";
import OrganViewer3D from "./OrganViewer3D.jsx";
import OrganSidePanel from "./OrganSidePanel.jsx";
import "./BodyExplorer.css";

// Organ icon lookup
const ORGAN_ICONS = {
  brain: Brain,
  stomach: Flame,
  pancreas: Droplets,
  thyroid: Wind,
  intestines: CircleDot,
};

export function BodyExplorer({ vitals, alerts = [], healthProfile, healthRecords = [] }) {
  const registeredSystems = useMemo(() => getRegisteredSystems(), []);
  const [selectedSystemId, setSelectedSystemId] = useState(
    registeredSystems[0]?.id || "internal-organs"
  );

  const activeSystem = useMemo(
    () => getSystemGroup(selectedSystemId) || registeredSystems[0],
    [selectedSystemId, registeredSystems]
  );

  const availableOrganIds = activeSystem?.organIds || ["stomach", "pancreas", "thyroid", "intestines"];
  const [selectedOrganId, setSelectedOrganId] = useState(availableOrganIds[0] || "stomach");

  // Bundle patient data
  const patientData = useMemo(
    () => ({ vitals, alerts, healthProfile, healthRecords }),
    [vitals, alerts, healthProfile, healthRecords]
  );

  // Compute status for all organs in active system
  const organStatuses = useMemo(() => {
    const map = {};
    availableOrganIds.forEach((id) => {
      map[id] = getOrganStatus(id, patientData);
    });
    return map;
  }, [availableOrganIds, patientData]);

  const activeOrganStatus = organStatuses[selectedOrganId] || getOrganStatus(selectedOrganId, patientData);
  const activeConfig = getOrganConfig(selectedOrganId);

  return (
    <section className="body-explorer-section" aria-label="Interactive 3D Body Systems Explorer">
      {/* 1. TOP HEADING & LIVE STREAM BADGE */}
      <div className="body-explorer-header">
        <div className="explorer-title-group">
          <span className="heading-kicker">3D ANATOMICAL BODY EXPLORER · {activeSystem?.phase || "PHASE 2"}</span>
          <h2 className="heading-title">Body Systems & Internal Organs</h2>
          <p className="explorer-sub">
            Interactive, procedural 3D visceral organ models mapped to your real-time physiological telemetry and clinical alerts.
          </p>
        </div>

        <div className="explorer-header-right">
          <div className="live-telemetry-pill font-mono">
            <Radio size={12} className="pulse-icon text-cyan" />
            <span>TELEMETRY SYNCED</span>
          </div>
        </div>
      </div>

      {/* 2. SYSTEM SELECTOR TABS (Extensible registry for Phase 2, Phase 3, etc.) */}
      <div className="system-selector-tabs" role="tablist" aria-label="Body System Selector">
        {registeredSystems.map((sys) => {
          const isActive = sys.id === selectedSystemId;
          return (
            <button
              key={sys.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`system-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => {
                setSelectedSystemId(sys.id);
                if (sys.organIds?.length) {
                  setSelectedOrganId(sys.organIds[0]);
                }
              }}
            >
              <Layers size={15} />
              <span>{sys.name}</span>
              <span className="system-tab-phase-tag">{sys.phase}</span>
            </button>
          );
        })}
      </div>

      {/* 3. ORGAN SELECTOR CHIP CARDS */}
      <div className="organ-selector-row" role="tablist" aria-label="Internal Organs Selector">
        {availableOrganIds.map((id) => {
          const cfg = getOrganConfig(id);
          const st = organStatuses[id] || getOrganStatus(id, patientData);
          const isSelected = id === selectedOrganId;
          const Icon = ORGAN_ICONS[id] || Activity;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`organ-card-tab ${isSelected ? "selected" : ""}`}
              style={{
                "--organ-active-color": st.color,
                borderColor: isSelected ? st.color : "rgba(148, 163, 184, 0.14)",
              }}
              onClick={() => setSelectedOrganId(id)}
            >
              <div
                className="organ-tab-icon-wrap"
                style={{
                  backgroundColor: st.bg,
                  color: st.color,
                }}
              >
                <Icon size={18} />
              </div>

              <div className="organ-tab-text">
                <span className="organ-tab-name">{cfg?.name || id}</span>
                <span className="organ-tab-status" style={{ color: st.color }}>
                  <span className="organ-status-mini-dot" style={{ backgroundColor: st.color }} />
                  {st.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. MAIN INTERACTIVE GRID: 3D VIEWPORT (LEFT) + CLINICAL SIDE PANEL (RIGHT) */}
      <div className="body-explorer-content-grid">
        {/* LEFT COLUMN: INTERACTIVE 3D ORGAN CANVAS */}
        <div className="explorer-canvas-column">
          <OrganViewer3D
            key={selectedOrganId}
            organId={selectedOrganId}
            status={activeOrganStatus.key}
            statusLabel={activeOrganStatus.label}
            onSelectOrgan={setSelectedOrganId}
          />
        </div>

        {/* RIGHT COLUMN: REUSED CLINICAL SIDE PANEL */}
        <div className="explorer-panel-column">
          <OrganSidePanel
            organId={selectedOrganId}
            organStatus={activeOrganStatus}
            patientData={patientData}
            onSelectOrgan={setSelectedOrganId}
          />
        </div>
      </div>
    </section>
  );
}

export default BodyExplorer;
