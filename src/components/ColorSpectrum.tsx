"use client";

import { useDepth } from "./DepthProvider";
import { WAVELENGTH_DATA } from "@/lib/constants";
import { getSpectrumColorAtDepth, colorToCSS } from "@/lib/colorScience";

export default function ColorSpectrum() {
  const { currentDepth } = useDepth();

  return (
    <div
      data-ui-panel
      style={{
        position: "fixed",
        left: "16px",
        bottom: "16px",
        zIndex: 10,
        display: "flex",
        flexDirection: "row",
        gap: "3px",
        alignItems: "flex-end",
      }}
    >
      {WAVELENGTH_DATA.map((w) => {
        const depthColor = getSpectrumColorAtDepth(w.color, w.wavelength, currentDepth);
        const originalCSS = colorToCSS(w.color);
        const depthCSS = colorToCSS(depthColor);

        return (
          <div
            key={w.wavelength}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {/* 元の色（小さい丸） */}
            <div style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: originalCSS,
              border: "1px solid rgba(255,255,255,0.25)",
              opacity: 0.8,
            }} />

            {/* 深度適用色ボックス */}
            <div
              style={{
                width: "32px",
                height: "64px",
                borderRadius: "4px",
                backgroundColor: depthCSS,
                transition: "background-color 0.1s ease",
                border: "1px solid rgba(255,255,255,0.06)",
                position: "relative",
              }}
            />

            {/* ラベル */}
            <div style={{
              fontSize: "8px",
              fontWeight: 300,
              color: "rgba(200, 230, 255, 0.5)",
              textAlign: "center",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}>
              <div>{w.nameJa}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
