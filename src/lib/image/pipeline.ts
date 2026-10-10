import { compressToLimit } from "./compress-to-limit";
import { decodeImage } from "./decode-image";
import { getStyle, type StyleDefinition } from "./styles";
import type { StyleParams } from "./styles/types";

export interface ProcessOptions {
  styleId?: string;
  styleParams?: StyleParams;
  targetWidth?: number;
  maxBytes?: number;
  output?: "image/webp" | "image/jpeg" | "image/png";
}

export interface ProcessResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
  mime: string;
  quality: number;
  style: StyleDefinition;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  detectedMime: string;
  underLimit: boolean;
}

function fitSize(w: number, h: number, targetWidth: number): { w: number; h: number } {
  if (w <= targetWidth) return { w, h };
  const s = targetWidth / w;
  return { w: targetWidth, h: Math.max(1, Math.round(h * s)) };
}

/** Pipeline completo: decode -> resize -> style -> compress */
export async function processImage(file: File, opts: ProcessOptions = {}): Promise<ProcessResult> {
  const {
    styleId = "pixel-art",
    styleParams,
    targetWidth = 640,
    maxBytes = 102_400,
    output = "image/webp",
  } = opts;

  const style = getStyle(styleId);
  const decoded = await decodeImage(file);
  const { w, h } = fitSize(decoded.width, decoded.height, targetWidth);

  // resize base
  const base = document.createElement("canvas");
  base.width = w;
  base.height = h;
  const bctx = base.getContext("2d", { willReadFrequently: true })!;
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(decoded.canvas, 0, 0, w, h);

  // style
  const params: StyleParams = { ...(styleParams ?? {}) };
  for (const p of style.params) {
    if (!(p.key in params)) params[p.key] = p.defaultValue;
  }
  const srcData = bctx.getImageData(0, 0, w, h);
  const styled = style.apply(srcData, params);

  const styledCanvas = document.createElement("canvas");
  styledCanvas.width = w;
  styledCanvas.height = h;
  styledCanvas.getContext("2d")!.putImageData(styled, 0, 0);

  // compress
  const c = await compressToLimit(styledCanvas, maxBytes, output);
  const url = URL.createObjectURL(c.blob);

  return {
    blob: c.blob,
    url,
    width: c.finalWidth,
    height: c.finalHeight,
    size: c.blob.size,
    mime: c.mime,
    quality: c.quality,
    style,
    originalWidth: decoded.width,
    originalHeight: decoded.height,
    originalSize: decoded.originalSize,
    detectedMime: decoded.detectedMime,
    underLimit: c.blob.size <= maxBytes,
  };
}
