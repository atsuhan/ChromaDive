export interface WavelengthInfo {
  name: string;
  nameJa: string;
  wavelength: number;
  color: [number, number, number];
  absorptionCoefficient: number;
}

export interface DepthContextType {
  currentDepth: number;
  setDepth: (depth: number) => void;
}
