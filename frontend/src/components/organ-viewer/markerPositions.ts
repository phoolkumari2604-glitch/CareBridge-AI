import { ViewerMarker } from "./types";

/**
 * 3D anatomical surface coordinates and outward-pointing normals
 * on the 3D lung model (right lung on negative X, left lung on positive X).
 */
export const LUNG_MARKER_POSITIONS: Record<
  string | number,
  { position: [number, number, number]; normal: [number, number, number] }
> = {
  // Marker 1: Right Upper Lobe (l1) - apical/superior
  l1: { position: [-0.92, 0.62, 0.76], normal: [-0.48, 0.38, 0.79] },
  1: { position: [-0.92, 0.62, 0.76], normal: [-0.48, 0.38, 0.79] },

  // Marker 2: Right Lower Lobe (l2) - basilar/inferior
  l2: { position: [-1.08, -0.58, 0.82], normal: [-0.54, -0.32, 0.78] },
  2: { position: [-1.08, -0.58, 0.82], normal: [-0.54, -0.32, 0.78] },

  // Marker 3: Left Lower Lobe (l3) - lateral/inferior
  l3: { position: [1.08, -0.58, 0.82], normal: [0.54, -0.32, 0.78] },
  3: { position: [1.08, -0.58, 0.82], normal: [0.54, -0.32, 0.78] },

  // Marker 4: Bronchial Bifurcation (l4) - carina/central
  l4: { position: [0.0, 0.18, 0.86], normal: [0.0, 0.12, 0.99] },
  4: { position: [0.0, 0.18, 0.86], normal: [0.0, 0.12, 0.99] },
};

/**
 * Adapter: converts page's existing marker data (id, label, severity, note, x, y)
 * into ViewerMarker format with 3D coordinates and normals.
 */
export function toViewerMarkers(rawMarkers: any[] = []): ViewerMarker[] {
  if (!Array.isArray(rawMarkers)) return [];

  return rawMarkers.map((m, index) => {
    const rawId = m.id !== undefined && m.id !== null ? m.id : index + 1;
    const lookupKey = String(rawId).toLowerCase();
    const lookup =
      LUNG_MARKER_POSITIONS[lookupKey] ||
      LUNG_MARKER_POSITIONS[rawId] ||
      LUNG_MARKER_POSITIONS[index + 1];

    let position: [number, number, number] = [0, 0, 1.2];
    let normal: [number, number, number] = [0, 0, 1];

    if (lookup) {
      position = [...lookup.position];
      normal = [...lookup.normal];
    } else if (typeof m.x === "number" && typeof m.y === "number") {
      // Procedurally project 2D percentage coordinates (0-100) onto the 3D lung surface
      const nx = ((m.x - 50) / 50) * 1.5;
      const ny = -((m.y - 50) / 50) * 1.5;
      const r = Math.sqrt(nx * nx + ny * ny);
      const nz = Math.max(0.4, Math.sqrt(Math.max(0.1, 2.25 - Math.min(2.0, r * r))));
      position = [nx, ny, nz * 0.75];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normal = [nx / len, ny / len, nz / len];
    }

    const rawSeverity = (m.severity || "watch").toLowerCase();
    const severity: "normal" | "watch" | "critical" =
      rawSeverity === "critical" ? "critical" : rawSeverity === "normal" ? "normal" : "watch";

    return {
      id: rawId,
      label: m.label || m.title || `Marker ${index + 1}`,
      title: m.title || m.label || `Marker ${index + 1}`,
      note: m.note || "",
      severity,
      position,
      normal,
    };
  });
}
