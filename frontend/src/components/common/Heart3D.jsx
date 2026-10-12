import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";

/* ====== PROCEDURAL X-RAY NETWORK 3D HEART ====== */
function buildHeart(THREE_LIB, segs = 96) {
  const body = new THREE_LIB.Group();
  const sm = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const shape = (x, y, z) => {
    const t = 1 - 0.62 * sm(-0.1, -1, y);
    return [x * 0.95 * t, y * 1.25, z * 0.85 * t];
  };
  const noise = (x, y, z) =>
    0.025 * Math.sin(x * 7 + y * 5) * Math.cos(z * 6 + y * 4) +
    0.012 * Math.sin(x * 17 + z * 13 + y * 11);
  const mat = (c, r = 0.5) =>
    new THREE_LIB.MeshPhysicalMaterial({
      color: c,
      roughness: r,
      clearcoat: 0.5,
      clearcoatRoughness: 0.35,
    });

  // Ventricles
  const geo = new THREE_LIB.SphereGeometry(1, segs, segs);
  const p = geo.attributes.position;
  const v = new THREE_LIB.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + noise(v.x, v.y, v.z);
    const s = shape(v.x, v.y, v.z);
    p.setXYZ(i, s[0] * n, s[1] * n, s[2] * n);
  }
  geo.computeVertexNormals();
  body.add(new THREE_LIB.Mesh(geo, mat(0xa3202e)));

  // Tube helper
  const tube = (pts, r, c, seg = 64) =>
    new THREE_LIB.Mesh(
      new THREE_LIB.TubeGeometry(
        new THREE_LIB.CatmullRomCurve3(pts.map((q) => new THREE_LIB.Vector3(...q))),
        seg,
        r,
        12
      ),
      mat(c, 0.45)
    );

  // Aorta arch
  const aPts = [];
  for (let i = 0; i < 24; i++) {
    const u = (i / 23) * 2.5;
    aPts.push([
      0.15 + Math.sin(u) * 0.45,
      0.75 + Math.cos(u) * 0.35 + u * 0.1,
      -0.05 + u * 0.12,
    ]);
  }
  body.add(tube(aPts, 0.17, 0x9b1b28));

  // Aortic branches
  [0.35, 0.52, 0.7].forEach((f, k) => {
    const p0 = [0.15 + Math.sin(f * 2.5) * 0.45, 1.1 + k * 0.04, -0.05 + f * 0.3];
    const bPts = [p0, [p0[0] + 0.05 * (k - 1), p0[1] + 0.35, p0[2] + 0.05]];
    body.add(tube(bPts, 0.05, 0x9b1b28, 16));
  });

  // Pulmonary artery
  const paPts = [];
  for (let i = 0; i < 20; i++) {
    const u = (i / 19) * 1.8;
    paPts.push([-0.18 + Math.sin(u) * 0.4, 0.65 + u * 0.25, 0.25 - u * 0.25]);
  }
  body.add(tube(paPts, 0.15, 0x22427a));

  // Vena cava
  const vcPts = [
    [0.45, 1.25, -0.2],
    [0.42, 0.6, -0.25],
    [0.4, -0.1, -0.3],
    [0.38, -0.7, -0.32],
  ];
  body.add(tube(vcPts, 0.14, 0x203a6b));

  body.scale.set(1.4, 1.4, 1.4);
  body.position.y = -0.5;
  return body;
}

function buildXrayHeart(THREE_LIB) {
  const root = new THREE_LIB.Group();
  const mats = [];
  const wires = [];
  const ADD = THREE_LIB.AdditiveBlending;

  const mk = (c, pulse = true) => {
    const m = new THREE_LIB.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE_LIB.Color(c) },
        uPulse: { value: 1 },
      },
      vertexShader:
        "varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}",
      fragmentShader:
        "uniform vec3 uColor;uniform float uPulse;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);float a=(.10+f*.9)*uPulse;gl_FragColor=vec4(uColor*(.35+f*1.5)*uPulse,a);}",
      transparent: true,
      depthWrite: false,
      blending: ADD,
      side: THREE_LIB.DoubleSide,
    });
    if (pulse) mats.push(m);
    return m;
  };

  const heart = buildHeart(THREE_LIB, 56);
  const meshes = [];
  heart.traverse((o) => o.isMesh && meshes.push(o));
  meshes.forEach((o) => {
    const hex = o.material.color.getHex();
    const c = new THREE_LIB.Color(hex);
    const col = hex === 0xd4343a ? 0xff9aa0 : c.b > c.r ? 0xe0709a : 0xff4d5e;
    o.material.dispose();
    o.material = mk(col);
    const wm = new THREE_LIB.MeshBasicMaterial({
      color: 0xff6b7a,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
      blending: ADD,
      depthWrite: false,
    });
    wires.push(wm);
    o.add(new THREE_LIB.Mesh(o.geometry, wm));
  });
  root.add(heart);

  // Branching vessel network
  let sd = 11;
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
          new THREE_LIB.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(0.9)
        )
        .normalize();
      branch(q, nd, len * 0.72, depth - 1);
    }
  };

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + R() * 0.4;
    const d = new THREE_LIB.Vector3(
      Math.cos(a),
      (R() - 0.5) * 1.2,
      Math.sin(a) * 0.6 - 0.2
    ).normalize();
    branch(
      d.clone().multiplyScalar(1.5).add(new THREE_LIB.Vector3(0, 0.1, -0.2)),
      d,
      0.6,
      6
    );
  }

  const lg = new THREE_LIB.BufferGeometry();
  lg.setAttribute("position", new THREE_LIB.Float32BufferAttribute(seg, 3));
  const lm = new THREE_LIB.LineBasicMaterial({
    color: 0xff5a6a,
    transparent: true,
    opacity: 0.4,
    blending: ADD,
    depthWrite: false,
  });
  root.add(new THREE_LIB.LineSegments(lg, lm));

  const pg = new THREE_LIB.BufferGeometry();
  pg.setAttribute("position", new THREE_LIB.Float32BufferAttribute(nodes, 3));
  const pm = new THREE_LIB.PointsMaterial({
    color: 0xffa0aa,
    size: 0.045,
    transparent: true,
    opacity: 0.8,
    blending: ADD,
    depthWrite: false,
  });
  root.add(new THREE_LIB.Points(pg, pm));

  // Faint rib cage
  const rm = mk(0x9fb3c8, false);
  for (let i = 0; i < 5; i++) {
    for (const s of [1, -1]) {
      const rib = new THREE_LIB.Mesh(
        new THREE_LIB.TorusGeometry(2.6, 0.03, 6, 60, 0.9),
        rm
      );
      rib.position.set(-1.2 * s, -1.3 + i * 0.7, -1.4);
      rib.rotation.z = -0.45 - i * 0.04;
      rib.scale.x = s;
      root.add(rib);
    }
  }

  root.userData.beat = (env) => {
    mats.forEach((m) => (m.uniforms.uPulse.value = 1 + 1.1 * env));
    wires.forEach((w) => (w.opacity = 0.12 + 0.35 * env));
    lm.opacity = 0.3 + 0.6 * env;
    pm.size = 0.04 + 0.04 * env;
  };

  return root;
}

const Heart3D = forwardRef(function Heart3D(
  {
    bpm = 72,
    isPaused = false,
    reducedMotion = false,
    className = "hm-heart",
    style,
    title = "Interactive 3D Anatomical Heart (Drag to rotate)",
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

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    cam.position.set(0, 0, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const procedural = buildXrayHeart(THREE);
    group.add(procedural);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const l1 = new THREE.DirectionalLight(0xffffff, 1.1);
    l1.position.set(3, 4, 5);
    scene.add(l1);

    const l2 = new THREE.PointLight(0x38bdf8, 1.0);
    l2.position.set(-4, -2, 3);
    scene.add(l2);

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

    let drag = false;
    let px = 0;
    let raf;
    let lastTime = 0;
    let accumulatedBeatTime = 0;
    let accumulatedRotTime = 0;

    const down = (e) => {
      drag = true;
      px = e.clientX;
    };
    const up = () => {
      drag = false;
    };
    const move = (e) => {
      if (drag) {
        rotationOffsetRef.current += (e.clientX - px) * 0.01;
        px = e.clientX;
      }
    };

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", move);

    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      if (!lastTime) lastTime = t;
      const delta = Math.min((t - lastTime) / 1000, 0.1);
      lastTime = t;

      const paused = isPausedRef.current;
      const reduced = reducedMotionRef.current;

      if (!paused && !reduced) {
        accumulatedBeatTime += delta;
        accumulatedRotTime += delta;
      }

      const curBpm = Math.max(30, Math.min(220, bpmRef.current || 72));
      // Heart beat phase (60 / bpm seconds per beat cycle)
      const ph = ((accumulatedBeatTime * curBpm) / 60) % 1;
      const env = (reduced || paused)
        ? 0
        : Math.exp(-ph * 7) + 0.5 * Math.exp(-Math.abs(ph - 0.25) * 9);

      if (procedural.userData.beat) {
        procedural.userData.beat(env);
      }

      group.scale.setScalar(0.95 * (1 + 0.05 * env));

      const idleRot = reduced ? 0 : Math.sin(accumulatedRotTime * (1 / 2.5)) * 0.6;
      group.rotation.y = rotationOffsetRef.current + (drag ? 0 : idleRot);

      renderer.render(scene, cam);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointermove", move);
      if (el) {
        el.removeEventListener("pointerdown", down);
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
      aria-label="3D Anatomical Wireframe Heart Model"
    />
  );
});

export default Heart3D;
export { buildHeart, buildXrayHeart };
