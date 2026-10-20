import React, { Suspense, lazy } from "react";
import { OrganViewer3DProps } from "./types";

export * from "./types";
export * from "./markerPositions";

// Lazy-load the heavy 3D Three.js bundle so other pages/routes are not slowed down
const LazyOrganViewer3D = lazy(() => import("./OrganViewer3D"));

/**
 * Skeleton loader with exact matching card dimensions while 3D Three.js loads.
 */
export const OrganViewerSkeleton: React.FC = () => (
  <div
    style={{
      position: "relative",
      width: "100%",
      minHeight: "480px",
      height: "520px",
      backgroundColor: "#030712",
      borderRadius: "16px",
      border: "1px solid rgba(148, 163, 184, 0.14)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "14px",
      color: "#94a3b8",
    }}
  >
    <div
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        border: "3px solid rgba(56, 189, 248, 0.2)",
        borderTopColor: "#38bdf8",
        animation: "organViewerSpin 1s linear infinite",
      }}
    />
    <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Loading 3D Respiratory Viewer...</span>
    <style>{`@keyframes organViewerSpin { 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

/**
 * Main drop-in OrganViewer3D component with Suspense and zero overhead.
 */
export const OrganViewer3D: React.FC<OrganViewer3DProps> = (props) => {
  return (
    <Suspense fallback={<OrganViewerSkeleton />}>
      <LazyOrganViewer3D {...props} />
    </Suspense>
  );
};

export default OrganViewer3D;
