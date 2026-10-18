import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Layers,
  Info,
  Radio,
} from "lucide-react";
import { getOrganConfig } from "./organs.config.js";

export function OrganViewer3D({
  organId,
  status = "grey",
  statusLabel = "No data yet",
  onSelectOrgan,
  onOpenPanel,
}) {
  const containerRef = useRef(null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });

  const [cutawayActive, setCutawayActive] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, text: "" });
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  const canvasRef = useRef(null);
  const config = getOrganConfig(organId);

  // Check prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handler = (e) => setReducedMotion(e.matches);
      mq.addEventListener?.("change", handler);
      return () => mq.removeEventListener?.("change", handler);
    }
  }, []);

  // Compute file paths for organ video & poster
  const organKey = organId || "stomach";
  const isBrain = organKey === "brain";
  const baseName = cutawayActive ? `${organKey}-inner` : organKey;
  const videoSrc = `/assets/organs/${baseName}.mp4`;
  const posterSrc = `/assets/organs/${baseName}.jpg`;

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

    // Initialize 60 floating particles
    const particleCount = 60;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.45 + 0.2, // float upward
      speedX: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.65 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      pulseDir: Math.random() > 0.5 ? 1 : -1,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        // Move upward
        p.y -= p.speedY;
        p.x += p.speedX;

        // Reset if moved out of top bounds
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Glow pulse on alpha
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

  // Reset video error state on organ or cutaway change
  useEffect(() => {
    setVideoError(false);
  }, [organKey, cutawayActive]);

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

  // Mouse wheel zoom support
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

  // Pointer Drag & Pan support when zoomed in
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
      // Clamp pan bounds according to zoom scale
      const maxPan = (zoomScale - 1.0) * 180;
      setPanOffset({
        x: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.initialPanX + dx)),
        y: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.initialPanY + dy)),
      });
    } else if (containerRef.current) {
      // Floating tooltip
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setTooltipPos({
        x,
        y: y - 36,
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

  // Keyboard navigation for accessibility
  const handleKeyDown = (e) => {
    switch (e.key) {
      case "+":
      case "=":
        e.preventDefault();
        handleZoomIn();
        break;
      case "-":
        e.preventDefault();
        handleZoomOut();
        break;
      case "0":
        e.preventDefault();
        handleResetView();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onOpenPanel?.();
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`organ-3d-viewport ${isBrain ? "brain-viewport-container" : ""} ${isDragging ? "is-orbiting" : ""}`}
      tabIndex={0}
      role="region"
      aria-label={`Realistic Clinical Media Viewer of ${config?.name || "Organ"}. Use zoom controls or arrow keys to inspect.`}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={(e) => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setTooltipPos({
            x,
            y: y - 36,
            visible: true,
            text: `${config?.name || "Organ"} · Status: ${statusLabel}`,
          });
        }
      }}
      onMouseLeave={() => setTooltipPos((prev) => ({ ...prev, visible: false }))}
      style={{
        cursor: zoomScale > 1.0 ? (isDragging ? "grabbing" : "grab") : "default",
        backgroundColor: isBrain ? "#06101f" : undefined,
      }}
    >
      {/* REALISTIC MEDIA WRAPPER */}
      <div className={`organ-media-wrapper ${isBrain ? "brain-moving-bg" : ""}`}>
        {/* Background Floating Particles for Brain */}
        {isBrain && (
          <canvas
            ref={canvasRef}
            className="brain-particles-canvas"
            aria-hidden="true"
          />
        )}

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
        >
          {isBrain ? (
            /* BRAIN: Moving Visual with float, tilt, scale and blue glow pulse */
            <img
              src="/assets/organs/brain.jpg"
              alt="Live Anatomical Brain Visual"
              className={`organ-media-element ${!reducedMotion ? "brain-live-image" : ""}`}
              style={{
                objectFit: "contain",
                width: "100%",
                height: "100%",
                maxHeight: "380px",
              }}
              onClick={() => onOpenPanel?.()}
            />
          ) : !videoError ? (
            <video
              key={baseName}
              src={videoSrc}
              autoPlay
              muted
              loop
              playsInline
              poster={posterSrc}
              onError={() => setVideoError(true)}
              className="organ-media-element"
              style={{ objectFit: "contain", width: "100%", height: "100%" }}
              onClick={() => onOpenPanel?.()}
            >
              <source src={videoSrc} type="video/mp4" />
              <img
                src={posterSrc}
                alt={config?.name}
                className={`organ-media-element ${
                  !reducedMotion ? "organ-image-gentle-motion" : ""
                }`}
                style={{ objectFit: "contain", width: "100%", height: "100%" }}
              />
            </video>
          ) : (
            <img
              src={posterSrc}
              alt={config?.name}
              className={`organ-media-element ${
                !reducedMotion ? "organ-image-gentle-motion" : ""
              }`}
              style={{ objectFit: "contain", width: "100%", height: "100%" }}
              onClick={() => onOpenPanel?.()}
            />
          )}
        </div>
      </div>

      {/* TOP FLOATING OVERLAY: CONTROLS & CHIPS */}
      <div className="viewport-overlay-top">
        <div className="viewport-organ-tag">
          {/* For Brain: Black pill with red dot blinking every 1.2s at top left */}
          {isBrain ? (
            <span className="brain-live-pill-badge" title="Live Continuous Telemetry Active">
              <span className="brain-red-dot" /> LIVE
            </span>
          ) : (
            <>
              <span className="organ-tag-dot" style={{ backgroundColor: config?.color || "#38bdf8" }} />
              <span className="organ-tag-name">{config?.name}</span>
              <span className="organ-tag-system">Realistic Organ Viewer</span>
              <span className="media-live-badge">
                <span className="live-dot" /> LIVE
              </span>
            </>
          )}

          {isBrain && (
            <>
              <span className="organ-tag-dot" style={{ backgroundColor: config?.color || "#38bdf8" }} />
              <span className="organ-tag-name">{config?.name}</span>
              <span className="organ-tag-system">Neural & Hemodynamic Feed</span>
            </>
          )}
        </div>

        <div className="viewport-actions-row">
          {/* Inner Cutaway Toggle */}
          <button
            type="button"
            className={`viewport-tool-btn ${cutawayActive ? "active" : ""}`}
            onClick={handleToggleCutaway}
            title="Toggle interior cutaway lumen view"
            aria-label="Toggle inner cutaway view"
          >
            <Layers size={14} />
            <span>{cutawayActive ? "Surface View" : "Inner Cutaway"}</span>
          </button>

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

      {/* BOTTOM FLOATING CONTROLS & INTERACTION HINT */}
      <div className="viewport-overlay-bottom">
        <div className="viewport-gesture-hint">
          <span>{zoomScale > 1.0 ? "Drag to Pan · " : ""}Scroll to Zoom (1x - 2x) · Click for Clinical Detail</span>
        </div>

        <button
          type="button"
          onClick={() => onOpenPanel?.()}
          className="viewport-inspect-btn"
          aria-label="Inspect organ telemetry and clinical dossiers"
        >
          <Info size={14} />
          <span>Inspect {config?.name} Dossier</span>
        </button>
      </div>

      {/* FLOATING HOVER TOOLTIP */}
      {tooltipPos.visible && !isDragging && (
        <div
          className="viewport-hover-tooltip"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <span className="tooltip-indicator" />
          <span>{tooltipPos.text}</span>
        </div>
      )}
    </div>
  );
}

export default OrganViewer3D;
