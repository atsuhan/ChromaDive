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

/**
 * UV蛍光の発光効果
 *
 * 紫外線(UV-A: 315-400nm)が水中に到達する量を計算し、
 * それに比例してルアーの蛍光塗料が可視光を発する。
 * UV蛍光塗料は吸収したUVエネルギーを長波長の可視光として再放出する。
 *
 * 水中でのUV透過: UVは可視光より吸収が強い(α≈0.04-0.10/m)
 * → 浅場(0-30m)ではUV蛍光が効果的、深場では減衰
 *
 * 蛍光色は元の色のうち明るい成分を増幅する形で表現。
 * ピンク/チャートリュースなどの蛍光色が深場でも目立つ効果。
 */
export function applyUVFluorescence(
  r: number, g: number, b: number,
  depthMeters: number,
  absorptionMultiplier: number = 1.0,
  lightMultiplier: number = 1.0
): [number, number, number] {
  // UV-A(365nm)の水中透過率 — 吸収係数はα≈0.07/m（純水より高い）
  const uvAlpha = 0.07 * absorptionMultiplier;
  const uvIntensity = Math.exp(-uvAlpha * depthMeters) * lightMultiplier;

  // 蛍光効率: UVを吸収して可視光に変換（量子収率~0.3-0.8）
  const fluorescenceYield = 0.6;
  const emission = uvIntensity * fluorescenceYield;

  // 蛍光塗料は元の色の明るい成分を増幅
  // 元の色が鮮やかなほど蛍光が強い
  const max = Math.max(r, g, b);
  if (max === 0) return [r, g, b];

  // 各チャンネルの蛍光発光量（元の色比率で再放出）
  const boost = emission * 120;
  const newR = r + (r / max) * boost;
  const newG = g + (g / max) * boost;
  const newB = b + (b / max) * boost;

  return [
    Math.max(0, Math.min(255, Math.round(newR))),
    Math.max(0, Math.min(255, Math.round(newG))),
    Math.max(0, Math.min(255, Math.round(newB))),
  ];
}

/**
 * 蓄光(グロー)の発光効果
 *
 * 蓄光塗料は光エネルギーを蓄積し、暗闘で緑〜黄緑に自発光する。
 * 主に硫化亜鉛やアルミン酸ストロンチウム系の蛍光体。
 * 発光ピーク: 520nm付近（黄緑）
 *
 * 特徴:
 * - 光を受けている間は蓄光中（発光は目立たない）
 * - 暗くなるほど（深くなるほど）相対的に発光が目立つ
 * - 自発光なので水の吸収の影響を受けない（周囲からは見える距離で吸収される）
 */
export function applyGlowEffect(
  r: number, g: number, b: number,
  depthMeters: number,
  absorptionMultiplier: number = 1.0,
  lightMultiplier: number = 1.0
): [number, number, number] {
  // 蓄光の充電量: 浅い所で光を受けてから深い所で発光する想定
  // 濁った水(absorptionMultiplier高)ほど充電が弱い
  const chargeEfficiency = 1.0 / Math.sqrt(absorptionMultiplier);
  // 光が弱い環境ほどグローが目立つ
  const ambientLight = Math.exp(-0.005 * depthMeters) * lightMultiplier;
  // 暗いほど発光が相対的に際立つ（コントラスト）
  const glowVisibility = Math.max(0.1, 1.0 - ambientLight);

  // グロー発光強度（一定の自発光 + 暗闘での視認性向上）
  const glowIntensity = (0.5 + glowVisibility * 0.5) * chargeEfficiency;

  // 発光色: 520nm (黄緑) をピークとする
  // RGB近似: (180, 255, 100) を基本グロー色として加算
  const glowR = 180 * glowIntensity * 0.3;
  const glowG = 255 * glowIntensity * 0.4;
  const glowB = 100 * glowIntensity * 0.15;

  // 元の明るいピクセルほどグロー塗料が多い想定
  const brightness = (r + g + b) / (3 * 255);
  const mix = Math.max(0.2, brightness);

  return [
    Math.max(0, Math.min(255, Math.round(r + glowR * mix))),
    Math.max(0, Math.min(255, Math.round(g + glowG * mix))),
    Math.max(0, Math.min(255, Math.round(b + glowB * mix))),
  ];
}

export function colorToCSS(color: [number, number, number]): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}
