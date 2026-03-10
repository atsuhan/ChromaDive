export interface WavelengthInfo {
  name: string;
  nameJa: string;
  wavelength: number;
  color: [number, number, number];
  absorptionCoefficient: number;
}

export type ViewMode = "scroll" | "camera";

export interface CameraState {
  rotateX: number; // -90 (真上=水面) ~ +30 (やや下向き)
  rotateY: number; // -45 ~ +45 (左右見回し)
}

export interface DepthContextType {
  currentDepth: number;
  setDepth: (depth: number) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  camera: CameraState;
}
