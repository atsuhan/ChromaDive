import { transformColorAtDepth } from "./colorScience";
import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";

export interface ImageProcessor {
  applyDepthFilter(
    depth: number,
    absorptionMultiplier?: number,
    lightMultiplier?: number,
  ): ImageData;
  removeBackground(): Promise<void>;
  restoreBackground(): void;
  hasBackgroundRemoved(): boolean;
  width: number;
  height: number;
}

/**
 * 画像のピクセルデータを保持し、深度に応じたフィルタを適用する
 */
export function createImageProcessor(
  imageElement: HTMLImageElement,
  maxSize: number = 600
): ImageProcessor {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // アスペクト比を保持してリサイズ
  let { width, height } = imageElement;
  if (width > maxSize || height > maxSize) {
    const scale = maxSize / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(imageElement, 0, 0, width, height);

  const originalData = ctx.getImageData(0, 0, width, height);
  const originalPixels = new Uint8ClampedArray(originalData.data);

  // 背景除去後のアルファマスク（null = 未適用）
  let alphaMask: Uint8ClampedArray | null = null;

  let cachedKey = "";
  let cachedResult: ImageData | null = null;

  return {
    width,
    height,

    /**
     * 背景除去: @imgly/background-removal のAIモデルで前景を抽出
     *
     * ブラウザ上でONNX Runtimeを使い、U²-Netベースのセグメンテーションを実行。
     * 結果のアルファチャンネルをマスクとして保持する。
     */
    async removeBackground() {
      // 元画像をBlobに変換してライブラリに渡す
      canvas.width = width;
      canvas.height = height;
      ctx.putImageData(originalData, 0, 0);
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      const resultBlob = await imglyRemoveBackground(blob, {
        // 初回はモデルをダウンロードするため時間がかかる
        progress: (key: string, current: number, total: number) => {
          console.log(`[背景除去] ${key}: ${Math.round((current / total) * 100)}%`);
        },
      });

      // 結果画像からアルファマスクを抽出
      const resultImg = new Image();
      await new Promise<void>((resolve) => {
        resultImg.onload = () => resolve();
        resultImg.src = URL.createObjectURL(resultBlob);
      });

      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = width;
      tmpCanvas.height = height;
      const tmpCtx = tmpCanvas.getContext("2d")!;
      tmpCtx.drawImage(resultImg, 0, 0, width, height);
      URL.revokeObjectURL(resultImg.src);

      const resultData = tmpCtx.getImageData(0, 0, width, height);
      const mask = new Uint8ClampedArray(width * height);
      for (let i = 0; i < mask.length; i++) {
        mask[i] = resultData.data[i * 4 + 3];
      }

      alphaMask = mask;
      cachedKey = "";
      cachedResult = null;
    },

    restoreBackground() {
      alphaMask = null;
      cachedKey = "";
      cachedResult = null;
    },

    hasBackgroundRemoved() {
      return alphaMask !== null;
    },

    applyDepthFilter(
      depth: number,
      absorptionMultiplier: number = 1.0,
      lightMultiplier: number = 1.0,
    ): ImageData {
      const key = `${Math.round(depth)}_${absorptionMultiplier.toFixed(2)}_${lightMultiplier.toFixed(2)}_${alphaMask ? "masked" : "full"}`;
      if (key === cachedKey && cachedResult) {
        return cachedResult;
      }

      const output = ctx.createImageData(width, height);
      const src = originalPixels;
      const dst = output.data;

      for (let i = 0; i < src.length; i += 4) {
        const pixelIdx = i / 4;

        // 背景除去が有効な場合、透明ピクセルはスキップ
        if (alphaMask && alphaMask[pixelIdx] === 0) {
          dst[i] = 0;
          dst[i + 1] = 0;
          dst[i + 2] = 0;
          dst[i + 3] = 0;
          continue;
        }

        // 深度フィルタ
        const [r, g, b] = transformColorAtDepth(
          src[i], src[i + 1], src[i + 2],
          depth, absorptionMultiplier, lightMultiplier
        );

        dst[i] = r;
        dst[i + 1] = g;
        dst[i + 2] = b;

        // アルファ: 元のアルファ × 背景除去マスク
        const origAlpha = src[i + 3];
        dst[i + 3] = alphaMask
          ? Math.round(origAlpha * alphaMask[pixelIdx] / 255)
          : origAlpha;
      }

      cachedKey = key;
      cachedResult = output;
      return output;
    },
  };
}
