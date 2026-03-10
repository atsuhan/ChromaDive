"use client";

import { useDepth } from "./DepthProvider";
import { MAX_DEPTH } from "@/lib/constants";

export default function OceanBackground() {
  const { currentDepth, camera, viewMode } = useDepth();

  const depthRatio = currentDepth / MAX_DEPTH;

  const skyOpacity = Math.max(0, 1 - currentDepth / 5);
  const lightRayOpacity = Math.max(0, 1 - currentDepth / 100) * 0.5;

  const bgTop = interpolateColor(
    [26, 143, 196],
    [6, 20, 45],
    Math.min(1, depthRatio * 1.8)
  );
  const bgBottom = interpolateColor(
    [10, 61, 107],
    [2, 8, 20],
    Math.min(1, depthRatio * 1.5)
  );

  // 海底の可視度（180m以降で徐々に表示）
  const floorOpacity = Math.max(0, (currentDepth - 175) / 25);

  // カメラモード: 見上げたとき水面が見える効果
  const lookingUp = viewMode === "camera" ? Math.max(0, -camera.rotateX) / 90 : 0;
  // 見上げ時の水面光の強さ
  const surfaceGlowOpacity = lookingUp * Math.max(0, 1 - depthRatio * 2) * 0.8;

  // 3Dトランスフォーム
  const transform = viewMode === "camera"
    ? `perspective(1200px) rotateX(${camera.rotateX * 0.15}deg) rotateY(${camera.rotateY * 0.1}deg) scale(${1 + Math.abs(camera.rotateX) * 0.002})`
    : "none";

  return (
    <div style={{
      position: "fixed",
      inset: "-5%",
      width: "110%",
      height: "110%",
      zIndex: 0,
      overflow: "hidden",
      transform,
      transition: viewMode === "scroll" ? "transform 0.3s ease" : "none",
      willChange: "transform",
    }}>
      {/* 海中グラデーション */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(180deg,
          rgb(${bgTop.join(",")}) 0%,
          rgb(${bgBottom.join(",")}) 100%)`,
        transition: "background 0.1s ease",
      }} />

      {/* 空（水面上） */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "35%",
        background: "linear-gradient(180deg, #4a90d9 0%, #87CEEB 50%, #b0e0f0 100%)",
        opacity: skyOpacity,
        transition: "opacity 0.15s ease",
      }}>
        <svg style={{ position: "absolute", top: "15%", left: "20%", opacity: 0.6 }}
          width="40" height="16" viewBox="0 0 40 16">
          <path d="M0 8 Q10 0 20 8 Q30 0 40 8" stroke="#2a4a6a" strokeWidth="2" fill="none"/>
        </svg>
        <svg style={{ position: "absolute", top: "10%", left: "35%", opacity: 0.4 }}
          width="30" height="12" viewBox="0 0 40 16">
          <path d="M0 8 Q10 0 20 8 Q30 0 40 8" stroke="#2a4a6a" strokeWidth="2" fill="none"/>
        </svg>
        <svg style={{ position: "absolute", top: "20%", left: "65%", opacity: 0.5 }}
          width="35" height="14" viewBox="0 0 40 16">
          <path d="M0 8 Q10 0 20 8 Q30 0 40 8" stroke="#2a4a6a" strokeWidth="2" fill="none"/>
        </svg>
        <svg style={{ position: "absolute", top: "8%", left: "78%", opacity: 0.3 }}
          width="25" height="10" viewBox="0 0 40 16">
          <path d="M0 8 Q10 0 20 8 Q30 0 40 8" stroke="#2a4a6a" strokeWidth="2" fill="none"/>
        </svg>
      </div>

      {/* 水面の波 */}
      <div style={{
        position: "absolute",
        top: "34%",
        left: 0,
        right: 0,
        height: "8%",
        opacity: skyOpacity,
        background: "linear-gradient(180deg, rgba(176,224,240,0.6) 0%, rgba(26,143,196,0.3) 50%, transparent 100%)",
      }}>
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "30px" }}
          viewBox="0 0 1200 30" preserveAspectRatio="none">
          <path d="M0 15 Q150 0 300 15 Q450 30 600 15 Q750 0 900 15 Q1050 30 1200 15 L1200 0 L0 0 Z"
            fill="rgba(176,224,240,0.5)"/>
        </svg>
      </div>

      {/* 水面を見上げたときの光（カメラモード） */}
      <div style={{
        position: "absolute",
        top: 0,
        left: "10%",
        right: "10%",
        height: "60%",
        opacity: surfaceGlowOpacity,
        background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(140, 210, 255, 0.5) 0%, rgba(60, 150, 220, 0.2) 40%, transparent 70%)",
        pointerEvents: "none",
        transition: "opacity 0.2s ease",
      }} />

      {/* 光線エフェクト */}
      <div style={{
        position: "absolute",
        inset: 0,
        opacity: lightRayOpacity,
        background: `
          linear-gradient(170deg, rgba(255,255,255,0.1) 0%, transparent 40%),
          linear-gradient(175deg, rgba(255,255,255,0.06) 0%, transparent 50%),
          linear-gradient(165deg, rgba(255,255,255,0.04) 0%, transparent 35%)
        `,
        pointerEvents: "none",
      }} />

      {/* 浮遊パーティクル */}
      <div style={{
        position: "absolute",
        inset: 0,
        opacity: Math.max(0, 0.3 - depthRatio * 0.25),
        pointerEvents: "none",
      }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${(i * 37 + 13) % 100}%`,
            top: `${(i * 53 + 7) % 100}%`,
            width: `${1 + (i % 3)}px`,
            height: `${1 + (i % 3)}px`,
            borderRadius: "50%",
            background: "rgba(200, 230, 255, 0.4)",
            animation: `float-particle ${4 + (i % 5)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.7) % 5}s`,
          }} />
        ))}
      </div>

      {/* 海底 */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "20%",
        opacity: floorOpacity,
        background: "linear-gradient(0deg, #1a1208 0%, #0d0a04 40%, transparent 100%)",
      }}>
        <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "80px" }}
          viewBox="0 0 1200 80" preserveAspectRatio="none">
          <path d="M0 80 L0 50 Q50 30 120 45 Q200 20 280 40 Q350 55 400 35 Q480 15 560 30 Q640 50 700 25 Q780 10 850 35 Q920 50 980 30 Q1050 15 1120 40 Q1170 55 1200 45 L1200 80 Z"
            fill="#1a1208"/>
          <path d="M0 80 L0 60 Q80 45 160 55 Q250 40 340 52 Q430 62 500 48 Q580 35 660 50 Q740 60 820 45 Q900 55 980 48 Q1060 58 1140 50 L1200 55 L1200 80 Z"
            fill="#231a0e"/>
        </svg>
      </div>

      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-8px) translateX(4px); }
          66% { transform: translateY(4px) translateX(-3px); }
        }
      `}</style>
    </div>
  );
}

function interpolateColor(
  from: [number, number, number],
  to: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(from[0] + (to[0] - from[0]) * t),
    Math.round(from[1] + (to[1] - from[1]) * t),
    Math.round(from[2] + (to[2] - from[2]) * t),
  ];
}
