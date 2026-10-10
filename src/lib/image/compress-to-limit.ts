export interface CompressResult {
  blob: Blob;
  finalWidth: number;
  finalHeight: number;
  mime: string;
  quality: number;
  attempts: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}

async function supportsMime(mime: string): Promise<boolean> {
  const c = document.createElement("canvas");
  c.width = c.height = 8;
  const b = await canvasToBlob(c, mime, 0.8);
  return !!b && b.type === mime;
}

/**
 * Comprime un canvas hasta que pese <= maxBytes.
 * Estrategia: baja quality 0.92 -> 0.35; si sigue grande, escala 0.9 y repite.
 */
export async function compressToLimit(
  source: HTMLCanvasElement,
  maxBytes = 102_400,
  preferred: "image/webp" | "image/jpeg" | "image/png" = "image/webp"
): Promise<CompressResult> {
  let mime = preferred;
  if (mime === "image/webp" && !(await supportsMime("image/webp"))) mime = "image/jpeg";
  if (mime === "image/png") {
    // PNG no tiene quality: solo escala
    let scale = 1;
    let attempts = 0;
    let current = source;
    for (;;) {
      attempts++;
      const blob = await canvasToBlob(current, "image/png", 1);
      if (!blob) throw new Error("encode-failed");
      if (blob.size <= maxBytes || scale < 0.25) {
        return { blob, finalWidth: current.width, finalHeight: current.height, mime: "image/png", quality: 1, attempts };
      }
      scale *= 0.85;
      const next = document.createElement("canvas");
      next.width = Math.max(64, Math.round(source.width * scale));
      next.height = Math.max(64, Math.round(source.height * scale));
      next.getContext("2d")!.drawImage(source, 0, 0, next.width, next.height);
      current = next;
      if (attempts > 12) {
        const last = await canvasToBlob(current, "image/png", 1);
        if (!last) throw new Error("encode-failed");
        return { blob: last, finalWidth: current.width, finalHeight: current.height, mime: "image/png", quality: 1, attempts };
      }
    }
  }

  let scale = 1;
  let attempts = 0;
  let current = source;

  for (let round = 0; round < 8; round++) {
    for (const q of [0.92, 0.82, 0.72, 0.62, 0.52, 0.42, 0.32]) {
      attempts++;
      const blob = await canvasToBlob(current, mime, q);
      if (!blob) continue;
      if (blob.size <= maxBytes) {
        return { blob, finalWidth: current.width, finalHeight: current.height, mime, quality: q, attempts };
      }
    }
    // achicar 15% y reintentar
    scale *= 0.85;
    if (scale < 0.2) break;
    const next = document.createElement("canvas");
    next.width = Math.max(64, Math.round(source.width * scale));
    next.height = Math.max(64, Math.round(source.height * scale));
    next.getContext("2d")!.drawImage(source, 0, 0, next.width, next.height);
    current = next;
  }

  // último intento con lo más chico/agresivo
  const fallback = (await canvasToBlob(current, mime, 0.3)) ?? (await canvasToBlob(current, "image/jpeg", 0.5));
  if (!fallback) throw new Error("No se pudo comprimir bajo el límite.");
  return { blob: fallback, finalWidth: current.width, finalHeight: current.height, mime: fallback.type, quality: 0.3, attempts };
}
