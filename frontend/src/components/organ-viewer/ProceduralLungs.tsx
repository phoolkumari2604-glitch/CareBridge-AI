import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ProceduralLungsProps {
  respRate?: number;
  reducedMotion?: boolean;
}

/**
 * Procedural anatomical lungs model constructed from deformed spheres,
 * cylinders, and bronchial trees with realistic pulmonary tissue shaders.
 */
export const ProceduralLungs: React.FC<ProceduralLungsProps> = ({
  respRate = 16,
  reducedMotion = false,
}) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const rightLungRef = useRef<THREE.Group>(null);
  const leftLungRef = useRef<THREE.Group>(null);

  // Reusable geometries & materials with explicit disposal
  const {
    tracheaGeo,
    bronchusGeo,
    lobeGeo,
    tracheaMat,
    bronchusMat,
    pulmonaryTissueMat,
    pleuralVesselsMat,
  } = useMemo(() => {
    // Trachea: windpipe with rings
    const tGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.1, 32, 16);
    // Bronchi
    const bGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.6, 24);

    // Deformed sphere representing an organic pulmonary lobe
    const lGeo = new THREE.SphereGeometry(1, 48, 36);
    const pos = lGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Subtle anatomical organic tapering
      const yNorm = (v.y + 1) * 0.5; // 0 to 1
      const bulge = Math.sin(yNorm * Math.PI) * 0.12;
      const taper = 0.85 + (1 - yNorm) * 0.3;
      v.x *= taper + bulge;
      v.z *= (0.75 + bulge) * (1 - yNorm * 0.15);
      v.y *= 1.25;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    lGeo.computeVertexNormals();

    const tMat = new THREE.MeshStandardMaterial({
      color: "#94a3b8",
      roughness: 0.35,
      metalness: 0.1,
    });

    const bMat = new THREE.MeshStandardMaterial({
      color: "#64748b",
      roughness: 0.45,
    });

    const lungMat = new THREE.MeshStandardMaterial({
      color: "#fb7185",
      roughness: 0.4,
      metalness: 0.05,
      emissive: "#881337",
      emissiveIntensity: 0.12,
    });

    const vesselsMat = new THREE.MeshStandardMaterial({
      color: "#0284c7",
      roughness: 0.3,
      metalness: 0.2,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });

    return {
      tracheaGeo: tGeo,
      bronchusGeo: bGeo,
      lobeGeo: lGeo,
      tracheaMat: tMat,
      bronchusMat: bMat,
      pulmonaryTissueMat: lungMat,
      pleuralVesselsMat: vesselsMat,
    };
  }, []);

  // Cleanup on unmount to prevent WebGL memory leaks
  useEffect(() => {
    return () => {
      tracheaGeo.dispose();
      bronchusGeo.dispose();
      lobeGeo.dispose();
      tracheaMat.dispose();
      bronchusMat.dispose();
      pulmonaryTissueMat.dispose();
      pleuralVesselsMat.dispose();
    };
  }, [
    tracheaGeo,
    bronchusGeo,
    lobeGeo,
    tracheaMat,
    bronchusMat,
    pulmonaryTissueMat,
    pleuralVesselsMat,
  ]);

  // Breathing animation synchronized with respRate
  useFrame(({ clock }) => {
    if (reducedMotion || !rootGroupRef.current) return;

    const rate = Math.max(6, Math.min(45, respRate));
    const cycleDuration = 60 / rate; // seconds per breath cycle
    const t = clock.getElapsedTime();
    // Gentle non-linear expansion and relaxation
    const breathPhase = ((t % cycleDuration) / cycleDuration) * Math.PI * 2;
    const expansion = (Math.sin(breathPhase - Math.PI / 2) + 1) * 0.5; // 0 to 1

    const scaleX = 1.0 + expansion * 0.045;
    const scaleY = 1.0 + expansion * 0.035;
    const scaleZ = 1.0 + expansion * 0.04;

    rootGroupRef.current.scale.set(scaleX, scaleY, scaleZ);

    if (rightLungRef.current && leftLungRef.current) {
      // Lateral outward breathing movement
      rightLungRef.current.position.x = -0.86 - expansion * 0.035;
      leftLungRef.current.position.x = 0.86 + expansion * 0.035;
    }
  });

  return (
    <group ref={rootGroupRef} position={[0, -0.15, 0]}>
      {/* ── 1. TRACHEA (WINDPIPE) ── */}
      <group position={[0, 1.45, 0]}>
        <mesh geometry={tracheaGeo} material={tracheaMat} castShadow receiveShadow />
        {/* Cartilage rings */}
        {[-0.35, -0.15, 0.05, 0.25].map((y, idx) => (
          <mesh key={idx} position={[0, y, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.165, 0.018, 12, 32]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* ── 2. PRIMARY BRONCHI (BIFURCATION / CARINA) ── */}
      {/* Right Primary Bronchus */}
      <mesh
        geometry={bronchusGeo}
        material={bronchusMat}
        position={[-0.26, 0.74, 0]}
        rotation={[0, 0, Math.PI / 4]}
      />
      {/* Left Primary Bronchus */}
      <mesh
        geometry={bronchusGeo}
        material={bronchusMat}
        position={[0.26, 0.74, 0]}
        rotation={[0, 0, -Math.PI / 4]}
      />

      {/* ── 3. RIGHT LUNG (3 Lobes: Superior, Middle, Inferior) ── */}
      <group ref={rightLungRef} position={[-0.86, 0, 0]}>
        {/* Right Superior Lobe */}
        <mesh
          geometry={lobeGeo}
          material={pulmonaryTissueMat}
          position={[0, 0.58, 0]}
          scale={[0.76, 0.62, 0.72]}
        />
        {/* Right Middle Lobe */}
        <mesh
          geometry={lobeGeo}
          material={pulmonaryTissueMat}
          position={[-0.04, 0.04, 0.08]}
          scale={[0.78, 0.5, 0.76]}
        />
        {/* Right Inferior Lobe */}
        <mesh
          geometry={lobeGeo}
          material={pulmonaryTissueMat}
          position={[-0.02, -0.52, -0.04]}
          scale={[0.82, 0.68, 0.8]}
        />
        {/* Pleural vascular overlay hint */}
        <mesh
          geometry={lobeGeo}
          material={pleuralVesselsMat}
          position={[-0.02, 0.02, 0]}
          scale={[0.86, 1.25, 0.84]}
        />
      </group>

      {/* ── 4. LEFT LUNG (2 Lobes: Superior & Inferior with Cardiac Notch) ── */}
      <group ref={leftLungRef} position={[0.86, 0, 0]}>
        {/* Left Superior Lobe */}
        <mesh
          geometry={lobeGeo}
          material={pulmonaryTissueMat}
          position={[0, 0.52, 0]}
          scale={[0.74, 0.64, 0.72]}
        />
        {/* Left Inferior Lobe (with cardiac notch space medially) */}
        <mesh
          geometry={lobeGeo}
          material={pulmonaryTissueMat}
          position={[0.04, -0.46, -0.02]}
          scale={[0.8, 0.7, 0.78]}
        />
        {/* Pleural vascular overlay hint */}
        <mesh
          geometry={lobeGeo}
          material={pleuralVesselsMat}
          position={[0.02, 0.02, 0]}
          scale={[0.84, 1.25, 0.82]}
        />
      </group>
    </group>
  );
};
