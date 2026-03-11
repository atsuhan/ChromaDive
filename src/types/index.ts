export interface WavelengthInfo {
  name: string;
  nameJa: string;
  wavelength: number;
  color: [number, number, number];
  absorptionCoefficient: number;
}

export type OceanType = "tropical" | "temperate" | "coastal";
export type TimeOfDay = "day" | "sunset" | "night";

export interface EnvironmentSettings {
  ocean: OceanType;
  timeOfDay: TimeOfDay;
  /**
   * 光量（0.0〜1.0）
   * 1.0 = 夏の日中（最大光量）
   * 0.0 = 夜間（最小光量）
   * 天気や時間帯の代わりに、光の強さを直接制御する
   */
  lightIntensity: number;
}

export interface DepthContextType {
  currentDepth: number;
  setDepth: (depth: number) => void;
  environment: EnvironmentSettings;
  setEnvironment: (env: EnvironmentSettings) => void;
}

