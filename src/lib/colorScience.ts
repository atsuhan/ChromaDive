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
 * 散乱パラメータ型
 *
 * rayleigh: 純水のレイリー散乱強度
 * mie: ミー散乱（懸濁粒子）
 * chlorophyll: クロロフィル濃度（440nm,675nm吸収）
 * carotenoid: カロテノイド色素（赤潮: 450-550nm吸収）
 * sulfur: 硫黄コロイド粒子散乱（青潮: λ^-2散乱）
 */
export interface ScatterParams {
  rayleigh: number;
  mie: number;
  chlorophyll: number;
  carotenoid?: number;
  sulfur?: number;
}

/**
 * 水中の環境光色を物理計算で求める
 *
 * 太陽光（白色光）が水深 d メートルを通過した後の
 * 散乱光スペクトルを CIE XYZ → sRGB 変換で色に変換。
 *
 * 散乱モデル:
 * - レイリー散乱 (∝ λ^-4): 水分子 → 青が支配的
 * - ミー散乱: 懸濁粒子 → 緑寄り
 * - 硫黄コロイド散乱 (∝ λ^-2): 青潮 → 乳白青緑
 *
 * 追加吸収:
 * - クロロフィル: 440nm + 675nm
 * - カロテノイド(ペリジニン): 450-550nm (赤潮)
 *
 * 明度制御: スペクトル積分で色相を決定し、
 * 深度に応じた目標輝度に正規化して現実的な明るさにする。
 */
export function getPhysicalWaterColor(
  depthMeters: number,
  absorptionMultiplier: number = 1.0,
  lightMultiplier: number = 1.0,
  scatterParams: ScatterParams = {
    rayleigh: 1.0,
    mie: 0.0,
    chlorophyll: 0.0,
  }
): [number, number, number] {
  if (depthMeters <= 0) {
    return getPhysicalWaterColor(0.5, absorptionMultiplier, lightMultiplier, scatterParams);
  }

  const carotenoid = scatterParams.carotenoid ?? 0;
  const sulfur = scatterParams.sulfur ?? 0;

  let X = 0, Y = 0, Z = 0;

  // この深度で利用可能な光量（太陽光が水面からここまで到達する分）
  const availableLightFade = Math.exp(-0.008 * depthMeters);
  const energyBudget = availableLightFade * lightMultiplier;

  // 色素による追加吸収を計算するヘルパー
  const pigmentAbsorption = (nm: number): number => {
    let extra = 0;
    // クロロフィル-a: 440nm (ソーレー帯) と 675nm (Q帯) に吸収ピーク
    if (scatterParams.chlorophyll > 0) {
      const chlAbs440 = Math.exp(-((nm - 440) ** 2) / (2 * 30 ** 2));
      const chlAbs675 = Math.exp(-((nm - 675) ** 2) / (2 * 20 ** 2));
      extra += scatterParams.chlorophyll * (chlAbs440 * 0.04 + chlAbs675 * 0.02);
    }
    // カロテノイド(ペリジニン): 450-550nm を強く吸収 → 赤潮の赤褐色の原因
    if (carotenoid > 0) {
      const caroAbs = Math.exp(-((nm - 490) ** 2) / (2 * 50 ** 2));
      extra += carotenoid * caroAbs * 0.06;
    }
    return extra;
  };

  // レイリー散乱: 水分子による散乱 (∝ λ^-4)
  // 短波長（青/紫）が強く散乱される → 海が青く見える主因
  {
    const strength = scatterParams.rayleigh * energyBudget;
    for (let nm = 380; nm <= 720; nm += 5) {
      const alpha = interpolateAbsorptionCoefficient(nm) * absorptionMultiplier;
      const extraAbs = pigmentAbsorption(nm);
      const transmittance = Math.exp(-(alpha + extraAbs) * depthMeters);
      const rayleighProb = Math.pow(470 / nm, 4);
      const scattered = transmittance * rayleighProb * strength;

      const [xBar, yBar, zBar] = cie1931(nm);
      X += scattered * xBar * 5;
      Y += scattered * yBar * 5;
      Z += scattered * zBar * 5;
    }
  }

  // ミー散乱: 懸濁粒子（プランクトン・泥など）による散乱
  // 波長依存性が弱い（大粒子）が、色素吸収で赤/青が消え緑が残る
  if (scatterParams.mie > 0) {
    const strength = scatterParams.mie * energyBudget;
    for (let nm = 380; nm <= 720; nm += 5) {
      const alpha = interpolateAbsorptionCoefficient(nm) * absorptionMultiplier;
      const extraAbs = pigmentAbsorption(nm);
      const transmittance = Math.exp(-(alpha + extraAbs) * depthMeters);
      const miePeak = Math.exp(-((nm - 540) ** 2) / (2 * 80 ** 2));
      const mieProb = 0.4 + 0.6 * miePeak;
      const scattered = transmittance * mieProb * strength;

      const [xBar, yBar, zBar] = cie1931(nm);
      X += scattered * xBar * 5;
      Y += scattered * yBar * 5;
      Z += scattered * zBar * 5;
    }
  }

  // 硫黄コロイド散乱（青潮）: 微細硫黄粒子による散乱
  // レイリーとミーの中間的な波長依存性 (∝ λ^-2)
  // 乳白色の青緑に見える
  if (sulfur > 0) {
    const strength = sulfur * energyBudget;
    for (let nm = 380; nm <= 720; nm += 5) {
      const alpha = interpolateAbsorptionCoefficient(nm) * absorptionMultiplier;
      const extraAbs = pigmentAbsorption(nm);
      const transmittance = Math.exp(-(alpha + extraAbs) * depthMeters);
      const sulfurProb = Math.pow(500 / nm, 2);
      const scattered = transmittance * sulfurProb * strength;

      const [xBar, yBar, zBar] = cie1931(nm);
      X += scattered * xBar * 5;
      Y += scattered * yBar * 5;
      Z += scattered * zBar * 5;
    }
  }

  // 明度の正規化: スペクトル積分は正確な色相を与えるが
  // 絶対的な明るさは物理単位と画面表示の間に任意性がある。
  // 深度に応じた目標輝度に合わせることで
  // 浅場=豊かで飽和した色、深場=暗い色を実現する。
  const baseBrightness = 0.18;
  const depthDarkening = Math.exp(-0.02 * depthMeters);
  // 硫黄コロイドは水を乳白色にする（明度を上げ、彩度を下げる）
  const sulfurBrightBoost = 1.0 + sulfur * 0.3;
  const targetY = baseBrightness * depthDarkening * lightMultiplier * sulfurBrightBoost;

  if (Y > 1e-8) {
    const normalizer = targetY / Y;
    X *= normalizer;
    Y *= normalizer;
    Z *= normalizer;
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

  return [
    Math.max(0, Math.min(255, Math.round(toSRGB(rLin) * 255))),
    Math.max(0, Math.min(255, Math.round(toSRGB(gLin) * 255))),
    Math.max(0, Math.min(255, Math.round(toSRGB(bLin) * 255))),
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
 * 上空を見上げた時の水中背景色を物理計算
 *
 * 太陽光が水面から depthMeters を透過した後の残存スペクトルを
 * CIE XYZ → sRGB で色に変換する。
 *
 * 水平方向（散乱光）と違い、直接透過光が支配的:
 * - 浅い所: 明るい白〜青白（全波長が透過）
 * - 中間: 青緑（赤・橙が吸収済み）
 * - 深い所: 暗い青〜暗闇（短波長のみ残る）
 *
 * スネルの窓（Snell's window）効果:
 * 水面を見上げると約97°の円錐に空が見え、外側は全反射で暗い。
 */
export function getUpwardWaterColor(
  depthMeters: number,
  absorptionMultiplier: number = 1.0,
  lightMultiplier: number = 1.0,
  scatterParams: ScatterParams = {
    rayleigh: 1.0,
    mie: 0.0,
    chlorophyll: 0.0,
  }
): [number, number, number] {
  if (depthMeters <= 0) {
    const v = Math.round(230 * lightMultiplier);
    return [
      Math.min(255, Math.round(v * 0.7)),
      Math.min(255, Math.round(v * 0.9)),
      Math.min(255, v),
    ];
  }

  let X = 0, Y = 0, Z = 0;

  const carotenoid = scatterParams.carotenoid ?? 0;

  // 直接透過光: 太陽光がdepthMetersを通過して目に届く
  for (let nm = 380; nm <= 720; nm += 5) {
    const alpha = interpolateAbsorptionCoefficient(nm) * absorptionMultiplier;

    let extraAbs = 0;
    if (scatterParams.chlorophyll > 0) {
      const chlAbs440 = Math.exp(-((nm - 440) ** 2) / (2 * 30 ** 2));
      const chlAbs675 = Math.exp(-((nm - 675) ** 2) / (2 * 20 ** 2));
      extraAbs += scatterParams.chlorophyll * (chlAbs440 * 0.04 + chlAbs675 * 0.02);
    }
    if (carotenoid > 0) {
      const caroAbs = Math.exp(-((nm - 490) ** 2) / (2 * 50 ** 2));
      extraAbs += carotenoid * caroAbs * 0.06;
    }

    const transmittance = Math.exp(-(alpha + extraAbs) * depthMeters);
    const irradiance = transmittance * lightMultiplier;

    const [xBar, yBar, zBar] = cie1931(nm);
    X += irradiance * xBar * 5;
    Y += irradiance * yBar * 5;
    Z += irradiance * zBar * 5;
  }

  // スネルの窓: 深くなるほど窓の外（全反射=散乱光）の割合が増す
  const snellWindowRatio = Math.max(0.15, 1.0 - depthMeters * 0.003);
  const scatter = getPhysicalWaterColor(depthMeters, absorptionMultiplier, lightMultiplier, scatterParams);

  // XYZ → linear sRGB
  const rLin =  3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  const gLin = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  const bLin =  0.0557 * X - 0.2040 * Y + 1.0570 * Z;

  const toSRGB = (c: number) => {
    const clamped = Math.max(0, c);
    return clamped <= 0.0031308
      ? clamped * 12.92
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const scale = 255;
  const dR = Math.max(0, Math.min(255, Math.round(toSRGB(rLin) * scale)));
  const dG = Math.max(0, Math.min(255, Math.round(toSRGB(gLin) * scale)));
  const dB = Math.max(0, Math.min(255, Math.round(toSRGB(bLin) * scale)));

  // スネルの窓（直接光）と周囲（散乱光）をブレンド
  return [
    Math.round(dR * snellWindowRatio + scatter[0] * (1 - snellWindowRatio)),
    Math.round(dG * snellWindowRatio + scatter[1] * (1 - snellWindowRatio)),
    Math.round(dB * snellWindowRatio + scatter[2] * (1 - snellWindowRatio)),
  ];
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
