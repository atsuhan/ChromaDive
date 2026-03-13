"use client";

import { useDepth } from "./DepthProvider";
import { WAVELENGTH_DATA } from "@/lib/constants";
import { getSpectrumColorAtDepth, colorToCSS } from "@/lib/colorScience";
import {
  getOceanAbsorptionMultiplier,
  getLightMultiplier,
} from "@/lib/environment";

/**
 * 明度バリエーションの倍率
 * 上段: 明るい色（白方向にブレンド）
 * 中段: 元の色
 * 下段: 暗い色
 */
const BRIGHTNESS_ROWS: { label: string; mix: (c: [number, number, number]) => [number, number, number] }[] = [
  {
    label: "明",
    // 白方向に50%ブレンドして明るいバリエーションを作る
    mix: ([r, g, b]) => [
      Math.round(r + (255 - r) * 0.5),
      Math.round(g + (255 - g) * 0.5),
      Math.round(b + (255 - b) * 0.5),
    ],
  },
  {
    label: "標準",
    mix: (c) => c,
  },
  {
    label: "暗",
    // 暗い方向に50%
    mix: ([r, g, b]) => [
      Math.round(r * 0.5),
      Math.round(g * 0.5),
      Math.round(b * 0.5),
    ],
  },
];

export default function ColorSpectrum() {
  const { currentDepth, environment } = useDepth();
  const absorptionMul = getOceanAbsorptionMultiplier(environment.forelUleIndex);
  const lightMul = getLightMultiplier(environment.lightIntensity);

  // 白/黒の列用データ（波長は可視光中央の550nmで代表）
  const neutralColumn = {
    nameJa: "",
    wavelength: 550,
    rows: [
      { baseColor: [255, 255, 255] as [number, number, number], label: "白" },
      { baseColor: [128, 128, 128] as [number, number, number], label: "灰" },
      { baseColor: [0, 0, 0] as [number, number, number], label: "黒" },
    ],
  };

  return (
    <div
      data-ui-panel
      style={{
        position: "fixed",
        left: "12px",
        bottom: "12px",
        // 右のゲージ(82px)と余白を確保して見切れ防止
        right: "90px",
        zIndex: 10,
        display: "flex",
        flexDirection: "row",
        gap: "3px",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      {/* 左端: 白/灰/黒の中性色列 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2px",
          minWidth: 0,
        }}
      >
        {neutralColumn.rows.map((row) => {
          // 中性色は特定波長に依存しない。明度のみで深度変換する
          const depthColor = getSpectrumColorAtDepth(
            row.baseColor,
            neutralColumn.wavelength,
            currentDepth,
            absorptionMul,
            lightMul,
          );

          return (
            <div key={row.label} style={{ position: "relative" }}>
              {/* 元の色の小さいドット */}
              <div style={{
                position: "absolute",
                top: "-3px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                backgroundColor: colorToCSS(row.baseColor),
                border: "1px solid rgba(255,255,255,0.25)",
                opacity: 0.8,
                zIndex: 1,
              }} />
              <div
                style={{
                  width: "clamp(18px, calc((100vw - 120px) / 14), 28px)",
                  height: "clamp(12px, 2.5vw, 20px)",
                  borderRadius: "3px",
                  backgroundColor: colorToCSS(depthColor),
                  transition: "background-color 0.1s ease",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              />
            </div>
          );
        })}
        <div style={{
          fontSize: "clamp(6px, 1.5vw, 8px)",
          fontWeight: 300,
          color: "rgba(200, 230, 255, 0.5)",
          textAlign: "center",
          lineHeight: 1.1,
          whiteSpace: "nowrap",
        }}>
          白/黒
        </div>
      </div>

      {/* 区切り線 */}
      <div style={{
        width: "1px",
        alignSelf: "stretch",
        background: "rgba(200, 230, 255, 0.1)",
        margin: "0 1px",
      }} />

      {/* 各波長の色列 */}
      {WAVELENGTH_DATA.map((w) => (
        <div
          key={w.wavelength}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            minWidth: 0,
          }}
        >
          {BRIGHTNESS_ROWS.map((row, rowIdx) => {
            const baseVariant = row.mix(w.color);
            const depthColor = getSpectrumColorAtDepth(
              baseVariant,
              w.wavelength,
              currentDepth,
              absorptionMul,
              lightMul,
            );
            const originalCSS = colorToCSS(baseVariant);
            const depthCSS = colorToCSS(depthColor);

            return (
              <div key={rowIdx} style={{ position: "relative" }}>
                {/* 元の色の小さいドット */}
                <div style={{
                  position: "absolute",
                  top: "-3px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  backgroundColor: originalCSS,
                  border: "1px solid rgba(255,255,255,0.25)",
                  opacity: 0.8,
                  zIndex: 1,
                }} />
                <div
                  style={{
                    width: "clamp(18px, calc((100vw - 120px) / 14), 28px)",
                    height: "clamp(12px, 2.5vw, 20px)",
                    borderRadius: "3px",
                    backgroundColor: depthCSS,
                    transition: "background-color 0.1s ease",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                />
              </div>
            );
          })}

          {/* ラベル */}
          <div style={{
            fontSize: "clamp(6px, 1.5vw, 8px)",
            fontWeight: 300,
            color: "rgba(200, 230, 255, 0.5)",
            textAlign: "center",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
          }}>
            {w.nameJa}
          </div>
        </div>
      ))}
    </div>
  );
}
