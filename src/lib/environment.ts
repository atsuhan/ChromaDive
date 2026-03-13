import { getPhysicalWaterColor, ScatterParams } from "./colorScience";

/**
 * Forel-Uleスケールの物理パラメータ定義
 *
 * FUインデックスの代表点ごとに散乱・吸収パラメータを定義し、
 * 中間値は線形補間で算出する。
 *
 * パラメータの物理的意味:
 * - absorptionMul: Beer-Lambert法の吸収係数倍率。大きいほど光が早く減衰
 * - rayleigh: 純水のレイリー散乱。λ^-4依存で短波長(青)を強く散乱
 * - mie: 懸濁粒子によるミー散乱。波長依存性が弱く緑寄りの散乱
 * - chlorophyll: クロロフィルa濃度指標。440nm/675nmに吸収ピーク
 *
 * 参考値:
 *  FU 1-2: 外洋（Jerlov Type I相当）— 極めて透明、レイリー散乱支配
 *  FU 5-7: 外洋〜沿岸遷移域 — プランクトン増加で青緑に
 *  FU 10-14: 沿岸域 — ミー散乱増加、緑色が支配的
 *  FU 17-21: 河口・高濁度域 — 懸濁物質で黄緑〜茶色
 */
interface ForelUleParams {
  fuIndex: number;
  absorptionMul: number;
  scatter: ScatterParams;
}

const FU_KEYPOINTS: ForelUleParams[] = [
  // FU 1: 最も透明な外洋。深い藍色。Jerlov Type I相当
  { fuIndex: 1, absorptionMul: 0.6, scatter: { rayleigh: 1.3, mie: 0.02, chlorophyll: 0.03 } },
  // FU 3: 外洋。鮮やかな青
  { fuIndex: 3, absorptionMul: 0.7, scatter: { rayleigh: 1.2, mie: 0.05, chlorophyll: 0.08 } },
  // FU 5: 青〜青緑の遷移。プランクトンがやや増加
  { fuIndex: 5, absorptionMul: 0.8, scatter: { rayleigh: 1.1, mie: 0.12, chlorophyll: 0.2 } },
  // FU 7: 青緑。温帯外洋の典型
  { fuIndex: 7, absorptionMul: 0.9, scatter: { rayleigh: 1.0, mie: 0.25, chlorophyll: 0.4 } },
  // FU 9: 緑がかった青。温帯沿岸寄り
  { fuIndex: 9, absorptionMul: 1.0, scatter: { rayleigh: 0.9, mie: 0.4, chlorophyll: 0.6 } },
  // FU 11: 緑。沿岸域の典型
  { fuIndex: 11, absorptionMul: 1.2, scatter: { rayleigh: 0.8, mie: 0.6, chlorophyll: 0.9 } },
  // FU 14: 黄緑。高クロロフィル域
  { fuIndex: 14, absorptionMul: 1.5, scatter: { rayleigh: 0.65, mie: 0.9, chlorophyll: 1.3 } },
  // FU 17: 黄色みのある緑。河口域
  { fuIndex: 17, absorptionMul: 1.8, scatter: { rayleigh: 0.5, mie: 1.3, chlorophyll: 1.6 } },
  // FU 21: 最も濁った茶緑。高濁度の河口・潟湖
  { fuIndex: 21, absorptionMul: 2.2, scatter: { rayleigh: 0.35, mie: 1.8, chlorophyll: 2.0 } },
];

/**
 * FUインデックスからキーポイント間を線形補間してパラメータを取得
 */
function interpolateScalar(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateParams(fuIndex: number): { absorptionMul: number; scatter: ScatterParams } {
  // 範囲クランプ
  const clamped = Math.max(1, Math.min(21, fuIndex));

  // キーポイント間の位置を特定
  let lower = FU_KEYPOINTS[0];
  let upper = FU_KEYPOINTS[FU_KEYPOINTS.length - 1];

  for (let i = 0; i < FU_KEYPOINTS.length - 1; i++) {
    if (clamped >= FU_KEYPOINTS[i].fuIndex && clamped <= FU_KEYPOINTS[i + 1].fuIndex) {
      lower = FU_KEYPOINTS[i];
      upper = FU_KEYPOINTS[i + 1];
      break;
    }
  }

  const range = upper.fuIndex - lower.fuIndex;
  const t = range === 0 ? 0 : (clamped - lower.fuIndex) / range;

  return {
    absorptionMul: interpolateScalar(lower.absorptionMul, upper.absorptionMul, t),
    scatter: {
      rayleigh: interpolateScalar(lower.scatter.rayleigh, upper.scatter.rayleigh, t),
      mie: interpolateScalar(lower.scatter.mie, upper.scatter.mie, t),
      chlorophyll: interpolateScalar(lower.scatter.chlorophyll, upper.scatter.chlorophyll, t),
    },
  };
}

/**
 * FUインデックスから吸収係数倍率を取得
 */
export function getOceanAbsorptionMultiplier(fuIndex: number): number {
  return interpolateParams(fuIndex).absorptionMul;
}

/**
 * FUインデックスから散乱パラメータを取得
 */
export function getOceanScatterParams(fuIndex: number): ScatterParams {
  return interpolateParams(fuIndex).scatter;
}

/**
 * 光量スライダーの値から光の強さの倍率を計算
 *
 * lightIntensity: 0.0（夜）〜 1.0（夏の日中）
 * 光量0で完全な闇にはならない（月明かり等）ため最小値は0.02
 *
 * 最大値1.5: 熱帯外洋・真夏の正午など、高照度条件を再現。
 * 海面での太陽放射照度は曇天〜快晴で5倍以上変動するため、
 * 1.0を「標準的な日中」、1.5を「最大照度」として幅を持たせる。
 */
export function getLightMultiplier(lightIntensity: number): number {
  // 最小0.02（夜間の微光）〜 最大1.5（真夏の快晴正午）
  return 0.02 + lightIntensity * 1.48;
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
  fuIndex: number,
  lightIntensity: number
): [number, number, number] {
  const { absorptionMul, scatter } = interpolateParams(fuIndex);
  const lightMul = getLightMultiplier(lightIntensity);

  return getPhysicalWaterColor(depthMeters, absorptionMul, lightMul, scatter);
}

/**
 * FUインデックスの代表色（スライダー表示用）
 *
 * Wernand & van der Woerd (2010) の測定値を元にした
 * Forel-Uleスケール21色のsRGB近似値。
 * 海面で目視される水の色に対応する。
 */
export const FU_COLORS: [number, number, number][] = [
  [0, 75, 150],     // FU 1:  深い藍色
  [0, 90, 160],     // FU 2:  藍色
  [0, 110, 165],    // FU 3:  青
  [0, 130, 170],    // FU 4:  明るい青
  [0, 150, 165],    // FU 5:  青緑
  [30, 165, 155],   // FU 6:  青緑（緑寄り）
  [60, 175, 140],   // FU 7:  緑がかった青
  [85, 180, 120],   // FU 8:  青緑〜緑
  [110, 185, 100],  // FU 9:  緑
  [130, 185, 80],   // FU 10: 緑（黄寄り）
  [150, 185, 65],   // FU 11: 黄緑
  [165, 182, 52],   // FU 12: 黄緑
  [178, 178, 42],   // FU 13: 黄緑〜黄
  [188, 170, 38],   // FU 14: 緑黄
  [195, 160, 35],   // FU 15: 黄
  [200, 148, 34],   // FU 16: 黄〜橙
  [202, 135, 34],   // FU 17: 橙黄
  [200, 120, 36],   // FU 18: 橙
  [195, 105, 38],   // FU 19: 橙褐
  [186, 90, 40],    // FU 20: 褐色
  [175, 78, 42],    // FU 21: 茶褐色
];
