"use client";

import { ReactNode } from "react";
import { useDepth } from "./DepthProvider";
import { TOTAL_SCROLL_HEIGHT } from "@/lib/constants";

export default function ScrollContainer({ children }: { children: ReactNode }) {
  const { viewMode } = useDepth();

  return (
    <div style={{
      // スクロールモード: ページの高さでスクロール可能に
      // カメラモード: 100vhに固定してスクロールを無効化
      height: viewMode === "scroll" ? `${TOTAL_SCROLL_HEIGHT}px` : "100vh",
      position: "relative",
      overflow: viewMode === "camera" ? "hidden" : undefined,
      cursor: viewMode === "camera" ? "grab" : undefined,
    }}>
      {children}
    </div>
  );
}
