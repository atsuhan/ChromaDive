import { transformColorAtDepth, applyUVFluorescence, applyGlowEffect } from "./colorScience";
import { LureColorType } from "@/types";

export interface ImageProcessor {
  applyDepthFilter(
    depth: number,
    absorptionMultiplier?: number,
    lightMultiplier?: number,
    lureColorType?: LureColorType
  ): ImageData;
  removeBackground(tolerance?: number): void;
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
     * 背景除去: Flood Fill で四隅から類似色を透明にする
     *
     * 1. 四隅のピクセルを「背景色」としてサンプリング
     * 2. 各隅からFlood Fillで色差がtolerance以内のピクセルを透明化
     * 3. 境界にフェザリング（半透明グラデーション）を適用
     */
    removeBackground(tolerance: number = 30) {
      const mask = new Uint8ClampedArray(width * height);
      mask.fill(255); // 全ピクセル不透明から開始

      const src = originalPixels;
      const visited = new Uint8Array(width * height);

      // 四隅のサンプルポイント
      const corners = [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1],
      ];

      for (const [cx, cy] of corners) {
        const ci = (cy * width + cx) * 4;
        const bgR = src[ci];
        const bgG = src[ci + 1];
        const bgB = src[ci + 2];

        // BFS Flood Fill
        const queue: [number, number][] = [[cx, cy]];
        const key = cy * width + cx;
        if (visited[key]) continue;
        visited[key] = 1;

        while (queue.length > 0) {
          const [x, y] = queue.shift()!;
          const idx = (y * width + x) * 4;

          const dr = src[idx] - bgR;
          const dg = src[idx + 1] - bgG;
          const db = src[idx + 2] - bgB;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);

          if (dist <= tolerance) {
            // フェザリング: 閾値に近いほど半透明
            const feather = dist > tolerance * 0.6
              ? Math.round(255 * (dist - tolerance * 0.6) / (tolerance * 0.4))
              : 0;
            mask[y * width + x] = feather;

            // 隣接ピクセルをキューに追加
            const neighbors: [number, number][] = [
              [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
            ];
            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nk = ny * width + nx;
                if (!visited[nk]) {
                  visited[nk] = 1;
                  queue.push([nx, ny]);
                }
              }
            }
          }
        }
      }

      // エッジスムージング: 3x3カーネルで境界をなめらかに
      const smoothed = new Uint8ClampedArray(mask);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          // 完全不透明でも完全透明でもないピクセルの周囲を平均化
          if (mask[idx] > 0 && mask[idx] < 255) {
            let sum = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                sum += mask[(y + dy) * width + (x + dx)];
              }
            }
            smoothed[idx] = Math.round(sum / 9);
          }
        }
      }

      alphaMask = smoothed;
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
      lureColorType: LureColorType = "none"
    ): ImageData {
      const key = `${Math.round(depth)}_${absorptionMultiplier.toFixed(2)}_${lightMultiplier.toFixed(2)}_${lureColorType}_${alphaMask ? "masked" : "full"}`;
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

        // 通常の深度フィルタ
        let [r, g, b] = transformColorAtDepth(
          src[i], src[i + 1], src[i + 2],
          depth, absorptionMultiplier, lightMultiplier
        );

        // UV/グロー効果の適用
        if (lureColorType === "uv") {
          [r, g, b] = applyUVFluorescence(r, g, b, depth, absorptionMultiplier, lightMultiplier);
        } else if (lureColorType === "glow") {
          [r, g, b] = applyGlowEffect(r, g, b, depth, absorptionMultiplier, lightMultiplier);
        }

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
