"use client";

import { useDepth } from "./DepthProvider";
import { FU_COLORS } from "@/lib/environment";

export default function EnvironmentPanel() {
  const { environment, setEnvironment } = useDepth();

  const update = (partial: Partial<typeof environment>) => {
    setEnvironment({ ...environment, ...partial });
  };

  // FUスライダーのグラデーション背景を生成
  // 21色を等間隔に配置してCSS linear-gradientにする
  const fuGradientStops = FU_COLORS.map((c, i) => {
    const pct = (i / (FU_COLORS.length - 1)) * 100;
    return `rgb(${c[0]},${c[1]},${c[2]}) ${pct}%`;
  }).join(", ");

  // 現在のFUインデックスの代表色
  const currentFuColor = FU_COLORS[environment.forelUleIndex - 1];

  return (
    <div
      data-ui-panel
      style={{
        position: "fixed",
        top: "8px",
        left: "8px",
        right: "60px",
        zIndex: 20,
        background: "rgba(0, 20, 40, 0.6)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(200, 230, 255, 0.12)",
        borderRadius: "10px",
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        flexWrap: "nowrap",
        gap: "6px 8px",
      }}
    >
      {/* 海色（Forel-Ule）スライダー */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0, flex: "1 1 auto" }}>
        <span style={{
          fontSize: "9px",
          color: "rgba(200, 230, 255, 0.5)",
          whiteSpace: "nowrap",
          letterSpacing: "0.02em",
        }}>
          海色
        </span>
        <input
          type="range"
          min="1"
          max="21"
          step="1"
          value={environment.forelUleIndex}
          onChange={(e) => update({ forelUleIndex: Number(e.target.value) })}
          style={{
            width: "80px",
            minWidth: "50px",
            height: "4px",
            appearance: "none",
            WebkitAppearance: "none",
            background: `linear-gradient(to right, ${fuGradientStops})`,
            borderRadius: "2px",
            outline: "none",
            cursor: "pointer",
            flex: "1 1 60px",
          }}
        />
        {/* 現在のFU色を小さいプレビューで表示 */}
        <div style={{
          width: "12px",
          height: "12px",
          borderRadius: "3px",
          backgroundColor: `rgb(${currentFuColor[0]},${currentFuColor[1]},${currentFuColor[2]})`,
          border: "1px solid rgba(255,255,255,0.2)",
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: "9px",
          color: "rgba(200, 230, 255, 0.4)",
          minWidth: "16px",
          textAlign: "right",
        }}>
          {environment.forelUleIndex}
        </span>
      </div>

      {/* 区切り線 */}
      <div style={{
        width: "1px",
        height: "20px",
        background: "rgba(200, 230, 255, 0.12)",
      }} />

      {/* 光量スライダー */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
        <span style={{ fontSize: "10px", color: "rgba(200, 230, 255, 0.35)" }}>
          🌙
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(environment.lightIntensity * 100)}
          onChange={(e) => update({ lightIntensity: Number(e.target.value) / 100 })}
          style={{
            width: "60px",
            minWidth: "40px",
            height: "4px",
            appearance: "none",
            WebkitAppearance: "none",
            background: `linear-gradient(to right,
              rgba(30, 40, 80, 0.8) 0%,
              rgba(100, 140, 200, 0.6) 40%,
              rgba(255, 230, 180, 0.8) 100%)`,
            borderRadius: "2px",
            outline: "none",
            cursor: "pointer",
            flex: "1 1 50px",
          }}
        />
        <span style={{ fontSize: "10px", color: "rgba(200, 230, 255, 0.35)" }}>
          ☀️
        </span>
        <span style={{
          fontSize: "9px",
          color: "rgba(200, 230, 255, 0.35)",
          minWidth: "26px",
          textAlign: "right",
        }}>
          {Math.round(environment.lightIntensity * 100)}%
        </span>
      </div>
    </div>
  );
}
