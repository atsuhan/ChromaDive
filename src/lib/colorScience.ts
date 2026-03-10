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

/**
 * 水中の環境光色を物理計算で求める
 *
 * 太陽光（白色光）が水深 d メートルを通過した後の色を
 * Beer-Lambert法で波長ごとに計算し、RGB合成する。
 *
 * 可視光域 380-720nm を 10nm 刻みでサンプリングし、
 * CIE 1931 XYZ 等色関数 → sRGB 変換で正確な色を得る。
 *
 * さらに海域固有の散乱を加算:
 * - 純水: レイリー散乱 (∝ λ^-4) → 青が支配的
 * - 沿岸: ミー散乱 (粒子・植物プランクトン) → 緑がかる
 */
export function getPhysicalWaterColor(
  depthMeters: number,
  absorptionMultiplier: number = 1.0,
  lightMultiplier: number = 1.0,
  scatterParams: { rayleigh: number; mie: number; chlorophyll: number } = {
    rayleigh: 1.0,
    mie: 0.0,
    chlorophyll: 0.0,
  }
): [number, number, number] {
  if (depthMeters <= 0) {
    // 水面: 光の色そのもの
    const v = Math.round(255 * lightMultiplier);
    return [
      Math.min(255, v),
      Math.min(255, v),
      Math.min(255, v),
    ];
  }

  // CIE XYZ 積分
  let X = 0, Y = 0, Z = 0;

  for (let nm = 380; nm <= 720; nm += 5) {
    // Beer-Lambert: 水の吸収による透過率
    const alpha = interpolateAbsorptionCoefficient(nm) * absorptionMultiplier;
    let transmittance = Math.exp(-alpha * depthMeters);

    // 植物プランクトンによる追加吸収 (ピーク 440nm, 675nm)
    if (scatterParams.chlorophyll > 0) {
      const chlAbs440 = Math.exp(-((nm - 440) ** 2) / (2 * 30 ** 2));
      const chlAbs675 = Math.exp(-((nm - 675) ** 2) / (2 * 20 ** 2));
      const chlAbsorption = scatterParams.chlorophyll * (chlAbs440 * 0.04 + chlAbs675 * 0.02);
      transmittance *= Math.exp(-chlAbsorption * depthMeters);
    }

    // 入射光スペクトル（太陽光 × 光量倍率）
    const irradiance = transmittance * lightMultiplier;

    // CIE 1931 等色関数の近似
    const [xBar, yBar, zBar] = cie1931(nm);
    X += irradiance * xBar * 5;
    Y += irradiance * yBar * 5;
    Z += irradiance * zBar * 5;
  }

  // 散乱光の寄与を加算
  // 水中を見ているとき、散乱で視線方向に入ってくる光
  const scatterDepthFade = Math.exp(-0.008 * depthMeters);

  // レイリー散乱: 短波長ほど強い (∝ λ^-4)
  if (scatterParams.rayleigh > 0) {
    const scatterStrength = scatterParams.rayleigh * scatterDepthFade * lightMultiplier;
    for (let nm = 380; nm <= 720; nm += 10) {
      const rayleighIntensity = Math.pow(470 / nm, 4); // 470nmを基準に正規化
      const [xBar, yBar, zBar] = cie1931(nm);
      const s = rayleighIntensity * scatterStrength * 0.15;
      X += s * xBar * 10;
      Y += s * yBar * 10;
      Z += s * zBar * 10;
    }
  }

  // ミー散乱: 波長依存性が弱い（大きな粒子）、やや緑寄り
  if (scatterParams.mie > 0) {
    const mieStrength = scatterParams.mie * scatterDepthFade * lightMultiplier;
    for (let nm = 380; nm <= 720; nm += 10) {
      // 緑をピークとするブロードな散乱
      const miePeak = Math.exp(-((nm - 540) ** 2) / (2 * 80 ** 2));
      const mieIntensity = 0.3 + 0.7 * miePeak;
      const [xBar, yBar, zBar] = cie1931(nm);
      const s = mieIntensity * mieStrength * 0.12;
      X += s * xBar * 10;
      Y += s * yBar * 10;
      Z += s * zBar * 10;
    }
  }

  // XYZ → linear sRGB
  const rLin =  3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  const gLin = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  const bLin =  0.0557 * X - 0.2040 * Y + 1.0570 * Z;

  // sRGBガンマ補正
  const toSRGB = (c: number) => {
    const clamped = Math.max(0, c);
    return clamped <= 0.0031308
      ? clamped * 12.92
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  // スケーリング: Y=1.0 (完全白) が 255 になるように
  const scale = 255;
  return [
    Math.max(0, Math.min(255, Math.round(toSRGB(rLin) * scale))),
    Math.max(0, Math.min(255, Math.round(toSRGB(gLin) * scale))),
    Math.max(0, Math.min(255, Math.round(toSRGB(bLin) * scale))),
  ];
}

/**
 * CIE 1931 2° 等色関数のガウス近似
 * Wyman, Sloan, Shirley (2013) の多項ガウスフィット
 */
function cie1931(nm: number): [number, number, number] {
  const t1 = (nm - 442.0) * (nm < 442.0 ? 0.0624 : 0.0374);
  const t2 = (nm - 599.8) * (nm < 599.8 ? 0.0264 : 0.0323);
  const t3 = (nm - 501.1) * (nm < 501.1 ? 0.0490 : 0.0382);

  const xBar =
    0.362 * Math.exp(-0.5 * t1 * t1) +
    1.056 * Math.exp(-0.5 * t2 * t2) -
    0.065 * Math.exp(-0.5 * t3 * t3);

  const t4 = (nm - 568.8) * (nm < 568.8 ? 0.0213 : 0.0247);
  const t5 = (nm - 530.9) * (nm < 530.9 ? 0.0613 : 0.0322);

  const yBar =
    0.821 * Math.exp(-0.5 * t4 * t4) +
    0.286 * Math.exp(-0.5 * t5 * t5);

  const t6 = (nm - 437.0) * (nm < 437.0 ? 0.0845 : 0.0278);
  const t7 = (nm - 459.0) * (nm < 459.0 ? 0.0385 : 0.0725);

  const zBar =
    1.217 * Math.exp(-0.5 * t6 * t6) +
    0.681 * Math.exp(-0.5 * t7 * t7);

  return [Math.max(0, xBar), Math.max(0, yBar), Math.max(0, zBar)];
}

export function colorToCSS(color: [number, number, number]): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}
