import React, { useRef, useState, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { ViewerMarker } from "./types";

interface Pins3DProps {
  markers: ViewerMarker[];
  selectedMarkerId?: number | string | null;
  onSelectMarker?: (id: number | string) => void;
  reducedMotion?: boolean;
  onFlyTo?: (pos: [number, number, number]) => void;
}

const SEVERITY_COLORS = {
  critical: "#ef4444",
  watch: "#f59e0b",
  normal: "#10b981",
};

export const Pins3D: React.FC<Pins3DProps> = ({
  markers = [],
  selectedMarkerId = null,
  onSelectMarker,
  reducedMotion = false,
  onFlyTo,
}) => {
  return (
    <group>
      {markers.map((marker, index) => (
        <SinglePin
          key={marker.id || index}
          marker={marker}
          index={index + 1}
          isSelected={
            selectedMarkerId !== null &&
            selectedMarkerId !== undefined &&
            String(selectedMarkerId) === String(marker.id)
          }
          onSelectMarker={onSelectMarker}
          reducedMotion={reducedMotion}
          onFlyTo={onFlyTo}
        />
      ))}
    </group>
  );
};

interface SinglePinProps {
  marker: ViewerMarker;
  index: number;
  isSelected: boolean;
  onSelectMarker?: (id: number | string) => void;
  reducedMotion?: boolean;
  onFlyTo?: (pos: [number, number, number]) => void;
}

const SinglePin: React.FC<SinglePinProps> = ({
  marker,
  index,
  isSelected,
  onSelectMarker,
  reducedMotion = false,
  onFlyTo,
}) => {
  const pinGroupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [opacity, setOpacity] = useState(1.0);
  const [isHovered, setIsHovered] = useState(false);

  const severity = marker.severity || "watch";
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.watch;
  const isNonNormal = severity !== "normal";

  // Reusable vector objects to avoid per-frame GC allocations
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);
  const normalVec = useMemo(
    () => new THREE.Vector3(...marker.normal).normalize(),
    [marker.normal]
  );

  // Trigger camera fly-to when selected from outside
  useEffect(() => {
    if (isSelected && onFlyTo) {
      onFlyTo(marker.position);
    }
  }, [isSelected, marker.position, onFlyTo]);

  // Frame update: facing calculation and pulsing animation
  useFrame(({ camera, clock }) => {
    if (!pinGroupRef.current) return;

    pinGroupRef.current.getWorldPosition(worldPos);
    camDir.subVectors(camera.position, worldPos).normalize();

    // Facing calculation: dot product of surface normal and camera direction
    const dot = normalVec.dot(camDir);
    // Smooth fade when facing away (dot < 0)
    const targetOpacity = dot > 0 ? Math.min(1.0, dot * 2.2 + 0.1) : 0.08;
    setOpacity(targetOpacity);

    // Non-normal pins pulse in scale and glow
    if (!reducedMotion && isNonNormal && meshRef.current) {
      const freq = severity === "critical" ? 5.5 : 3.2;
      const pulse = 1.0 + Math.sin(clock.getElapsedTime() * freq) * 0.18;
      meshRef.current.scale.set(pulse, pulse, pulse);

      if (ringRef.current) {
        const ringScale = 1.0 + ((clock.getElapsedTime() * 1.5) % 1.5) * 1.6;
        const ringFade = Math.max(0, 1.0 - (((clock.getElapsedTime() * 1.5) % 1.5) / 1.5));
        ringRef.current.scale.set(ringScale, ringScale, ringScale);
        if (ringRef.current.material instanceof THREE.Material) {
          ringRef.current.material.opacity = ringFade * targetOpacity * 0.8;
        }
      }
    }
  });

  const handleClick = (e: any) => {
    e?.stopPropagation?.();
    onSelectMarker?.(marker.id);
    onFlyTo?.(marker.position);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(e);
    }
  };

  return (
    <group ref={pinGroupRef} position={marker.position}>
      {/* 3D Pin Core Mesh */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.9 : 0.5}
          roughness={0.2}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Ripple ring for non-normal severity */}
      {isNonNormal && !reducedMotion && (
        <mesh ref={ringRef} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.085, 0.11, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.6 * opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Numbered Accessible Marker Label & Hover Tooltip */}
      <Html
        center
        distanceFactor={6}
        style={{
          pointerEvents: opacity < 0.2 ? "none" : "auto",
          opacity: opacity,
          transition: "opacity 0.2s ease",
        }}
      >
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          tabIndex={0}
          role="button"
          aria-label={`Finding: ${marker.title || marker.label}, Severity: ${severity}`}
          style={{
            background: isSelected ? "#ffffff" : color,
            color: isSelected ? "#0f172a" : "#ffffff",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            border: "2px solid #ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: `0 0 10px ${color}, 0 2px 8px rgba(0,0,0,0.6)`,
            transform: isSelected ? "scale(1.2)" : "scale(1.0)",
            transition: "all 0.15s ease",
            outline: isSelected ? "2px solid #38bdf8" : "none",
            outlineOffset: "2px",
          }}
        >
          {index}
        </button>

        {/* Hover Tooltip */}
        {isHovered && (
          <div
            style={{
              position: "absolute",
              bottom: "26px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(15, 23, 42, 0.95)",
              color: "#f8fafc",
              padding: "6px 10px",
              borderRadius: "6px",
              border: `1px solid ${color}`,
              whiteSpace: "nowrap",
              fontSize: "11px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.7)",
              pointerEvents: "none",
              zIndex: 100,
            }}
          >
            <div style={{ fontWeight: 700, color: color, textTransform: "uppercase", fontSize: "10px" }}>
              {severity}
            </div>
            <div>{marker.title || marker.label}</div>
          </div>
        )}
      </Html>
    </group>
  );
};
