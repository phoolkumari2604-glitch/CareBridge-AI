/**
 * Procedural 3D Pancreas Model.
 * 
 * Anatomical features:
 * - Elongated comma/tadpole morphology: bulbous head tucked into duodenal C-loop,
 *   oblique body, and narrow tapered tail.
 * - Granular, lobulated glandular surface texture.
 * - Main pancreatic duct (Duct of Wirsung): glowing central channel running length of gland.
 * - C-shaped Duodenal frame wrapping the pancreatic head with common bile duct junction.
 * - Islets of Langerhans: luminous clusters along the body and tail with pulsing metabolic glow.
 * - Soft idle animation: gentle endocrine pulse of islets.
 */

export function buildPancreasModel(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = "PancreasModel";

  const geometriesToDispose = [];
  const materialsToDispose = [];

  // 1. PANCREAS CENTERLINE SPLINE (Tadpole curve from tail at left to head at right)
  const pancreasPoints = [
    new THREE.Vector3(-1.8, 0.45, -0.2),   // Tail (narrow, superior, left)
    new THREE.Vector3(-1.2, 0.35, -0.1),   // Distal Body
    new THREE.Vector3(-0.6, 0.2, 0.0),     // Mid Body
    new THREE.Vector3(0.0, 0.05, 0.05),    // Neck
    new THREE.Vector3(0.6, -0.1, 0.0),     // Head upper
    new THREE.Vector3(0.95, -0.45, -0.05), // Head central (broad)
    new THREE.Vector3(0.85, -0.85, 0.0),   // Uncinate process (inferior hook)
  ];

  const pancreasCurve = new THREE.CatmullRomCurve3(pancreasPoints);
  pancreasCurve.curveType = "catmullrom";
  pancreasCurve.tension = 0.45;

  function getPancreasRadius(t) {
    if (t < 0.25) return 0.16 + t * 0.8;           // Tail to distal body (narrow)
    if (t < 0.6) return 0.36 + (t - 0.25) * 0.35;  // Body (medium)
    return 0.48 + Math.sin((t - 0.6) * Math.PI) * 0.22; // Bulbous Head & Uncinate
  }

  // 2. PROCEDURAL LOBULATED GLANDULAR GEOMETRY
  const tubularSegments = 48;
  const radialSegments = 24;
  const pancreasGeo = new THREE.BufferGeometry();
  const positions = [];
  const uvs = [];
  const indices = [];

  const frames = pancreasCurve.computeFrenetFrames(tubularSegments, false);

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const pt = pancreasCurve.getPointAt(t);
    const n = frames.normals[i];
    const bn = frames.binormals[i];
    const r = getPancreasRadius(t);

    for (let j = 0; j <= radialSegments; j++) {
      const v = j / radialSegments;
      const angle = v * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Lobulated glandular bumps: multi-frequency sinusoidal modulation
      const lobulation =
        Math.sin(angle * 6 + t * 24) * 0.045 +
        Math.cos(angle * 10 - t * 18) * 0.025;

      const currentR = Math.max(0.08, r + lobulation);

      const px = pt.x + (n.x * cosA + bn.x * sinA) * currentR;
      const py = pt.y + (n.y * cosA + bn.y * sinA) * currentR;
      const pz = pt.z + (n.z * cosA + bn.z * sinA) * currentR;

      positions.push(px, py, pz);
      uvs.push(t, v);
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = (i + 1) * (radialSegments + 1) + j;
      const c = (i + 1) * (radialSegments + 1) + (j + 1);
      const d = i * (radialSegments + 1) + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  pancreasGeo.setIndex(indices);
  pancreasGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  pancreasGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  pancreasGeo.computeVertexNormals();
  geometriesToDispose.push(pancreasGeo);

  // Glandular Tissue Material (Salmon/amber mucosal sheen with clearcoat)
  const pancreasMat = new THREE.MeshPhysicalMaterial({
    color: 0xdf845d,
    roughness: 0.38,
    metalness: 0.05,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    emissive: 0x542314,
    emissiveIntensity: 0.35,
  });
  materialsToDispose.push(pancreasMat);

  const pancreasMesh = new THREE.Mesh(pancreasGeo, pancreasMat);
  pancreasMesh.castShadow = true;
  pancreasMesh.receiveShadow = true;
  root.add(pancreasMesh);

  // 3. MAIN PANCREATIC DUCT (Duct of Wirsung)
  // Thin glowing channel running down the interior length
  const ductCurve = new THREE.CatmullRomCurve3(
    pancreasPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z + 0.12))
  );
  const ductGeo = new THREE.TubeGeometry(ductCurve, 36, 0.038, 8, false);
  geometriesToDispose.push(ductGeo);

  const ductMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  materialsToDispose.push(ductMat);

  const ductMesh = new THREE.Mesh(ductGeo, ductMat);
  root.add(ductMesh);

  // 4. DUODENUM C-LOOP WRAPPING THE HEAD
  const duodenumPoints = [
    new THREE.Vector3(0.55, 0.45, -0.05),  // Superior duodenal flexure (start of C-loop)
    new THREE.Vector3(1.35, 0.2, 0.0),     // Descending duodenum (wrapping right of head)
    new THREE.Vector3(1.5, -0.5, 0.0),     // Inferior duodenal flexure
    new THREE.Vector3(1.2, -1.05, 0.05),   // Horizontal duodenum (under head)
    new THREE.Vector3(0.3, -1.15, 0.05),   // Ascending duodenum
  ];
  const duodenumCurve = new THREE.CatmullRomCurve3(duodenumPoints);
  const duodenumGeo = new THREE.TubeGeometry(duodenumCurve, 40, 0.26, 16, false);
  geometriesToDispose.push(duodenumGeo);

  const duodenumMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4a373,
    roughness: 0.32,
    metalness: 0.04,
    clearcoat: 0.7,
    clearcoatRoughness: 0.2,
    emissive: 0x3b2413,
    emissiveIntensity: 0.25,
  });
  materialsToDispose.push(duodenumMat);

  const duodenumMesh = new THREE.Mesh(duodenumGeo, duodenumMat);
  root.add(duodenumMesh);

  // 5. COMMON BILE DUCT JUNCTION (Greenish/yellow duct entering at head)
  const bilePoints = [
    new THREE.Vector3(0.8, 0.75, 0.1),
    new THREE.Vector3(0.9, 0.2, 0.08),
    new THREE.Vector3(0.95, -0.2, 0.05),
  ];
  const bileCurve = new THREE.CatmullRomCurve3(bilePoints);
  const bileGeo = new THREE.TubeGeometry(bileCurve, 16, 0.042, 8, false);
  geometriesToDispose.push(bileGeo);

  const bileMat = new THREE.MeshStandardMaterial({
    color: 0x84cc16,
    roughness: 0.4,
  });
  materialsToDispose.push(bileMat);

  const bileMesh = new THREE.Mesh(bileGeo, bileMat);
  root.add(bileMesh);

  // 6. ISLETS OF LANGERHANS (Insulin-producing endocrine clusters)
  // Distributed mainly along the body and tail
  const isletGroup = new THREE.Group();
  const isletPositions = [
    new THREE.Vector3(-1.6, 0.42, 0.12),
    new THREE.Vector3(-1.45, 0.32, -0.05),
    new THREE.Vector3(-1.25, 0.38, 0.16),
    new THREE.Vector3(-1.05, 0.28, 0.08),
    new THREE.Vector3(-0.85, 0.22, 0.18),
    new THREE.Vector3(-0.65, 0.18, -0.04),
    new THREE.Vector3(-0.4, 0.12, 0.14),
    new THREE.Vector3(-0.15, 0.08, 0.16),
  ];

  const isletSphereGeo = new THREE.SphereGeometry(0.065, 12, 12);
  geometriesToDispose.push(isletSphereGeo);

  const isletMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  materialsToDispose.push(isletMat);

  isletPositions.forEach((pos) => {
    const sphere = new THREE.Mesh(isletSphereGeo, isletMat);
    sphere.position.copy(pos);
    isletGroup.add(sphere);
  });

  root.add(isletGroup);

  // 7. USER DATA & INTERACTION HOOKS
  root.userData = {
    name: "Pancreas",
    id: "pancreas",
    geometries: geometriesToDispose,
    materials: materialsToDispose,

    update(time, reducedMotion = false) {
      if (reducedMotion) return;

      // Soft endocrine pulse of Langerhans islets (glycemic breathing)
      const pulse = 0.7 + 0.3 * Math.sin(time * 2.8);
      isletMat.opacity = 0.5 + 0.45 * pulse;
      isletGroup.scale.setScalar(0.95 + 0.08 * pulse);

      // Subtle glow modulation on the pancreatic duct
      ductMat.opacity = 0.65 + 0.25 * Math.sin(time * 1.9);
    },

    setStatus(statusKey, tintHex) {
      if (statusKey === "red") {
        pancreasMat.emissive.setHex(0x991b1b);
        pancreasMat.emissiveIntensity = 0.65;
        isletMat.color.setHex(0xef4444);
      } else if (statusKey === "amber") {
        pancreasMat.emissive.setHex(0x78350f);
        pancreasMat.emissiveIntensity = 0.5;
        isletMat.color.setHex(0xf59e0b);
      } else if (statusKey === "green") {
        pancreasMat.emissive.setHex(0x064e3b);
        pancreasMat.emissiveIntensity = 0.38;
        isletMat.color.setHex(0x10b981);
      } else {
        pancreasMat.emissive.setHex(0x334155);
        pancreasMat.emissiveIntensity = 0.25;
        isletMat.color.setHex(0x94a3b8);
      }
    },

    dispose() {
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
    },
  };

  return root;
}

export default buildPancreasModel;
