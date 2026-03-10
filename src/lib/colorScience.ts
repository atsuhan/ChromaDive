import { WAVELENGTH_DATA } from "./constants";

/**
 * Beer-Lambert法による光の吸収計算
 * absorptionMultiplier: 海のタイプによる係数倍率 (default 1.0)
 * lightMultiplier: 天気・時間帯による光の強さ (default 1.0)
 */
export function calculateAbsorption(
  wavelengthNm: number,
  depthMeters: number,
  absorptionMultiplier: number = 1.0
): number {
  const alpha = interpolateAbsorptionCoefficient(wavelengthNm) * absorptionMultiplier;
  return Math.exp(-alpha * depthMeters);
}

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

export function getSpectrumColorAtDepth(
  baseColor: [number, number, number],
  wavelengthNm: number,
  depthMeters: number,
  absorptionMultiplier: number = 1.0,
  lightMultiplier: number = 1.0
): [number, number, number] {
  const intensity = calculateAbsorption(wavelengthNm, depthMeters, absorptionMultiplier);
  const ambientDarkening = Math.exp(-0.005 * depthMeters);

  const r = Math.round(baseColor[0] * intensity * ambientDarkening * lightMultiplier);
  const g = Math.round(baseColor[1] * intensity * ambientDarkening * lightMultiplier);
  const b = Math.round(baseColor[2] * intensity * ambientDarkening * lightMultiplier);

  return [
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b)),
  ];
}

export function transformColorAtDepth(
  r: number,
  g: number,
  b: number,
  depthMeters: number,
  absorptionMultiplier: number = 1.0,
  lightMultiplier: number = 1.0
): [number, number, number] {
  if (depthMeters <= 0) {
    return [
      Math.round(r * lightMultiplier),
      Math.round(g * lightMultiplier),
      Math.round(b * lightMultiplier),
    ];
  }

  const rAbsorption = (
    calculateAbsorption(620, depthMeters, absorptionMultiplier) * 0.3 +
    calculateAbsorption(650, depthMeters, absorptionMultiplier) * 0.3 +
    calculateAbsorption(700, depthMeters, absorptionMultiplier) * 0.4
  );
  const gAbsorption = (
    calculateAbsorption(510, depthMeters, absorptionMultiplier) * 0.3 +
    calculateAbsorption(540, depthMeters, absorptionMultiplier) * 0.4 +
    calculateAbsorption(570, depthMeters, absorptionMultiplier) * 0.3
  );
  const bAbsorption = (
    calculateAbsorption(420, depthMeters, absorptionMultiplier) * 0.3 +
    calculateAbsorption(460, depthMeters, absorptionMultiplier) * 0.4 +
    calculateAbsorption(490, depthMeters, absorptionMultiplier) * 0.3
  );

  const ambientDarkening = Math.exp(-0.005 * depthMeters);
  const blueScatter = Math.min(20, depthMeters * 0.04) * ambientDarkening;

  const newR = Math.round(r * rAbsorption * ambientDarkening * lightMultiplier);
  const newG = Math.round(g * gAbsorption * ambientDarkening * lightMultiplier);
  const newB = Math.round(Math.min(255, b * bAbsorption * ambientDarkening * lightMultiplier + blueScatter));

  return [
    Math.max(0, Math.min(255, newR)),
    Math.max(0, Math.min(255, newG)),
    Math.max(0, Math.min(255, newB)),
  ];
}

export function colorToCSS(color: [number, number, number]): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}
