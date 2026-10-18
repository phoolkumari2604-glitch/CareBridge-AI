import React, { Suspense, lazy } from "react";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { registerSystemGroup, getRegisteredSystems } from "./systemRegistry.js";
import { registerOrgan, ORGANS_CONFIG } from "./organs.config.js";
import { getOrganStatus } from "./getOrganStatus.js";

// Lazy-load the main BodyExplorer chunk
const LazyBodyExplorer = lazy(() => import("./BodyExplorer.jsx"));

// Skeleton loader shown while lazy chunk loads
function BodyExplorerSkeleton() {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid rgba(148, 163, 184, 0.12)",
        borderRadius: "16px",
        padding: "24px",
        minHeight: "360px",
        marginBottom: "24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "#94a3b8",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          border: "3px solid rgba(6, 182, 212, 0.2)",
          borderTopColor: "#06b6d4",
          animation: "spin 1s linear infinite",
        }}
      />
      <span style={{ fontSize: "0.86rem", fontWeight: 600 }}>Loading 3D Body Systems Explorer...</span>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/**
 * Main Exported BodyExplorer Component.
 * Fully lazy-loaded and shielded by ErrorBoundary.
 */
export function BodyExplorerWrapper(props) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<BodyExplorerSkeleton />}>
        <LazyBodyExplorer {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Named exports for extensibility (Phase 3 integration)
export { registerSystemGroup, getRegisteredSystems, registerOrgan, ORGANS_CONFIG, getOrganStatus };

export default BodyExplorerWrapper;
