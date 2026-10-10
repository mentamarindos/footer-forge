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

function sniffMime(bytes: Uint8Array, fallbackType: string): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (bytes.length >= 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    // RIFF....WEBP
    return "image/webp";
  }
  if (bytes.length >= 12) {
    const box = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (box === "ftyp") {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (brand === "avif" || brand.startsWith("av")) return "image/avif";
      if (brand === "heic" || brand === "heix" || brand === "hevc" || brand === "hevx") return "image/heic";
      if (brand === "mif1") return "image/heif";
    }
  }
  if (bytes.length >= 4 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";
  if (bytes.length >= 4 && ((bytes[0] === 0x49 && bytes[1] === 0x49) || (bytes[0] === 0x4d && bytes[1] === 0x4d))) return "image/tiff";
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) return "image/x-icon";
  return fallbackType || "application/octet-stream";
}

async function blobToCanvasViaBitmap(blob: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

async function blobToCanvasViaImage(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode-failed"));
      img.src = url;
    });
    // SVG without intrinsic size -> default to 1200 wide
    const w = img.naturalWidth || img.width || 1200;
    const h = img.naturalHeight || img.height || Math.round(w * 0.5);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeTiff(file: File): Promise<HTMLCanvasElement> {
  const { default: UTIF } = await import("utif");
  const buf = await file.arrayBuffer();
  const ifds = UTIF.decode(buf);
  if (!ifds || ifds.length === 0) throw new Error("tiff-decode-failed");
  const first = ifds[0];
  UTIF.decodeImage(buf, first);
  const rgba = UTIF.toRGBA8(first);
  const canvas = document.createElement("canvas");
  const ifd = first as unknown as Record<string, number[]>;
  canvas.width = ifd["t256"]?.[0] ?? (first as unknown as { width: number }).width;
  canvas.height = ifd["t257"]?.[0] ?? (first as unknown as { height: number }).height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  imageData.data.set(rgba.subarray(0, canvas.width * canvas.height * 4));
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

async function decodeHeic(file: File): Promise<HTMLCanvasElement> {
  const { heicTo } = await import("heic-to");
  const buf = await file.arrayBuffer();
  const src = new File([buf], file.name || "input.heic", { type: "image/heic" });
  const outBlob = await heicTo({ blob: src, type: "image/png" });
  const blob = outBlob instanceof Blob ? outBlob : new Blob([outBlob as unknown as BlobPart]);
  return blobToCanvasViaBitmap(blob);
}

/**
 * Decodes ANY supported input file into a canvas.
 * Order: TIFF -> HEIC -> createImageBitmap -> <img> fallback -> SVG path.
 */
export async function decodeImage(file: File): Promise<ImageDecodeResult> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const sniffed = sniffMime(head, file.type);
  const isSvg =
    sniffed.includes("svg") ||
    file.name.toLowerCase().endsWith(".svg") ||
    file.type.includes("svg");

  let canvas: HTMLCanvasElement | null = null;
  let decoder: ImageDecodeResult["decoder"] = "bitmap";

  if (sniffed === "image/tiff" || /\.tiff?$/i.test(file.name)) {
    canvas = await decodeTiff(file);
    decoder = "utif";
  } else if (sniffed === "image/heic" || sniffed === "image/heif" || /\.hei(c|f)$/i.test(file.name)) {
    canvas = await decodeHeic(file);
    decoder = "heic-to";
  } else if (isSvg) {
    canvas = await blobToCanvasViaImage(file);
    decoder = "img-svg";
  } else {
    try {
      canvas = await blobToCanvasViaBitmap(file);
      decoder = "bitmap";
    } catch {
      // GIF animado -> primer frame vía <img>; AVIF/BMP/ICO antiguos -> <img>
      canvas = await blobToCanvasViaImage(file);
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
