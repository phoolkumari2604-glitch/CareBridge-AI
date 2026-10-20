import React, { Component, ReactNode, Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import { ProceduralLungs } from "./ProceduralLungs";

interface ModelLoaderProps {
  organ?: "lungs" | "heart";
  respRate?: number;
  reducedMotion?: boolean;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Model fallback without noisy console error
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Inner component that attempts to load a GLTF model at `/assets/models/lungs.glb`.
 */
const GLTFLungs: React.FC<ModelLoaderProps> = ({
  respRate = 16,
  reducedMotion = false,
}) => {
  // If the GLB is placed at /assets/models/lungs.glb, useGLTF will load it
  const gltf = useGLTF("/assets/models/lungs.glb");
  if (!gltf || !gltf.scene) {
    return <ProceduralLungs respRate={respRate} reducedMotion={reducedMotion} />;
  }
  return <primitive object={gltf.scene} scale={[1.2, 1.2, 1.2]} position={[0, -0.2, 0]} />;
};

/**
 * Robust loader with fallback to anatomical procedural lungs.
 */
export const ModelLoader: React.FC<ModelLoaderProps> = ({
  organ = "lungs",
  respRate = 16,
  reducedMotion = false,
}) => {
  return (
    <ModelErrorBoundary
      fallback={<ProceduralLungs respRate={respRate} reducedMotion={reducedMotion} />}
    >
      <Suspense fallback={<ProceduralLungs respRate={respRate} reducedMotion={reducedMotion} />}>
        <GLTFLungs respRate={respRate} reducedMotion={reducedMotion} />
      </Suspense>
    </ModelErrorBoundary>
  );
};
