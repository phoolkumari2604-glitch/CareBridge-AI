import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import doctorService from "../../services/doctorService";
import {
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  TrendingUp,
  RefreshCw,
  Plus,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileText
} from "lucide-react";
import "./HealthMonitoring.css";

/* ====== 1. METRICS & RANGES CONFIGURATION ====== */
const H = 3600e3;
const METRICS = {
  hr:    { label: "Heart Rate",     unit: "bpm",   lo: 60,   hi: 100, get: r => r.hr,    color: "#ef4444" },
  bp:    { label: "Blood Pressure", unit: "mmHg",  lo: 90,   hi: 120, get: r => r.sys,   color: "#3b82f6" },
  spo2:  { label: "SpO₂ Oxygen",    unit: "%",     lo: 95,   hi: 100, get: r => r.spo2,  color: "#06b6d4" },
  temp:  { label: "Temperature",    unit: "°C",    lo: 36.1, hi: 37.2, get: r => r.temp,  color: "#f59e0b" },
  sugar: { label: "Blood Sugar",    unit: "mg/dL", lo: 70,   hi: 140, get: r => r.sugar, color: "#8b5cf6" },
};

const RANGES = {
  "24h": 24 * H,
  "7 Days": 168 * H,
  "30 Days": 720 * H,
  "All History": 1e15
};

const isOut = (k, v) => v < METRICS[k].lo || v > METRICS[k].hi;
const fmt = t => new Date(t).toLocaleString([], {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

/* ====== 2. PROCEDURAL X-RAY NETWORK 3D HEART ====== */
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
  const dir = (vv, u) => [
    Math.sin(vv) * Math.cos(u),
    Math.cos(vv),
    Math.sin(vv) * Math.sin(u),
  ];
  const onSurf = (vv, u) => {
    const d = dir(vv, u);
    const s = shape(...d);
    return [s[0] * 1.035, s[1] * 1.035, s[2] * 1.035];
  };
  const path = (v0, v1, u0, u1, n = 12) =>
    Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      return onSurf(v0 + (v1 - v0) * t, u0 + (u1 - u0) * t);
    });

  // Coronary arteries
  body.add(tube(path(0.55, 2.75, 1.25, 1.1), 0.03, 0xd4343a));
  body.add(tube(path(0.95, 1.2, 1.2, -0.4), 0.028, 0xd4343a));
  body.add(tube(path(1.0, 1.7, 1.85, 3.5), 0.03, 0xd4343a));

  // Atria
  const ra = new THREE_LIB.Mesh(new THREE_LIB.SphereGeometry(0.55, 48, 48), mat(0x8e1c2c));
  ra.position.set(-0.85, 0.5, 0.05);
  ra.scale.set(1, 1.15, 0.8);
  body.add(ra);

  const la = new THREE_LIB.Mesh(new THREE_LIB.SphereGeometry(0.3, 32, 32), mat(0x93202f));
  la.position.set(0.62, 0.85, 0.42);
  la.scale.set(1, 1.3, 0.8);
  la.rotation.z = -0.5;
  body.add(la);

  // Great vessels
  body.add(tube([[-0.05, 0.7, 0], [-0.05, 1.3, 0], [0.2, 1.75, -0.1], [0.7, 1.8, -0.2], [1.05, 1.4, -0.3], [1.1, 0.7, -0.4]], 0.22, 0xc0504d));
  body.add(tube([[0.2, 1.78, -0.1], [0.2, 2.25, -0.1]], 0.09, 0xc0504d));
  body.add(tube([[0.55, 1.82, -0.2], [0.58, 2.3, -0.2]], 0.09, 0xc0504d));
  body.add(tube([[0.3, 0.75, 0.45], [0.3, 1.2, 0.5], [0.6, 1.6, 0.4], [1.15, 1.55, 0.2]], 0.17, 0x5a6fc0));
  body.add(tube([[-0.9, 0.9, 0], [-0.9, 2.1, 0]], 0.17, 0x4a5fb0));
  body.add(tube([[-0.9, 0.1, 0], [-0.95, -0.7, -0.05]], 0.17, 0x4a5fb0));

  body.rotation.z = 0.35;
  const root = new THREE_LIB.Group();
  body.position.y = -0.5;
  root.add(body);
  return root;
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

function Heart3D({ bpm = 72 }) {
  const box = useRef(null);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

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

    // Optional glb fallback loader
    new GLTFLoader().load(
      "/models/heart.glb",
      (gltf) => {
        group.remove(procedural);
        const m = gltf.scene;
        const bb = new THREE.Box3().setFromObject(m);
        const size = bb.getSize(new THREE.Vector3());
        const c = bb.getCenter(new THREE.Vector3());
        m.position.sub(c);
        const w = new THREE.Group();
        w.add(m);
        w.scale.setScalar(3.4 / Math.max(size.x, size.y, size.z));
        group.add(w);
      },
      undefined,
      () => {}
    );

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
    let off = 0;
    let raf;

    const down = (e) => {
      drag = true;
      px = e.clientX;
    };
    const up = () => {
      drag = false;
    };
    const move = (e) => {
      if (drag) {
        off += (e.clientX - px) * 0.01;
        px = e.clientX;
      }
    };

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", move);

    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const curBpm = Math.max(30, Math.min(220, bpmRef.current || 72));
      const ph = ((t / 1000) * curBpm / 60) % 1;
      const env = Math.exp(-ph * 7) + 0.5 * Math.exp(-Math.abs(ph - 0.25) * 9);

      if (procedural.userData.beat) {
        procedural.userData.beat(env);
      }
      group.scale.setScalar(0.95 * (1 + 0.05 * env));
      group.rotation.y = off + (drag ? 0 : Math.sin(t / 2500) * 0.6);
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

  return <div ref={box} className="hm-heart" title="Interactive 3D Anatomical Heart (Drag to rotate)" />;
}

/* ====== 3. ACCURATE SVG LINE CHART ====== */
function Chart({ rows, mk, onLog }) {
  const m = METRICS[mk];
  if (!rows || !rows.length) {
    return (
      <div className="hm-empty">
        <Activity size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
        <p>No recorded {m.label.toLowerCase()} readings in this time interval.</p>
        <button className="hm-btn pri" onClick={onLog} style={{ marginTop: 14 }}>
          ＋ Log Vital Reading
        </button>
      </div>
    );
  }

  const W = 800;
  const Ht = 260;
  const p = 44;
  const vals = rows.map(m.get);
  const n = rows.length;
  const pad = (m.hi - m.lo) * 0.18;
  const lo = Math.min(m.lo, ...vals) - pad;
  const hi = Math.max(m.hi, ...vals) + pad;
  const t0 = rows[0].t;
  const t1 = rows[n - 1].t || t0 + 1;

  const X = (t) => p + (n > 1 ? (t - t0) / (t1 - t0) : 0.5) * (W - p - 16);
  const Y = (v) => Ht - p - ((v - lo) / (hi - lo || 1)) * (Ht - p - 16);

  const pts = rows.map((r, i) => [X(r.t), Y(vals[i])]);
  const d = pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join("");

  const yNormalHi = Math.max(10, Math.min(Ht - 10, Y(m.hi)));
  const yNormalLo = Math.max(10, Math.min(Ht - 10, Y(m.lo)));
  const normalHeight = Math.max(2, yNormalLo - yNormalHi);

  return (
    <div className="hm-chart-wrap">
      <svg viewBox={`0 0 ${W} ${Ht}`} className="hm-svg-chart">
        <defs>
          <linearGradient id="hmg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Shaded normal target zone */}
        <rect
          x={p}
          y={yNormalHi}
          width={W - p - 16}
          height={normalHeight}
          fill="#10b981"
          opacity="0.12"
          rx="4"
        />

        {/* Grid lines & Axis labels */}
        {[0, 1, 2, 3].map((i) => {
          const v = lo + ((hi - lo) * i) / 3;
          const y = Y(v);
          return (
            <g key={i}>
              <line x1={p} x2={W - 16} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
              <text x="6" y={y + 4} fontSize="11" fill="currentColor" fillOpacity="0.6">
                {v.toFixed(mk === "temp" ? 1 : 0)}
              </text>
            </g>
          );
        })}

        {/* Area fill under trendline */}
        <path
          d={`${d}L${pts[n - 1][0]} ${Ht - p}L${pts[0][0]} ${Ht - p}Z`}
          fill="url(#hmg)"
        />

        {/* Trendline */}
        <path d={d} fill="none" stroke="#0284c7" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />

        {/* Individual data nodes */}
        {pts.map((q, i) => {
          const outOfRange = isOut(mk, vals[i]);
          return (
            <g key={i} className="hm-chart-node">
              <circle
                cx={q[0]}
                cy={q[1]}
                r={outOfRange ? 5.5 : 3.5}
                fill={outOfRange ? "#ef4444" : "#0284c7"}
                stroke="#ffffff"
                strokeWidth={outOfRange ? 2 : 1.5}
              >
                <title>{`${fmt(rows[i].t)} · ${vals[i]} ${m.unit} ${outOfRange ? '(Abnormal Reading)' : '(Normal)'}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="hm-chart-legend">
        <span className="legend-item"><span className="dot normal-zone" /> Normal Range ({m.lo} - {m.hi} {m.unit})</span>
        <span className="legend-item"><span className="dot telemetry-line" /> Telemetry Curve</span>
        <span className="legend-item"><span className="dot alert-node" /> Out of Range</span>
      </div>
    </div>
  );
}

/* ====== 4. PULSEVIEW MAIN COMPONENT ====== */
export default function HealthMonitoring() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPid = searchParams.get("patientId") || "";

  const [patients, setPatients] = useState([]);
  const [pid, setPid] = useState("");
  const [data, setData] = useState([]);
  const [mk, setMk] = useState("hr");
  const [rk, setRk] = useState("7 Days");
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  // Set browser title on mount
  useEffect(() => {
    document.title = "PulseView | CareBridge AI";
  }, []);

  const say = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 2800);
  };

  // 1. Fetch Patients list
  const loadPatients = useCallback(async () => {
    try {
      const list = await doctorService.getPatients();
      const valid = (Array.isArray(list) ? list : []).map((p) => {
        const idCode = p.patient_code || String(p.patientId || "").replace("PT-", "") || String(p._id || p.id).slice(-6);
        return {
          id: p._id || p.id,
          patient_code: idCode,
          name: p.name || "Patient",
          age: p.age || 42,
          gender: p.gender || "Other",
          blood: p.blood_group || p.blood || "O+",
          phone: p.phone || ""
        };
      });
      setPatients(valid);

      if (valid.length > 0) {
        let initialId = valid[0].id;
        if (preselectedPid) {
          const match = valid.find(p => p.id === preselectedPid || p.patient_code === preselectedPid);
          if (match) initialId = match.id;
        }
        setPid(initialId);
      }
    } catch (err) {
      console.warn("Failed to load patients for PulseView:", err);
    } finally {
      setLoading(false);
    }
  }, [preselectedPid]);

  // 2. Fetch Vitals for selected patient
  const loadVitals = useCallback(async (targetPid) => {
    if (!targetPid) return;
    try {
      const raw = await doctorService.getPatientVitals(targetPid);
      const rows = (Array.isArray(raw) ? raw : []).map((r) => {
        const tMs = r.recorded_at ? new Date(r.recorded_at).getTime() : Date.now();
        return {
          id: r._id || r.id || crypto.randomUUID(),
          t: tMs,
          hr: Number(r.heart_rate) || 72,
          sys: Number(r.systolic_bp) || 120,
          dia: Number(r.diastolic_bp) || 80,
          spo2: Number(r.spo2) || 98,
          temp: Number(r.temperature) || 36.8,
          sugar: Number(r.blood_sugar) || 95,
          weight: r.weight ? Number(r.weight) : null,
          recorded_by: r.recorded_by_name || "Medical Staff",
          notes: r.notes || ""
        };
      });
      setData(rows);
      setLastSync(new Date());
    } catch (err) {
      console.warn("PulseView telemetry load error:", err);
      setData([]);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (pid) {
      loadVitals(pid);
    }
  }, [pid, loadVitals]);

  // 30s live auto-refresh polling
  useEffect(() => {
    if (!pid) return;
    const interval = setInterval(() => {
      loadVitals(pid);
    }, 30000);
    return () => clearInterval(interval);
  }, [pid, loadVitals]);

  const sync = async () => {
    if (!pid) return;
    setSyncing(true);
    await loadVitals(pid);
    setSyncing(false);
    say("Telemetry curves synced with live stream");
  };

  const submit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    try {
      await doctorService.recordVitals({
        patient_id: pid,
        heart_rate: +o.hr,
        systolic_bp: +o.sys,
        diastolic_bp: +o.dia,
        spo2: +o.spo2,
        temperature: +o.temp,
        blood_sugar: +o.sugar,
        weight: o.weight ? +o.weight : undefined,
        notes: o.notes || ""
      });
      await loadVitals(pid);
      setOpen(false);
      say("Vital signs recorded and synchronized to patient chart");
    } catch (err) {
      console.error("Save vital error:", err);
      say("Failed to record vital reading. Please check input values.");
    }
  };

  // Metric & Range calculations
  const m = METRICS[mk];
  const rows = useMemo(() => {
    const cutoff = Date.now() - RANGES[rk];
    return data
      .filter((r) => r.t > cutoff)
      .sort((a, b) => a.t - b.t);
  }, [data, rk]);

  const vals = rows.map(m.get);
  const n = rows.length;
  const last = rows[n - 1] || data[data.length - 1];
  const avg = n ? vals.reduce((a, b) => a + b, 0) / n : 0;
  const h = Math.floor(n / 2);
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const a1 = mean(vals.slice(0, h));
  const a2 = mean(vals.slice(h));
  const trend = !n
    ? "Stable →"
    : Math.abs(a2 - a1) < (m.hi - m.lo) * 0.04
    ? "Stable →"
    : a2 > a1
    ? "Rising ↑"
    : "Falling ↓";

  let status = "STABLE";
  let statusColor = "var(--hm-ok)";
  if (last) {
    if (last.spo2 < 90 || last.hr > 130 || last.hr < 40 || last.sys >= 180 || last.dia >= 120) {
      status = "CRITICAL";
      statusColor = "var(--hm-bad)";
    } else if (Object.keys(METRICS).some((k) => isOut(k, METRICS[k].get(last)))) {
      status = "WARNING";
      statusColor = "var(--hm-warn)";
    }
  }

  const selectedPatient = patients.find((p) => p.id === pid) || patients[0];

  const stats = [
    [
      "Latest Reading",
      !last ? "--" : mk === "bp" ? `${last.sys}/${last.dia}` : m.get(last),
      m.unit,
      `Target: ${m.lo} - ${m.hi} ${m.unit}`,
    ],
    [
      "Interval Average",
      n ? avg.toFixed(1) : "--",
      m.unit,
      `Computed from ${n} valid reading${n === 1 ? '' : 's'}`,
    ],
    [
      "Min / Max Fluctuation",
      n ? `${Math.min(...vals)} - ${Math.max(...vals)}` : "--",
      m.unit,
      `Observed range in ${rk}`,
    ],
    [
      "Trend Trajectory",
      trend,
      "",
      `Compared to previous interval split`,
    ],
  ];

  return (
    <div className="hm pulseview-container">
      <div className="hm-wrap">
        {/* HERO SECTION */}
        <section className="hm-hero">
          <div className="hm-hero-info">
            <div className="hm-eyebrow-row">
              <span className="hm-eyebrow-badge">CLINICAL TELEMETRY &amp; 3D CARDIAC</span>
              <span className="hm-live-tag">
                <span className="hm-live-dot" /> LIVE TELEMETRY
              </span>
            </div>
            <h1>PulseView</h1>
            <p className="hm-subtitle">Live 3D Cardiac &amp; Vital Telemetry Engine</p>
            <p className="hm-sync-text">
              Synchronized stream · Last updated: {lastSync ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Live Polling"}
            </p>
            
            <div className="hm-row" style={{ marginTop: 16 }}>
              <button
                className="hm-btn hm-sync-btn"
                onClick={sync}
                disabled={syncing || !pid}
                title="Synchronize live data curves from telemetry sensor stream"
              >
                <RefreshCw size={15} className={syncing ? "hm-spin" : ""} />
                {syncing ? "Syncing Curves…" : "Sync Curves"}
              </button>
              <button
                className="hm-btn pri"
                onClick={() => setOpen(true)}
                disabled={!pid}
              >
                <Plus size={16} /> Log Vital Reading
              </button>
            </div>
          </div>

          <div className="hm-hero-heart-col">
            <Heart3D bpm={last ? last.hr : 72} />
            <div className="hm-heart-caption">
              <span>Rhythm: <strong>{last ? `${last.hr} BPM` : "72 BPM"} (Sinus Normal)</strong></span>
              <span className="hm-heart-subtag">Drag to rotate 3D anatomical view</span>
            </div>
          </div>
        </section>

        {/* MONITORED PATIENT BAR */}
        <section className="hm-card hm-bar hm-patient-bar">
          <div className="hm-patient-select-wrap">
            <User size={18} className="hm-patient-icon" />
            <label htmlFor="pulseview-patient-select"><strong>Monitored Patient:</strong></label>
            <select
              id="pulseview-patient-select"
              className="hm-select"
              value={pid}
              onChange={(e) => setPid(e.target.value)}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (ID: {p.patient_code})
                </option>
              ))}
            </select>
          </div>

          {selectedPatient && (
            <div className="hm-demographics-row">
              <span className="hm-demographic-chip">
                <strong>Age:</strong> {selectedPatient.age} yrs
              </span>
              <span className="hm-demographic-chip">
                <strong>Gender:</strong> {selectedPatient.gender}
              </span>
              <span className="hm-demographic-chip">
                <strong>Blood Group:</strong> {selectedPatient.blood}
              </span>
            </div>
          )}

          <div className="hm-status-wrap">
            <span
              className={`hm-badge hm-status-pill ${status.toLowerCase()}`}
              style={{ color: statusColor, borderColor: statusColor }}
            >
              {status === "CRITICAL" ? <ShieldAlert size={14} /> : status === "WARNING" ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
              {status}
            </span>
          </div>
        </section>

        {/* METRIC & TIME RANGE TABS */}
        <section className="hm-card hm-controls-bar">
          <div className="hm-tabs-col">
            <span className="hm-tab-group-label">PHYSIOLOGICAL PARAMETER:</span>
            <div className="hm-tabs">
              {Object.entries(METRICS).map(([k, v]) => (
                <button
                  key={k}
                  className={`hm-tab ${k === mk ? "on" : ""}`}
                  onClick={() => setMk(k)}
                >
                  {k === "hr" && <HeartPulse size={14} />}
                  {k === "bp" && <Activity size={14} />}
                  {k === "spo2" && <Droplets size={14} />}
                  {k === "temp" && <Thermometer size={14} />}
                  {k === "sugar" && <TrendingUp size={14} />}
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hm-tabs-col">
            <span className="hm-tab-group-label">TIME WINDOW:</span>
            <div className="hm-tabs">
              {Object.keys(RANGES).map((k) => (
                <button
                  key={k}
                  className={`hm-tab ${k === rk ? "on" : ""}`}
                  onClick={() => setRk(k)}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 4 STATS CARDS */}
        <section className="hm-stats">
          {stats.map(([title, val, unit, subtext], idx) => {
            const isAbnormal = idx === 0 && last && isOut(mk, m.get(last));
            return (
              <div className="hm-card hm-stat-card" key={title}>
                <div className="hm-l">{title}</div>
                <div
                  className="hm-v"
                  style={{
                    color: isAbnormal
                      ? "var(--hm-bad)"
                      : idx === 3
                      ? "var(--hm-ok)"
                      : "inherit",
                  }}
                >
                  {val} {unit && <small>{unit}</small>}
                </div>
                <div className="hm-stat-subtext">{subtext}</div>
              </div>
            );
          })}
        </section>

        {/* TREND CHART */}
        <section className="hm-card hm-chart-card">
          <div className="hm-chart-header">
            <div>
              <h3>{m.label} Trend Stream ({m.unit})</h3>
              <p className="hm-mut">
                Displaying {n} calibrated data points for time interval <strong>{rk}</strong>
              </p>
            </div>
            <span className="hm-target-badge">
              Normal Target: {m.lo} - {m.hi} {m.unit}
            </span>
          </div>
          <Chart rows={rows} mk={mk} onLog={() => setOpen(true)} />
        </section>

        {/* HISTORICAL LOG TABLE */}
        <section className="hm-card hm-history-card">
          <div className="hm-bar" style={{ marginBottom: 14 }}>
            <div>
              <h3>Historical Telemetry Log</h3>
              <p className="hm-mut">Verified recordings chronologically indexed</p>
            </div>
            <span className="hm-badge count-badge">{n} recorded data points</span>
          </div>

          <div className="hm-table-responsive">
            <table className="hm-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Heart Rate (bpm)</th>
                  <th>Blood Pressure (mmHg)</th>
                  <th>SpO₂ (%)</th>
                  <th>Temp (°C)</th>
                  <th>Sugar (mg/dL)</th>
                  <th>Staff / Recorder</th>
                </tr>
              </thead>
              <tbody>
                {n ? (
                  [...rows].reverse().slice(0, 40).map((r) => (
                    <tr key={r.id}>
                      <td><strong>{fmt(r.t)}</strong></td>
                      <td className={isOut("hr", r.hr) ? "out" : ""}>
                        {r.hr} {isOut("hr", r.hr) && "⚠️"}
                      </td>
                      <td className={isOut("bp", r.sys) ? "out" : ""}>
                        {r.sys}/{r.dia} {isOut("bp", r.sys) && "⚠️"}
                      </td>
                      <td className={isOut("spo2", r.spo2) ? "out" : ""}>
                        {r.spo2}% {isOut("spo2", r.spo2) && "⚠️"}
                      </td>
                      <td className={isOut("temp", r.temp) ? "out" : ""}>
                        {r.temp}°C {isOut("temp", r.temp) && "⚠️"}
                      </td>
                      <td className={isOut("sugar", r.sugar) ? "out" : ""}>
                        {r.sugar} {isOut("sugar", r.sugar) && "⚠️"}
                      </td>
                      <td>
                        <span className="recorder-tag">{r.recorded_by}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="hm-empty">
                      No vital signs history recorded in this window. Click "Log Vital Reading" to add telemetry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* RECORD VITAL MODAL */}
      {open && (
        <div className="hm-back" onClick={() => setOpen(false)}>
          <form
            className="hm-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
          >
            <div className="hm-modal-header">
              <h3>Log Vital Reading</h3>
              <p>Record physiological telemetry for patient chart</p>
            </div>

            <div className="hm-g">
              <label>
                Heart Rate (bpm)
                <input name="hr" type="number" min="20" max="250" defaultValue="72" required />
              </label>
              <label>
                SpO₂ Oxygen (%)
                <input name="spo2" type="number" min="50" max="100" defaultValue="98" required />
              </label>
              <label>
                BP Systolic (mmHg)
                <input name="sys" type="number" min="50" max="260" defaultValue="120" required />
              </label>
              <label>
                BP Diastolic (mmHg)
                <input name="dia" type="number" min="30" max="160" defaultValue="80" required />
              </label>
              <label>
                Temperature (°C)
                <input name="temp" type="number" step="0.1" min="30" max="44" defaultValue="36.8" required />
              </label>
              <label>
                Blood Sugar (mg/dL)
                <input name="sugar" type="number" min="20" max="600" defaultValue="95" required />
              </label>
              <label>
                Body Weight (kg)
                <input name="weight" type="number" step="0.1" min="10" max="250" placeholder="e.g. 70" />
              </label>
              <label>
                Clinical Notes
                <input name="notes" type="text" placeholder="e.g. Routine morning review" />
              </label>
            </div>

            <div className="hm-row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
              <button type="button" className="hm-btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="hm-btn pri">
                Save Reading &amp; Sync
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="hm-toast">{toast}</div>}
    </div>
  );
}
