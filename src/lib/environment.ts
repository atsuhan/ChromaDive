import { OceanType, TimeOfDay } from "@/types";
import { getPhysicalWaterColor, ScatterParams } from "./colorScience";

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
  }
}

/**
 * 光量スライダーの値から光の強さの倍率を計算
 *
 * lightIntensity: 0.0（夜）〜 1.0（夏の日中）
 * 光量0で完全な闇にはならない（月明かり等）ため最小値は0.02
 */
export function getLightMultiplier(lightIntensity: number): number {
  // 最小0.02（夜間の微光）〜 最大1.0（夏の日中）
  return 0.02 + lightIntensity * 0.98;
}

/**
 * 空の色
 * lightIntensityから時間帯相当の空色を推定する
 */
export function getSkyColors(
  lightIntensity: number
): { top: string; mid: string; bottom: string } {
  if (lightIntensity < 0.1) {
    // 夜
    return {
      top: "#0a0a1a",
      mid: "#0f1028",
      bottom: "#1a1a30",
    };
  }
  if (lightIntensity < 0.4) {
    // 夕方・薄暗い
    const t = (lightIntensity - 0.1) / 0.3;
    return {
      top: interpolateColor("#0a0a1a", "#2a1a50", t),
      mid: interpolateColor("#0f1028", "#c05030", t),
      bottom: interpolateColor("#1a1a30", "#f0a040", t),
    };
  }
  // 日中
  return {
    top: "#4a90d9",
    mid: "#87CEEB",
    bottom: "#b0e0f0",
  };
}

/**
 * 2つの16進カラー間を線形補間する
 */
function interpolateColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
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
  lightIntensity: number
): [number, number, number] {
  const absorptionMul = getOceanAbsorptionMultiplier(ocean);
  const lightMul = getLightMultiplier(lightIntensity);
  const scatter = getOceanScatterParams(ocean);

  return getPhysicalWaterColor(depthMeters, absorptionMul, lightMul, scatter);
}

export const OCEAN_LABELS: Record<OceanType, string> = {
  tropical: "熱帯",
  temperate: "温帯",
  coastal: "沿岸",
};

export const TIME_LABELS: Record<TimeOfDay, string> = {
  day: "日中",
  sunset: "夕方",
  night: "夜",
};
