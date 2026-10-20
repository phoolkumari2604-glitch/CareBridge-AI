import React, { useState, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Activity, Wind } from "lucide-react";
import { Scene3D } from "./Scene3D";
import { OrganViewer3DProps } from "./types";

/**
 * OrganViewer3D Component: Interactive 3D WebGL anatomical viewer using Three.js / @react-three/fiber.
 * Matches the exact outer dimensions, border radius, position, and control overlays of the CareBridge viewer card.
 */
export const OrganViewer3D: React.FC<OrganViewer3DProps> = ({
  organ = "lungs",
  markers = [],
  selectedMarkerId = null,
  onSelectMarker,
  respRate = 16,
  heartRate = 72,
  isLive = true,
  className = "",
}) => {
  const [zoomScale, setZoomScale] = useState(1.0);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [zoomInTrigger, setZoomInTrigger] = useState(0);
  const [zoomOutTrigger, setZoomOutTrigger] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check prefers-reduced-motion media query & CareBridge motion event
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener?.("change", handler);
      return () => mq.removeEventListener?.("change", handler);
    }
  }, []);

  const handleReset = () => {
    setResetTrigger((prev) => prev + 1);
  };

  const handleZoomIn = () => {
    setZoomInTrigger((prev) => prev + 1);
  };

  const handleZoomOut = () => {
    setZoomOutTrigger((prev) => prev + 1);
  };

  return (
    <div
      className={`organ-3d-viewport relative overflow-hidden select-none ${className}`}
      tabIndex={0}
      role="region"
      aria-label={`Interactive 3D anatomical viewer of ${organ}`}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "480px",
        height: "520px",
        maxHeight: "680px",
        backgroundColor: "#030712",
        borderRadius: "16px",
        border: "1px solid rgba(148, 163, 184, 0.14)",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* ── 1. THREE.JS / R3F CANVAS ── */}
      <Scene3D
        organ={organ}
        markers={markers}
        selectedMarkerId={selectedMarkerId}
        onSelectMarker={onSelectMarker}
        respRate={respRate}
        reducedMotion={reducedMotion}
        onZoomChange={setZoomScale}
        resetTrigger={resetTrigger}
        zoomInTrigger={zoomInTrigger}
        zoomOutTrigger={zoomOutTrigger}
      />

      {/* ── 2. TOP FLOATING OVERLAY: LIVE BADGE, CHIP, BREATHING PILL & CONTROLS ── */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          left: "14px",
          right: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        {/* Left Group: LIVE Badge + Organ Vitality Chip + Breathing Pill */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", pointerEvents: "auto", flexWrap: "wrap" }}>
          {/* LIVE Badge */}
          {isLive && (
            <span
              className="organ-live-pill-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                background: "#000000",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "9999px",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.08em",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.6)",
              }}
              title="Live Continuous Telemetry Stream Active"
            >
              <span
                className="live-dot-indicator"
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#ff2d2d",
                  boxShadow: "0 0 8px #ff2d2d",
                  display: "inline-block",
                }}
              />
              LIVE
            </span>
          )}

          {/* Organ Chip: Lungs · Respiratory Vitality */}
          <div
            className="viewport-organ-tag"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              background: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#f8fafc",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#38bdf8",
                boxShadow: "0 0 8px #38bdf8",
              }}
            />
            <span style={{ fontWeight: 700 }}>
              {organ === "lungs" ? "Lungs" : "Heart"}
            </span>
            <span style={{ color: "rgba(148, 163, 184, 0.4)" }}>·</span>
            <span style={{ color: "#94a3b8", fontSize: "0.74rem" }}>
              {organ === "lungs" ? "Respiratory Vitality" : "Cardiovascular Vitality"}
            </span>
          </div>

          {/* Breathing / Heart Rate Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              background: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "9999px",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#38bdf8",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
            }}
          >
            <Wind size={12} style={{ color: "#38bdf8" }} />
            <span>Breathing {respRate}/min</span>
          </div>
        </div>

        {/* Right Group: Zoom Controls & Reset View */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            padding: "3px 6px",
            borderRadius: "9999px",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom in"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
            }}
          >
            <ZoomIn size={14} />
          </button>

          <span
            style={{
              fontSize: "0.74rem",
              fontWeight: 700,
              color: "#38bdf8",
              display: "inline-flex",
              alignItems: "center",
              padding: "0 4px",
              fontFamily: "ui-monospace, monospace",
              minWidth: "32px",
              justifyContent: "center",
            }}
          >
            {zoomScale.toFixed(1)}x
          </span>

          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom out"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
            }}
          >
            <ZoomOut size={14} />
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Reset zoom and rotation"
            aria-label="Reset zoom and rotation"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              color: "#38bdf8",
              cursor: "pointer",
              padding: "3px 8px",
              borderRadius: "9999px",
              fontSize: "0.7rem",
              fontWeight: 700,
              marginLeft: "2px",
            }}
          >
            <RotateCcw size={12} />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* ── 3. BOTTOM FLOATING CONTROLS & HINT ── */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: "14px",
          right: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(6px)",
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid rgba(148, 163, 184, 0.12)",
            color: "#94a3b8",
            fontSize: "0.72rem",
            pointerEvents: "auto",
          }}
        >
          <span>Drag to rotate / pan · Click a marker to inspect</span>
        </div>
      </div>
    </div>
  );
};

export default OrganViewer3D;
