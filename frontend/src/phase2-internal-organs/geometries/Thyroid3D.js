/**
 * Procedural 3D Thyroid Model.
 * 
 * Anatomical features:
 * - Butterfly / shield morphology: right lobe, left lobe, and connecting central isthmus.
 * - Anterior to a ribbed tracheal column with segmented cartilaginous rings.
 * - Superior and inferior thyroid vascular poles.
 * - Posterior parathyroid gland nodules (4 small lentil-shaped glands on dorsal surface).
 * - Smooth, vascular reddish-brown glandular texture with high clearcoat sheen.
 * - Idle animation: gentle respiratory tracheal excursion and metabolic glow.
 */

export function buildThyroidModel(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = "ThyroidModel";

  const geometriesToDispose = [];
  const materialsToDispose = [];

  // 1. TRACHEA COLUMN (Anatomical backdrop with cartilage rings)
  const tracheaGroup = new THREE.Group();
  const tracheaHeight = 3.6;
  const tracheaRadius = 0.58;

  // Trachea inner mucosal tube
  const tracheaInnerGeo = new THREE.CylinderGeometry(tracheaRadius * 0.94, tracheaRadius * 0.94, tracheaHeight, 28);
  geometriesToDispose.push(tracheaInnerGeo);

  const tracheaInnerMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.6,
  });
  materialsToDispose.push(tracheaInnerMat);
  const tracheaInnerMesh = new THREE.Mesh(tracheaInnerGeo, tracheaInnerMat);
  tracheaGroup.add(tracheaInnerMesh);

  // Stacked Cartilage Rings (C-shaped horseshoe rings)
  const numRings = 9;
  const ringGeo = new THREE.TorusGeometry(tracheaRadius, 0.065, 12, 32, Math.PI * 1.6);
  geometriesToDispose.push(ringGeo);

  const ringMat = new THREE.MeshPhysicalMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.1,
    clearcoat: 0.4,
  });
  materialsToDispose.push(ringMat);

  for (let i = 0; i < numRings; i++) {
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    const y = -tracheaHeight / 2 + 0.35 + i * (tracheaHeight - 0.7) / (numRings - 1);
    ringMesh.position.set(0, y, 0);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.rotation.z = Math.PI * 0.2; // Open posterior gap
    tracheaGroup.add(ringMesh);
  }

  // Position trachea slightly posterior
  tracheaGroup.position.set(0, 0, -0.25);
  root.add(tracheaGroup);

  // 2. THYROID GLAND LOBES (Right & Left butterfly wings)
  // Each lobe is an organic conical ellipsoid wrapping anterior-lateral trachea
  function buildLobeGeometry(isRight) {
    const sign = isRight ? 1 : -1;
    const lobeGeo = new THREE.BufferGeometry();
    const widthSegments = 24;
    const heightSegments = 32;

    const positions = [];
    const uvs = [];
    const indices = [];

    for (let yIdx = 0; yIdx <= heightSegments; yIdx++) {
      const v = yIdx / heightSegments; // 0 (inferior pole) to 1 (superior pole)
      const y = (v - 0.45) * 1.85;

      // Vertical profile: wider at lower-mid third, tapering to pointed superior pole
      const profileRadius = Math.sin(v * Math.PI) * (0.42 + (1 - v) * 0.2);

      for (let xIdx = 0; xIdx <= widthSegments; xIdx++) {
        const u = xIdx / widthSegments;
        const theta = (u - 0.5) * Math.PI * 1.35; // Wrapping arc around trachea

        // Anterior curved embrace
        const rX = profileRadius * 1.15;
        const rZ = profileRadius * 0.85;

        // Base center of lobe laterally offset
        const centerX = sign * (0.62 + (1 - v) * 0.15);
        const centerZ = 0.22 - Math.abs(theta) * 0.12;

        const px = centerX + Math.sin(theta) * rX;
        const py = y;
        const pz = centerZ + Math.cos(theta) * rZ;

        positions.push(px, py, pz);
        uvs.push(u, v);
      }
    }

    for (let yIdx = 0; yIdx < heightSegments; yIdx++) {
      for (let xIdx = 0; xIdx < widthSegments; xIdx++) {
        const a = yIdx * (widthSegments + 1) + xIdx;
        const b = (yIdx + 1) * (widthSegments + 1) + xIdx;
        const c = (yIdx + 1) * (widthSegments + 1) + (xIdx + 1);
        const d = yIdx * (widthSegments + 1) + (xIdx + 1);

        if (isRight) {
          indices.push(a, b, d);
          indices.push(b, c, d);
        } else {
          indices.push(a, d, b);
          indices.push(b, d, c);
        }
      }
    }

    lobeGeo.setIndex(indices);
    lobeGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    lobeGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    lobeGeo.computeVertexNormals();

    return lobeGeo;
  }

  const rightLobeGeo = buildLobeGeometry(true);
  const leftLobeGeo = buildLobeGeometry(false);
  geometriesToDispose.push(rightLobeGeo, leftLobeGeo);

  // Rich vascular reddish-brown glandular material
  const thyroidMat = new THREE.MeshPhysicalMaterial({
    color: 0x991b1b,
    roughness: 0.26,
    metalness: 0.08,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
    emissive: 0x450a0a,
    emissiveIntensity: 0.45,
    side: THREE.DoubleSide,
  });
  materialsToDispose.push(thyroidMat);

  const rightLobeMesh = new THREE.Mesh(rightLobeGeo, thyroidMat);
  const leftLobeMesh = new THREE.Mesh(leftLobeGeo, thyroidMat);
  root.add(rightLobeMesh);
  root.add(leftLobeMesh);

  // 3. THYROID ISTHMUS (Central bridge joining the two lobes across 2nd-4th rings)
  const isthmusPoints = [
    new THREE.Vector3(-0.55, -0.15, 0.48),
    new THREE.Vector3(-0.25, -0.08, 0.62),
    new THREE.Vector3(0.0, -0.05, 0.65),
    new THREE.Vector3(0.25, -0.08, 0.62),
    new THREE.Vector3(0.55, -0.15, 0.48),
  ];
  const isthmusCurve = new THREE.CatmullRomCurve3(isthmusPoints);
  const isthmusGeo = new THREE.TubeGeometry(isthmusCurve, 24, 0.18, 14, false);
  geometriesToDispose.push(isthmusGeo);

  const isthmusMesh = new THREE.Mesh(isthmusGeo, thyroidMat);
  root.add(isthmusMesh);

  // 4. PARATHYROID NODULES (Dorsal surface of each lobe)
  const parathyroidGroup = new THREE.Group();
  const parathyroidGeo = new THREE.SphereGeometry(0.062, 10, 10);
  geometriesToDispose.push(parathyroidGeo);

  const parathyroidMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.35,
    emissive: 0x78350f,
    emissiveIntensity: 0.4,
  });
  materialsToDispose.push(parathyroidMat);

  // 4 locations: superior & inferior on both lobes (posterior side z ~ -0.1)
  const paraCoords = [
    [0.78, 0.35, -0.05],   // Right superior
    [0.82, -0.45, -0.05],  // Right inferior
    [-0.78, 0.35, -0.05],  // Left superior
    [-0.82, -0.45, -0.05], // Left inferior
  ];

  paraCoords.forEach(([x, y, z]) => {
    const mesh = new THREE.Mesh(parathyroidGeo, parathyroidMat);
    mesh.position.set(x, y, z);
    parathyroidGroup.add(mesh);
  });
  root.add(parathyroidGroup);

  // 5. USER DATA & INTERACTION HOOKS
  root.userData = {
    name: "Thyroid",
    id: "thyroid",
    geometries: geometriesToDispose,
    materials: materialsToDispose,

    update(time, reducedMotion = false) {
      if (reducedMotion) return;

      // Gentle respiratory tracheal heave
      const breathPhase = Math.sin(time * 1.7);
      tracheaGroup.position.y = breathPhase * 0.04;
      isthmusMesh.position.y = breathPhase * 0.03;
      rightLobeMesh.position.y = breathPhase * 0.03;
      leftLobeMesh.position.y = breathPhase * 0.03;

      // Subtle endocrine metabolic shimmer on the lobes
      const metabolicGlow = 0.4 + 0.18 * Math.sin(time * 2.5);
      thyroidMat.emissiveIntensity = metabolicGlow;
    },

    setStatus(statusKey, tintHex) {
      if (statusKey === "red") {
        thyroidMat.emissive.setHex(0xb91c1c);
        thyroidMat.emissiveIntensity = 0.7;
      } else if (statusKey === "amber") {
        thyroidMat.emissive.setHex(0xb45309);
        thyroidMat.emissiveIntensity = 0.55;
      } else if (statusKey === "green") {
        thyroidMat.emissive.setHex(0x064e3b);
        thyroidMat.emissiveIntensity = 0.4;
      } else {
        thyroidMat.emissive.setHex(0x334155);
        thyroidMat.emissiveIntensity = 0.3;
      }
    },

    dispose() {
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
    },
  };

  return root;
}

export default buildThyroidModel;
