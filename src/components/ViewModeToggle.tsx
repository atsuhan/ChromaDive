"use client";

import { useDepth } from "./DepthProvider";

export default function ViewModeToggle() {
  const { viewMode, setViewMode, camera } = useDepth();

  return (
    <div
      data-ui-panel
      style={{
        position: "fixed",
        top: "12px",
        left: "16px",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {/* モード切替ボタン */}
      <div style={{
        display: "flex",
        background: "rgba(0, 20, 40, 0.5)",
        backdropFilter: "blur(8px)",
        borderRadius: "8px",
        border: "1px solid rgba(200, 230, 255, 0.1)",
        overflow: "hidden",
      }}>
        <button
          onClick={() => setViewMode("scroll")}
          style={{
            padding: "6px 14px",
            fontSize: "11px",
            fontWeight: viewMode === "scroll" ? 600 : 300,
            color: viewMode === "scroll" ? "rgba(140, 220, 255, 0.95)" : "rgba(200, 230, 255, 0.4)",
            background: viewMode === "scroll" ? "rgba(80, 160, 220, 0.15)" : "transparent",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "var(--font-body)",
          }}
        >
          Scroll
        </button>
        <div style={{
          width: "1px",
          background: "rgba(200, 230, 255, 0.1)",
        }} />
        <button
          onClick={() => setViewMode("camera")}
          style={{
            padding: "6px 14px",
            fontSize: "11px",
            fontWeight: viewMode === "camera" ? 600 : 300,
            color: viewMode === "camera" ? "rgba(140, 220, 255, 0.95)" : "rgba(200, 230, 255, 0.4)",
            background: viewMode === "camera" ? "rgba(80, 160, 220, 0.15)" : "transparent",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "var(--font-body)",
          }}
        >
          Camera
        </button>
      </div>

      {/* カメラモードのヒント */}
      {viewMode === "camera" && (
        <div style={{
          fontSize: "10px",
          color: "rgba(200, 230, 255, 0.35)",
          fontWeight: 300,
          lineHeight: 1.5,
          maxWidth: "160px",
        }}>
          <div>ドラッグ: 見回す</div>
          <div>ホイール: 深度変更</div>
          {camera.rotateX < -20 && (
            <div style={{ color: "rgba(140, 210, 255, 0.5)", marginTop: "4px" }}>
              ↑ 水面方向
            </div>
          )}
        </div>
      )}
    </div>
  );
}
