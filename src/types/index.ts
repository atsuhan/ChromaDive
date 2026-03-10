export interface WavelengthInfo {
  name: string;
  nameJa: string;
  wavelength: number;
  color: [number, number, number];
  absorptionCoefficient: number;
}

export type OceanType = "tropical" | "temperate" | "coastal";
export type Weather = "clear" | "cloudy" | "rainy";
export type TimeOfDay = "day" | "sunset" | "night";

export interface EnvironmentSettings {
  ocean: OceanType;
  weather: Weather;
  timeOfDay: TimeOfDay;
}

export interface DepthContextType {
  currentDepth: number;
  setDepth: (depth: number) => void;
  environment: EnvironmentSettings;
  setEnvironment: (env: EnvironmentSettings) => void;
}

/**
 * ルアーの特殊カラータイプ
 * none: 通常カラー
 * uv: UV蛍光（紫外線で励起、可視光を発光）
 * glow: 蓄光（暗闘で緑〜黄緑に自発光）
 */
export type LureColorType = "none" | "uv" | "glow";
