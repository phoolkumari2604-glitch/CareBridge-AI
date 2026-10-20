import React, { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ModelLoader } from "./ModelLoader";
import { Pins3D } from "./Pins3D";
import { ViewerMarker } from "./types";

interface Scene3DProps {
  organ?: "lungs" | "heart";
  markers: ViewerMarker[];
  selectedMarkerId?: number | string | null;
  onSelectMarker?: (id: number | string) => void;
  respRate?: number;
  reducedMotion?: boolean;
  onZoomChange?: (zoom: number) => void;
  resetTrigger?: number;
  zoomInTrigger?: number;
  zoomOutTrigger?: number;
}

const DEFAULT_CAMERA_POS: [number, number, number] = [0, 0.1, 4.4];
const DEFAULT_TARGET: [number, number, number] = [0, 0, 0];

/**
 * Camera Controller: handles orbit, zoom reporting, fly-to animation, and smooth reset.
 */
const CameraController: React.FC<{
  onZoomChange?: (zoom: number) => void;
  resetTrigger?: number;
  zoomInTrigger?: number;
  zoomOutTrigger?: number;
  flyToPos?: [number, number, number] | null;
  reducedMotion?: boolean;
}> = ({
  onZoomChange,
  resetTrigger,
  zoomInTrigger,
  zoomOutTrigger,
  flyToPos,
  reducedMotion = false,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetCameraPos = useRef<THREE.Vector3 | null>(null);
  const targetLookAt = useRef<THREE.Vector3 | null>(null);
  const isAnimating = useRef(false);

  // Smooth Reset View
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      targetCameraPos.current = new THREE.Vector3(...DEFAULT_CAMERA_POS);
      targetLookAt.current = new THREE.Vector3(...DEFAULT_TARGET);
      isAnimating.current = true;
    }
  }, [resetTrigger]);

  // Zoom In button trigger
  useEffect(() => {
    if (zoomInTrigger && zoomInTrigger > 0 && controlsRef.current) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      camera.position.addScaledVector(dir, 0.5);
      controlsRef.current.update();
    }
  }, [zoomInTrigger, camera]);

  // Zoom Out button trigger
  useEffect(() => {
    if (zoomOutTrigger && zoomOutTrigger > 0 && controlsRef.current) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      camera.position.addScaledVector(dir, -0.5);
      controlsRef.current.update();
    }
  }, [zoomOutTrigger, camera]);

  // Fly to Pin Position
  useEffect(() => {
    if (flyToPos) {
      const [fx, fy, fz] = flyToPos;
      targetLookAt.current = new THREE.Vector3(fx, fy, fz);
      // Position camera slightly offset along normal
      targetCameraPos.current = new THREE.Vector3(
        fx * 1.35,
        fy * 1.35 + 0.1,
        fz + 1.8
      );
      isAnimating.current = true;
    }
  }, [flyToPos]);

  // Per-frame animation and real-time zoom calculation
  useFrame(() => {
    if (controlsRef.current) {
      // Calculate real zoom: defaultDistance / currentDistance
      const dist = camera.position.distanceTo(controlsRef.current.target);
      const defaultDist = 4.4;
      const zoom = Math.max(0.6, Math.min(3.0, defaultDist / Math.max(1.0, dist)));
      onZoomChange?.(zoom);
    }

    if (isAnimating.current && targetCameraPos.current && targetLookAt.current) {
      const speed = reducedMotion ? 1.0 : 0.08;
      camera.position.lerp(targetCameraPos.current, speed);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLookAt.current, speed);
        controlsRef.current.update();
      }

      if (camera.position.distanceTo(targetCameraPos.current) < 0.04) {
        camera.position.copy(targetCameraPos.current);
        if (controlsRef.current) {
          controlsRef.current.target.copy(targetLookAt.current);
          controlsRef.current.update();
        }
        isAnimating.current = false;
        targetCameraPos.current = null;
        targetLookAt.current = null;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={true}
      enableZoom={true}
      enablePan={true}
      autoRotate={!reducedMotion}
      autoRotateSpeed={0.65}
      minDistance={1.8}
      maxDistance={6.5}
      dampingFactor={0.06}
      enableDamping={true}
    />
  );
};

export const Scene3D: React.FC<Scene3DProps> = ({
  organ = "lungs",
  markers = [],
  selectedMarkerId = null,
  onSelectMarker,
  respRate = 16,
  reducedMotion = false,
  onZoomChange,
  resetTrigger = 0,
  zoomInTrigger = 0,
  zoomOutTrigger = 0,
}) => {
  const [flyToPos, setFlyToPos] = React.useState<[number, number, number] | null>(null);

  const handleFlyTo = React.useCallback((pos: [number, number, number]) => {
    setFlyToPos(pos);
  }, []);

  return (
    <Canvas
      camera={{ position: DEFAULT_CAMERA_POS, fov: 42 }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      style={{
        background: "transparent",
        width: "100%",
        height: "100%",
      }}
    >
      {/* ── LIGHTING ── */}
      <ambientLight intensity={0.7} />
      {/* Key Light */}
      <directionalLight position={[4, 5, 4]} intensity={1.1} castShadow />
      {/* Soft Fill Light */}
      <directionalLight position={[-4, -2, -3]} intensity={0.4} />
      {/* Cyan/Blue Anatomical Rim Light */}
      <directionalLight position={[0, -4, 4]} intensity={0.5} color="#38bdf8" />
      {/* Warm Subsurface Accent */}
      <pointLight position={[0, 0, 0]} intensity={0.3} color="#f43f5e" />

      {/* ── 3D MODEL & PIN MARKERS ── */}
      <group>
        <ModelLoader organ={organ} respRate={respRate} reducedMotion={reducedMotion} />
        <Pins3D
          markers={markers}
          selectedMarkerId={selectedMarkerId}
          onSelectMarker={onSelectMarker}
          reducedMotion={reducedMotion}
          onFlyTo={handleFlyTo}
        />
      </group>

      {/* ── CONTROLS & CAMERA LERP ── */}
      <CameraController
        onZoomChange={onZoomChange}
        resetTrigger={resetTrigger}
        zoomInTrigger={zoomInTrigger}
        zoomOutTrigger={zoomOutTrigger}
        flyToPos={flyToPos}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
};
