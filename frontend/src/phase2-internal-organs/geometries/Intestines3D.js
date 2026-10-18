/**
 * Procedural 3D Intestines Model.
 * 
 * Anatomical features:
 * - Nested central small intestine (jejunum & ileum): serpentine Catmull-Rom tube
 *   tightly coiled in abdominal core.
 * - Framing large intestine (colon): cecum + appendix vermiformis stub at lower-right,
 *   ascending colon, hepatic flexure, transverse colon, splenic flexure,
 *   descending colon, and sigmoid colon loop.
 * - Haustra coli: periodic segmental pouch contractions on the colon wall.
 * - Distinct anatomical color tokens (soft mucosal pink-tan for small intestine,
 *   rich rose-taupe for large intestine).
 * - Peristaltic traveling wave idle animation.
 * - Mobile-optimized vertex count with tubular segment caps.
 */

export function buildIntestinesModel(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = "IntestinesModel";

  const geometriesToDispose = [];
  const materialsToDispose = [];

  // 1. SMALL INTESTINE: MULTI-LOOP SERPENTINE CENTRAL CORE
  // Dense undulating Catmull-Rom spline within [-0.9, 0.9] x [-0.8, 0.6] x [-0.3, 0.35]
  const smallIntestinePoints = [
    new THREE.Vector3(-0.4, 0.6, 0.0),
    new THREE.Vector3(-0.1, 0.5, 0.18),
    new THREE.Vector3(0.35, 0.55, 0.05),
    new THREE.Vector3(0.55, 0.35, -0.1),
    new THREE.Vector3(0.2, 0.25, 0.22),
    new THREE.Vector3(-0.35, 0.3, 0.15),
    new THREE.Vector3(-0.6, 0.1, -0.05),
    new THREE.Vector3(-0.25, -0.05, 0.25),
    new THREE.Vector3(0.3, 0.0, 0.1),
    new THREE.Vector3(0.65, -0.15, -0.12),
    new THREE.Vector3(0.35, -0.35, 0.2),
    new THREE.Vector3(-0.15, -0.3, 0.15),
    new THREE.Vector3(-0.55, -0.4, -0.08),
    new THREE.Vector3(-0.25, -0.6, 0.18),
    new THREE.Vector3(0.2, -0.55, 0.22),
    new THREE.Vector3(0.5, -0.7, 0.05),
    new THREE.Vector3(0.72, -0.85, 0.0), // Enters ileocecal junction
  ];

  const smallCurve = new THREE.CatmullRomCurve3(smallIntestinePoints);
  smallCurve.curveType = "catmullrom";
  smallCurve.tension = 0.55;

  // Mobile-friendly geometry budget: 110 tubular segments, 10 radial segments
  const smallTubeGeo = new THREE.TubeGeometry(smallCurve, 110, 0.11, 10, false);
  geometriesToDispose.push(smallTubeGeo);

  // Store initial vertex positions for peristaltic wave pulse
  const smallInitialPositions = Float32Array.from(smallTubeGeo.attributes.position.array);

  const smallMat = new THREE.MeshPhysicalMaterial({
    color: 0xdf988d,
    roughness: 0.32,
    metalness: 0.04,
    clearcoat: 0.65,
    clearcoatRoughness: 0.2,
    emissive: 0x4a1d17,
    emissiveIntensity: 0.3,
  });
  materialsToDispose.push(smallMat);

  const smallMesh = new THREE.Mesh(smallTubeGeo, smallMat);
  smallMesh.castShadow = true;
  root.add(smallMesh);

  // 2. LARGE INTESTINE (COLON): PERIPHERAL ARCH WITH HAUSTRA POUCHES
  const colonPoints = [
    new THREE.Vector3(0.95, -1.25, -0.1),  // Cecum bottom
    new THREE.Vector3(1.0, -0.75, -0.05),  // Lower Ascending
    new THREE.Vector3(1.05, 0.1, -0.05),   // Mid Ascending
    new THREE.Vector3(0.95, 0.85, 0.0),    // Hepatic (Right) Flexure
    new THREE.Vector3(0.5, 0.95, 0.15),    // Transverse right
    new THREE.Vector3(0.0, 0.88, 0.22),    // Transverse mid (slightly sagging)
    new THREE.Vector3(-0.5, 0.95, 0.15),   // Transverse left
    new THREE.Vector3(-1.0, 0.9, 0.0),     // Splenic (Left) Flexure (higher)
    new THREE.Vector3(-1.05, 0.15, -0.05), // Descending upper
    new THREE.Vector3(-1.0, -0.65, -0.05), // Descending lower
    new THREE.Vector3(-0.8, -1.05, 0.1),   // Sigmoid colon curve
    new THREE.Vector3(-0.4, -1.2, 0.12),   // Sigmoid loop
    new THREE.Vector3(-0.05, -1.35, 0.0),  // Rectum entrance
  ];

  const colonCurve = new THREE.CatmullRomCurve3(colonPoints);
  colonCurve.curveType = "catmullrom";
  colonCurve.tension = 0.5;

  // Custom segmented colon tube with Haustra pouches
  const colonSegments = 70;
  const colonRadials = 16;
  const colonGeo = new THREE.BufferGeometry();
  const colonPositions = [];
  const colonUvs = [];
  const colonIndices = [];

  const colonFrames = colonCurve.computeFrenetFrames(colonSegments, false);

  for (let i = 0; i <= colonSegments; i++) {
    const t = i / colonSegments;
    const pt = colonCurve.getPointAt(t);
    const n = colonFrames.normals[i];
    const bn = colonFrames.binormals[i];

    // Haustra modulation: sinusoidal ribbed segmentation along the colon
    const haustraPeriod = 26; // number of pouch segments along colon length
    const haustraWave = Math.sin(t * Math.PI * haustraPeriod);
    const baseR = 0.22;
    const r = baseR + haustraWave * 0.045;

    for (let j = 0; j <= colonRadials; j++) {
      const v = j / colonRadials;
      const angle = v * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Taenia coli effect (subtle trilobed cross-section indentation)
      const taenia = 1.0 + Math.cos(angle * 3) * 0.06;
      const finalR = r * taenia;

      const px = pt.x + (n.x * cosA + bn.x * sinA) * finalR;
      const py = pt.y + (n.y * cosA + bn.y * sinA) * finalR;
      const pz = pt.z + (n.z * cosA + bn.z * sinA) * finalR;

      colonPositions.push(px, py, pz);
      colonUvs.push(t, v);
    }
  }

  for (let i = 0; i < colonSegments; i++) {
    for (let j = 0; j < colonRadials; j++) {
      const a = i * (colonRadials + 1) + j;
      const b = (i + 1) * (colonRadials + 1) + j;
      const c = (i + 1) * (colonRadials + 1) + (j + 1);
      const d = i * (colonRadials + 1) + (j + 1);

      colonIndices.push(a, b, d);
      colonIndices.push(b, c, d);
    }
  }

  colonGeo.setIndex(colonIndices);
  colonGeo.setAttribute("position", new THREE.Float32BufferAttribute(colonPositions, 3));
  colonGeo.setAttribute("uv", new THREE.Float32BufferAttribute(colonUvs, 2));
  colonGeo.computeVertexNormals();
  geometriesToDispose.push(colonGeo);

  // Large Intestine material: deeper rose-taupe mucosal tone
  const colonMat = new THREE.MeshPhysicalMaterial({
    color: 0xbe6e65,
    roughness: 0.35,
    metalness: 0.06,
    clearcoat: 0.7,
    clearcoatRoughness: 0.22,
    emissive: 0x3d1712,
    emissiveIntensity: 0.35,
  });
  materialsToDispose.push(colonMat);

  const colonMesh = new THREE.Mesh(colonGeo, colonMat);
  colonMesh.castShadow = true;
  root.add(colonMesh);

  // 3. APPENDIX VERMIFORMIS STUB (Lower cecal worm-like appendix)
  const appendixPoints = [
    new THREE.Vector3(0.95, -1.25, -0.1),
    new THREE.Vector3(1.05, -1.45, -0.05),
    new THREE.Vector3(1.2, -1.55, 0.05),
  ];
  const appendixCurve = new THREE.CatmullRomCurve3(appendixPoints);
  const appendixGeo = new THREE.TubeGeometry(appendixCurve, 12, 0.055, 8, false);
  geometriesToDispose.push(appendixGeo);

  const appendixMat = new THREE.MeshStandardMaterial({
    color: 0xaa5b53,
    roughness: 0.45,
  });
  materialsToDispose.push(appendixMat);
  const appendixMesh = new THREE.Mesh(appendixGeo, appendixMat);
  root.add(appendixMesh);

  // 4. USER DATA & INTERACTION HOOKS
  root.userData = {
    name: "Intestines",
    id: "intestines",
    geometries: geometriesToDispose,
    materials: materialsToDispose,

    update(time, reducedMotion = false) {
      if (reducedMotion) return;

      // Traveling peristaltic ripple along small intestine loops
      const posAttr = smallTubeGeo.attributes.position;
      const count = posAttr.count;
      const waveSpeed = 2.2;
      const waveFreq = 18.0;

      for (let i = 0; i < count; i++) {
        const u = i / count; // normalized index
        const pulse = Math.sin(u * waveFreq - time * waveSpeed);
        const factor = 1.0 + pulse * 0.035;

        posAttr.setXYZ(
          i,
          smallInitialPositions[i * 3] * factor,
          smallInitialPositions[i * 3 + 1] * factor,
          smallInitialPositions[i * 3 + 2] * factor
        );
      }
      posAttr.needsUpdate = true;

      // Gentle respiratory/motility breathing on colon
      const colonBreath = 1.0 + Math.sin(time * 1.5) * 0.015;
      colonMesh.scale.set(colonBreath, colonBreath, colonBreath);
    },

    setStatus(statusKey, tintHex) {
      if (statusKey === "red") {
        colonMat.emissive.setHex(0x991b1b);
        colonMat.emissiveIntensity = 0.65;
        smallMat.emissive.setHex(0x7f1d1d);
        smallMat.emissiveIntensity = 0.55;
      } else if (statusKey === "amber") {
        colonMat.emissive.setHex(0x78350f);
        colonMat.emissiveIntensity = 0.5;
        smallMat.emissive.setHex(0x78350f);
        smallMat.emissiveIntensity = 0.4;
      } else if (statusKey === "green") {
        colonMat.emissive.setHex(0x064e3b);
        colonMat.emissiveIntensity = 0.35;
        smallMat.emissive.setHex(0x064e3b);
        smallMat.emissiveIntensity = 0.3;
      } else {
        colonMat.emissive.setHex(0x334155);
        colonMat.emissiveIntensity = 0.25;
        smallMat.emissive.setHex(0x334155);
        smallMat.emissiveIntensity = 0.2;
      }
    },

    dispose() {
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
    },
  };

  return root;
}

export default buildIntestinesModel;
