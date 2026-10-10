import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  HeartPulse,
  RotateCcw,
  Sparkles,
  Activity,
  Sliders,
  Play,
  Pause,
  ShieldCheck,
  Radio,
} from "lucide-react";
import heartImg from "../../assets/heart-realistic.png";
import "./AnatomicalHeart3D.css";

/**
 * Calculates ECG wave amplitude y in [-1, 1] for a given normalized phase u in [0, 1)
 * Standard P-Q-R-S-T clinical waveform morphology.
 */
function getECGAmplitude(u) {
  // Baseline isoelectric
  if (u < 0.12) return 0;

  // P wave: atrial depolarization (smooth upward dome)
  if (u >= 0.12 && u < 0.22) {
    const pPhase = (u - 0.12) / 0.1;
    return 0.18 * Math.sin(Math.PI * pPhase);
  }

  // PR segment (isoelectric)
  if (u >= 0.22 && u < 0.3) return 0;

  // Q wave: small downward deflection
  if (u >= 0.3 && u < 0.33) {
    const qPhase = (u - 0.3) / 0.03;
    return -0.16 * Math.sin(Math.PI * qPhase);
  }

  // R wave: sharp upward QRS spike
  if (u >= 0.33 && u < 0.38) {
    const rPhase = (u - 0.33) / 0.05;
    return 0.95 * Math.sin(Math.PI * rPhase);
  }

  // S wave: sharp downward dip
  if (u >= 0.38 && u < 0.42) {
    const sPhase = (u - 0.38) / 0.04;
    return -0.32 * Math.sin(Math.PI * sPhase);
  }

  // ST segment (isoelectric)
  if (u >= 0.42 && u < 0.52) return 0;

  // T wave: ventricular repolarization (medium dome)
  if (u >= 0.52 && u < 0.7) {
    const tPhase = (u - 0.52) / 0.18;
    return 0.28 * Math.sin(Math.PI * tPhase);
  }

  // TP segment (resting baseline until next beat)
  return 0;
}

function AnatomicalHeart3D({ heartRate = 74, isAbnormal = false, status = "NORMAL" }) {
  const [bpm, setBpm] = useState(heartRate || 74);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Sync prop changes when not manually modified
  useEffect(() => {
    if (heartRate) {
      setBpm(heartRate);
    }
  }, [heartRate]);

  // Check OS prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) {
        setReducedMotion(true);
      }
      const handler = (e) => setReducedMotion(e.matches);
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
      }
    }
  }, []);

  // Determine dynamic badge & status info based on BPM
  const getStatusInfo = (rate) => {
    if (rate > 110) {
      return {
        hex: "#ef4444",
        label: "High Heart Rate",
        cardiacState: "Tachycardic",
        badgeClass: "badge-critical",
        dotClass: "dot-red",
        description: "Significant tachycardia threshold: close observation recommended",
      };
    }
    if (rate > 100) {
      return {
        hex: "#f59e0b",
        label: "Elevated Rhythm",
        cardiacState: "Elevated Rhythm",
        badgeClass: "badge-warning",
        dotClass: "dot-amber",
        description: "Mild tachycardia threshold: monitored resting suggested",
      };
    }
    if (rate < 60) {
      return {
        hex: "#38bdf8",
        label: "Low Resting Rhythm",
        cardiacState: "Bradycardic",
        badgeClass: "badge-low",
        dotClass: "dot-cyan",
        description: "Bradycardia threshold: physiological resting rhythm",
      };
    }
    return {
      hex: "#10b981",
      label: "Optimal Rhythm",
      cardiacState: "Sinus Normal",
      badgeClass: "badge-normal",
      dotClass: "dot-green",
      description: "Optimal sinus rhythm: physiological parameters in safe range",
    };
  };

  const currentStatus = getStatusInfo(bpm);
  const cycleDuration = (60 / bpm).toFixed(3);

  // Canvas ECG waveform refs & animation loop
  const canvasRef = useRef(null);
  const ecgWrapRef = useRef(null);
  const bpmRef = useRef(bpm);
  const animationFrameRef = useRef(null);
  const phaseAccumulatorRef = useRef(0);
  const lastTimeRef = useRef(null);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  // ResizeObserver for sharp High-DPI canvas rendering
  useEffect(() => {
    const wrap = ecgWrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const canvas = canvasRef.current;
        if (canvas && width > 0 && height > 0) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(width * dpr);
          canvas.height = Math.floor(height * dpr);
        }
      }
    });

    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  // ECG drawing callback
  const drawECG = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const deltaSeconds = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = timestamp;

    const currentBpm = bpmRef.current;
    const beatsPerSecond = currentBpm / 60;

    // Advance phase if not paused and not reduced motion
    if (!reducedMotion && !isPaused) {
      phaseAccumulatorRef.current += deltaSeconds * beatsPerSecond;
    }

    const currentPhase = phaseAccumulatorRef.current;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 210;
    const displayHeight = canvas.clientHeight || 50;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Subtle medical grid
    ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
    ctx.lineWidth = 1;
    const gridSize = 14;

    ctx.beginPath();
    for (let x = 0; x < displayWidth; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, displayHeight);
    }
    for (let y = 0; y < displayHeight; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(displayWidth, y);
    }
    ctx.stroke();

    // Baseline & waveform amplitude
    const baselineY = displayHeight * 0.58;
    const waveAmplitude = displayHeight * 0.44;

    // Draw glowing ECG trail in bright cyan/blue
    ctx.beginPath();
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#38bdf8";
    ctx.shadowColor = "rgba(56, 189, 248, 0.85)";
    ctx.shadowBlur = 7;

    const cyclesVisibleOnScreen = 1.8;
    const pointsCount = Math.floor(displayWidth);

    for (let px = 0; px <= pointsCount; px++) {
      const fractionOfScreen = px / displayWidth;
      const samplePhase = currentPhase - (1 - fractionOfScreen) * cyclesVisibleOnScreen;
      const u = ((samplePhase % 1) + 1) % 1;
      const amp = getECGAmplitude(u);
      const y = baselineY - amp * waveAmplitude;

      if (px === 0) {
        ctx.moveTo(px, y);
      } else {
        ctx.lineTo(px, y);
      }
    }
    ctx.stroke();

    // Leading glowing pulse dot at the right edge
    const leadU = ((currentPhase % 1) + 1) % 1;
    const leadY = baselineY - getECGAmplitude(leadU) * waveAmplitude;

    ctx.beginPath();
    ctx.arc(displayWidth - 2, leadY, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.restore();

    animationFrameRef.current = requestAnimationFrame(drawECG);
  }, [reducedMotion, isPaused]);

  useEffect(() => {
    lastTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(drawECG);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawECG]);

  const handleResetCamera = () => {
    setBpm(heartRate || 74);
    setIsPaused(false);
  };

  return (
    <div className="heart-3d-card" aria-label="3D Anatomical Heart Telemetry Monitor">
      {/* 1. HEADER WITH DYNAMIC OPTIMAL/ELEVATED/HIGH BADGE */}
      <div className="heart-3d-header">
        <div className="heart-header-title">
          <div className="heart-pulse-icon" style={{ color: currentStatus.hex }}>
            <HeartPulse size={20} />
          </div>
          <div>
            <h3>3D Anatomical Heart Telemetry</h3>
            <span>Rhythmic Biomechanical Model Synchronized with Physiological Heart Rate</span>
          </div>
        </div>

        <div
          className="heart-status-pill"
          style={{ borderColor: `${currentStatus.hex}60`, color: currentStatus.hex }}
        >
          <span className="pulsing-led" style={{ background: currentStatus.hex }} />
          <span>{currentStatus.label}</span>
        </div>
      </div>

      {/* 2. REALISTIC ANATOMICAL HEART VIEWPORT WITH LIVE LUB-DUB BEAT */}
      <div className="heart-3d-viewport">
        <div className="heart-image-stage">
          {/* Ambient synced cardiac glow */}
          <div
            className="heart-ambient-glow"
            style={{
              animationDuration: `${cycleDuration}s`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          />

          {/* Realistic Anatomical Human Heart Image with lub-dub keyframe animation */}
          <img
            src={heartImg}
            alt="Realistic Anatomical Human Heart"
            className={`realistic-heart-img ${reducedMotion ? "no-animation" : ""}`}
            style={{
              animationDuration: reducedMotion ? "0s" : `${cycleDuration}s`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          />
        </div>

        {/* 3. GLASSMORPHISM "HEART BEAT" CARD (BOTTOM-LEFT OVERLAY) */}
        <div className="heartbeat-glass-overlay" role="region" aria-label="Heart Beat Live Overlay">
          <div className="glass-header-row">
            <div className="glass-icon-badge">
              <Activity
                size={14}
                className={`overlay-heart-pulse ${reducedMotion || isPaused ? "no-animation" : ""}`}
              />
            </div>
            <div className="glass-title-col">
              <span className="glass-title">Heart Beat</span>
              <span className="glass-caption">Live heart rate</span>
            </div>
            <div className="glass-live-indicator">
              <span className={`live-pulse-dot ${isPaused ? "paused" : ""}`} />
              <span className="glass-sync-badge">{isPaused ? "Paused" : "Live"}</span>
            </div>
          </div>

          <div className="glass-bpm-row">
            <span className="glass-bpm-value" aria-live="polite">
              {bpm}
            </span>
            <span className="glass-bpm-unit">bpm</span>
          </div>

          {/* REAL CANVAS ECG WAVEFORM */}
          <div ref={ecgWrapRef} className="glass-ecg-wrap">
            <canvas
              ref={canvasRef}
              className="glass-ecg-canvas"
              aria-label="Real-time scrolling ECG telemetry waveform"
            />
          </div>
        </div>

        {/* 4. TOP-RIGHT FLOATING TELEMETRY BADGE (BPM, INTERVAL, CARDIAC STATE) */}
        <div className="viewport-telemetry-badge">
          <div className="bpm-counter">
            <strong>{bpm}</strong>
            <small>BPM</small>
          </div>
          <div className="cycle-indicator">
            <span>Interval: {cycleDuration}s</span>
            <span className="cardiac-state" style={{ color: currentStatus.hex }}>
              {currentStatus.cardiacState}
            </span>
          </div>
        </div>

        {/* 5. VIEWPORT CONTROL BUTTONS (PAUSE & RESET) */}
        <div className="viewport-controls">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`ctrl-btn ${isPaused ? "active" : ""}`}
            title={isPaused ? "Resume cardiac animation" : "Pause cardiac animation"}
            aria-label={isPaused ? "Resume animation" : "Pause animation"}
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button
            type="button"
            onClick={handleResetCamera}
            className="ctrl-btn"
            title="Reset to resting baseline rate"
            aria-label="Reset heart rate"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* 6. INTERACTIVE SLIDER, 48 / 74 / 135 PRESETS & REDUCE MOTION */}
      <div className="heart-simulation-tray">
        <div className="sim-slider-row">
          <div className="sim-label">
            <Sliders size={14} />
            <span>Simulate Heart Rate:</span>
            <strong>{bpm} BPM</strong>
          </div>
          <input
            type="range"
            min="40"
            max="160"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="heart-slider"
            aria-label="Adjust simulated heart rate slider"
          />
        </div>

        <div className="sim-quick-presets">
          <button
            type="button"
            className={`preset-chip ${bpm === 48 ? "active" : ""}`}
            onClick={() => setBpm(48)}
          >
            48 BPM (Bradycardia)
          </button>
          <button
            type="button"
            className={`preset-chip ${bpm === 74 ? "active" : ""}`}
            onClick={() => setBpm(74)}
          >
            74 BPM (Normal Resting)
          </button>
          <button
            type="button"
            className={`preset-chip ${bpm === 135 ? "active" : ""}`}
            onClick={() => setBpm(135)}
          >
            135 BPM (Tachycardia / Stress)
          </button>
        </div>

        <div className="accessibility-row">
          <label className="reduced-motion-toggle">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
            />
            <span>Reduce Motion (Disable Pulse & Scrolling Animation)</span>
          </label>
          <span className="heart-disclaimer">
            * Physiological anatomical model synchronized with live telemetry parameters.
          </span>
        </div>
      </div>
    </div>
  );
}

export default AnatomicalHeart3D;
