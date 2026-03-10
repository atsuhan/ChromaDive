"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { DepthContextType, ViewMode, CameraState } from "@/types";
import { MAX_DEPTH, SCROLL_HEIGHT_PER_METER } from "@/lib/constants";

const DepthContext = createContext<DepthContextType>({
  currentDepth: 0,
  setDepth: () => {},
  viewMode: "scroll",
  setViewMode: () => {},
  camera: { rotateX: 0, rotateY: 0 },
});

export function useDepth(): DepthContextType {
  return useContext(DepthContext);
}

export default function DepthProvider({ children }: { children: ReactNode }) {
  const [currentDepth, setCurrentDepth] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("scroll");
  const [camera, setCamera] = useState<CameraState>({ rotateX: 0, rotateY: 0 });
  const rafRef = useRef<number>(0);
  const isProgrammaticScroll = useRef(false);

  // スクロールモード: scroll → depth
  useEffect(() => {
    const handleScroll = () => {
      if (isProgrammaticScroll.current || viewMode !== "scroll") return;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const depth = Math.min(MAX_DEPTH, Math.max(0, scrollY / SCROLL_HEIGHT_PER_METER));
        setCurrentDepth(Math.round(depth * 10) / 10);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [viewMode]);

  // カメラモード: マウスドラッグでカメラ回転、ホイールで深度
  useEffect(() => {
    if (viewMode !== "camera") return;

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      // UIパネル上のクリックは無視（z-index 10以上の要素）
      const target = e.target as HTMLElement;
      if (target.closest("[data-ui-panel]")) return;
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      document.body.style.cursor = "grabbing";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      setCamera((prev) => ({
        // 上下: ドラッグ上 → rotateX負 → 水面を見上げる
        rotateX: Math.max(-90, Math.min(30, prev.rotateX - dy * 0.4)),
        rotateY: Math.max(-60, Math.min(60, prev.rotateY + dx * 0.3)),
      }));
    };

    const handleMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = "";
    };

    // カメラモードでもホイールで深度変更
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-ui-panel]")) return;
      e.preventDefault();
      setCurrentDepth((prev) => {
        const next = prev + e.deltaY * 0.1;
        return Math.round(Math.min(MAX_DEPTH, Math.max(0, next)) * 10) / 10;
      });
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("wheel", handleWheel);
      document.body.style.cursor = "";
    };
  }, [viewMode]);

  const setDepth = useCallback((depth: number) => {
    const clamped = Math.min(MAX_DEPTH, Math.max(0, depth));
    setCurrentDepth(Math.round(clamped * 10) / 10);

    if (viewMode === "scroll") {
      isProgrammaticScroll.current = true;
      window.scrollTo({
        top: clamped * SCROLL_HEIGHT_PER_METER,
        behavior: "instant",
      });
      requestAnimationFrame(() => {
        isProgrammaticScroll.current = false;
      });
    }
  }, [viewMode]);

  // モード切替時にスクロール位置を同期
  const handleSetViewMode = useCallback((mode: ViewMode) => {
    if (mode === "scroll") {
      // カメラモード→スクロールモード: スクロール位置を現在の深度に合わせる
      isProgrammaticScroll.current = true;
      window.scrollTo({
        top: currentDepth * SCROLL_HEIGHT_PER_METER,
        behavior: "instant",
      });
      requestAnimationFrame(() => {
        isProgrammaticScroll.current = false;
      });
      // カメラ角度をリセット
      setCamera({ rotateX: 0, rotateY: 0 });
    }
    setViewMode(mode);
  }, [currentDepth]);

  return (
    <DepthContext.Provider value={{
      currentDepth,
      setDepth,
      viewMode,
      setViewMode: handleSetViewMode,
      camera,
    }}>
      {children}
    </DepthContext.Provider>
  );
}
