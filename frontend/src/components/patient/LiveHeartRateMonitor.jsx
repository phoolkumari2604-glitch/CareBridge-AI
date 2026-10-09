import React, { useState, useEffect, useRef, useCallback } from "react";
import { Heart, Activity, ShieldCheck, AlertTriangle, Radio } from "lucide-react";
import heartImg from "../../assets/heart-realistic.png";
import "./LiveHeartRateMonitor.css";

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

export default function LiveHeartRateMonitor({ className = "" }) {
  // 1. Live BPM state (single source of truth, initially 120 bpm)
  const [bpm, setBpm] = useState(120);

  // 2. Reduced motion detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  // Refs for animation & canvas rendering without causing component re-render loops
  const bpmRef = useRef(120);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const phaseAccumulatorRef = useRef(0);
  const lastTimeRef = useRef(null);

  // Sync ref with state
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  // Listen to OS prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e) => setPrefersReducedMotion(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // 3. Live BPM simulation:
  // Every 2 seconds, generate and display a new integer BPM between 60 and 110
  useEffect(() => {
    const interval = setInterval(() => {
      // Generate random integer between 60 and 110 inclusive
      const newBpm = Math.floor(Math.random() * (110 - 60 + 1)) + 60;
      setBpm(newBpm);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // 4. Status Indicator classification based on current BPM
  const getStatusInfo = (currentBpm) => {
    if (currentBpm < 60) {
      return {
        text: "Low resting heart rate",
        color: "#f59e0b",
        badgeClass: "status-low",
        dotClass: "dot-amber",
        description: "Bradycardia threshold: clinical resting evaluation suggested",
      };
    }
    if (currentBpm <= 100) {
      return {
        text: "Normal resting heart rate",
        color: "#10b981",
        badgeClass: "status-normal",
        dotClass: "dot-green",
        description: "Optimal sinus rhythm: physiological metrics in safe range",
      };
    }
    if (currentBpm <= 110) {
      return {
        text: "Elevated heart rate",
        color: "#f59e0b",
        badgeClass: "status-elevated",
        dotClass: "dot-amber",
        description: "Mild tachycardia threshold: monitored observation recommended",
      };
    }
    return {
      text: "High heart rate",
      color: "#ef4444",
      badgeClass: "status-high",
      dotClass: "dot-red",
      description: "Significant tachycardia threshold: patient alert notification active",
    };
  };

  const status = getStatusInfo(bpm);

  // Dynamic cardiac cycle duration (60 / bpm) seconds for the lub-dub animation
  const cycleDurationSeconds = (60 / bpm).toFixed(3);

  // 5. Canvas ECG Scrolling Waveform Animation Loop
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

    // Advance continuous phase accumulator
    if (!prefersReducedMotion) {
      phaseAccumulatorRef.current += deltaSeconds * beatsPerSecond;
    }

    const currentPhase = phaseAccumulatorRef.current;

    // Handle high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 220;
    const displayHeight = canvas.clientHeight || 56;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw subtle medical grid background
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

    // Baseline horizontal center line
    const baselineY = displayHeight * 0.58;
    const waveAmplitude = displayHeight * 0.44;

    // Draw glowing ECG trail
    ctx.beginPath();
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#38bdf8"; // Bright medical cyan/blue
    ctx.shadowColor = "rgba(56, 189, 248, 0.85)";
    ctx.shadowBlur = 7;

    // We render approximately 1.8 full cardiac cycles across the canvas width
    const cyclesVisibleOnScreen = 1.8;
    const pointsCount = Math.floor(displayWidth);

    for (let px = 0; px <= pointsCount; px++) {
      const fractionOfScreen = px / displayWidth;
      // Rightmost point (px = displayWidth) corresponds to current continuous phase
      const samplePhase = currentPhase - (1 - fractionOfScreen) * cyclesVisibleOnScreen;
      
      // Normalized phase in [0, 1)
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

    // Draw leading glowing pulse dot at the leading right edge
    const leadU = ((currentPhase % 1) + 1) % 1;
    const leadY = baselineY - getECGAmplitude(leadU) * waveAmplitude;

    ctx.beginPath();
    ctx.arc(displayWidth - 2, leadY, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.restore();

    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(drawECG);
  }, [prefersReducedMotion]);

  // Start / stop ECG animation frame loop
  useEffect(() => {
    lastTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(drawECG);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawECG]);

  return (
    <div
      ref={containerRef}
      className={`live-heart-monitor-card ${className}`}
      aria-label="Live Heart Rate Monitoring System"
    >
      {/* CARD TOP BAR */}
      <div className="monitor-top-bar">
        <div className="monitor-title-group">
          <div className="telemetry-live-dot-wrap" title="Live Continuous Telemetry Active">
            <span className="telemetry-ping-circle" />
            <span className="telemetry-solid-dot" />
          </div>
          <div>
            <h3 className="monitor-main-heading">Cardiac Rhythm & Heart Rate Monitor</h3>
            <span className="monitor-sub-heading">Real-time physiological telemetry visualizer</span>
          </div>
        </div>

        <div className="telemetry-status-pill" style={{ borderColor: `${status.color}40` }}>
          <Radio size={13} className="telemetry-radio-icon" style={{ color: status.color }} />
          <span className="telemetry-mode-text">LIVE STREAM</span>
          <span className="telemetry-rate-badge font-mono">{bpm} BPM</span>
        </div>
      </div>

      {/* ANATOMICAL HEART VISUALIZATION WITH GLASS OVERLAY */}
      <div className="heart-visualizer-container">
        {/* REALISTIC ANATOMICAL HEART IMAGE WITH LUB-DUB ANIMATION */}
        <div className="heart-image-viewport">
          <div className="heart-ambient-glow" style={{ animationDuration: `${cycleDurationSeconds}s` }} />
          <img
            src={heartImg}
            alt="Realistic Anatomical Human Heart"
            className={`realistic-heart-img ${prefersReducedMotion ? "no-animation" : ""}`}
            style={{
              animationDuration: prefersReducedMotion ? "0s" : `${cycleDurationSeconds}s`,
            }}
          />
        </div>

        {/* GLASSMORPHISM "HEART BEAT" OVERLAY CARD ON BOTTOM-LEFT */}
        <div className="heartbeat-glass-overlay" role="region" aria-label="Heart Beat Overlay Widget">
          <div className="glass-header-row">
            <div className="glass-icon-badge">
              <Heart size={15} className={`overlay-heart-pulse ${prefersReducedMotion ? "no-animation" : ""}`} />
            </div>
            <span className="glass-title">Heart Beat</span>
            <span className="glass-sync-badge">Synced</span>
          </div>

          <div className="glass-bpm-row">
            <span className="glass-bpm-value" aria-live="polite">
              {bpm}
            </span>
            <span className="glass-bpm-unit">bpm</span>
          </div>

          {/* REAL CANVAS ECG WAVEFORM */}
          <div className="glass-ecg-wrap">
            <canvas
              ref={canvasRef}
              className="glass-ecg-canvas"
              aria-label="Real-time scrolling ECG telemetry waveform"
            />
          </div>
        </div>
      </div>

      {/* HEART RATE STATUS INDICATOR (DIRECTLY BENEATH HEART & OVERLAY) */}
      <div className="heart-rate-status-bar" role="status" aria-live="polite">
        <div className="status-indicator-lead">
          <span className={`status-color-dot ${status.dotClass}`} style={{ backgroundColor: status.color }} />
          <strong className="status-label-text" style={{ color: status.color }}>
            {status.text}
          </strong>
          <span className="status-bpm-tag font-mono">{bpm} BPM</span>
        </div>

        <div className="status-clinical-note">
          <ShieldCheck size={14} className="status-shield-icon" />
          <span>{status.description}</span>
        </div>
      </div>

      {/* FOOTER CLINICAL DISCLAIMER */}
      <div className="monitor-clinical-notice">
        <small>
          Visual Cardiac Simulation &middot; Cycle: {cycleDurationSeconds}s &middot; Informational telemetry display.
        </small>
      </div>
    </div>
  );
}
