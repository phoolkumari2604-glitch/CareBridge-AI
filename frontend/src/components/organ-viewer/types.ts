export interface ViewerMarker {
  id: number | string;
  label: string;
  position: [number, number, number];
  normal: [number, number, number];
  severity: "normal" | "watch" | "critical";
  title?: string;
  note?: string;
}

export interface OrganViewer3DProps {
  organ?: "lungs" | "heart";
  markers: ViewerMarker[];
  selectedMarkerId?: number | string | null;
  onSelectMarker?: (id: number | string) => void;
  respRate?: number;
  heartRate?: number;
  isLive?: boolean;
  className?: string;
}
