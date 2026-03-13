export interface WavelengthInfo {
  name: string;
  nameJa: string;
  wavelength: number;
  color: [number, number, number];
  absorptionCoefficient: number;
}

export type TimeOfDay = "day" | "sunset" | "night";

export interface EnvironmentSettings {
  /**
   * Forel-Ule海色スケール（1〜21）
   * 1 = 外洋の深い藍色（最も透明）
   * 21 = 沿岸の茶緑色（最も濁った水）
   *
   * 19世紀に開発された目視海色分類で、現在もリモートセンシングの
   * 地上検証に使われる国際標準。水中の散乱・吸収特性を1つの指標で表す。
   */
  forelUleIndex: number;
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

