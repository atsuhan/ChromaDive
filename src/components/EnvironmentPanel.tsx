"use client";

import { useDepth } from "./DepthProvider";
import { OceanType, Weather, TimeOfDay } from "@/types";
import {
  OCEAN_LABELS,
  WEATHER_LABELS,
  TIME_LABELS,
} from "@/lib/environment";
import { useState } from "react";

const OCEAN_OPTIONS: OceanType[] = ["tropical", "temperate", "coastal"];
const WEATHER_OPTIONS: Weather[] = ["clear", "cloudy", "rainy"];
const TIME_OPTIONS: TimeOfDay[] = ["day", "sunset", "night"];

export default function EnvironmentPanel() {
  const { environment, setEnvironment } = useDepth();
  const [isOpen, setIsOpen] = useState(false);

  const update = (partial: Partial<typeof environment>) => {
    setEnvironment({ ...environment, ...partial });
  };

  return (
    <div
      data-ui-panel
      style={{
        position: "fixed",
        top: "60px",
        left: "12px",
        zIndex: 20,
      }}
    >
      {/* トグルボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "rgba(0, 20, 40, 0.6)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(200, 230, 255, 0.15)",
          borderRadius: "8px",
          color: "rgba(200, 230, 255, 0.7)",
          fontSize: "12px",
          padding: "6px 12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.2s",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        環境設定
        <span style={{
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
          fontSize: "10px",
        }}>
          ▼
        </span>
      </button>

      {/* パネル本体 */}
      {isOpen && (
        <div
          style={{
            marginTop: "6px",
            background: "rgba(0, 20, 40, 0.75)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(200, 230, 255, 0.12)",
            borderRadius: "10px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            minWidth: "160px",
          }}
        >
          {/* 海のタイプ */}
          <OptionGroup
            label="海域"
            options={OCEAN_OPTIONS}
            labels={OCEAN_LABELS}
            value={environment.ocean}
            onChange={(v) => update({ ocean: v as OceanType })}
          />

          {/* 天気 */}
          <OptionGroup
            label="天気"
            options={WEATHER_OPTIONS}
            labels={WEATHER_LABELS}
            value={environment.weather}
            onChange={(v) => update({ weather: v as Weather })}
          />

          {/* 時間帯 */}
          <OptionGroup
            label="時間帯"
            options={TIME_OPTIONS}
            labels={TIME_LABELS}
            value={environment.timeOfDay}
            onChange={(v) => update({ timeOfDay: v as TimeOfDay })}
          />
        </div>
      )}
    </div>
  );
}

function OptionGroup<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  labels: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div style={{
        fontSize: "9px",
        fontWeight: 500,
        color: "rgba(200, 230, 255, 0.4)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "5px",
      }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              padding: "4px 6px",
              fontSize: "11px",
              fontWeight: value === opt ? 500 : 300,
              color: value === opt ? "rgba(200, 230, 255, 0.9)" : "rgba(200, 230, 255, 0.45)",
              background: value === opt ? "rgba(100, 180, 255, 0.15)" : "rgba(255, 255, 255, 0.03)",
              border: `1px solid ${value === opt ? "rgba(100, 180, 255, 0.3)" : "rgba(200, 230, 255, 0.08)"}`,
              borderRadius: "5px",
              cursor: "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {labels[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}
