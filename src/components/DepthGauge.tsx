"use client";

import { useDepth } from "./DepthProvider";
import { MAX_DEPTH } from "@/lib/constants";
import { useCallback, useRef, useState } from "react";

const TICK_INTERVAL = 20;
const LABEL_INTERVAL = 50;
const TICKS = Array.from(
  { length: MAX_DEPTH / TICK_INTERVAL + 1 },
  (_, i) => i * TICK_INTERVAL
);

export default function DepthGauge() {
  const { currentDepth, setDepth } = useDepth();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const depthFromMouseEvent = useCallback((clientY: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return Math.round(ratio * MAX_DEPTH);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDepth(depthFromMouseEvent(e.clientY));

    const handleMouseMove = (e: MouseEvent) => {
      setDepth(depthFromMouseEvent(e.clientY));
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [depthFromMouseEvent, setDepth]);

  const markerPosition = (currentDepth / MAX_DEPTH) * 100;

  return (
    <div
      data-ui-panel
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        height: "100vh",
        width: "var(--gauge-width)",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 0",
        userSelect: "none",
      }}
    >
      {/* 現在の深度表示 */}
      <div style={{
        position: "absolute",
        top: "12px",
        right: "12px",
        fontFamily: "var(--font-display)",
        fontSize: "20px",
        fontWeight: 700,
        color: "rgba(200, 230, 255, 0.9)",
        textShadow: "0 0 20px rgba(100, 180, 255, 0.4)",
        textAlign: "right",
        lineHeight: 1.2,
      }}>
        <span style={{ fontSize: "32px" }}>{Math.round(currentDepth)}</span>
        <span style={{ fontSize: "13px", opacity: 0.6, marginLeft: "2px" }}>m</span>
      </div>

      {/* ゲージトラック */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        style={{
          position: "relative",
          width: "32px",
          height: "calc(100vh - 120px)",
          cursor: "pointer",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{
          position: "absolute",
          width: "2px",
          height: "100%",
          background: "rgba(200, 230, 255, 0.15)",
          borderRadius: "1px",
        }} />

        <div style={{
          position: "absolute",
          width: "2px",
          height: `${markerPosition}%`,
          background: "linear-gradient(180deg, rgba(100, 200, 255, 0.6), rgba(40, 100, 180, 0.4))",
          borderRadius: "1px",
          transition: isDragging ? "none" : "height 0.1s ease",
        }} />

        {TICKS.map((depth) => {
          const y = (depth / MAX_DEPTH) * 100;
          const isLabel = depth % LABEL_INTERVAL === 0;
          return (
            <div key={depth} style={{
              position: "absolute",
              top: `${y}%`,
              right: isLabel ? "4px" : "8px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transform: "translateY(-50%)",
            }}>
              {isLabel && (
                <span style={{
                  fontSize: "9px",
                  color: "rgba(200, 230, 255, 0.4)",
                  fontWeight: 300,
                  minWidth: "24px",
                  textAlign: "right",
                }}>
                  {depth}
                </span>
              )}
              <div style={{
                width: isLabel ? "8px" : "4px",
                height: "1px",
                background: isLabel
                  ? "rgba(200, 230, 255, 0.3)"
                  : "rgba(200, 230, 255, 0.12)",
              }} />
            </div>
          );
        })}

        <div style={{
          position: "absolute",
          top: `${markerPosition}%`,
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(140, 220, 255, 0.9), rgba(80, 160, 220, 0.6))",
          boxShadow: "0 0 8px rgba(100, 200, 255, 0.5), 0 0 20px rgba(100, 200, 255, 0.2)",
          transition: isDragging ? "none" : "top 0.1s ease",
          zIndex: 2,
        }} />
      </div>
    </div>
  );
}
