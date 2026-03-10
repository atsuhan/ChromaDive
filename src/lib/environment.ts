import { OceanType, Weather, TimeOfDay, ViewDirection } from "@/types";
import { getPhysicalWaterColor, getUpwardWaterColor, ScatterParams } from "./colorScience";

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
    case "redtide": return 2.5;    // 赤潮: 高濁度
    case "bluetide": return 1.3;   // 青潮: やや濁り
  }
}

/**
 * 海域ごとの散乱パラメータ
 *
 * rayleigh: 純水のレイリー散乱強度。全海域で存在するが透明度が高いほど支配的。
 * mie: ミー散乱（懸濁粒子による）。沿岸で強い。波長依存性が弱く緑寄り。
 * chlorophyll: クロロフィル濃度指標。植物プランクトンによる追加吸収(440nm,675nm)。
 *              沿岸・温帯で高い。
 */
export function getOceanScatterParams(ocean: OceanType): ScatterParams {
  switch (ocean) {
    // 熱帯外洋: 極めて透明。レイリー散乱のみ → 鮮やかな青
    case "tropical":
      return { rayleigh: 1.2, mie: 0.05, chlorophyll: 0.1 };
    // 温帯: 適度なプランクトン。青緑
    case "temperate":
      return { rayleigh: 1.0, mie: 0.3, chlorophyll: 0.5 };
    // 沿岸: 高濁度。ミー散乱が支配的 → 緑がかる
    case "coastal":
      return { rayleigh: 0.6, mie: 1.2, chlorophyll: 1.5 };
    // 赤潮: 渦鞭毛藻の大量発生。ペリジニン(カロテノイド)が青緑を吸収 → 赤褐色
    case "redtide":
      return { rayleigh: 0.4, mie: 1.8, chlorophyll: 3.0, carotenoid: 2.0 };
    // 青潮: 硫化水素由来の硫黄コロイド。微粒子散乱 → 乳白色の青緑
    case "bluetide":
      return { rayleigh: 1.0, mie: 0.8, chlorophyll: 0.2, sulfur: 3.0 };
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
 * 指定深度での水中背景色をBeer-Lambert法 + 散乱モデルで物理計算する
 *
 * 太陽光が水面から depthMeters まで到達した時点での
 * 残存スペクトルをCIE XYZ → sRGBに変換して色を返す。
 */
export function getWaterColorAtDepth(
  depthMeters: number,
  ocean: OceanType,
  timeOfDay: TimeOfDay,
  weather: Weather,
  viewDirection: ViewDirection = "horizontal"
): [number, number, number] {
  const absorptionMul = getOceanAbsorptionMultiplier(ocean);
  const lightMul = getTimeOfDayLightMultiplier(timeOfDay) * getWeatherLightMultiplier(weather);
  const scatter = getOceanScatterParams(ocean);

  if (viewDirection === "upward") {
    return getUpwardWaterColor(depthMeters, absorptionMul, lightMul, scatter);
  }
  return getPhysicalWaterColor(depthMeters, absorptionMul, lightMul, scatter);
}

export const OCEAN_LABELS: Record<OceanType, string> = {
  tropical: "熱帯",
  temperate: "温帯",
  coastal: "沿岸",
  redtide: "赤潮",
  bluetide: "青潮",
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

export const VIEW_LABELS: Record<ViewDirection, string> = {
  horizontal: "水平",
  upward: "上空",
};
