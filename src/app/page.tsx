import DepthProvider from "@/components/DepthProvider";
import OceanBackground from "@/components/OceanBackground";
import BubbleParticles from "@/components/BubbleParticles";
import ColorSpectrum from "@/components/ColorSpectrum";
import DepthGauge from "@/components/DepthGauge";
import ImageViewer from "@/components/ImageViewer";
import EnvironmentPanel from "@/components/EnvironmentPanel";
import ScrollDepthController from "@/components/ScrollDepthController";

export default function Home() {
  return (
    <DepthProvider>
      {/* スクロール量で水深を制御するため、ページ全体を十分な高さにする */}
      <div style={{ height: "500vh", position: "relative" }}>
        {/* 背景レイヤー */}
        <OceanBackground />
        <BubbleParticles />

        {/* スクロールで水深を連動させるコントローラー */}
        <ScrollDepthController />

        {/* UIパネル: 操作UIを最上部に配置 */}
        <EnvironmentPanel />
        <ImageViewer />
        <DepthGauge />
        <ColorSpectrum />
      </div>
    </DepthProvider>
  );
}
