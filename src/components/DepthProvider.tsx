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
import { DepthContextType, EnvironmentSettings } from "@/types";
import { MAX_DEPTH, SCROLL_HEIGHT_PER_METER } from "@/lib/constants";

const DEFAULT_ENV: EnvironmentSettings = {
  ocean: "temperate",
  weather: "clear",
  timeOfDay: "day",
};

const DepthContext = createContext<DepthContextType>({
  currentDepth: 0,
  setDepth: () => {},
  environment: DEFAULT_ENV,
  setEnvironment: () => {},
});

export function useDepth(): DepthContextType {
  return useContext(DepthContext);
}

export default function DepthProvider({ children }: { children: ReactNode }) {
  const [currentDepth, setCurrentDepth] = useState(0);
  const [environment, setEnvironment] = useState<EnvironmentSettings>(DEFAULT_ENV);
  const rafRef = useRef<number>(0);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (isProgrammaticScroll.current) return;

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
  }, []);

  const setDepth = useCallback((depth: number) => {
    const clamped = Math.min(MAX_DEPTH, Math.max(0, depth));
    setCurrentDepth(Math.round(clamped * 10) / 10);

    isProgrammaticScroll.current = true;
    window.scrollTo({
      top: clamped * SCROLL_HEIGHT_PER_METER,
      behavior: "instant",
    });
    requestAnimationFrame(() => {
      isProgrammaticScroll.current = false;
    });
  }, []);

  return (
    <DepthContext.Provider value={{ currentDepth, setDepth, environment, setEnvironment }}>
      {children}
    </DepthContext.Provider>
  );
}
