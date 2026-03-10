"use client";

import { useDepth } from "./DepthProvider";
import { MAX_DEPTH } from "@/lib/constants";

const BUBBLES = Array.from({ length: 18 }).map((_, i) => ({
  id: i,
  left: `${(i * 41 + 7) % 95 + 2}%`,
  size: 2 + (i % 4) * 2 + ((i * 7 + 3) % 4),
  duration: 6 + (i % 7) * 2,
  delay: (i * 1.3) % 8,
}));

export default function BubbleParticles() {
  const { currentDepth, camera, viewMode } = useDepth();

  const opacity = Math.max(0.03, 0.3 - (currentDepth / MAX_DEPTH) * 0.25);

  const transform = viewMode === "camera"
    ? `perspective(1200px) rotateX(${camera.rotateX * 0.1}deg) rotateY(${camera.rotateY * 0.08}deg)`
    : "none";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 1,
      pointerEvents: "none",
      opacity,
      transform,
      transition: viewMode === "scroll" ? "transform 0.3s ease" : "none",
    }}>
      {BUBBLES.map((b) => (
        <div
          key={b.id}
          style={{
            position: "absolute",
            left: b.left,
            bottom: "-10px",
            width: `${b.size}px`,
            height: `${b.size}px`,
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%,
              rgba(200, 230, 255, 0.6),
              rgba(150, 200, 240, 0.2))`,
            border: "1px solid rgba(200, 230, 255, 0.2)",
            animation: `bubble-rise ${b.duration}s ease-in infinite`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes bubble-rise {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-105vh) translateX(15px) scale(0.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
