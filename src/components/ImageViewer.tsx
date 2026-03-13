"use client";

import { useDepth } from "./DepthProvider";
import { createImageProcessor, ImageProcessor } from "@/lib/imageProcessor";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOceanAbsorptionMultiplier,
  getLightMultiplier,
} from "@/lib/environment";
import {
  createSegmentationSession,
  type SegmentationSession,
  type ClickPoint,
} from "@/lib/lureSegmenter";

/** ルアー抽出モードの状態 */
type LureMode = "off" | "loading" | "ready" | "segmenting";

export default function ImageViewer() {
  const { currentDepth, environment } = useDepth();
  const absorptionMul = getOceanAbsorptionMultiplier(environment.forelUleIndex);
  const lightMul = getLightMultiplier(environment.lightIntensity);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processorRef = useRef<ImageProcessor | null>(null);
  const rafRef = useRef<number>(0);
  const [hasImage, setHasImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [bgRemoving, setBgRemoving] = useState(false);

  // ルアー抽出（SAM）関連
  const [lureMode, setLureMode] = useState<LureMode>("off");
  const [lureExtracted, setLureExtracted] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [clickPoints, setClickPoints] = useState<ClickPoint[]>([]);
  const segSessionRef = useRef<SegmentationSession | null>(null);
  // 元画像を保持（SAMセッション作成に必要）
  const imageElementRef = useRef<HTMLImageElement | null>(null);

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
      imageElementRef.current = img;

      const canvas = canvasRef.current!;
      canvas.width = processor.width;
      canvas.height = processor.height;

      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const filtered = processor.applyDepthFilter(currentDepth, absorptionMul, lightMul);
      ctx.putImageData(filtered, 0, 0);

      setHasImage(true);
      setBgRemoved(false);
      setLureMode("off");
      setLureExtracted(false);
      setClickPoints([]);
      segSessionRef.current?.dispose();
      segSessionRef.current = null;
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
    imageElementRef.current = null;
    segSessionRef.current?.dispose();
    segSessionRef.current = null;
    setHasImage(false);
    setBgRemoved(false);
    setLureMode("off");
    setLureExtracted(false);
    setClickPoints([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")!;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  const handleToggleBgRemoval = useCallback(async () => {
    if (!processorRef.current || bgRemoving) return;
    const processor = processorRef.current;

    if (processor.hasBackgroundRemoved()) {
      processor.restoreBackground();
      setBgRemoved(false);
      renderCanvas();
    } else {
      setBgRemoving(true);
      try {
        await processor.removeBackground();
        setBgRemoved(true);
        renderCanvas();
      } catch (err) {
        console.error("背景除去に失敗:", err);
      } finally {
        setBgRemoving(false);
      }
    }
  }, [renderCanvas, bgRemoving]);

  /**
   * ルアー抽出モードを開始
   *
   * SAMモデルをロードし、画像エンベディングを事前計算する。
   * 完了後、画像クリックでセグメンテーションできる状態になる。
   */
  const handleStartLureMode = useCallback(async () => {
    if (!processorRef.current || !imageElementRef.current) return;
    if (lureMode === "loading") return;

    // すでに抽出済みなら解除
    if (lureExtracted) {
      processorRef.current.clearMask();
      setLureExtracted(false);
      setLureMode("off");
      setClickPoints([]);
      segSessionRef.current?.dispose();
      segSessionRef.current = null;
      renderCanvas();
      return;
    }

    setLureMode("loading");
    setModelProgress(0);
    setClickPoints([]);

    try {
      const processor = processorRef.current;
      const session = await createSegmentationSession(
        imageElementRef.current,
        processor.width,
        processor.height,
        (percent) => setModelProgress(percent),
      );
      segSessionRef.current = session;
      setLureMode("ready");
    } catch (err) {
      console.error("SAMモデルのロードに失敗:", err);
      setLureMode("off");
    }
  }, [lureMode, lureExtracted, renderCanvas]);

  /**
   * キャンバスクリック → SAMセグメンテーション実行
   *
   * 表示上の座標を元画像の座標に変換し、SAMに渡す。
   * 左クリック=前景、右クリック=背景として扱う。
   */
  const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (lureMode !== "ready" || !segSessionRef.current || !processorRef.current) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    // CSS表示サイズと実際のcanvasサイズの比率を計算
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    const isBackground = e.shiftKey;
    const newPoint: ClickPoint = { x, y, label: isBackground ? 0 : 1 };
    const newPoints = [...clickPoints, newPoint];
    setClickPoints(newPoints);
    setLureMode("segmenting");

    try {
      const result = await segSessionRef.current.segmentAtPoints(newPoints);
      processorRef.current.applyMask(result.mask);
      setLureExtracted(true);
      renderCanvas();
    } catch (err) {
      console.error("セグメンテーションに失敗:", err);
    } finally {
      setLureMode("ready");
    }
  }, [lureMode, clickPoints, renderCanvas]);

  /** 右クリックで背景ポイントを追加 */
  const handleCanvasContextMenu = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (lureMode !== "ready" || !segSessionRef.current || !processorRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    const newPoint: ClickPoint = { x, y, label: 0 };
    const newPoints = [...clickPoints, newPoint];
    setClickPoints(newPoints);
    setLureMode("segmenting");

    try {
      const result = await segSessionRef.current.segmentAtPoints(newPoints);
      processorRef.current.applyMask(result.mask);
      setLureExtracted(true);
      renderCanvas();
    } catch (err) {
      console.error("セグメンテーションに失敗:", err);
    } finally {
      setLureMode("ready");
    }
  }, [lureMode, clickPoints, renderCanvas]);

  // ルアーモード中はカーソルを十字に変更
  const canvasCursor = lureMode === "ready"
    ? "crosshair"
    : lureMode === "segmenting"
      ? "wait"
      : "default";

  // マスクが適用されている状態（背景除去 or ルアー抽出）
  const hasMask = bgRemoved || lureExtracted;

  return (
    <div
      data-ui-panel
      style={{
        position: "fixed",
        /* 操作パネル(2段)の下に配置。下部カラーパレットとの余白と同程度のスペースを確保 */
        top: "88px",
        left: "16px",
        right: "72px",
        bottom: "120px",
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
          border: `2px dashed ${
            lureMode === "ready"
              ? "rgba(255, 200, 100, 0.5)"
              : isDragOver
                ? "rgba(140, 220, 255, 0.7)"
                : "rgba(200, 230, 255, 0.25)"
          }`,
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
        {/* チェッカーボード背景（マスク適用時に透明部分を可視化） */}
        {hasMask && (
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
          onClick={handleCanvasClick}
          onContextMenu={handleCanvasContextMenu}
          style={{
            display: hasImage ? "block" : "none",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            position: "relative",
            cursor: canvasCursor,
          }}
        />

        {/* ルアー抽出モードのガイド表示 */}
        {lureMode === "ready" && !lureExtracted && (
          <div style={{
            position: "absolute",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.7)",
            color: "rgba(255, 200, 100, 0.9)",
            fontSize: "12px",
            padding: "6px 14px",
            borderRadius: "20px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}>
            ルアーをクリック（右クリックで背景を除外）
          </div>
        )}

        {/* モデルロード中のプログレス */}
        {lureMode === "loading" && (
          <div style={{
            position: "absolute",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.7)",
            color: "rgba(200, 230, 255, 0.8)",
            fontSize: "12px",
            padding: "6px 14px",
            borderRadius: "20px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}>
            AIモデル読込中... {modelProgress}%
          </div>
        )}

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
          {/* ルアー抽出ボタン */}
          <ToolButton
            active={lureMode !== "off" || lureExtracted}
            disabled={lureMode === "loading" || lureMode === "segmenting"}
            onClick={handleStartLureMode}
            title={
              lureExtracted ? "ルアー抽出を解除"
                : lureMode === "loading" ? "モデル読込中..."
                : lureMode === "ready" ? "クリックで指定"
                : "ルアーを抽出"
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
              <path d="M11 8v6M8 11h6" />
            </svg>
            {lureExtracted ? "抽出解除"
              : lureMode === "loading" ? `読込中 ${modelProgress}%`
              : lureMode === "ready" || lureMode === "segmenting" ? "クリックで指定"
              : "ルアー抽出"}
          </ToolButton>

          {/* 背景除去ボタン */}
          <ToolButton
            active={bgRemoved}
            disabled={bgRemoving || lureMode !== "off"}
            onClick={handleToggleBgRemoval}
            title={bgRemoving ? "処理中..." : bgRemoved ? "背景を復元" : "背景を除去"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M3 9h18" strokeDasharray={bgRemoved ? "none" : "3 2"} />
            </svg>
            {bgRemoving ? "処理中..." : bgRemoved ? "背景復元" : "背景除去"}
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
  disabled,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
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
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.5 : 1,
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
