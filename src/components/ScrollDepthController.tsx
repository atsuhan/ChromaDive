"use client";

import { useEffect } from "react";
import { useDepth } from "./DepthProvider";
import { MAX_DEPTH } from "@/lib/constants";

/**
 * 画面スクロール量を水深に変換するコントローラー。
 * ページ全体のスクロール可能範囲（= document高さ - viewport高さ）を
 * 0〜MAX_DEPTH に線形マッピングする。
 */
export default function ScrollDepthController() {
  const { setDepth } = useDepth();

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));
      setDepth(ratio * MAX_DEPTH);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // 初期位置を反映
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [setDepth]);

  return null;
}
