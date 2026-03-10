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
        {/* 説明テキスト */}
        <p style={{
          position: "fixed",
          top: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          pointerEvents: "none",
          fontFamily: "var(--font-body)",
          fontSize: "11px",
          fontWeight: 300,
          color: "rgba(200, 230, 255, 0.45)",
          letterSpacing: "0.08em",
          margin: 0,
          whiteSpace: "nowrap",
        }}>
          水深に応じた色の見え方をシミュレーション
        </p>

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
