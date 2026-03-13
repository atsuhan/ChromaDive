"use client";

import { useDepth } from "./DepthProvider";
import { MAX_DEPTH } from "@/lib/constants";
import {
  getSkyColors,
  getWaterColorAtDepth,
  getLightMultiplier,
} from "@/lib/environment";
import { useMemo } from "react";

export default function OceanBackground() {
  const { currentDepth, environment } = useDepth();

  const depthRatio = currentDepth / MAX_DEPTH;
  const lightMul = getLightMultiplier(environment.lightIntensity);

  const skyOpacity = Math.max(0, 1 - currentDepth / 5);
  const lightRayOpacity = Math.max(0, 1 - currentDepth / 100) * 0.5 * lightMul;

  const sky = getSkyColors(environment.lightIntensity);

  // 画面上部 = 現在の深度、画面下部 = 現在の深度 + 見通し距離
  // 実際の水中では上を見ると浅い色、下を見ると深い色が見える
  const viewRange = Math.max(5, 30 - depthRatio * 20);
  const bgTop = useMemo(
    () => getWaterColorAtDepth(
      Math.max(0, currentDepth - viewRange * 0.3),
      environment.forelUleIndex, environment.lightIntensity
    ),
    [currentDepth, viewRange, environment.forelUleIndex, environment.lightIntensity]
  );
  const bgBottom = useMemo(
    () => getWaterColorAtDepth(
      currentDepth + viewRange * 0.7,
      environment.forelUleIndex, environment.lightIntensity
    ),
    [currentDepth, viewRange, environment.forelUleIndex, environment.lightIntensity]
  );

  // 日中の水面付近は太陽光の散乱・反射で白っぽくなる
  // 光量が高く、水面に近いほど白いオーバーレイを加える
  const surfaceWhiteness = useMemo(() => {
    // 水面から5m以内で光量が高い場合に白っぽさを加える
    const depthFade = Math.max(0, 1 - currentDepth / 8);
    // 光量が0.5以上で白っぽさが出始め、1.0で最大
    const lightFade = Math.max(0, (environment.lightIntensity - 0.3) / 0.7);
    return depthFade * lightFade * 0.45;
  }, [currentDepth, environment.lightIntensity]);

  const floorOpacity = Math.max(0, (currentDepth - 175) / 25);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 0,
      overflow: "hidden",
    }}>
      {/* 海中グラデーション — Beer-Lambert法で計算された物理色 */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(180deg,
          rgb(${bgTop.join(",")}) 0%,
          rgb(${bgBottom.join(",")}) 100%)`,
        transition: "background 0.1s ease",
      }} />

      {/* 水面付近の白っぽさ — 日中の太陽光散乱・反射による */}
      {surfaceWhiteness > 0.01 && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.5) 30%, transparent 70%)",
          opacity: surfaceWhiteness,
          transition: "opacity 0.15s ease",
          pointerEvents: "none",
        }} />
      )}

      {/* 空（水面上） */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "35vh",
        background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.mid} 50%, ${sky.bottom} 100%)`,
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
        top: "34vh",
        left: 0,
        right: 0,
        height: "8vh",
        opacity: skyOpacity,
        background: "linear-gradient(180deg, rgba(176,224,240,0.6) 0%, rgba(26,143,196,0.3) 50%, transparent 100%)",
      }}>
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "30px" }}
          viewBox="0 0 1200 30" preserveAspectRatio="none">
          <path d="M0 15 Q150 0 300 15 Q450 30 600 15 Q750 0 900 15 Q1050 30 1200 15 L1200 0 L0 0 Z"
            fill="rgba(176,224,240,0.5)"/>
        </svg>
      </div>

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
        height: "20vh",
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
