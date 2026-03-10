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
