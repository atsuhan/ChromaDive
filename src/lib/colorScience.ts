import { WAVELENGTH_DATA } from "./constants";

/**
 * Beer-Lambert法による光の吸収計算
 * 特定の波長が水中の深度でどれだけ残るかを返す (0-1)
 */
export function calculateAbsorption(wavelengthNm: number, depthMeters: number): number {
  const alpha = interpolateAbsorptionCoefficient(wavelengthNm);
  return Math.exp(-alpha * depthMeters);
}

/**
 * 既知のデータ点から任意の波長の吸収係数を線形補間で求める
 */
export function interpolateAbsorptionCoefficient(wavelengthNm: number): number {
  const data = WAVELENGTH_DATA;

  if (wavelengthNm <= data[0].wavelength) return data[0].absorptionCoefficient;
  if (wavelengthNm >= data[data.length - 1].wavelength) return data[data.length - 1].absorptionCoefficient;

  for (let i = 0; i < data.length - 1; i++) {
    if (wavelengthNm >= data[i].wavelength && wavelengthNm <= data[i + 1].wavelength) {
      const t = (wavelengthNm - data[i].wavelength) / (data[i + 1].wavelength - data[i].wavelength);
      return data[i].absorptionCoefficient * (1 - t) + data[i + 1].absorptionCoefficient * t;
    }
  }

  return 0.05;
}

/**
 * スペクトル上の特定波長の色が深度でどう見えるかを返す
 */
export function getSpectrumColorAtDepth(
  baseColor: [number, number, number],
  wavelengthNm: number,
  depthMeters: number
): [number, number, number] {
  const intensity = calculateAbsorption(wavelengthNm, depthMeters);

  // 深度に応じた全体的な暗さ（散乱光の減衰）
  const ambientDarkening = Math.exp(-0.005 * depthMeters);

  const r = Math.round(baseColor[0] * intensity * ambientDarkening);
  const g = Math.round(baseColor[1] * intensity * ambientDarkening);
  const b = Math.round(baseColor[2] * intensity * ambientDarkening);

  return [
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b)),
  ];
}

/**
 * 任意のRGB色を深度に応じて変換する
 * RチャンネルはR寄りの波長、Gは中間、Bは短波長に対応
 */
export function transformColorAtDepth(
  r: number,
  g: number,
  b: number,
  depthMeters: number
): [number, number, number] {
  if (depthMeters <= 0) return [r, g, b];

  // 各チャンネルに対応する波長帯の吸収を計算
  // Rチャンネル: 600-700nm帯の加重平均
  const rAbsorption = (
    calculateAbsorption(620, depthMeters) * 0.3 +
    calculateAbsorption(650, depthMeters) * 0.3 +
    calculateAbsorption(700, depthMeters) * 0.4
  );

  // Gチャンネル: 500-570nm帯の加重平均
  const gAbsorption = (
    calculateAbsorption(510, depthMeters) * 0.3 +
    calculateAbsorption(540, depthMeters) * 0.4 +
    calculateAbsorption(570, depthMeters) * 0.3
  );

  // Bチャンネル: 400-490nm帯の加重平均
  const bAbsorption = (
    calculateAbsorption(420, depthMeters) * 0.3 +
    calculateAbsorption(460, depthMeters) * 0.4 +
    calculateAbsorption(490, depthMeters) * 0.3
  );

  // 深度に応じた環境光の減衰
  const ambientDarkening = Math.exp(-0.005 * depthMeters);

  // 深海での青みがかったシフト（散乱光）
  const blueScatter = Math.min(20, depthMeters * 0.04) * ambientDarkening;

  const newR = Math.round(r * rAbsorption * ambientDarkening);
  const newG = Math.round(g * gAbsorption * ambientDarkening);
  const newB = Math.round(Math.min(255, b * bAbsorption * ambientDarkening + blueScatter));

  return [
    Math.max(0, Math.min(255, newR)),
    Math.max(0, Math.min(255, newG)),
    Math.max(0, Math.min(255, newB)),
  ];
}

export function colorToCSS(color: [number, number, number]): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}
