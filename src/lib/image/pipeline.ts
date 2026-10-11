import { compressToLimit } from "./compress-to-limit";
import { decodeCachedImage } from "./decode-image";
import { getStyle, type StyleDefinition } from "./styles";
import type { StyleParams } from "./styles/types";

export type ProcessStage = "decode" | "style" | "compress" | "done";

export interface ProcessOptions {
  styleId?: string;
  styleParams?: StyleParams;
  targetWidth?: number;
  maxBytes?: number;
  output?: "image/webp" | "image/jpeg" | "image/png";
  onStage?: (stage: ProcessStage) => void;
  /** Permite ampliar (suavizado de alta calidad, sin detalle nuevo). */
  allowUpscale?: boolean;
}

export interface ProcessResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  /** Dimensiones pedidas antes de comprimir (pueden diferir si se redujo). */
  requestedWidth: number;
  requestedHeight: number;
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

function fitSize(w: number, h: number, targetWidth: number, allowUpscale: boolean): { w: number; h: number } {
  if (w === targetWidth) return { w, h };
  // Solo se reduce por defecto: ampliar inventa píxeles (opt-in explícito).
  if (w > targetWidth || (w < targetWidth && allowUpscale)) {
    const s = targetWidth / w;
    return { w: targetWidth, h: Math.max(1, Math.round(h * s)) };
  }
  return { w, h };
}

/** Pipeline completo: decode (cacheado) -> resize -> style -> compress */
export async function processImage(file: File, opts: ProcessOptions = {}): Promise<ProcessResult> {
  const {
    styleId = "pixel-art",
    styleParams,
    targetWidth = 640,
    maxBytes = 102_400,
    output = "image/webp",
    onStage,
    allowUpscale = false,
  } = opts;

  const style = getStyle(styleId);
  onStage?.("decode");
  // decode capado al target: nunca se materializa más de lo necesario,
  // y el resultado se reutiliza entre runs del mismo archivo
  const decoded = await decodeCachedImage(file, targetWidth);
  const { w, h } = fitSize(decoded.width, decoded.height, targetWidth, allowUpscale);

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
  onStage?.("style");
  const styled = await style.apply(srcData, params);

  const styledCanvas = document.createElement("canvas");
  styledCanvas.width = w;
  styledCanvas.height = h;
  styledCanvas.getContext("2d")!.putImageData(styled, 0, 0);

  // compress
  onStage?.("compress");
  const c = await compressToLimit(styledCanvas, maxBytes, output);
  onStage?.("done");
  const url = URL.createObjectURL(c.blob);

  return {
    blob: c.blob,
    url,
    width: c.finalWidth,
    height: c.finalHeight,
    requestedWidth: w,
    requestedHeight: h,
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
