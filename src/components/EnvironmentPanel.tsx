"use client";

import { useDepth } from "./DepthProvider";
import { OceanType } from "@/types";
import { OCEAN_LABELS } from "@/lib/environment";

const OCEAN_OPTIONS: OceanType[] = ["tropical", "temperate", "coastal"];

export default function EnvironmentPanel() {
  const { environment, setEnvironment } = useDepth();

  const update = (partial: Partial<typeof environment>) => {
    setEnvironment({ ...environment, ...partial });
  };

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
        flexWrap: "wrap",
        gap: "8px 12px",
      }}
    >
      {/* 海域選択 */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{
          fontSize: "9px",
          fontWeight: 500,
          color: "rgba(200, 230, 255, 0.4)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
        }}>
          海域
        </span>
        <div style={{ display: "flex", gap: "3px" }}>
          {OCEAN_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => update({ ocean: opt })}
              style={{
                padding: "3px 8px",
                fontSize: "11px",
                fontWeight: environment.ocean === opt ? 500 : 300,
                color: environment.ocean === opt ? "rgba(200, 230, 255, 0.9)" : "rgba(200, 230, 255, 0.45)",
                background: environment.ocean === opt ? "rgba(100, 180, 255, 0.15)" : "rgba(255, 255, 255, 0.03)",
                border: `1px solid ${environment.ocean === opt ? "rgba(100, 180, 255, 0.3)" : "rgba(200, 230, 255, 0.08)"}`,
                borderRadius: "5px",
                cursor: "pointer",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {OCEAN_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      {/* 区切り線 */}
      <div style={{
        width: "1px",
        height: "20px",
        background: "rgba(200, 230, 255, 0.12)",
      }} />

      {/* 光量スライダー */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
        <span style={{
          fontSize: "9px",
          fontWeight: 500,
          color: "rgba(200, 230, 255, 0.4)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
        }}>
          光量
        </span>
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
            width: "80px",
            minWidth: "50px",
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
