import { encodeCanvas, flattenAlpha, resolveMime, tryFitAtScale } from "./compress-to-limit";
import { decodeCachedImage } from "./decode-image";
import { drawStepped } from "./resample";
import { unsharpMask } from "./sharpen";
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

/**
 * El target es un cap de LADO MAYOR (igual que el decode): así un vertical
 * con upscale no se inventa 3× píxeles por encima del cap.
 */
function fitSize(w: number, h: number, targetWidth: number, allowUpscale: boolean): { w: number; h: number } {
  const m = Math.max(w, h);
  if (m === targetWidth) return { w, h };
  // Solo se reduce por defecto: ampliar inventa píxeles (opt-in explícito).
  if (m > targetWidth || (m < targetWidth && allowUpscale)) {
    const s = targetWidth / m;
    return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
  }
  return { w, h };
}

/**
 * Estilos de salida plana (pocos colores): el PNG lossless preserva los
 * bordes duros sin el ringing del WebP lossy, y en paleta plana suele caber
 * en el límite. Solo auto cuando el usuario no forzó JPEG/PNG.
 */
const FLAT_STYLE_IDS = new Set(["pixel-art", "dither", "ballpoint"]);

/**
 * Estilos continuos con textura real que se beneficia del enfoque tras
 * reducir. Excluye blur (desenfocar lo recién enfocado no tiene sentido),
 * ballpoint (el enfoque añade tinta y bytes justo donde más cuesta) y
 * footer-fade/dither/pixel-art (el enfoque antes del tramado/mosaico solo
 * añade aspereza).
 */
const SHARPEN_STYLE_IDS = new Set(["grayscale", "duotone", "frosted"]);

/** Factor de reducción por ronda cuando no cabe en el límite. */
const SCALE_STEP = 0.85;
const MAX_ROUNDS = 8;

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
  const base = fitSize(decoded.width, decoded.height, targetWidth, allowUpscale);

  // defaults del schema garantizados
  const params: StyleParams = { ...(styleParams ?? {}) };
  for (const p of style.params) {
    if (!(p.key in params)) params[p.key] = p.defaultValue;
  }

  const renderAt = async (w: number, h: number): Promise<HTMLCanvasElement> => {
    // resize progresivo desde el decode (nunca desde lo ya estilizado).
    // willReadFrequently en la creación: el getImageData de abajo lo necesita.
    const resized = drawStepped(decoded.canvas, decoded.width, decoded.height, w, h, {
      willReadFrequently: true,
    });
    let srcData = resized.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, w, h);
    // unsharp solo si hubo re-muestreo real (1:1 no perdió nada)
    if (SHARPEN_STYLE_IDS.has(style.id) && (w !== decoded.width || h !== decoded.height)) {
      srcData = unsharpMask(srcData);
    }
    onStage?.("style");
    const styled = await style.apply(srcData, params);
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    out.getContext("2d")!.putImageData(styled, 0, 0);
    return out;
  };

  let scale = 1;
  let lastCanvas: HTMLCanvasElement | null = null;
  let lastW = base.w;
  let lastH = base.h;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const w = Math.max(1, Math.round(base.w * scale));
    const h = Math.max(1, Math.round(base.h * scale));
    lastW = w;
    lastH = h;
    const styledCanvas = await renderAt(w, h);
    lastCanvas = styledCanvas;

    onStage?.("compress");
    const primary = await tryFitAtScale(styledCanvas, output, maxBytes);
    // PNG automático para estilos planos: solo si el WebP no resolvió bien
    // (sin fit, o a calidad baja). Si el WebP ya entra a q≥0.8, el encode
    // PNG extra (1-3s a 4K) no aporta nada.
    const pngAuto =
      output === "image/webp" &&
      FLAT_STYLE_IDS.has(style.id) &&
      (!primary || primary.quality < 0.8)
        ? await tryFitAtScale(styledCanvas, "image/png", maxBytes)
        : null;
    const chosen = pngAuto ?? primary;
    if (chosen) {
      onStage?.("done");
      const url = URL.createObjectURL(chosen.blob);
      return {
        blob: chosen.blob,
        url,
        width: w,
        height: h,
        requestedWidth: base.w,
        requestedHeight: base.h,
        size: chosen.blob.size,
        mime: chosen.mime,
        quality: chosen.quality,
        style,
        originalWidth: decoded.width,
        originalHeight: decoded.height,
        originalSize: decoded.originalSize,
        detectedMime: decoded.detectedMime,
        underLimit: chosen.blob.size <= maxBytes,
      };
    }

    scale *= SCALE_STEP;
    if (scale < 0.2 || w <= 64) break;
  }

  // Fallback: lo más pequeño a calidad mínima (puede exceder el límite;
  // la UI lo marca con underLimit=false en vez de fallar en silencio).
  onStage?.("compress");
  const mime = await resolveMime(output);
  const last = lastCanvas!;
  // El retry a JPEG siempre aplana: toBlob a JPEG descarta el alpha sobre
  // negro y aquí el mime puede ser PNG (con alpha) aunque el retry sea JPEG.
  const forMime = mime === "image/jpeg" ? flattenAlpha(last) : last;
  let fbBlob = await encodeCanvas(forMime, mime, 0.3);
  let fbMime: string = mime;
  let fbQuality = 0.3;
  if (!fbBlob) {
    fbBlob = await encodeCanvas(flattenAlpha(last), "image/jpeg", 0.5);
    fbMime = "image/jpeg";
    fbQuality = 0.5;
  }
  if (!fbBlob) throw new Error("No se pudo comprimir bajo el límite.");
  onStage?.("done");
  const url = URL.createObjectURL(fbBlob);
  return {
    blob: fbBlob,
    url,
    width: lastW,
    height: lastH,
    requestedWidth: base.w,
    requestedHeight: base.h,
    size: fbBlob.size,
    mime: fbMime,
    quality: fbQuality,
    style,
    originalWidth: decoded.width,
    originalHeight: decoded.height,
    originalSize: decoded.originalSize,
    detectedMime: decoded.detectedMime,
    underLimit: fbBlob.size <= maxBytes,
  };
}
