import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Wind,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Pill,
  ShieldCheck,
  Activity,
  HeartPulse,
  Send,
  MessageSquare,
  Clock,
  User,
  Stethoscope,
  Info,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import { getOrganConfig } from "../../phase2-internal-organs/organs.config.js";
import "./LiveLungsVisual.css";

export function LiveLungsVisual({ vitals, alerts = [], patientId = null }) {
  const { user } = useAuth();
  const isDoctor = (user?.role || "").toUpperCase() === "DOCTOR";
  const activePatientId = patientId || user?.patient_id || user?.id || "demo-patient";

  const containerRef = useRef(null);
  const noteCardRef = useRef(null);
  const canvasRef = useRef(null);

  // Default zoom scale 1.0x (no pre-zoom)
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });

  // Respect both OS prefers-reduced-motion AND the InteractiveBodyMap checkbox
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("carebridge_reduce_motion");
      if (stored !== null) return stored === "true";
      if (window.matchMedia) {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      }
    }
    return false;
  });

  // Problem markers & clinical note state
  const [findings, setFindings] = useState([]);
  const [selectedPinId, setSelectedPinId] = useState(null);
  const [highlightedNote, setHighlightedNote] = useState(false);
  const [activeDotTooltip, setActiveDotTooltip] = useState(null);

  const [whatHappened, setWhatHappened] = useState("");
  const [howToReduce, setHowToReduce] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Doctor editing states
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [pinModal, setPinModal] = useState(null);
  const [isEditingBoxes, setIsEditingBoxes] = useState(false);
  const [tempWhatHappened, setTempWhatHappened] = useState("");
  const [tempHowToReduce, setTempHowToReduce] = useState("");
  const [tempMedicines, setTempMedicines] = useState([]);
  const [newMedName, setNewMedName] = useState("");
  const [newMedPurpose, setNewMedPurpose] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Live Organ Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatScrollRef = useRef(null);

  // Organ Config Fallback
  const lungsConfig = getOrganConfig("lungs");

  // Listen to OS prefers-reduced-motion and custom event from InteractiveBodyMap checkbox
  useEffect(() => {
    const handleCustomChange = (e) => {
      if (e?.detail?.reduceMotion !== undefined) {
        setReducedMotion(e.detail.reduceMotion);
      }
    };

    window.addEventListener("carebridge_reduce_motion_change", handleCustomChange);

    let mq = null;
    let mqHandler = null;
    if (typeof window !== "undefined" && window.matchMedia) {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mqHandler = (e) => {
        const stored = localStorage.getItem("carebridge_reduce_motion");
        if (stored === null) setReducedMotion(e.matches);
      };
      mq.addEventListener?.("change", mqHandler);
    }

    return () => {
      window.removeEventListener("carebridge_reduce_motion_change", handleCustomChange);
      if (mq && mqHandler) mq.removeEventListener?.("change", mqHandler);
    };
  }, []);

  // Compute Breathing Rate (default 16/min) and dynamic cycle duration: 60 / rate = 3.75s
  const rawRr = vitals?.respiratory_rate;
  const breathingRate =
    rawRr !== undefined && rawRr !== null && rawRr !== "" && !isNaN(Number(rawRr))
      ? Number(rawRr)
      : lungsConfig?.breathingRate || 16;
  const breathingCycleSec = Math.max(1.8, Math.min(8.0, Number((60 / breathingRate).toFixed(2))));

  // Compute Status: Critical = red, Watch = amber, Normal = green
  const spo2 =
    vitals?.spo2 !== undefined && vitals?.spo2 !== null && vitals?.spo2 !== ""
      ? Number(vitals.spo2)
      : null;

  const lungAlert = (alerts || []).find((a) => {
    const msg = (a.message || a.alert_type || "").toLowerCase();
    return (
      msg.includes("lung") ||
      msg.includes("respiratory") ||
      msg.includes("spo2") ||
      msg.includes("oxygen") ||
      msg.includes("dyspnea")
    );
  });

  let lungStatus = lungsConfig?.status || "watch";
  if (lungAlert) {
    lungStatus = (lungAlert.severity || "").toLowerCase() === "critical" ? "critical" : "watch";
  } else if (spo2 !== null) {
    if (spo2 < 90) lungStatus = "critical";
    else if (spo2 < 95) lungStatus = "watch";
    else lungStatus = "normal";
  }

  // Load findings from backend or config
  useEffect(() => {
    let isMounted = true;
    setLoadingData(true);

    patientService
      .getOrganFindings(activePatientId, "lungs")
      .then((data) => {
        if (!isMounted) return;
        const patientFindings = Array.isArray(data?.findings)
          ? data.findings
          : Array.isArray(lungsConfig?.painPoints)
          ? lungsConfig.painPoints
          : [];
        setFindings(patientFindings);
        setWhatHappened(data?.what_happened || "");
        setHowToReduce(data?.how_to_reduce || "");
        setMedicines(Array.isArray(data?.medicines) ? data.medicines : []);
        if (patientFindings.length > 0) {
          setSelectedPinId(patientFindings[0].id);
        }
      })
      .catch((err) => {
        console.warn("Could not load lungs findings from server, using config:", err);
        if (!isMounted) return;
        const fallback = Array.isArray(lungsConfig?.painPoints) ? lungsConfig.painPoints : [];
        setFindings(fallback);
        if (fallback.length > 0) {
          setSelectedPinId(fallback[0].id);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activePatientId, lungsConfig]);

  // Floating gentle air particles
  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 1,
      vy: Math.random() * 0.4 + 0.2,
      vx: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y -= p.vy;
        p.x += p.vx;
        if (p.y < -5) p.y = height + 5;
        if (p.x < -5) p.x = width + 5;
        if (p.x > width + 5) p.x = -5;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(186, 230, 253, ${p.alpha})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [reducedMotion]);

  // Toolbar Zoom & Pan Controls
  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(2.0, Number((prev + 0.2).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(1.0, Number((prev - 0.2).toFixed(2)));
      if (next === 1.0) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetView = () => {
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Drag & Pan support when zoomed in
  const handlePointerDown = (e) => {
    if (zoomScale > 1.0) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialPanX: panOffset.x,
        initialPanY: panOffset.y,
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (isDragging && zoomScale > 1.0) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const maxPan = (zoomScale - 1.0) * 180;
      setPanOffset({
        x: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.initialPanX + dx)),
        y: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.initialPanY + dy)),
      });
    }
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }
  };

  // Red pain point selection -> highlights note card and scrolls it into view
  const handleSelectPoint = (point) => {
    setSelectedPinId(point.id);
    setHighlightedNote(true);
    setTimeout(() => setHighlightedNote(false), 2200);
    if (noteCardRef.current) {
      noteCardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Hover Tooltip: flips left/right so it never gets clipped at viewer edges
  const handleDotMouseEnter = (e, point) => {
    if (!containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const dRect = e.currentTarget.getBoundingClientRect();
    const relX = dRect.left + dRect.width / 2 - cRect.left;
    const relY = dRect.top + dRect.height / 2 - cRect.top;
    const isRight = relX > cRect.width / 2;

    setActiveDotTooltip({
      x: relX,
      y: relY,
      align: isRight ? "right" : "left",
      title: point.title || point.label || "Pulmonary Finding",
      severity: (point.severity || "watch").toUpperCase(),
      organName: "Lungs",
    });
  };

  const handleDotMouseLeave = () => {
    setActiveDotTooltip(null);
  };

  // Doctor Role Clicking Image: Adds a pin at clicked coordinates
  const handleImageClick = (e) => {
    if (!isDoctor || !isAddingPin || isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const xPct = Math.max(5, Math.min(95, Number(((clickX / rect.width) * 100).toFixed(1))));
    const yPct = Math.max(5, Math.min(95, Number(((clickY / rect.height) * 100).toFixed(1))));

    setPinModal({
      mode: "add",
      x: xPct,
      y: yPct,
      id: `l-${Date.now().toString(36)}`,
      label: "New Pulmonary Finding",
      severity: "watch",
      note: "",
    });
  };

  // Save or edit pin
  const handleSavePin = async (e) => {
    e.preventDefault();
    if (!pinModal || !isDoctor) return;

    let updatedFindings;
    if (pinModal.mode === "add") {
      const newPin = {
        id: pinModal.id,
        x: pinModal.x,
        y: pinModal.y,
        label: pinModal.label || "Pulmonary Finding",
        title: pinModal.label || "Pulmonary Finding",
        severity: pinModal.severity || "watch",
        note: pinModal.note || "",
      };
      updatedFindings = [...findings, newPin];
      setSelectedPinId(newPin.id);
    } else {
      updatedFindings = findings.map((f) =>
        f.id === pinModal.id
          ? {
              ...f,
              label: pinModal.label,
              title: pinModal.label,
              severity: pinModal.severity,
              note: pinModal.note,
            }
          : f
      );
    }

    setFindings(updatedFindings);
    setPinModal(null);
    setIsAddingPin(false);

    try {
      setIsSaving(true);
      await patientService.saveOrganFindings(activePatientId, "lungs", {
        findings: updatedFindings,
        what_happened: whatHappened,
        how_to_reduce: howToReduce,
        medicines,
      });
    } catch (err) {
      console.error("Failed to save lungs finding pin:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePin = async (pinId, e) => {
    e?.stopPropagation();
    if (!isDoctor) return;
    const updated = findings.filter((f) => f.id !== pinId);
    setFindings(updated);
    if (selectedPinId === pinId) {
      setSelectedPinId(updated[0]?.id || null);
    }
    try {
      await patientService.saveOrganFindings(activePatientId, "lungs", {
        findings: updated,
        what_happened: whatHappened,
        how_to_reduce: howToReduce,
        medicines,
      });
    } catch (err) {
      console.error("Failed to delete lungs finding:", err);
    }
  };

  const activeFinding = findings.find((f) => f.id === selectedPinId) || findings[0];

  return (
    <div className="lungs-composite-container">
      {/* ── 1. LIGHT-BLUE VIEWER CONTAINER ── */}
      <div
        ref={containerRef}
        className={`lungs-viewport-container ${isDragging ? "is-orbiting" : ""}`}
        tabIndex={0}
        role="region"
        aria-label="Live Anatomical Lungs Visual with dynamic respiration cycles and clinical markers."
        onWheel={(e) => {
          e.preventDefault();
          if (e.deltaY < 0) handleZoomIn();
          else handleZoomOut();
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          cursor: isDoctor
            ? isAddingPin
              ? "crosshair"
              : zoomScale > 1.0
              ? isDragging
                ? "grabbing"
                : "grab"
              : "default"
            : zoomScale > 1.0
            ? isDragging
              ? "grabbing"
              : "grab"
            : "default",
        }}
      >
        {/* Soft light-blue background with subtle air drifting */}
        <div className={`lungs-media-wrapper ${!reducedMotion ? "lungs-moving-bg" : ""}`}>
          {/* Air particles canvas */}
          <canvas ref={canvasRef} className="lungs-particles-canvas" aria-hidden="true" />

          {/* Zoom and Pan container */}
          <div
            className="lungs-media-zoom-container"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
              transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              zIndex: 2,
            }}
            onClick={handleImageClick}
          >
            <div
              className="lungs-image-stage"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                maxWidth: "100%",
                maxHeight: "100%",
                width: "100%",
                height: "100%",
              }}
            >
              {/* Soft Pulsing Glow Behind the Lungs (Follows status: Critical = red, Watch = amber, Normal = green) */}
              {!reducedMotion && (
                <div className={`lungs-behind-glow glow-${lungStatus}`} aria-hidden="true" />
              )}

              {/* Realistic Lungs Image: transparent PNG with mix-blend-mode: multiply */}
              <img
                src="/assets/organs/lungs-realistic.png"
                alt="Realistic Anatomical Human Lungs Visual"
                className={`lungs-media-element ${
                  !reducedMotion ? "lungs-live-breathing-image" : ""
                }`}
                style={{
                  objectFit: "contain",
                  width: "100%",
                  height: "100%",
                  animationDuration: `${breathingCycleSec}s`,
                }}
              />

              {/* RED MOVING PAIN POINTS (14px, #ff2d2d, 2px white outline, throbbing 1.1s + 2 expanding ripple rings) */}
              <div className="lungs-pins-layer" aria-label="Pulmonary clinical problem points">
                {findings.map((point, idx) => {
                  const isSelected = selectedPinId === point.id;
                  const pointTitle = point.title || point.label || "Pulmonary Finding";
                  return (
                    <button
                      key={point.id || idx}
                      type="button"
                      className={`lungs-pain-point-marker ${isSelected ? "is-active" : ""}`}
                      style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPoint(point);
                      }}
                      onMouseEnter={(e) => handleDotMouseEnter(e, point)}
                      onMouseLeave={handleDotMouseLeave}
                      aria-label={`Finding: ${pointTitle}`}
                    >
                      {/* Two expanding ripple rings (scale 1 -> 4.5, fading out, 1.8s infinite, 2nd ring delayed 0.9s) */}
                      {!reducedMotion && (
                        <>
                          <span className="lungs-pain-point-ripple ripple-1" aria-hidden="true" />
                          <span className="lungs-pain-point-ripple ripple-2" aria-hidden="true" />
                        </>
                      )}
                      {/* Red throbbing center dot with 2px white outline for high contrast against red tissue */}
                      <span className="lungs-pain-point-core" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* TOP FLOATING OVERLAY: LIVE BADGE & TOOLBAR */}
        <div className="lungs-overlay-top">
          <div className="lungs-top-left-group">
            {/* LIVE Badge: dark pill with blinking red dot (opacity 1 -> 0.3, 1.2s infinite) */}
            <span className="lungs-live-pill-badge" title="Live Respiratory Visual Stream">
              <span className="lungs-red-dot" /> LIVE
            </span>

            {/* Pill: Lungs · Respiratory Vitality */}
            <span className="lungs-organ-label">
              <Wind size={13} className="lungs-header-wind-icon" />
              <span>Lungs · Respiratory Vitality</span>
            </span>
          </div>

          <div className="lungs-actions-row">
            {/* Zoom In/Out Buttons */}
            <button
              type="button"
              className="lungs-tool-btn icon-only"
              onClick={handleZoomIn}
              title="Zoom In (up to 2x)"
              aria-label="Zoom in"
              disabled={zoomScale >= 2.0}
            >
              <ZoomIn size={14} />
            </button>

            <span className="lungs-zoom-readout">{zoomScale.toFixed(1)}x</span>

            <button
              type="button"
              className="lungs-tool-btn icon-only"
              onClick={handleZoomOut}
              title="Zoom Out (down to 1x)"
              aria-label="Zoom out"
              disabled={zoomScale <= 1.0}
            >
              <ZoomOut size={14} />
            </button>

            {/* Reset View Button */}
            <button
              type="button"
              className="lungs-tool-btn"
              onClick={handleResetView}
              title="Reset view to 1x centered"
              aria-label="Reset zoom scale"
            >
              <RotateCcw size={14} />
              <span>Reset View</span>
            </button>
          </div>
        </div>

        {/* BOTTOM FLOATING OVERLAY: BREATHING RATE & HINTS */}
        <div className="lungs-overlay-bottom">
          <div className="lungs-breathing-rate-badge" title="Dynamic Respiration Rate Telemetry">
            <span className="lungs-wind-indicator">
              <Wind size={14} />
            </span>
            <span className="lungs-breathing-text">Breathing {breathingRate}/min</span>
          </div>

          <div className="lungs-interaction-hint">
            <span>
              {isDoctor && isAddingPin
                ? "Click anywhere on the lungs to place a marker"
                : "Drag to Pan · Scroll or Use Controls to Zoom · Click any red point to inspect note"}
            </span>
          </div>

          {isDoctor && (
            <div style={{ pointerEvents: "auto" }}>
              <button
                type="button"
                className={`doctor-edit-btn ${isAddingPin ? "active" : ""}`}
                onClick={() => setIsAddingPin((prev) => !prev)}
              >
                <Plus size={13} />
                <span>{isAddingPin ? "Cancel Pinning" : "Add Marker"}</span>
              </button>
            </div>
          )}
        </div>

        {/* FLIPPING HOVER TOOLTIP ON RED DOTS (Keeps fully inside viewer, flips left/right) */}
        {activeDotTooltip && (
          <div
            className={`lungs-dot-tooltip align-${activeDotTooltip.align}`}
            style={{
              left: `${activeDotTooltip.x}px`,
              top: `${activeDotTooltip.y}px`,
            }}
            role="tooltip"
          >
            <div className="lungs-tooltip-header">
              <span className={`lungs-tooltip-badge badge-${activeDotTooltip.severity.toLowerCase()}`}>
                {activeDotTooltip.severity}
              </span>
              <span className="lungs-tooltip-organ">{activeDotTooltip.organName}</span>
            </div>
            <div className="lungs-tooltip-title">{activeDotTooltip.title}</div>
          </div>
        )}
      </div>

      {/* ── DOCTOR PIN MODAL (ADD / EDIT PIN) ── */}
      {pinModal && isDoctor && (
        <div className="modal-backdrop-custom" style={{ zIndex: 9999 }}>
          <div className="modal-card-custom" style={{ maxWidth: "480px" }}>
            <div className="modal-card-header">
              <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "1.05rem" }}>
                {pinModal.mode === "add" ? "Place New Pulmonary Marker" : "Edit Pulmonary Marker"}
              </h4>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setPinModal(null)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSavePin}
              style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}
            >
              <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                Coordinates: <strong>X: {pinModal.x}%, Y: {pinModal.y}%</strong>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "4px" }}>
                  Finding Label *
                </label>
                <input
                  type="text"
                  required
                  value={pinModal.label}
                  onChange={(e) => setPinModal({ ...pinModal, label: e.target.value })}
                  placeholder="e.g. Upper lobe finding, Basilar coarsening"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#0f172a",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    fontSize: "0.88rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "4px" }}>
                  Clinical Severity *
                </label>
                <select
                  value={pinModal.severity}
                  onChange={(e) => setPinModal({ ...pinModal, severity: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#0f172a",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    fontSize: "0.88rem",
                  }}
                >
                  <option value="critical">Critical (Red badge)</option>
                  <option value="watch">Watch (Amber badge)</option>
                  <option value="normal">Normal (Green badge)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "4px" }}>
                  Clinical Note & Observations
                </label>
                <textarea
                  rows={3}
                  value={pinModal.note}
                  onChange={(e) => setPinModal({ ...pinModal, note: e.target.value })}
                  placeholder="Detailed radiological or auscultation finding note..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#0f172a",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    fontSize: "0.85rem",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button type="button" className="btn-cancel-modal" onClick={() => setPinModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save-modal" disabled={isSaving}>
                  <Save size={14} />
                  <span>{isSaving ? "Saving..." : "Save Marker"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. ACTIVE FINDING NOTE CARD (CLICKING RED DOT HIGHLIGHTS & SCROLLS IT) ── */}
      {activeFinding && (
        <div
          ref={noteCardRef}
          className={`lungs-note-card ${highlightedNote ? "is-highlighted" : ""}`}
          aria-live="polite"
        >
          <div className="lungs-note-header">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
              <span className={`lungs-severity-tag badge-${(activeFinding.severity || "watch").toLowerCase()}`}>
                {(activeFinding.severity || "watch").toUpperCase()}
              </span>
              <h4 className="lungs-note-title">
                {activeFinding.title || activeFinding.label}
              </h4>
            </div>

            {isDoctor && (
              <div className="doctor-organ-actions">
                <button
                  type="button"
                  className="doctor-edit-btn"
                  onClick={() =>
                    setPinModal({
                      mode: "edit",
                      ...activeFinding,
                      label: activeFinding.title || activeFinding.label,
                    })
                  }
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  type="button"
                  className="doctor-edit-btn"
                  style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.4)" }}
                  onClick={(e) => handleRemovePin(activeFinding.id, e)}
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            )}
          </div>

          <p className="lungs-note-text">
            {activeFinding.note || "No specific lung auscultation remarks logged for this coordinate."}
          </p>

          {/* Finding Selector Chips */}
          {findings.length > 1 && (
            <div className="lungs-findings-chip-bar">
              {findings.map((f, i) => (
                <button
                  key={f.id || i}
                  type="button"
                  className={`lungs-chip-btn ${f.id === activeFinding.id ? "is-active" : ""}`}
                  onClick={() => handleSelectPoint(f)}
                >
                  <span className="lungs-chip-dot" />
                  <span>{f.title || f.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LiveLungsVisual;
