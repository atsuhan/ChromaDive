"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import { DepthContextType, EnvironmentSettings } from "@/types";
import { MAX_DEPTH } from "@/lib/constants";

const DEFAULT_ENV: EnvironmentSettings = {
  forelUleIndex: 5,
  timeOfDay: "day",
  lightIntensity: 1.0,
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

  const setDepth = (depth: number) => {
    const clamped = Math.min(MAX_DEPTH, Math.max(0, depth));
    setCurrentDepth(Math.round(clamped * 10) / 10);
  };

  return (
    <DepthContext.Provider value={{ currentDepth, setDepth, environment, setEnvironment }}>
      {children}
    </DepthContext.Provider>
  );
}
