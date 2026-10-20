import React, { useState, useRef, useEffect } from "react";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Pill,
  ShieldCheck,
  Activity,
  CheckCircle2,
  HeartPulse,
} from "lucide-react";
import { getOrganConfig } from "./organs.config.js";
import { useAuth } from "../context/AuthContext";
import patientService from "../services/patientService";

export function OrganViewer3D({
  organId,
  status = "grey",
  statusLabel = "No data yet",
  onSelectOrgan,
  onOpenPanel,
  patientId = null,
}) {
  const { user } = useAuth();
  const isDoctor = (user?.role || "").toUpperCase() === "DOCTOR";
  const activePatientId = patientId || user?.patient_id || user?.id || "demo-patient";

  const containerRef = useRef(null);
  const noteCardRef = useRef(null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });

  const [cutawayActive, setCutawayActive] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, text: "" });
  const [activeDotTooltip, setActiveDotTooltip] = useState(null);
  const [highlightedNote, setHighlightedNote] = useState(false);
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

  const canvasRef = useRef(null);
  const config = getOrganConfig(organId);
  const organKey = organId || "kidneys";
  const isBrain = organKey === "brain";
  const isIntestines = organKey === "intestines";

  // State for Problem Markers & 4 Clinical Boxes
  const [findings, setFindings] = useState([]);
  const [selectedPinId, setSelectedPinId] = useState(null);
  const [whatHappened, setWhatHappened] = useState("");
  const [howToReduce, setHowToReduce] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Doctor editing modes
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [isEditingBoxes, setIsEditingBoxes] = useState(false);
  const [pinModal, setPinModal] = useState(null); // { mode: 'add'|'edit', x, y, id, label, severity, note }
  
  // Temporary form states for doctor editing
  const [tempWhatHappened, setTempWhatHappened] = useState("");
  const [tempHowToReduce, setTempHowToReduce] = useState("");
  const [tempMedicines, setTempMedicines] = useState([]);
  const [newMedName, setNewMedName] = useState("");
  const [newMedPurpose, setNewMedPurpose] = useState("");

  // Check prefers-reduced-motion changes and custom event from InteractiveBodyMap
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

  // Fetch Findings and Care Boxes from backend
  useEffect(() => {
    let isMounted = true;
    setLoadingData(true);
    setSelectedPinId(null);
    setIsAddingPin(false);
    setIsEditingBoxes(false);
    setPinModal(null);

    patientService
      .getOrganFindings(activePatientId, organKey)
      .then((data) => {
        if (!isMounted) return;
        const patientFindings = Array.isArray(data?.findings)
          ? data.findings
          : Array.isArray(config?.painPoints)
          ? config.painPoints
          : [];
        setFindings(patientFindings);
        setWhatHappened(data?.what_happened || "");
        setHowToReduce(data?.how_to_reduce || "");
        setMedicines(Array.isArray(data?.medicines) ? data.medicines : []);
        if (patientFindings && patientFindings.length > 0) {
          setSelectedPinId(patientFindings[0].id);
        }
      })
      .catch((err) => {
        console.warn("Could not load organ findings, checking config:", err);
        if (!isMounted) return;
        const fallback = Array.isArray(config?.painPoints) ? config.painPoints : [];
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
  }, [organKey, activePatientId, config]);

  // Particle Canvas for Brain background (~60 small blue particles floating upward)
  useEffect(() => {
    if (!isBrain || reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 460);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    const particleCount = 60;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.45 + 0.2,
      speedX: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.65 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      pulseDir: Math.random() > 0.5 ? 1 : -1,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += p.speedX;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        p.alpha += p.pulseSpeed * p.pulseDir;
        if (p.alpha > 0.85) {
          p.alpha = 0.85;
          p.pulseDir = -1;
        } else if (p.alpha < 0.2) {
          p.alpha = 0.2;
          p.pulseDir = 1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 168, 255, ${p.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(56, 168, 255, 0.7)";
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isBrain, reducedMotion]);

  // Image Source Resolution
  const resolvedImageSrc =
    cutawayActive && !["brain", "kidneys", "thyroid", "lungs"].includes(organKey)
      ? `/assets/organs/${organKey}-inner.jpg`
      : organKey === "kidneys"
      ? "/assets/organs/kidney-cross-section.png"
      : organKey === "thyroid"
      ? "/assets/organs/thyroid-realistic.png"
      : organKey === "brain"
      ? "/assets/organs/brain-realistic.png"
      : organKey === "lungs"
      ? "/assets/organs/lungs-realistic.png"
      : organKey === "pancreas"
      ? "/assets/organs/pancreas-realistic.png"
      : organKey === "intestines"
      ? "/assets/organs/intestines-realistic.png"
      : config?.imageSrc || `/assets/organs/${organKey}.jpg`;

  // Status Color & Animation Class Resolution
  // Pulsing glow behind kidney (2.5s ease-in-out infinite): Critical = red, Watch = amber, Normal = green
  const normStatus = (status || "").toLowerCase();
  let statusGlowClass = "glow-normal";
  let statusColor = "#10b981";
  if (normStatus === "red" || normStatus === "critical") {
    statusGlowClass = "glow-critical";
    statusColor = "#ef4444";
  } else if (normStatus === "amber" || normStatus === "watch") {
    statusGlowClass = "glow-watch";
    statusColor = "#f59e0b";
  }

  // Toolbar Actions
  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(2.0, Number((prev + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(1.0, Number((prev - 0.25).toFixed(2)));
      if (next === 1.0) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetView = () => {
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleToggleCutaway = () => {
    setCutawayActive((prev) => !prev);
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

  // Red pain point hover -> flipping tooltip that stays inside viewer
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
      title: point.title || point.label || "Clinical Finding",
      severity: (point.severity || "watch").toUpperCase(),
      organName: config?.name || "Organ",
    });
  };

  const handleDotMouseLeave = () => {
    setActiveDotTooltip(null);
  };

  // Mouse wheel zoom support (1x - 2x)
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomScale((prev) => Math.min(2.0, Number((prev + 0.15).toFixed(2))));
    } else {
      setZoomScale((prev) => {
        const next = Math.max(1.0, Number((prev - 0.15).toFixed(2)));
        if (next === 1.0) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
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
    } else if (containerRef.current && !activeDotTooltip) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const clampedX = Math.max(90, Math.min(rect.width - 90, x));
      setTooltipPos({
        x: clampedX,
        y: Math.max(26, y - 36),
        visible: true,
        text: `${config?.name || "Organ"} · Status: ${statusLabel}`,
      });
    }
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }
  };

  // Doctor Role Clicking Image: Adds a pin at clicked coordinates
  const handleImageClick = (e) => {
    if (!isDoctor) return;
    if (isDragging) return;

    // Calculate percentage coordinates relative to viewport bounds
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const xPct = Math.max(5, Math.min(95, Number(((clickX / rect.width) * 100).toFixed(1))));
    const yPct = Math.max(5, Math.min(95, Number(((clickY / rect.height) * 100).toFixed(1))));

    // Open add pin modal
    setPinModal({
      mode: "add",
      x: xPct,
      y: yPct,
      id: `p-${Date.now().toString(36)}`,
      label: "New Clinical Finding",
      severity: "watch",
      note: "",
    });
  };

  // Save new or edited pin
  const handleSavePin = async (e) => {
    e.preventDefault();
    if (!pinModal || !isDoctor) return;

    let updatedFindings;
    if (pinModal.mode === "add") {
      const newPin = {
        id: pinModal.id,
        x: pinModal.x,
        y: pinModal.y,
        label: pinModal.label || "Clinical Finding",
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
              severity: pinModal.severity,
              note: pinModal.note,
            }
          : f
      );
    }

    setFindings(updatedFindings);
    setPinModal(null);
    setIsAddingPin(false);

    // Persist to backend
    await persistFindings(updatedFindings, whatHappened, howToReduce, medicines);
  };

  // Remove pin
  const handleRemovePin = async (pinId, e) => {
    e?.stopPropagation();
    if (!isDoctor) return;
    const updated = findings.filter((f) => f.id !== pinId);
    setFindings(updated);
    if (selectedPinId === pinId) {
      setSelectedPinId(updated[0]?.id || null);
    }
    await persistFindings(updated, whatHappened, howToReduce, medicines);
  };

  // Doctor editing 4 Clinical Boxes
  const handleStartEditBoxes = () => {
    setTempWhatHappened(whatHappened);
    setTempHowToReduce(howToReduce);
    setTempMedicines(JSON.parse(JSON.stringify(medicines)));
    setNewMedName("");
    setNewMedPurpose("");
    setIsEditingBoxes(true);
  };

  const handleAddMedicine = () => {
    if (!newMedName.trim()) return;
    setTempMedicines([
      ...tempMedicines,
      { name: newMedName.trim(), purpose: newMedPurpose.trim() || "Prescribed clinical management" },
    ]);
    setNewMedName("");
    setNewMedPurpose("");
  };

  const handleRemoveMedicine = (idx) => {
    setTempMedicines(tempMedicines.filter((_, i) => i !== idx));
  };

  const handleSaveBoxes = async () => {
    setIsSaving(true);
    setWhatHappened(tempWhatHappened);
    setHowToReduce(tempHowToReduce);
    setMedicines(tempMedicines);
    setIsEditingBoxes(false);
    await persistFindings(findings, tempWhatHappened, tempHowToReduce, tempMedicines);
    setIsSaving(false);
  };

  // Helper to persist updates
  const persistFindings = async (updatedFindings, updatedWhat, updatedHow, updatedMeds) => {
    try {
      setIsSaving(true);
      await patientService.saveOrganFindings(activePatientId, organKey, {
        findings: updatedFindings,
        what_happened: updatedWhat,
        how_to_reduce: updatedHow,
        medicines: updatedMeds,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to save organ findings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeFinding = findings.find((f) => f.id === selectedPinId) || findings[0];

  return (
    <div className="organ-viewer-composite-container">
      {/* ── 1. MAIN 3D / IMAGE VIEWPORT ── */}
      <div
        ref={containerRef}
        className={`organ-3d-viewport ${isBrain ? "brain-viewport-container" : ""} ${isDragging ? "is-orbiting" : ""}`}
        tabIndex={0}
        role="region"
        aria-label={`Realistic Clinical Media Viewer of ${config?.name || "Organ"}.`}
        onWheel={handleWheel}
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
          backgroundColor: "#030712",
        }}
      >
        {/* Background & Particles */}
        <div className={`organ-media-wrapper ${isBrain ? "brain-moving-bg" : ""}`}>
          {isBrain && (
            <canvas
              ref={canvasRef}
              className="brain-particles-canvas"
              aria-hidden="true"
            />
          )}

          {/* Zoomable & Pannable Media Layer */}
          <div
            className="organ-media-zoom-container"
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
            {/* Stage maintaining aspect ratio matching the realistic organ image without stretching/cropping */}
            <div
              className={`organ-image-stage ${isIntestines ? "intestines-stage" : ""}`}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                maxWidth: "100%",
                maxHeight: "100%",
                aspectRatio: isIntestines ? "3 / 4" : "1 / 1",
                width: isIntestines ? "auto" : "100%",
                height: "100%",
              }}
            >
              {/* Slow pulsing glow behind the organ (2.5s ease-in-out infinite, color follows status) */}
              {!reducedMotion && (
                <div
                  className={`organ-behind-glow ${statusGlowClass}`}
                  aria-hidden="true"
                />
              )}

              {/* Realistic Organ Image with gentle breathing animation, neural shimmer on brain & screen blending */}
              <div
                className="organ-image-shimmer-wrapper"
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={resolvedImageSrc}
                  alt={config?.name || organKey}
                  className={`organ-media-element ${
                    isBrain && !reducedMotion
                      ? "brain-live-image organ-image-breathing"
                      : !reducedMotion
                      ? "organ-image-breathing"
                      : ""
                  }`}
                  style={{
                    objectFit: "contain",
                    width: "100%",
                    height: "100%",
                    mixBlendMode: "screen",
                    position: "relative",
                    zIndex: 2,
                  }}
                />

                {/* Subtle Neural Activity Shimmer across Brain Surface every 5s */}
                {isBrain && !reducedMotion && (
                  <div className="brain-neural-shimmer-overlay" aria-hidden="true" />
                )}

                {/* Subtle Peristaltic Gut Movement Wave across Intestine Coils */}
                {isIntestines && !reducedMotion && (
                  <div className="intestines-peristalsis-wave" aria-hidden="true" />
                )}
              </div>

              {/* RED MOVING PAIN POINTS (percentage coordinates locked to anatomy) */}
              <div className="organ-pins-layer" aria-label="Clinical problem markers">
                {findings.map((point, idx) => {
                  const isSelected = selectedPinId === point.id;
                  const pointTitle = point.title || point.label || "Clinical Finding";
                  return (
                    <button
                      key={point.id || idx}
                      type="button"
                      className={`pain-point-marker ${isSelected ? "is-selected" : ""}`}
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
                          <span className="pain-point-ripple ripple-1" aria-hidden="true" />
                          <span className="pain-point-ripple ripple-2" aria-hidden="true" />
                        </>
                      )}
                      {/* Red throbbing center dot (14px, #ff2d2d, red box-shadow glow, scale 1 -> 1.25, 1.1s infinite) */}
                      <span className="pain-point-core" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* TOP FLOATING OVERLAY: LIVE BADGE & TOOLBAR */}
        <div className="viewport-overlay-top">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", pointerEvents: "auto" }}>
            {/* LIVE Badge: dark pill with blinking red dot (opacity 1 -> 0.3, 1.2s infinite) */}
            <span className="organ-live-pill-badge" title="Live Continuous Telemetry Stream Active">
              <span className="live-dot-indicator" /> LIVE
            </span>

            {/* Pill: Brain | Neural & Hemodynamic Feed or [Organ] | Realistic Organ Viewer | [Status] */}
            <div className="viewport-organ-tag">
              <span className="organ-tag-dot" style={{ backgroundColor: statusColor }} />
              <span className="organ-tag-name">{config?.name || "Organ"}</span>
              <span className="organ-tag-separator">|</span>
              <span className="organ-tag-realistic" style={{ color: "#94a3b8", fontSize: "0.74rem" }}>
                {isBrain ? "Neural & Hemodynamic Feed" : "Realistic Organ Viewer"}
              </span>
              <span className="organ-tag-separator">|</span>
              <span className="organ-tag-system" style={{ color: statusColor, fontWeight: 700 }}>
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="viewport-actions-row">
            {/* Inner Cutaway Toggle for applicable organs (hidden for brain, thyroid and kidneys if no secondary cutaway) */}
            {["stomach", "pancreas", "intestines"].includes(organKey) && (
              <button
                type="button"
                className={`viewport-tool-btn ${cutawayActive ? "active" : ""}`}
                onClick={handleToggleCutaway}
                title="Toggle interior lumen cutaway"
                aria-label="Toggle inner cutaway view"
              >
                <Layers size={14} />
                <span>{cutawayActive ? "Surface" : "Inner Cutaway"}</span>
              </button>
            )}

            {/* Zoom In/Out Buttons */}
            <button
              type="button"
              className="viewport-tool-btn icon-only"
              onClick={handleZoomIn}
              title="Zoom In (up to 2x)"
              aria-label="Zoom in"
              disabled={zoomScale >= 2.0}
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
              }}
            >
              {zoomScale.toFixed(1)}x
            </span>

            <button
              type="button"
              className="viewport-tool-btn icon-only"
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
              className="viewport-tool-btn"
              onClick={handleResetView}
              title="Reset zoom to 1x"
              aria-label="Reset zoom scale"
            >
              <RotateCcw size={14} />
              <span>Reset View</span>
            </button>
          </div>
        </div>

        {/* BOTTOM FLOATING CONTROLS & HINT */}
        <div className="viewport-overlay-bottom">
          <div className="viewport-gesture-hint">
            <span>
              {isDoctor && isAddingPin
                ? "Click anywhere on the organ image to place a problem pin"
                : "Scroll to Zoom (1x - 2x) · Click any red point to inspect note"}
            </span>
          </div>

          {isDoctor && (
            <div style={{ pointerEvents: "auto", display: "inline-flex", gap: "6px" }}>
              <button
                type="button"
                className={`doctor-edit-btn ${isAddingPin ? "active" : ""}`}
                onClick={() => setIsAddingPin((prev) => !prev)}
                title="Click organ to place a pin marker"
              >
                <Plus size={13} />
                <span>{isAddingPin ? "Cancel Pin Mode" : "Add Pin Marker"}</span>
              </button>
            </div>
          )}
        </div>

        {/* FLIPPING HOVER TOOLTIP ON RED DOTS (fixes right edge clipping) */}
        {activeDotTooltip && (
          <div
            className={`dot-hover-tooltip align-${activeDotTooltip.align}`}
            style={{
              left: `${activeDotTooltip.x}px`,
              top: `${activeDotTooltip.y}px`,
            }}
            role="tooltip"
          >
            <div className="dot-tooltip-header">
              <span className={`dot-tooltip-badge badge-${activeDotTooltip.severity.toLowerCase()}`}>
                {activeDotTooltip.severity}
              </span>
              <span className="dot-tooltip-organ">{activeDotTooltip.organName}</span>
            </div>
            <div className="dot-tooltip-title">{activeDotTooltip.title}</div>
          </div>
        )}

        {/* GENERAL VIEWPORT HOVER TOOLTIP */}
        {!activeDotTooltip && tooltipPos.visible && !isDragging && (
          <div
            className="viewport-hover-tooltip"
            style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
          >
            <span className="tooltip-indicator" />
            <span>{tooltipPos.text}</span>
          </div>
        )}
      </div>

      {/* ── DOCTOR PIN MODAL (ADD / EDIT PIN) ── */}
      {pinModal && isDoctor && (
        <div className="modal-backdrop-custom" style={{ zIndex: 9999 }}>
          <div className="modal-card-custom" style={{ maxWidth: "480px" }}>
            <div className="modal-card-header">
              <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "1.05rem" }}>
                {pinModal.mode === "add" ? "Place New Clinical Problem Pin" : "Edit Problem Pin"}
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

            <form onSubmit={handleSavePin} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
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
                  placeholder="e.g. Cortical Thinning, Antral Erythema"
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
                  <option value="critical">Critical (Red pulse, 1.1s)</option>
                  <option value="watch">Watch (Amber pulse, 2.0s)</option>
                  <option value="normal">Normal / Benign (Green pulse, 3.5s)</option>
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
                  placeholder="Detailed radiological or clinical finding note shown in callout..."
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
                <button
                  type="button"
                  className="btn-cancel-modal"
                  onClick={() => setPinModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save-modal"
                  disabled={isSaving}
                >
                  <Save size={14} />
                  <span>{isSaving ? "Saving..." : "Save Pin"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. ACTIVE FINDING NOTE CARD (CLICKING A RED DOT HIGHLIGHTS & SCROLLS IT) ── */}
      {activeFinding && (
        <div
          ref={noteCardRef}
          className={`organ-callout-panel ${highlightedNote ? "is-highlighted" : ""}`}
          aria-live="polite"
        >
          <div className="organ-callout-header">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <span className={`organ-callout-badge badge-${(activeFinding.severity || "watch").toLowerCase()}`}>
                <span className="organ-status-mini-dot" style={{ backgroundColor: "currentColor" }} />
                {(activeFinding.severity || "watch").toUpperCase()}
              </span>
              <h4 className="organ-callout-title">
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
                  title="Edit this pin finding"
                >
                  <Edit2 size={12} />
                  <span>Edit Finding</span>
                </button>
                <button
                  type="button"
                  className="doctor-edit-btn"
                  style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.4)" }}
                  onClick={(e) => handleRemovePin(activeFinding.id, e)}
                  title="Remove this finding"
                >
                  <Trash2 size={12} />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          <p className="organ-callout-note">
            {activeFinding.note || "No specific radiological or clinical remarks logged for this coordinate."}
          </p>

          {/* Finding Selector Chips */}
          {findings.length > 1 && (
            <div className="organ-findings-chip-list">
              {findings.map((f, i) => (
                <button
                  key={f.id || i}
                  type="button"
                  className={`organ-finding-chip-btn ${f.id === activeFinding.id ? "is-active" : ""}`}
                  onClick={() => handleSelectPoint(f)}
                >
                  <span className="organ-finding-chip-dot" />
                  <span>{f.title || f.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3. FOUR CLINICAL DETAIL BOXES UNDER THE IMAGE ── */}
      <div className="organ-four-boxes-grid">
        {/* BOX 1: WHAT HAPPENED TO THE PATIENT */}
        <div className="organ-clinical-box">
          <div className="organ-box-header">
            <span className="organ-box-title">
              <Activity size={16} />
              What Happened to the Patient
            </span>
            {isDoctor && !isEditingBoxes && (
              <button
                type="button"
                className="doctor-edit-btn"
                onClick={handleStartEditBoxes}
                title="Edit patient care notes"
              >
                <Edit2 size={12} /> Edit
              </button>
            )}
          </div>

          {isEditingBoxes && isDoctor ? (
            <textarea
              rows={4}
              value={tempWhatHappened}
              onChange={(e) => setTempWhatHappened(e.target.value)}
              placeholder="Clinical explanation of physiological occurrence, symptoms, and etiology..."
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#0f172a",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                borderRadius: "6px",
                color: "#f8fafc",
                fontSize: "0.84rem",
              }}
            />
          ) : (
            <div className="organ-box-content">
              {whatHappened || "No pathophysiology remarks currently documented for this organ system."}
            </div>
          )}
        </div>

        {/* BOX 2: HOW TO REDUCE IT */}
        <div className="organ-clinical-box">
          <div className="organ-box-header">
            <span className="organ-box-title">
              <ShieldCheck size={16} />
              How to Reduce It
            </span>
          </div>

          {isEditingBoxes && isDoctor ? (
            <textarea
              rows={4}
              value={tempHowToReduce}
              onChange={(e) => setTempHowToReduce(e.target.value)}
              placeholder="Actionable patient care instructions, dietary adjustments, hydration, and monitoring..."
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#0f172a",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                borderRadius: "6px",
                color: "#f8fafc",
                fontSize: "0.84rem",
              }}
            />
          ) : (
            <div className="organ-box-content">
              {howToReduce || "Follow standard healthy dietary and hydration practices, and avoid aggravating stimulants."}
            </div>
          )}
        </div>

        {/* BOX 3: MEDICINES (NAME AND PURPOSE ONLY; DOCTOR ADDS/EDITS; NO DOSES) */}
        <div className="organ-clinical-box">
          <div className="organ-box-header">
            <span className="organ-box-title">
              <Pill size={16} />
              Medicines (Name & Purpose Only)
            </span>
          </div>

          {isEditingBoxes && isDoctor ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  placeholder="Medicine name"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    background: "#0f172a",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    fontSize: "0.8rem",
                  }}
                />
                <input
                  type="text"
                  placeholder="Purpose (e.g. Acid control)"
                  value={newMedPurpose}
                  onChange={(e) => setNewMedPurpose(e.target.value)}
                  style={{
                    flex: 1.5,
                    padding: "6px 8px",
                    background: "#0f172a",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    fontSize: "0.8rem",
                  }}
                />
                <button
                  type="button"
                  className="doctor-edit-btn"
                  onClick={handleAddMedicine}
                  title="Add medicine"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="organ-medicines-list" style={{ maxHeight: "160px", overflowY: "auto" }}>
                {tempMedicines.map((m, idx) => (
                  <div key={idx} className="organ-med-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div className="organ-med-name">{m.name}</div>
                      <div className="organ-med-purpose">{m.purpose}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicine(idx)}
                      style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="organ-box-content">
              {medicines.length === 0 ? (
                <p style={{ color: "#94a3b8", fontStyle: "italic", margin: 0 }}>
                  No pharmacological therapies currently designated for this organ.
                </p>
              ) : (
                <div className="organ-medicines-list">
                  {medicines.map((m, idx) => (
                    <div key={idx} className="organ-med-card">
                      <div className="organ-med-name">{m.name}</div>
                      <div className="organ-med-purpose">{m.purpose}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* STRICT CLINICAL REQUIREMENT: NO DOSES & MANDATORY PRESCRIPTION DISCLAIMER */}
              <div className="organ-med-disclaimer">
                ⚠️ Take only as prescribed by your doctor.
              </div>
            </div>
          )}
        </div>

        {/* BOX 4: CLINICAL FINDINGS & ACTION PLAN */}
        <div className="organ-clinical-box">
          <div className="organ-box-header">
            <span className="organ-box-title">
              <HeartPulse size={16} />
              Clinical Summary & Action Plan
            </span>
          </div>

          <div className="organ-box-content">
            <p style={{ margin: "0 0 10px 0" }}>
              Total of <strong>{findings.length}</strong> active anatomical markers monitored across real-time physiological telemetry and ultrasound diagnostics.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {findings.map((f, i) => (
                <div
                  key={f.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    background: "rgba(15, 23, 42, 0.4)",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                  }}
                  onClick={() => handleSelectPoint(f)}
                >
                  <span style={{ fontWeight: 600, color: "#f8fafc" }}>
                    {f.title || f.label}
                  </span>
                  <span className={`organ-callout-badge badge-${f.severity}`} style={{ fontSize: "0.68rem" }}>
                    {f.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DOCTOR EDITING ACTION BAR */}
      {isEditingBoxes && isDoctor && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
          <button
            type="button"
            className="btn-cancel-modal"
            onClick={() => setIsEditingBoxes(false)}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-save-modal"
            onClick={handleSaveBoxes}
            disabled={isSaving}
          >
            <Save size={14} />
            <span>{isSaving ? "Saving Changes..." : "Save Care Instructions"}</span>
          </button>
        </div>
      )}

      {saveSuccess && (
        <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", borderRadius: "8px", color: "#10b981", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
          <CheckCircle2 size={16} />
          <span>Clinical instructions and organ problem markers synced successfully.</span>
        </div>
      )}
    </div>
  );
}

export default OrganViewer3D;
