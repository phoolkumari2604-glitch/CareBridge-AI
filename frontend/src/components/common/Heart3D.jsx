import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/* ====== 1. REALISTIC CORONARY VESSEL & GLOW NETWORK ====== */
function buildCoronaryVesselNetwork(THREE_LIB) {
  const root = new THREE_LIB.Group();
  let sd = 17;
  const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  const seg = [];
  const nodes = [];

  const branch = (p, d, len, depth) => {
    if (!depth) return;
    const q = p.clone().addScaledVector(d, len);
    seg.push(p.x, p.y, p.z, q.x, q.y, q.z);
    nodes.push(q.x, q.y, q.z);
    for (let i = 0; i < 2; i++) {
      const nd = d
        .clone()
        .add(
          new THREE_LIB.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(0.85)
        )
        .normalize();
      branch(q, nd, len * 0.72, depth - 1);
    }
  };

  // Branch outward from aortic root down cardiac ventricles
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + R() * 0.3;
    const d = new THREE_LIB.Vector3(
      Math.cos(a) * 0.9,
      (R() - 0.6) * 1.4,
      Math.sin(a) * 0.85 - 0.1
    ).normalize();
    branch(
      d.clone().multiplyScalar(1.2).add(new THREE_LIB.Vector3(0, 0.15, -0.1)),
      d,
      0.55,
      5
    );
  }

  const lg = new THREE_LIB.BufferGeometry();
  lg.setAttribute("position", new THREE_LIB.Float32BufferAttribute(seg, 3));
  const lm = new THREE_LIB.LineBasicMaterial({
    color: 0xff3b4e,
    transparent: true,
    opacity: 0.5,
    blending: THREE_LIB.AdditiveBlending,
    depthWrite: false,
  });
  root.add(new THREE_LIB.LineSegments(lg, lm));

  const pg = new THREE_LIB.BufferGeometry();
  pg.setAttribute("position", new THREE_LIB.Float32BufferAttribute(nodes, 3));
  const pm = new THREE_LIB.PointsMaterial({
    color: 0xff6b7a,
    size: 0.045,
    transparent: true,
    opacity: 0.85,
    blending: THREE_LIB.AdditiveBlending,
    depthWrite: false,
  });
  root.add(new THREE_LIB.Points(pg, pm));

  root.userData.beat = (env) => {
    lm.opacity = 0.35 + 0.55 * env;
    pm.size = 0.04 + 0.035 * env;
  };

  return root;
}

/* ====== 2. PROCEDURAL HIGH-ANATOMICAL FALLBACK HEART ====== */
function buildAnatomicalFallbackHeart(THREE_LIB) {
  const root = new THREE_LIB.Group();
  const matTissue = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x9b2226,
    roughness: 0.42,
    metalness: 0.08,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25,
  });
  const matAorta = new THREE_LIB.MeshPhysicalMaterial({
    color: 0xae2012,
    roughness: 0.38,
    clearcoat: 0.5,
  });
  const matVein = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x1d3557,
    roughness: 0.45,
    clearcoat: 0.35,
  });

  // Ventricles & Atria main body
  const geo = new THREE_LIB.SphereGeometry(1, 64, 64);
  const p = geo.attributes.position;
  const v = new THREE_LIB.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const t = 1 - 0.65 * Math.min(1, Math.max(0, (v.y + 0.2) / -0.9));
    const noise = 0.02 * Math.sin(v.x * 6 + v.y * 5);
    p.setXYZ(i, v.x * 0.95 * t * (1 + noise), v.y * 1.35 * (1 + noise), v.z * 0.88 * t * (1 + noise));
  }
  geo.computeVertexNormals();
  root.add(new THREE_LIB.Mesh(geo, matTissue));

  const tube = (pts, r, material) =>
    new THREE_LIB.Mesh(
      new THREE_LIB.TubeGeometry(
        new THREE_LIB.CatmullRomCurve3(pts.map((q) => new THREE_LIB.Vector3(...q))),
        48,
        r,
        14
      ),
      material
    );

  // Aorta arch
  const aPts = [];
  for (let i = 0; i < 20; i++) {
    const u = (i / 19) * 2.4;
    aPts.push([
      0.15 + Math.sin(u) * 0.48,
      0.75 + Math.cos(u) * 0.38 + u * 0.08,
      -0.05 + u * 0.12,
    ]);
  }
  root.add(tube(aPts, 0.18, matAorta));

  // Pulmonary artery
  const paPts = [];
  for (let i = 0; i < 18; i++) {
    const u = (i / 17) * 1.8;
    paPts.push([-0.18 + Math.sin(u) * 0.42, 0.68 + u * 0.25, 0.25 - u * 0.25]);
  }
  root.add(tube(paPts, 0.16, matVein));

  // Vena cava
  root.add(
    tube(
      [
        [0.45, 1.3, -0.2],
        [0.42, 0.6, -0.25],
        [0.4, -0.1, -0.3],
        [0.38, -0.7, -0.32],
      ],
      0.15,
      matVein
    )
  );

  root.scale.set(1.35, 1.35, 1.35);
  root.position.y = -0.4;
  return root;
}

/* ====== 3. SHARED INTERACTIVE 3D ANATOMICAL HEART ====== */
const Heart3D = forwardRef(function Heart3D(
  {
    bpm = 72,
    isPaused = false,
    reducedMotion = false,
    className = "hm-heart",
    style,
    title = "Interactive 3D Anatomical Human Heart (Drag to rotate)",
  },
  ref
) {
  const box = useRef(null);
  const bpmRef = useRef(bpm);
  const isPausedRef = useRef(isPaused);
  const reducedMotionRef = useRef(reducedMotion);
  const rotationOffsetRef = useRef(0);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useImperativeHandle(ref, () => ({
    resetRotation: () => {
      rotationOffsetRef.current = 0;
    },
  }));

  useEffect(() => {
    const el = box.current;
    if (!el) return;

    // Three.js Scene Setup with clean dark backdrop
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    cam.position.set(0, 0, 5.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    el.appendChild(renderer.domElement);

    const heartMasterGroup = new THREE.Group();
    scene.add(heartMasterGroup);

    // Subtle atmospheric red cardiac glow sphere in the background
    const glowGeo = new THREE.SphereGeometry(2.3, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        uPulse: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uPulse;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          gl_FragColor = vec4(0.85, 0.12, 0.18, 0.28 * intensity * uPulse);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    heartMasterGroup.add(glowMesh);

    // Coronary vessel tree & red particle cloud
    const coronaryVessels = buildCoronaryVesselNetwork(THREE);
    heartMasterGroup.add(coronaryVessels);

    // Initial anatomical fallback while GLB streams in
    const fallbackMesh = buildAnatomicalFallbackHeart(THREE);
    heartMasterGroup.add(fallbackMesh);

    // Load realistic GLTF/GLB Human Heart model
    const loader = new GLTFLoader();
    loader.load(
      "/models/heart.glb",
      (gltf) => {
        const model = gltf.scene;
        heartMasterGroup.remove(fallbackMesh);

        // Enhance realistic organ tissue with rich red/pink PBR lighting
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = Math.min(child.material.roughness || 0.4, 0.45);
              child.material.metalness = Math.min(child.material.metalness || 0.05, 0.1);
              child.material.envMapIntensity = 1.3;
            }
          }
        });

        // Center and normalize scale
        const box3 = new THREE.Box3().setFromObject(model);
        const size = box3.getSize(new THREE.Vector3());
        const center = box3.getCenter(new THREE.Vector3());
        model.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.6 / (maxDim || 1);
        model.scale.setScalar(scale);

        heartMasterGroup.add(model);
      },
      undefined,
      (err) => {
        console.warn("GLTF human heart model loading fallback active:", err);
      }
    );

    // Soft medical studio illumination for realistic tissue
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff1f2, 2.0); // warm reddish tissue highlight
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.1); // cyan telemetry rim accent
    fillLight.position.set(-3, -2, 2.5);
    scene.add(fillLight);

    const backRimLight = new THREE.PointLight(0xf43f5e, 2.8, 12); // deep crimson back-glow
    backRimLight.position.set(0, 1.5, -3);
    scene.add(backRimLight);

    const fit = () => {
      if (!el) return;
      const w = el.clientWidth || 320;
      const h = el.clientHeight || 320;
      renderer.setSize(w, h);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };

    fit();
    window.addEventListener("resize", fit);

    // Pointer events for smooth drag-to-rotate interaction
    let isDragging = false;
    let prevPointerX = 0;
    let rafId;
    let lastTimestamp = 0;
    let accumulatedBeatTime = 0;
    let accumulatedRotTime = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      prevPointerX = e.clientX;
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    const onPointerMove = (e) => {
      if (isDragging) {
        rotationOffsetRef.current += (e.clientX - prevPointerX) * 0.01;
        prevPointerX = e.clientX;
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);

    // Animation Loop: synchronized physiological lub-dub scale beat
    const loop = (timestamp) => {
      rafId = requestAnimationFrame(loop);
      if (!lastTimestamp) lastTimestamp = timestamp;
      const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = timestamp;

      const isPaused = isPausedRef.current;
      const isReduced = reducedMotionRef.current;

      if (!isPaused && !isReduced) {
        accumulatedBeatTime += delta;
        accumulatedRotTime += delta;
      }

      const activeBpm = Math.max(30, Math.min(220, bpmRef.current || 72));
      // Heart beat phase: 60 / bpm seconds per complete cardiac cycle
      const phase = ((accumulatedBeatTime * activeBpm) / 60) % 1;

      // Physiological 2-phase Lub-Dub envelope:
      // Lub (systolic ventricular contraction) at phase ~0, Dub (aortic recoil) at phase ~0.25
      const lubDub =
        isReduced || isPaused
          ? 0
          : Math.exp(-phase * 8.5) * 1.15 +
            Math.exp(-Math.abs(phase - 0.24) * 12.0) * 0.65;

      // Beat scale on master group
      heartMasterGroup.scale.setScalar(0.96 * (1 + 0.065 * lubDub));

      // Glow pulse
      if (glowMat.uniforms.uPulse) {
        glowMat.uniforms.uPulse.value = 1.0 + 1.2 * lubDub;
      }

      // Coronary particles and vessels pulsation
      if (coronaryVessels.userData.beat) {
        coronaryVessels.userData.beat(lubDub);
      }

      // Idle anatomical breathing rotation + user drag offset
      const idleRotation = isReduced ? 0 : Math.sin(accumulatedRotTime * 0.4) * 0.35;
      heartMasterGroup.rotation.y = rotationOffsetRef.current + (isDragging ? 0 : idleRotation);

      renderer.render(scene, cam);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", fit);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      if (el) {
        el.removeEventListener("pointerdown", onPointerDown);
        renderer.dispose();
        el.innerHTML = "";
      }
    };
  }, []);

  return (
    <div
      ref={box}
      className={className}
      style={style}
      title={title}
      role="img"
      aria-label="3D Anatomical Human Heart Model"
    />
  );
});

export default Heart3D;
