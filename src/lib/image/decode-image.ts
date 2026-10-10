export interface ImageDecodeResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  detectedMime: string;
  originalSize: number;
  originalName: string;
  decoder: "bitmap" | "img" | "img-svg" | "utif" | "heic-to";
}

export const SUPPORTED_INPUT_ACCEPT = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
  ".bmp",
  ".ico",
  ".svg",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
  "image/*",
].join(",");

/** Techo anti-OOM: más allá se rechaza con mensaje claro. */
export const MAX_DECODE_MEGAPIXELS = 64;

function assertMegapixels(w: number, h: number, name: string): void {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    throw new Error(`No se pudo leer las dimensiones de ${name}.`);
  }
  if ((w * h) / 1_000_000 > MAX_DECODE_MEGAPIXELS) {
    throw new Error(
      `Imagen demasiado grande (${w}×${h}). Límite: ${MAX_DECODE_MEGAPIXELS} MP. Prueba con una versión más pequeña.`
    );
  }
}

function fitInside(w: number, h: number, maxSide: number): { w: number; h: number } {
  const m = Math.max(w, h);
  if (m <= maxSide) return { w, h };
  const s = maxSide / m;
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

function drawHighQuality(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  w: number,
  h: number
): void {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
}

function sniffMime(bytes: Uint8Array, fallbackType: string): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    // RIFF....WEBP (verifica la marca: un WAV también es RIFF)
    const tag = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (tag === "WEBP") return "image/webp";
    return fallbackType || "application/octet-stream";
  }
  if (bytes.length >= 12) {
    const box = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (box === "ftyp") {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (brand === "avif" || brand.startsWith("av")) return "image/avif";
      if (
        brand === "heic" || brand === "heix" || brand === "hevc" || brand === "hevx" ||
        brand === "heim" || brand === "heis" || brand === "hevm" || brand === "hevs" ||
        brand === "mif1" || brand === "msf1"
      ) {
        return brand === "mif1" || brand === "msf1" ? "image/heif" : "image/heic";
      }
    }
  }
  if (bytes.length >= 4 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";
  if (bytes.length >= 4 && ((bytes[0] === 0x49 && bytes[1] === 0x49) || (bytes[0] === 0x4d && bytes[1] === 0x4d))) return "image/tiff";
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) return "image/x-icon";
  return fallbackType || "application/octet-stream";
}

async function blobToCanvasViaBitmap(blob: Blob, maxSide: number, name: string): Promise<HTMLCanvasElement> {
  let bitmap = await createImageBitmap(blob);
  try {
    assertMegapixels(bitmap.width, bitmap.height, name);
    const target = fitInside(bitmap.width, bitmap.height, maxSide);
    if (target.w !== bitmap.width || target.h !== bitmap.height) {
      // segunda pasada ya escalada: nunca se materializa el full-res en canvas
      const small = await createImageBitmap(blob, {
        resizeWidth: target.w,
        resizeHeight: target.h,
        resizeQuality: "high",
      });
      bitmap.close();
      bitmap = small;
    }
    const canvas = document.createElement("canvas");
    drawHighQuality(canvas, bitmap, bitmap.width, bitmap.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}

function loadImageElement(blob: Blob): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = "async";
  return new Promise((resolve, reject) => {
    img.onload = () => resolve({ img, revoke: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode-failed"));
    };
    img.src = url;
  });
}

async function blobToCanvasViaImage(blob: Blob, maxSide: number, name: string): Promise<HTMLCanvasElement> {
  const { img, revoke } = await loadImageElement(blob);
  try {
    // SVG sin tamaño intrínseco -> rasteriza directo al cap (más calidad)
    const w = img.naturalWidth || img.width || 1200;
    const h = img.naturalHeight || img.height || Math.round(w * 0.5);
    assertMegapixels(w, h, name);
    const target = fitInside(w, h, maxSide);
    const canvas = document.createElement("canvas");
    drawHighQuality(canvas, img, target.w, target.h);
    return canvas;
  } finally {
    revoke();
  }
}

async function decodeTiff(file: File, maxSide: number): Promise<HTMLCanvasElement> {
  const { default: UTIF } = await import("utif");
  const buf = await file.arrayBuffer();
  const ifds = UTIF.decode(buf);
  if (!ifds || ifds.length === 0) throw new Error("tiff-decode-failed");
  const first = ifds[0];
  const ifd = first as unknown as Record<string, number[]>;
  const w = ifd["t256"]?.[0] ?? (first as unknown as { width: number }).width;
  const h = ifd["t257"]?.[0] ?? (first as unknown as { height: number }).height;
  assertMegapixels(w, h, file.name);
  UTIF.decodeImage(buf, first);
  const rgba = UTIF.toRGBA8(first);
  const full = document.createElement("canvas");
  full.width = w;
  full.height = h;
  const fctx = full.getContext("2d")!;
  const imageData = fctx.createImageData(w, h);
  imageData.data.set(rgba.subarray(0, w * h * 4));
  fctx.putImageData(imageData, 0, 0);
  const target = fitInside(w, h, maxSide);
  if (target.w === w && target.h === h) return full;
  const canvas = document.createElement("canvas");
  drawHighQuality(canvas, full, target.w, target.h);
  return canvas;
}

async function decodeHeic(file: File, maxSide: number): Promise<HTMLCanvasElement> {
  const { heicTo } = await import("heic-to");
  // bitmap directo: sin PNG intermedio, sin copiar el File (ya es un Blob)
  const bitmap = await heicTo({ blob: file, type: "bitmap" });
  try {
    assertMegapixels(bitmap.width, bitmap.height, file.name);
    const target = fitInside(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement("canvas");
    drawHighQuality(canvas, bitmap, target.w, target.h);
    return canvas;
  } finally {
    bitmap.close();
  }
}

export interface DecodeOptions {
  /** Lado máximo a decodificar (el pipeline pasa su targetWidth). */
  maxSide?: number;
}

/**
 * Decodes ANY supported input file into a canvas, capped at maxSide.
 * Order: TIFF -> HEIC -> createImageBitmap -> <img> fallback -> SVG path.
 */
export async function decodeImage(file: File, opts: DecodeOptions = {}): Promise<ImageDecodeResult> {
  const maxSide = Math.max(64, Math.round(opts.maxSide ?? 2048));
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const sniffed = sniffMime(head, file.type);
  const isSvg =
    sniffed.includes("svg") ||
    file.name.toLowerCase().endsWith(".svg") ||
    file.type.includes("svg");

  let canvas: HTMLCanvasElement | null = null;
  let decoder: ImageDecodeResult["decoder"] = "bitmap";

  if (sniffed === "image/tiff" || /\.tiff?$/i.test(file.name)) {
    canvas = await decodeTiff(file, maxSide);
    decoder = "utif";
  } else if (sniffed === "image/heic" || sniffed === "image/heif" || /\.hei(c|f)$/i.test(file.name)) {
    canvas = await decodeHeic(file, maxSide);
    decoder = "heic-to";
  } else if (isSvg) {
    canvas = await blobToCanvasViaImage(file, maxSide, file.name);
    decoder = "img-svg";
  } else {
    try {
      canvas = await blobToCanvasViaBitmap(file, maxSide, file.name);
      decoder = "bitmap";
    } catch {
      // GIF animado -> primer frame vía <img>; AVIF/BMP/ICO antiguos -> <img>
      canvas = await blobToCanvasViaImage(file, maxSide, file.name);
      decoder = "img";
    }
  }

  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error("No se pudo decodificar la imagen. Prueba con JPG, PNG o WebP.");
  }

  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
    detectedMime: sniffed,
    originalSize: file.size,
    originalName: file.name,
    decoder,
  };
}

/** Decode cacheado por File+maxSide: los sliders no reinician workers. */
const decodeCache = new WeakMap<File, Map<number, Promise<ImageDecodeResult>>>();

export function decodeCachedImage(file: File, maxSide: number): Promise<ImageDecodeResult> {
  let bySize = decodeCache.get(file);
  if (!bySize) {
    bySize = new Map();
    decodeCache.set(file, bySize);
  }
  const key = Math.max(64, Math.round(maxSide));
  let pending = bySize.get(key);
  if (!pending) {
    pending = decodeImage(file, { maxSide: key });
    // si falla, no envenena la caché
    pending.catch(() => bySize?.delete(key));
    bySize.set(key, pending);
  }
  return pending;
}
