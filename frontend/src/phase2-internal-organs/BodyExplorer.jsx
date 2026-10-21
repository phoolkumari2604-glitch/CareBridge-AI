import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import { useAuth } from "../context/AuthContext";
import patientService from "../services/patientService";
import "./BodyExplorer.css";

// Organ icon lookup
const ORGAN_ICONS = {
  kidneys: Activity,
  brain: Brain,
  stomach: Flame,
  pancreas: Droplets,
  thyroid: Wind,
  intestines: CircleDot,
};

export function BodyExplorer({ vitals, alerts = [], healthProfile, healthRecords = [], activePatientId = null }) {
  const { user } = useAuth();
  const effectivePatientId = activePatientId || user?.patient_id || user?.id || user?._id || "6ad74791bab1d0fdb9dbb23d";

  const registeredSystems = useMemo(() => getRegisteredSystems(), []);
  const [selectedSystemId, setSelectedSystemId] = useState(
    registeredSystems[0]?.id || "internal-organs"
  );

  const activeSystem = useMemo(
    () => getSystemGroup(selectedSystemId) || registeredSystems[0],
    [selectedSystemId, registeredSystems]
  );

  const availableOrganIds = activeSystem?.organIds || ["kidneys", "brain", "stomach", "pancreas", "thyroid", "intestines"];
  const [selectedOrganId, setSelectedOrganId] = useState(availableOrganIds[0] || "kidneys");

  // Real-time Dossier State
  const [dossierMap, setDossierMap] = useState({});
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [lastDataTimestamp, setLastDataTimestamp] = useState(null);

  // Bundle legacy patient data
  const patientData = useMemo(
    () => ({ vitals, alerts, healthProfile, healthRecords, organDossiers: dossierMap }),
    [vitals, alerts, healthProfile, healthRecords, dossierMap]
  );

  // Fetch complete organ dossier from database
  const fetchDossier = useCallback(async () => {
    if (!effectivePatientId) return;
    try {
      const res = await patientService.getPatientOrgans(effectivePatientId);
      if (res && res.organs) {
        setDossierMap(res.organs);
        setLastDataTimestamp(new Date());
      }
    } catch (err) {
      console.warn("[BodyExplorer] Failed to fetch organs dossier:", err);
    }
  }, [effectivePatientId]);

  // Connect Server-Sent Events (SSE) with 15s polling fallback
  useEffect(() => {
    let isMounted = true;
    let eventSource = null;
    let pollInterval = null;

    // Initial fetch
    fetchDossier();

    // Setup SSE
    try {
      const streamUrl = patientService.getPatientOrganStreamUrl(effectivePatientId);
      eventSource = new EventSource(streamUrl);

      const handlePayload = (e) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.organs) {
            setDossierMap(payload.organs);
            setLastDataTimestamp(new Date());
            setIsLiveConnected(true);
          }
        } catch (err) {
          console.error("[BodyExplorer SSE] Error parsing payload:", err);
        }
      };

      eventSource.addEventListener("initial", handlePayload);
      eventSource.addEventListener("update", handlePayload);
      eventSource.addEventListener("heartbeat", () => {
        if (!isMounted) return;
        setIsLiveConnected(true);
      });

      eventSource.onmessage = handlePayload;

      eventSource.onerror = () => {
        if (!isMounted) return;
        setIsLiveConnected(false);
      };

      eventSource.onopen = () => {
        if (!isMounted) return;
        setIsLiveConnected(true);
      };
    } catch (err) {
      console.warn("[BodyExplorer] SSE initialization failed, falling back to polling:", err);
      setIsLiveConnected(false);
    }

    // 15-second polling fallback
    pollInterval = setInterval(() => {
      if (!isMounted) return;
      fetchDossier();
    }, 15000);

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [effectivePatientId, fetchDossier]);

  // Honest LIVE badge calculation: offline or data older than 5 minutes -> neutral grey
  const isStale = useMemo(() => {
    if (!lastDataTimestamp) return true;
    return Date.now() - new Date(lastDataTimestamp).getTime() > 5 * 60 * 1000;
  }, [lastDataTimestamp]);

  const isFeedHonestLive = isLiveConnected && !isStale;
  const lastUpdatedFormatted = lastDataTimestamp
    ? new Date(lastDataTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  // Compute status for all organs in active system using live dossier
  const organStatuses = useMemo(() => {
    const map = {};
    availableOrganIds.forEach((id) => {
      map[id] = getOrganStatus(id, patientData, dossierMap[id]);
    });
    return map;
  }, [availableOrganIds, patientData, dossierMap]);

  const activeOrganStatus = organStatuses[selectedOrganId] || getOrganStatus(selectedOrganId, patientData, dossierMap[selectedOrganId]);
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
          <div
            className={`live-telemetry-pill font-mono ${!isFeedHonestLive ? "offline" : ""}`}
            title={isFeedHonestLive ? "Live continuous telemetry feed active" : `Last updated ${lastUpdatedFormatted}`}
          >
            <Radio size={12} className={`pulse-icon ${isFeedHonestLive ? "text-cyan" : ""}`} />
            <span>{isFeedHonestLive ? "LIVE TELEMETRY" : `OFFLINE · ${lastUpdatedFormatted}`}</span>
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
          const st = organStatuses[id] || getOrganStatus(id, patientData, dossierMap[id]);
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
            patientId={effectivePatientId}
            patientData={patientData}
            organDossier={dossierMap[selectedOrganId]}
            onFindingsChange={fetchDossier}
          />
        </div>

        {/* RIGHT COLUMN: CLINICAL SIDE PANEL */}
        <div className="explorer-panel-column">
          <OrganSidePanel
            organId={selectedOrganId}
            organStatus={activeOrganStatus}
            patientData={patientData}
            organDossier={dossierMap[selectedOrganId]}
            onSelectOrgan={setSelectedOrganId}
          />
        </div>
      </div>
    </section>
  );
}

export default BodyExplorer;
