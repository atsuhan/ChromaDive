"use client";

import { useDepth } from "./DepthProvider";
import { createImageProcessor, ImageProcessor } from "@/lib/imageProcessor";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOceanAbsorptionMultiplier,
  getWeatherLightMultiplier,
  getTimeOfDayLightMultiplier,
} from "@/lib/environment";

export default function ImageViewer() {
  const { currentDepth, environment } = useDepth();
  const absorptionMul = getOceanAbsorptionMultiplier(environment.ocean);
  const lightMul = getWeatherLightMultiplier(environment.weather) * getTimeOfDayLightMultiplier(environment.timeOfDay);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processorRef = useRef<ImageProcessor | null>(null);
  const rafRef = useRef<number>(0);
  const [hasImage, setHasImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // 深度・環境変更時にフィルタを適用
  useEffect(() => {
    if (!processorRef.current || !canvasRef.current) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const processor = processorRef.current!;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const filtered = processor.applyDepthFilter(currentDepth, absorptionMul, lightMul);
      ctx.putImageData(filtered, 0, 0);
    });
  }, [currentDepth, absorptionMul, lightMul]);

  const loadImage = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const processor = createImageProcessor(img);
      processorRef.current = processor;

      const canvas = canvasRef.current!;
      canvas.width = processor.width;
      canvas.height = processor.height;

      const ctx = canvas.getContext("2d")!;
      const filtered = processor.applyDepthFilter(currentDepth, absorptionMul, lightMul);
      ctx.putImageData(filtered, 0, 0);

      setHasImage(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [currentDepth, absorptionMul, lightMul]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      loadImage(file);
    }
  }, [loadImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  }, [loadImage]);

  const handleRemove = useCallback(() => {
    processorRef.current = null;
    setHasImage(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")!;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  return (
    <div
      data-ui-panel
      style={{
        position: "fixed",
        top: "36px",
        left: "12px",
        right: "72px",
        bottom: "100px",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
      }}
    >
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          maxWidth: "800px",
          border: `2px dashed ${isDragOver ? "rgba(140, 220, 255, 0.7)" : "rgba(200, 230, 255, 0.25)"}`,
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isDragOver
            ? "rgba(100, 180, 255, 0.08)"
            : "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(4px)",
          transition: "border-color 0.2s, background 0.2s",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: hasImage ? "block" : "none",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />

        {!hasImage && (
          <label style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
            padding: "20px",
            textAlign: "center",
          }}>
            {/* アップロードアイコン */}
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 32V16M24 16L18 22M24 16L30 22"
                stroke="rgba(200, 230, 255, 0.3)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 32V36C8 38.2 9.8 40 12 40H36C38.2 40 40 38.2 40 36V32"
                stroke="rgba(200, 230, 255, 0.3)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div>
              <div style={{
                fontSize: "14px",
                color: "rgba(200, 230, 255, 0.5)",
                fontWeight: 300,
                marginBottom: "4px",
              }}>
                画像をドロップ
              </div>
              <div style={{
                fontSize: "11px",
                color: "rgba(200, 230, 255, 0.3)",
              }}>
                またはクリックして選択
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </label>
        )}
      </div>

      {hasImage && (
        <button
          onClick={handleRemove}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(200, 230, 255, 0.15)",
            borderRadius: "6px",
            color: "rgba(200, 230, 255, 0.5)",
            fontSize: "11px",
            padding: "4px 12px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 100, 100, 0.1)";
            e.currentTarget.style.borderColor = "rgba(255, 100, 100, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
            e.currentTarget.style.borderColor = "rgba(200, 230, 255, 0.15)";
          }}
        >
          画像を削除
        </button>
      )}
    </div>
  );
}
