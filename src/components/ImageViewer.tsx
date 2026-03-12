"use client";

import { useDepth } from "./DepthProvider";
import { createImageProcessor, ImageProcessor } from "@/lib/imageProcessor";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOceanAbsorptionMultiplier,
  getLightMultiplier,
} from "@/lib/environment";

export default function ImageViewer() {
  const { currentDepth, environment } = useDepth();
  const absorptionMul = getOceanAbsorptionMultiplier(environment.ocean);
  const lightMul = getLightMultiplier(environment.lightIntensity);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processorRef = useRef<ImageProcessor | null>(null);
  const rafRef = useRef<number>(0);
  const [hasImage, setHasImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);

  const renderCanvas = useCallback(() => {
    if (!processorRef.current || !canvasRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const processor = processorRef.current!;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const filtered = processor.applyDepthFilter(currentDepth, absorptionMul, lightMul);
      ctx.putImageData(filtered, 0, 0);
    });
  }, [currentDepth, absorptionMul, lightMul]);

  // 深度・環境・カラータイプ変更時にフィルタを適用
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const filtered = processor.applyDepthFilter(currentDepth, absorptionMul, lightMul);
      ctx.putImageData(filtered, 0, 0);

      setHasImage(true);
      setBgRemoved(false);
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
    setBgRemoved(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")!;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  const handleToggleBgRemoval = useCallback(() => {
    if (!processorRef.current) return;
    const processor = processorRef.current;

    if (processor.hasBackgroundRemoved()) {
      processor.restoreBackground();
      setBgRemoved(false);
    } else {
      processor.removeBackground(30);
      setBgRemoved(true);
    }
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div
      data-ui-panel
      style={{
        position: "fixed",
        /* 操作パネルの下に配置。モバイルでパネルが折り返す場合も余裕をもたせる */
        top: "56px",
        left: "16px",
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
          /* スマホでも周囲に余白を確保するためパディングを追加 */
          padding: "8px",
        }}
      >
        {/* チェッカーボード背景（背景除去時に透明部分を可視化） */}
        {bgRemoved && (
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%),
              linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%)
            `,
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
            pointerEvents: "none",
          }} />
        )}

        <canvas
          ref={canvasRef}
          style={{
            display: hasImage ? "block" : "none",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            position: "relative",
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

      {/* ツールバー */}
      {hasImage && (
        <div style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          {/* 背景除去ボタン */}
          <ToolButton
            active={bgRemoved}
            onClick={handleToggleBgRemoval}
            title={bgRemoved ? "背景を復元" : "背景を除去"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M3 9h18" strokeDasharray={bgRemoved ? "none" : "3 2"} />
            </svg>
            {bgRemoved ? "背景復元" : "背景除去"}
          </ToolButton>

          {/* 区切り */}
          <div style={{
            width: "1px",
            height: "20px",
            background: "rgba(200, 230, 255, 0.1)",
          }} />

          {/* 画像削除 */}
          <ToolButton onClick={handleRemove} title="画像を削除" danger>
            画像を削除
          </ToolButton>
        </div>
      )}
    </div>
  );
}

function ToolButton({
  children,
  active,
  danger,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        background: active
          ? "rgba(100, 180, 255, 0.15)"
          : "rgba(255, 255, 255, 0.06)",
        border: `1px solid ${
          active
            ? "rgba(100, 180, 255, 0.3)"
            : "rgba(200, 230, 255, 0.15)"
        }`,
        borderRadius: "6px",
        color: active
          ? "rgba(200, 230, 255, 0.9)"
          : "rgba(200, 230, 255, 0.5)",
        fontSize: "11px",
        padding: "4px 10px",
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (danger) {
          e.currentTarget.style.background = "rgba(255, 100, 100, 0.1)";
          e.currentTarget.style.borderColor = "rgba(255, 100, 100, 0.3)";
        } else if (!active) {
          e.currentTarget.style.background = "rgba(100, 180, 255, 0.08)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
          e.currentTarget.style.borderColor = "rgba(200, 230, 255, 0.15)";
        } else {
          e.currentTarget.style.background = "rgba(100, 180, 255, 0.15)";
          e.currentTarget.style.borderColor = "rgba(100, 180, 255, 0.3)";
        }
      }}
    >
      {children}
    </button>
  );
}
