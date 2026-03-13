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
  // 単一波長の色なのでtransformColorAtDepthに委譲して
  // 散乱光反射の効果を一貫して適用する
  return transformColorAtDepth(
    baseColor[0], baseColor[1], baseColor[2],
    depthMeters, absorptionMultiplier, lightMultiplier
  );
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

  // --- 散乱光の反射による明るい色・白の残存効果 ---
  //
  // 水中では太陽光が吸収されて青緑系のみ残存する。
  // 明るい色（特に白）の物体は、この残存光を強く反射するため
  // 周囲の水よりも目立って見える。（シーフロアコントロール、ホンダ釣り倶楽部の知見）
  //
  // 物体の「明度」が高いほど、残存する散乱光を多く反射し、
  // 水中でのコントラスト（視認性）が高まる。
  // 暗い色の物体は周囲の水に溶け込みやすい。

  // 元の色の輝度（0〜1）を計算
  const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

  // 水中の残存散乱光（青緑系）が物体表面で反射される量
  // 明るい色ほど散乱光をよく反射する。白が最も強い。
  const scatterReflection = luminance * ambientDarkening * lightMultiplier;
  // 深度に応じた散乱光の色（青緑がかった光）
  const scatterR = Math.min(40, depthMeters * 0.08) * scatterReflection;
  const scatterG = Math.min(60, depthMeters * 0.15) * scatterReflection;
  const scatterB = Math.min(80, depthMeters * 0.25) * scatterReflection;

  const newR = Math.round(r * rAbsorption * ambientDarkening * lightMultiplier + scatterR);
  const newG = Math.round(g * gAbsorption * ambientDarkening * lightMultiplier + scatterG);
  const newB = Math.round(b * bAbsorption * ambientDarkening * lightMultiplier + blueScatter + scatterB);

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
  // 水面付近で光量が高い場合、太陽光の後方散乱と水面反射で
  // 水が白っぽく明るく見える効果を追加
  // 浅い所ほど、光量が高いほど効果が大きい
  const surfaceBrightening = Math.exp(-0.15 * depthMeters) * Math.max(0, lightMultiplier - 0.3) * 0.6;
  const targetY = baseBrightness * depthDarkening * lightMultiplier * sulfurBrightBoost + surfaceBrightening;

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

  let rOut = toSRGB(rLin) * 255;
  let gOut = toSRGB(gLin) * 255;
  let bOut = toSRGB(bLin) * 255;

  // 水面付近の白っぽさ: 日中・浅場で太陽光の後方散乱により
  // 水色が白方向にシフトする現象を再現
  // surfaceBrighteningの強さに応じて白(255)に向けてブレンド
  const whiteBlend = Math.min(1, surfaceBrightening * 0.8);
  if (whiteBlend > 0.01) {
    rOut = rOut + (255 - rOut) * whiteBlend;
    gOut = gOut + (255 - gOut) * whiteBlend;
    bOut = bOut + (255 - bOut) * whiteBlend;
  }

  return [
    Math.max(0, Math.min(255, Math.round(rOut))),
    Math.max(0, Math.min(255, Math.round(gOut))),
    Math.max(0, Math.min(255, Math.round(bOut))),
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

export function colorToCSS(color: [number, number, number]): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}
