import {
  SamModel,
  AutoProcessor,
  RawImage,
  type Tensor,
  type ProgressInfo,
} from "@huggingface/transformers";

const MODEL_ID = "Xenova/slimsam-77-uniform";

/**
 * SlimSAM モデルのシングルトン管理
 *
 * SAM のエンコーダ+デコーダを一度だけロードし、以降は使い回す。
 * 初回ロード時にモデル（約10MB）をダウンロードする。
 */
let modelPromise: Promise<SamModelInstance> | null = null;

interface SamModelInstance {
  model: InstanceType<typeof SamModel>;
  processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
}

/** セグメンテーション結果 */
export interface SegmentationResult {
  /** 各ピクセルのアルファ値（0=背景, 255=前景） */
  mask: Uint8ClampedArray;
  width: number;
  height: number;
}

/** クリックポイントの種類 */
export interface ClickPoint {
  /** 元画像上のX座標（0〜width） */
  x: number;
  /** 元画像上のY座標（0〜height） */
  y: number;
  /** 1=前景（ルアー）, 0=背景 */
  label: 0 | 1;
}

function loadModel(
  onProgress?: (percent: number) => void
): Promise<SamModelInstance> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [model, processor] = await Promise.all([
        SamModel.from_pretrained(MODEL_ID, {
          progress_callback: (info: ProgressInfo) => {
            if ("progress" in info && typeof info.progress === "number" && onProgress) {
              onProgress(Math.round(info.progress));
            }
          },
        }),
        AutoProcessor.from_pretrained(MODEL_ID),
      ]);
      return { model: model as InstanceType<typeof SamModel>, processor };
    })();
  }
  return modelPromise;
}

/**
 * 画像のエンベディングを事前計算し、クリックごとに高速デコードできるセッションを返す
 *
 * SAM は「エンコーダ（重い、1回）→ デコーダ（軽い、クリックごと）」の2段構成。
 * エンベディングを保持しておくことで、クリックのたびにエンコーダを再実行せずに済む。
 */
export async function createSegmentationSession(
  imageElement: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  onProgress?: (percent: number) => void,
) {
  const { model, processor } = await loadModel(onProgress);

  // RawImage として読み込み、プロセッサで前処理
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageElement, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png");
  });
  const url = URL.createObjectURL(blob);
  const rawImage = await RawImage.read(url);
  URL.revokeObjectURL(url);

  const inputs = await processor(rawImage);

  // エンコーダを1回実行してエンベディングを取得
  const embeddings = await (model as unknown as {
    get_image_embeddings: (inputs: Record<string, unknown>) => Promise<Tensor>;
  }).get_image_embeddings(inputs);

  /**
   * クリック座標からセグメンテーションマスクを生成
   *
   * 前景/背景の両方のポイントを受け付ける。
   * 前景ポイントのみでも動作するが、背景ポイントを追加すると精度が上がる。
   */
  async function segmentAtPoints(
    points: ClickPoint[],
  ): Promise<SegmentationResult> {
    const inputPoints = [points.map((p) => [p.x, p.y])];
    const inputLabels = [points.map((p) => p.label)];

    const outputs = await (model as unknown as {
      (args: Record<string, unknown>): Promise<{ pred_masks: Tensor }>;
    })({
      ...inputs,
      image_embeddings: embeddings,
      input_points: inputPoints,
      input_labels: inputLabels,
    });

    // pred_masks: [batch, num_masks, H, W] — 最もスコアの高いマスクを使用
    const maskData = outputs.pred_masks;
    const maskArray = maskData.data as Float32Array;

    // SAM は複数マスク候補を返す。最初のマスク（最高スコア）を使用
    const maskHeight = maskData.dims[2];
    const maskWidth = maskData.dims[3];
    const singleMaskSize = maskHeight * maskWidth;

    // マスクをターゲットサイズにリサイズ
    const result = resizeMask(
      maskArray, maskWidth, maskHeight,
      targetWidth, targetHeight, singleMaskSize
    );

    return { mask: result, width: targetWidth, height: targetHeight };
  }

  function dispose() {
    // 将来的にリソース解放が必要になった場合のフック
  }

  return { segmentAtPoints, dispose };
}

/**
 * SAM 出力マスクをターゲットサイズにリサイズ
 *
 * SAM のマスクは元画像と異なるサイズで出力されるため、
 * nearest neighbor でリサイズする。0以上を前景（255）、それ以外を背景（0）に二値化。
 */
function resizeMask(
  maskArray: Float32Array,
  maskWidth: number,
  maskHeight: number,
  targetWidth: number,
  targetHeight: number,
  _offset: number,
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(targetWidth * targetHeight);
  const scaleX = maskWidth / targetWidth;
  const scaleY = maskHeight / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    const srcY = Math.min(Math.floor(y * scaleY), maskHeight - 1);
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.min(Math.floor(x * scaleX), maskWidth - 1);
      const val = maskArray[srcY * maskWidth + srcX];
      // SAM の出力は logit。0以上 = 前景
      result[y * targetWidth + x] = val > 0 ? 255 : 0;
    }
  }

  return result;
}

export type SegmentationSession = Awaited<ReturnType<typeof createSegmentationSession>>;
