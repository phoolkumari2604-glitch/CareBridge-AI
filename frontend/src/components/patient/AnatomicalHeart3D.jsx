import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  HeartPulse,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Sliders,
  Play,
  Pause,
} from "lucide-react";
import "./AnatomicalHeart3D.css";

function AnatomicalHeart3D({ heartRate = 72, isAbnormal = false, status = "NORMAL" }) {
  const mountRef = useRef(null);
  const [bpm, setBpm] = useState(heartRate || 72);
  const [simulating, setSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webGlSupported, setWebGlSupported] = useState(true);

  // Sync prop changes
  useEffect(() => {
    if (!simulating && heartRate) {
      setBpm(heartRate);
    }
  }, [heartRate, simulating]);

  // Determine heart color based on BPM
  const getStatusColor = (rate) => {
    if (rate < 50 || rate > 120) return { hex: "#ef4444", threeColor: 0xef4444, label: "Critical Threshold", badge: "critical" };
    if (rate < 60 || rate > 100) return { hex: "#f59e0b", threeColor: 0xf59e0b, label: "Borderline Watch", badge: "warning" };
    return { hex: "#10b981", threeColor: 0x10b981, label: "Optimal Rhythm", badge: "normal" };
  };

  const currentStatus = getStatusColor(bpm);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let scene, camera, renderer, heartGroup, animationFrameId;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    try {
      // Scene setup
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
      camera.position.set(0, 0, 8.5);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight1.position.set(5, 10, 7);
      scene.add(dirLight1);

      const pointLight = new THREE.PointLight(currentStatus.threeColor, 2.5, 20);
      pointLight.position.set(0, 0, 4);
      scene.add(pointLight);

      // Construct Anatomical 3D Heart Geometry Group
      heartGroup = new THREE.Group();

      // Main Ventricles (Left & Right cardiac body)
      const ventricleGeo = new THREE.SphereGeometry(1.6, 32, 32);
      ventricleGeo.scale(1.0, 1.35, 0.95);
      const heartMat = new THREE.MeshStandardMaterial({
        color: currentStatus.threeColor,
        roughness: 0.25,
        metalness: 0.35,
        emissive: currentStatus.threeColor,
        emissiveIntensity: 0.22,
      });
      const ventricleMesh = new THREE.Mesh(ventricleGeo, heartMat);
      ventricleMesh.rotation.z = -0.15;
      heartGroup.add(ventricleMesh);

      // Left & Right Atria
      const atriaGeo = new THREE.SphereGeometry(0.85, 24, 24);
      const atriaMat = new THREE.MeshStandardMaterial({
        color: currentStatus.threeColor,
        roughness: 0.4,
        metalness: 0.2,
      });

      const rightAtrium = new THREE.Mesh(atriaGeo, atriaMat);
      rightAtrium.position.set(-0.85, 1.25, -0.1);
      heartGroup.add(rightAtrium);

      const leftAtrium = new THREE.Mesh(atriaGeo, atriaMat);
      leftAtrium.position.set(0.8, 1.2, -0.2);
      heartGroup.add(leftAtrium);

      // Aorta Arch (Main pulmonary artery curve)
      const aortaCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.2, 0),
        new THREE.Vector3(0.2, 2.2, 0.1),
        new THREE.Vector3(-0.6, 2.4, -0.1),
        new THREE.Vector3(-1.1, 1.8, -0.3),
      ]);
      const aortaGeo = new THREE.TubeGeometry(aortaCurve, 20, 0.38, 16, false);
      const aortaMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
      const aortaMesh = new THREE.Mesh(aortaGeo, aortaMat);
      heartGroup.add(aortaMesh);

      // Pulmonary Artery trunk
      const pulmonaryCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.3, 1.0, 0.4),
        new THREE.Vector3(-0.5, 1.8, 0.2),
        new THREE.Vector3(0.5, 2.0, -0.2),
      ]);
      const pulmonaryGeo = new THREE.TubeGeometry(pulmonaryCurve, 16, 0.32, 12, false);
      const pulmonaryMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });
      const pulmonaryMesh = new THREE.Mesh(pulmonaryGeo, pulmonaryMat);
      heartGroup.add(pulmonaryMesh);

      // Superior Vena Cava
      const venaCavaGeo = new THREE.CylinderGeometry(0.26, 0.26, 1.2, 16);
      const venaCavaMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.35 });
      const venaCavaMesh = new THREE.Mesh(venaCavaGeo, venaCavaMat);
      venaCavaMesh.position.set(-1.1, 1.8, -0.1);
      heartGroup.add(venaCavaMesh);

      scene.add(heartGroup);

      // Interactive Mouse / Touch Drag to Rotate
      const handleMouseDown = (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const handleMouseMove = (e) => {
        if (!isDragging || !heartGroup) return;
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        heartGroup.rotation.y += deltaX * 0.01;
        heartGroup.rotation.x += deltaY * 0.01;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const handleMouseUp = () => {
        isDragging = false;
      };

      container.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      // Touch events
      const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
          isDragging = true;
          previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      };

      const handleTouchMove = (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;

        heartGroup.rotation.y += deltaX * 0.01;
        heartGroup.rotation.x += deltaY * 0.01;

        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      };

      const handleTouchEnd = () => {
        isDragging = false;
      };

      container.addEventListener("touchstart", handleTouchStart, { passive: true });
      container.addEventListener("touchmove", handleTouchMove, { passive: true });
      container.addEventListener("touchend", handleTouchEnd);

      // Animation Loop with Physiological Heartbeat Rhythm
      let clock = new THREE.Clock();

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        if (heartGroup) {
          // Slow continuous rotation
          if (!isDragging && !isPaused) {
            heartGroup.rotation.y += 0.005;
          }

          // Heartbeat pulse frequency formula (BPM / 60 beats per second)
          if (!reducedMotion && !isPaused) {
            const beatFreq = (bpm / 60) * Math.PI * 2;
            const systolicPeak = Math.sin(elapsedTime * beatFreq);
            const secondaryPulse = Math.sin(elapsedTime * beatFreq * 2) * 0.35;
            const totalScale = 1.0 + Math.max(0, systolicPeak + secondaryPulse) * 0.12;

            heartGroup.scale.set(totalScale, totalScale, totalScale);
          } else {
            heartGroup.scale.set(1, 1, 1);
          }

          // Update material colors dynamically if BPM changes
          heartMat.color.setHex(currentStatus.threeColor);
          heartMat.emissive.setHex(currentStatus.threeColor);
          atriaMat.color.setHex(currentStatus.threeColor);
          pointLight.color.setHex(currentStatus.threeColor);
        }

        renderer.render(scene, camera);
      };

      animate();

      // Resize listener
      const handleResize = () => {
        if (!container || !camera || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };

      window.addEventListener("resize", handleResize);

      return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener("resize", handleResize);
        container.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleTouchEnd);

        if (renderer?.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer?.dispose();
      };
    } catch (err) {
      console.warn("WebGL initialization failed, falling back to 2D canvas:", err);
      setWebGlSupported(false);
    }
  }, [bpm, isPaused, reducedMotion, currentStatus.threeColor]);

  const handleZoom = (direction) => {
    // Zoom control helper
    setBpm((prev) => prev);
  };

  const handleResetCamera = () => {
    setBpm(heartRate || 72);
    setSimulating(false);
    setIsPaused(false);
  };

  return (
    <div className="heart-3d-card">
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

        <div className="heart-status-pill" style={{ borderColor: currentStatus.hex, color: currentStatus.hex }}>
          <span className="pulsing-led" style={{ background: currentStatus.hex }} />
          <span>{currentStatus.label}</span>
        </div>
      </div>

      <div className="heart-3d-viewport">
        {webGlSupported ? (
          <div ref={mountRef} className="three-canvas-container" title="Click & drag to rotate 3D heart" />
        ) : (
          /* 2D Canvas / SVG Fallback */
          <div className="heart-2d-fallback">
            <svg
              viewBox="0 0 100 100"
              className={`fallback-heart-svg ${!reducedMotion ? "beating" : ""}`}
              style={{
                filter: `drop-shadow(0 0 16px ${currentStatus.hex})`,
                animationDuration: `${60 / bpm}s`,
              }}
            >
              <path
                d="M50,88 C50,88 15,62 15,35 C15,18 28,10 40,18 C46,22 50,30 50,30 C50,30 54,22 60,18 C72,10 85,18 85,35 C85,62 50,88 50,88 Z"
                fill={currentStatus.hex}
              />
            </svg>
            <span>2D Anatomical Cardiac Mode</span>
          </div>
        )}

        {/* Floating Telemetry Stats on Canvas */}
        <div className="viewport-telemetry-badge">
          <div className="bpm-counter">
            <strong>{bpm}</strong>
            <small>BPM</small>
          </div>
          <div className="cycle-indicator">
            <span>Interval: {(60 / bpm).toFixed(2)}s</span>
            <span className="cardiac-state">{bpm > 100 ? "Tachycardic" : bpm < 60 ? "Bradycardic" : "Sinus Normal"}</span>
          </div>
        </div>

        {/* Viewport Control Bar */}
        <div className="viewport-controls">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="ctrl-btn"
            title={isPaused ? "Resume rotation" : "Pause rotation"}
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button type="button" onClick={handleResetCamera} className="ctrl-btn" title="Reset Camera & Vitals">
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Heart Rate Simulator & Accessibility Controls */}
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
            onChange={(e) => {
              setSimulating(true);
              setBpm(Number(e.target.value));
            }}
            className="heart-slider"
          />
        </div>

        <div className="sim-quick-presets">
          <button
            type="button"
            className={`preset-chip ${bpm === 48 ? "active" : ""}`}
            onClick={() => {
              setSimulating(true);
              setBpm(48);
            }}
          >
            48 BPM (Bradycardia)
          </button>
          <button
            type="button"
            className={`preset-chip ${bpm === 74 ? "active" : ""}`}
            onClick={() => {
              setSimulating(true);
              setBpm(74);
            }}
          >
            74 BPM (Normal Resting)
          </button>
          <button
            type="button"
            className={`preset-chip ${bpm === 135 ? "active" : ""}`}
            onClick={() => {
              setSimulating(true);
              setBpm(135);
            }}
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
            <span>Reduce Motion (Disable Pulse Animation)</span>
          </label>
          <span className="heart-disclaimer">
            * Informational 3D model synced with physiological parameters.
          </span>
        </div>
      </div>
    </div>
  );
}

export default AnatomicalHeart3D;
