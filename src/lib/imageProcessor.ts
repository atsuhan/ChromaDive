import { transformColorAtDepth } from "./colorScience";

export interface ImageProcessor {
  applyDepthFilter(depth: number): ImageData;
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

  let cachedDepth = -1;
  let cachedResult: ImageData | null = null;

  return {
    width,
    height,
    applyDepthFilter(depth: number): ImageData {
      const roundedDepth = Math.round(depth);
      if (roundedDepth === cachedDepth && cachedResult) {
        return cachedResult;
      }

      const output = ctx.createImageData(width, height);
      const src = originalPixels;
      const dst = output.data;

      for (let i = 0; i < src.length; i += 4) {
        const [r, g, b] = transformColorAtDepth(src[i], src[i + 1], src[i + 2], depth);
        dst[i] = r;
        dst[i + 1] = g;
        dst[i + 2] = b;
        dst[i + 3] = src[i + 3]; // alphaはそのまま
      }

      cachedDepth = roundedDepth;
      cachedResult = output;
      return output;
    },
  };
}
