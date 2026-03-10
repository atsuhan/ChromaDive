import DepthProvider from "@/components/DepthProvider";
import OceanBackground from "@/components/OceanBackground";
import BubbleParticles from "@/components/BubbleParticles";
import ColorSpectrum from "@/components/ColorSpectrum";
import DepthGauge from "@/components/DepthGauge";
import ImageViewer from "@/components/ImageViewer";
import EnvironmentPanel from "@/components/EnvironmentPanel";
import { TOTAL_SCROLL_HEIGHT } from "@/lib/constants";

export default function Home() {
  return (
    <DepthProvider>
      {/* スクロール用の高さを確保するコンテナ */}
      <div style={{ height: `${TOTAL_SCROLL_HEIGHT}px`, position: "relative" }}>
        {/* タイトル */}
        <div style={{
          position: "fixed",
          top: "8px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          textAlign: "center",
          pointerEvents: "none",
        }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(20px, 3vw, 28px)",
            fontWeight: 600,
            color: "rgba(200, 230, 255, 0.7)",
            letterSpacing: "0.12em",
            textShadow: "0 2px 12px rgba(0, 40, 80, 0.5)",
            margin: 0,
          }}>
            ChromaDive
          </h1>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: "11px",
            fontWeight: 300,
            color: "rgba(200, 230, 255, 0.4)",
            marginTop: "2px",
            letterSpacing: "0.05em",
          }}>
            深度別カラーシミュレーション
          </p>
        </div>

        {/* 背景レイヤー */}
        <OceanBackground />
        <BubbleParticles />

        {/* UIパネル */}
        <EnvironmentPanel />
        <ColorSpectrum />
        <ImageViewer />
        <DepthGauge />
      </div>
    </DepthProvider>
  );
}
