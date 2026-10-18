/**
 * Procedural 3D Stomach Model.
 * 
 * Anatomical features:
 * - J-shaped organ with wide fundus (top-left), prominent greater curvature,
 *   subtle lesser curvature, tapering antrum, and muscular pylorus.
 * - Esophagus entrance tube at the cardiac notch; duodenum stub exit at pylorus.
 * - Procedural mucosal rugae surface displacement.
 * - Peristaltic ripple idle animation along the gastric wall.
 * - Translucent cutaway mode to reveal inner lumen/folds.
 */

export function buildStomachModel(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = "StomachModel";

  const geometriesToDispose = [];
  const materialsToDispose = [];

  // 1. PATH CURVE FOR THE J-SHAPED ORGAN
  // Curve points define the center-line of the stomach from esophagus to duodenum
  const points = [
    new THREE.Vector3(-0.35, 1.6, 0.0),    // Lower Esophagus
    new THREE.Vector3(-0.4, 1.2, 0.05),    // Cardia
    new THREE.Vector3(-1.1, 1.0, 0.15),    // Fundus (bulges up and left)
    new THREE.Vector3(-1.3, 0.3, 0.2),     // Body - upper greater curve
    new THREE.Vector3(-1.1, -0.6, 0.15),   // Body - mid
    new THREE.Vector3(-0.6, -1.2, 0.05),   // Angular incisure / lower curve
    new THREE.Vector3(0.2, -1.35, -0.05),  // Antrum
    new THREE.Vector3(0.9, -1.1, -0.1),    // Pre-pylorus
    new THREE.Vector3(1.3, -0.8, -0.12),   // Pylorus
    new THREE.Vector3(1.6, -0.4, -0.15),   // Duodenal bulb
  ];

  const curve = new THREE.CatmullRomCurve3(points);
  curve.curveType = "catmullrom";
  curve.tension = 0.5;

  // Custom radii along the spline to model fundus vs antrum vs pylorus
  // 0 to 1 parameter t
  function getRadiusAt(t) {
    if (t < 0.1) return 0.22 + t * 0.4;             // Esophagus entering
    if (t < 0.25) return 0.26 + (t - 0.1) * 3.8;    // Expanding into fundus (peaks ~0.82)
    if (t < 0.5) return 0.82 - (t - 0.25) * 0.4;    // Broad corpus/body
    if (t < 0.75) return 0.72 - (t - 0.5) * 1.2;    // Antrum narrowing
    if (t < 0.9) return 0.42 - (t - 0.75) * 1.1;   // Pyloric canal
    return 0.26 - (t - 0.9) * 0.4;                  // Duodenal exit
  }

  // 2. PROCEDURAL LATHE-LIKE RIBBED SHELL WITH RUGAE DISPLACEMENT
  const tubularSegments = 54;
  const radialSegments = 30;

  // Build custom BufferGeometry with variable radius along curve + rugae ripples
  const stomachGeo = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const frames = curve.computeFrenetFrames(tubularSegments, false);

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const center = curve.getPointAt(t);
    const normal = frames.normals[i];
    const binormal = frames.binormals[i];
    const baseRadius = getRadiusAt(t);

    for (let j = 0; j <= radialSegments; j++) {
      const v = j / radialSegments;
      const angle = v * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Procedural Rugae folds: high frequency azimuthal waviness
      const rugaeWave = Math.sin(angle * 7 + t * 12) * 0.035 * (t > 0.15 && t < 0.85 ? 1 : 0.2);
      // Asymmetric greater vs lesser curvature bulge
      const asymmetry = 1.0 + (cosA > 0 ? 0.22 * cosA : -0.15 * cosA);
      const finalR = (baseRadius * asymmetry) + rugaeWave;

      const px = center.x + (normal.x * cosA + binormal.x * sinA) * finalR;
      const py = center.y + (normal.y * cosA + binormal.y * sinA) * finalR;
      const pz = center.z + (normal.z * cosA + binormal.z * sinA) * finalR;

      positions.push(px, py, pz);
      uvs.push(t, v);
    }
  }

  // Generate faces
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

  stomachGeo.setIndex(indices);
  stomachGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  stomachGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  stomachGeo.computeVertexNormals();

  geometriesToDispose.push(stomachGeo);

  // Store initial vertex positions for peristaltic wave animation
  const initialPosArray = Float32Array.from(stomachGeo.attributes.position.array);

  // 3. PHYSICAL MUCOSAL MATERIAL (Wet, organic, clinical sheen)
  const stomachMat = new THREE.MeshPhysicalMaterial({
    color: 0xbe3a4d,
    roughness: 0.28,
    metalness: 0.08,
    clearcoat: 0.75,
    clearcoatRoughness: 0.15,
    emissive: 0x471018,
    emissiveIntensity: 0.45,
    side: THREE.DoubleSide,
  });
  materialsToDispose.push(stomachMat);

  const stomachMesh = new THREE.Mesh(stomachGeo, stomachMat);
  stomachMesh.castShadow = true;
  stomachMesh.receiveShadow = true;
  root.add(stomachMesh);

  // 4. ESOPHAGUS INFLOW SPHINCTER (Upper muscular ring)
  const esophRingGeo = new THREE.TorusGeometry(0.24, 0.05, 12, 24);
  const sphincterMat = new THREE.MeshStandardMaterial({
    color: 0xd9777f,
    roughness: 0.5,
  });
  geometriesToDispose.push(esophRingGeo);
  materialsToDispose.push(sphincterMat);

  const esophRing = new THREE.Mesh(esophRingGeo, sphincterMat);
  esophRing.position.copy(points[0]);
  esophRing.rotation.x = Math.PI * 0.4;
  root.add(esophRing);

  // 5. PYLORIC MUSCULAR SPHINCTER (Exit ring)
  const pylorusRingGeo = new THREE.TorusGeometry(0.25, 0.06, 12, 24);
  geometriesToDispose.push(pylorusRingGeo);
  const pylorusRing = new THREE.Mesh(pylorusRingGeo, sphincterMat);
  pylorusRing.position.copy(points[8]);
  pylorusRing.rotation.y = Math.PI * 0.4;
  root.add(pylorusRing);

  // 6. INTERNAL RUGAE FOLDS HIGHLIGHT LINE (Subtle interior mucosal crests)
  const rugaeLinePoints = [];
  for (let i = 2; i <= 7; i++) {
    const pt = points[i].clone();
    pt.z += 0.25; // slightly forward on the greater curve
    rugaeLinePoints.push(pt);
  }
  const rugaeCurve = new THREE.CatmullRomCurve3(rugaeLinePoints);
  const rugaeTubeGeo = new THREE.TubeGeometry(rugaeCurve, 30, 0.04, 8, false);
  const rugaeMat = new THREE.MeshBasicMaterial({
    color: 0xff6b81,
    transparent: true,
    opacity: 0.6,
  });
  geometriesToDispose.push(rugaeTubeGeo);
  materialsToDispose.push(rugaeMat);
  const rugaeMesh = new THREE.Mesh(rugaeTubeGeo, rugaeMat);
  root.add(rugaeMesh);

  // 7. USER DATA & INTERACTION HOOKS
  let isCutaway = false;

  root.userData = {
    name: "Stomach",
    id: "stomach",
    geometries: geometriesToDispose,
    materials: materialsToDispose,

    // Peristaltic ripple animation
    update(time, reducedMotion = false) {
      if (reducedMotion) return;

      const posAttr = stomachGeo.attributes.position;
      const count = posAttr.count;

      // Gentle traveling peristalsis wave from fundus (t=0.2) down to pylorus (t=0.9)
      const waveSpeed = 1.8;
      const waveFreq = 4.0;
      const wavePhase = time * waveSpeed;

      for (let i = 0; i < count; i++) {
        const u = uvs[i * 2]; // t along curve
        const basePx = initialPosArray[i * 3];
        const basePy = initialPosArray[i * 3 + 1];
        const basePz = initialPosArray[i * 3 + 2];

        // Wave is active along body and antrum
        let amplitude = 0;
        if (u > 0.15 && u < 0.9) {
          const envelope = Math.sin((u - 0.15) / 0.75 * Math.PI);
          const wave = Math.sin(u * waveFreq - wavePhase);
          amplitude = wave * 0.028 * envelope;
        }

        // Apply radial ripple
        posAttr.setXYZ(i, basePx * (1 + amplitude), basePy * (1 + amplitude), basePz * (1 + amplitude));
      }
      posAttr.needsUpdate = true;
    },

    // Toggle cutaway mode
    setCutaway(enabled) {
      isCutaway = !!enabled;
      stomachMat.transparent = isCutaway;
      stomachMat.opacity = isCutaway ? 0.55 : 1.0;
      stomachMat.roughness = isCutaway ? 0.15 : 0.28;
      rugaeMesh.visible = isCutaway;
      stomachMat.needsUpdate = true;
    },

    getCutaway() {
      return isCutaway;
    },

    // Dynamic clinical status tinting
    setStatus(statusKey, tintHex) {
      if (statusKey === "red") {
        stomachMat.emissive.setHex(0x7f1d1d);
        stomachMat.emissiveIntensity = 0.65;
      } else if (statusKey === "amber") {
        stomachMat.emissive.setHex(0x78350f);
        stomachMat.emissiveIntensity = 0.5;
      } else if (statusKey === "green") {
        stomachMat.emissive.setHex(0x064e3b);
        stomachMat.emissiveIntensity = 0.4;
      } else {
        stomachMat.emissive.setHex(0x334155);
        stomachMat.emissiveIntensity = 0.3;
      }
    },

    dispose() {
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
    },
  };

  return root;
}

export default buildStomachModel;
