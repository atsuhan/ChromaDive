export interface WavelengthInfo {
  name: string;
  nameJa: string;
  wavelength: number;
  color: [number, number, number];
  absorptionCoefficient: number;
}

export type OceanType = "tropical" | "temperate" | "coastal" | "redtide" | "bluetide";
export type Weather = "clear" | "cloudy" | "rainy";
export type TimeOfDay = "day" | "sunset" | "night";

/**
 * カメラ方向
 * horizontal: 水平方向（散乱光 = 海の色）
 * upward: 上空方向（透過光 = 水面からの光）
 */
export type ViewDirection = "horizontal" | "upward";

export interface EnvironmentSettings {
  ocean: OceanType;
  weather: Weather;
  timeOfDay: TimeOfDay;
  viewDirection: ViewDirection;
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
