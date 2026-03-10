import { OceanType, Weather, TimeOfDay } from "@/types";

/**
 * 海のタイプごとの吸収係数の倍率
 * 熱帯: 透明度が高い（係数小さい）
 * 温帯: 標準
 * 沿岸: 濁りで吸収が強い（係数大きい）
 */
export function getOceanAbsorptionMultiplier(ocean: OceanType): number {
  switch (ocean) {
    case "tropical": return 0.7;
    case "temperate": return 1.0;
    case "coastal": return 1.8;
  }
}

/**
 * 海のタイプごとの散乱光の色味調整
 * 熱帯: 青が強い、沿岸: 緑がかる
 */
export function getOceanTint(ocean: OceanType): [number, number, number] {
  switch (ocean) {
    case "tropical": return [0, 5, 15];
    case "temperate": return [0, 0, 0];
    case "coastal": return [5, 10, -5];
  }
}

/**
 * 天気による光の透過率
 */
export function getWeatherLightMultiplier(weather: Weather): number {
  switch (weather) {
    case "clear": return 1.0;
    case "cloudy": return 0.5;
    case "rainy": return 0.3;
  }
}

/**
 * 時間帯による光の強さ
 */
export function getTimeOfDayLightMultiplier(timeOfDay: TimeOfDay): number {
  switch (timeOfDay) {
    case "day": return 1.0;
    case "sunset": return 0.5;
    case "night": return 0.08;
  }
}

/**
 * 空の色
 */
export function getSkyColors(
  timeOfDay: TimeOfDay,
  weather: Weather
): { top: string; mid: string; bottom: string } {
  if (timeOfDay === "night") {
    return {
      top: "#0a0a1a",
      mid: "#0f1028",
      bottom: "#1a1a30",
    };
  }
  if (timeOfDay === "sunset") {
    if (weather === "rainy") {
      return { top: "#3a2a30", mid: "#5a3a40", bottom: "#7a5a50" };
    }
    if (weather === "cloudy") {
      return { top: "#4a3a45", mid: "#8a5a50", bottom: "#c08060" };
    }
    return {
      top: "#2a1a50",
      mid: "#c05030",
      bottom: "#f0a040",
    };
  }
  // day
  if (weather === "rainy") {
    return { top: "#4a5060", mid: "#6a7080", bottom: "#8a9098" };
  }
  if (weather === "cloudy") {
    return { top: "#5a6a80", mid: "#8a9aaa", bottom: "#aab8c8" };
  }
  return {
    top: "#4a90d9",
    mid: "#87CEEB",
    bottom: "#b0e0f0",
  };
}

/**
 * 水中の背景色
 */
export function getUnderwaterColors(
  ocean: OceanType,
  timeOfDay: TimeOfDay,
  weather: Weather
): {
  shallowTop: [number, number, number];
  shallowBottom: [number, number, number];
  deepTop: [number, number, number];
  deepBottom: [number, number, number];
} {
  const lightMul = getTimeOfDayLightMultiplier(timeOfDay) * getWeatherLightMultiplier(weather);

  const bases: Record<OceanType, {
    shallowTop: [number, number, number];
    shallowBottom: [number, number, number];
  }> = {
    tropical: {
      shallowTop: [15, 160, 210],
      shallowBottom: [5, 80, 140],
    },
    temperate: {
      shallowTop: [26, 143, 196],
      shallowBottom: [10, 61, 107],
    },
    coastal: {
      shallowTop: [30, 120, 100],
      shallowBottom: [15, 55, 50],
    },
  };

  const base = bases[ocean];

  const applyLight = (c: [number, number, number]): [number, number, number] => [
    Math.round(c[0] * lightMul),
    Math.round(c[1] * lightMul),
    Math.round(c[2] * lightMul),
  ];

  return {
    shallowTop: applyLight(base.shallowTop),
    shallowBottom: applyLight(base.shallowBottom),
    deepTop: [Math.round(6 * lightMul), Math.round(20 * lightMul), Math.round(45 * lightMul)],
    deepBottom: [Math.round(2 * lightMul), Math.round(8 * lightMul), Math.round(20 * lightMul)],
  };
}

export const OCEAN_LABELS: Record<OceanType, string> = {
  tropical: "熱帯",
  temperate: "温帯",
  coastal: "沿岸",
};

export const WEATHER_LABELS: Record<Weather, string> = {
  clear: "晴れ",
  cloudy: "曇り",
  rainy: "雨",
};

export const TIME_LABELS: Record<TimeOfDay, string> = {
  day: "日中",
  sunset: "夕方",
  night: "夜",
};
