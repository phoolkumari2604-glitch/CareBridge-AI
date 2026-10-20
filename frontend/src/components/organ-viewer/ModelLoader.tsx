import React from "react";
import { ProceduralLungs } from "./ProceduralLungs";

interface ModelLoaderProps {
  organ?: "lungs" | "heart";
  respRate?: number;
  reducedMotion?: boolean;
}

/**
 * Robust loader that displays the anatomical procedural 3D organ model.
 */
export const ModelLoader: React.FC<ModelLoaderProps> = ({
  organ = "lungs",
  respRate = 16,
  reducedMotion = false,
}) => {
  return <ProceduralLungs respRate={respRate} reducedMotion={reducedMotion} />;
};

export default ModelLoader;
