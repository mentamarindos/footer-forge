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

const mimeSupportCache = new Map<string, boolean>();

async function supportsMime(mime: string): Promise<boolean> {
  const cached = mimeSupportCache.get(mime);
  if (cached !== undefined) return cached;
  const c = document.createElement("canvas");
  c.width = c.height = 8;
  const b = await canvasToBlob(c, mime, 0.8);
  const ok = !!b && b.type === mime;
  mimeSupportCache.set(mime, ok);
  return ok;
}

function drawScaled(source: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  const next = document.createElement("canvas");
  next.width = Math.max(64, w);
  next.height = Math.max(64, h);
  const ctx = next.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, next.width, next.height);
  return next;
}

/**
 * JPEG no tiene alpha: aplana sobre fondo claro para no dejar bandas negras.
 * Llamar solo cuando el mime final no soporta transparencia.
 */
function flattenAlpha(source: HTMLCanvasElement, bg = "#ffffff"): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0);
  return out;
}

/**
 * Mejor calidad que quepa en maxBytes a esta escala (búsqueda binaria).
 * Devuelve el blob de MAYOR calidad que cumple, o null si ni q=0.3 cabe.
 */
async function bestQualityFit(
  canvas: HTMLCanvasElement,
  mime: string,
  maxBytes: number,
  counter: { attempts: number }
): Promise<{ blob: Blob; quality: number } | null> {
  let lo = 0.3;
  let hi = 0.95;

  const probe = async (q: number) => {
    counter.attempts++;
    return canvasToBlob(canvas, mime, q);
  };

  const first = await probe(hi);
  if (!first) return null;
  if (first.size <= maxBytes) return { blob: first, quality: hi };
  // atajo: si ni a mínima calidad hay esperanza, escalar directo
  const worst = await probe(lo);
  if (!worst) return null;
  if (worst.size > maxBytes * 1.6) return null;

  let candidate: { blob: Blob; quality: number } = { blob: worst, quality: lo };
  // worst ya cabe si worst.size <= maxBytes (si no, candidate se descarta abajo)
  let fits = worst.size <= maxBytes;
  if (!fits) {
    // ni q=0.3 cabe: no hay nada que rescatar a esta escala
    return null;
  }
  while (hi - lo > 0.07) {
    const mid = (lo + hi) / 2;
    const blob = await probe(mid);
    if (!blob) return candidate;
    if (blob.size <= maxBytes) {
      candidate = { blob, quality: mid };
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return candidate;
}

/**
 * Comprime un canvas hasta que pese <= maxBytes.
 * Estrategia: máxima calidad que quepa (búsqueda binaria); si ni q=0.3
 * cabe, escala ×0.85 y repite.
 */
export async function compressToLimit(
  source: HTMLCanvasElement,
  maxBytes = 102_400,
  preferred: "image/webp" | "image/jpeg" | "image/png" = "image/webp"
): Promise<CompressResult> {
  let mime = preferred;
  if (mime === "image/webp" && !(await supportsMime("image/webp"))) mime = "image/jpeg";

  // el canvas de trabajo: sin alpha si el destino no lo soporta
  let base = mime === "image/jpeg" ? flattenAlpha(source) : source;
  const counter = { attempts: 0 };

  if (mime === "image/png") {
    // PNG no tiene quality: solo escala
    let scale = 1;
    let current = base;
    for (;;) {
      counter.attempts++;
      const blob = await canvasToBlob(current, "image/png", 1);
      if (!blob) throw new Error("encode-failed");
      if (blob.size <= maxBytes || scale < 0.25 || current.width <= 64) {
        return { blob, finalWidth: current.width, finalHeight: current.height, mime: "image/png", quality: 1, attempts: counter.attempts };
      }
      scale *= 0.85;
      current = drawScaled(source, Math.round(source.width * scale), Math.round(source.height * scale));
      if (counter.attempts > 12) {
        return { blob, finalWidth: current.width, finalHeight: current.height, mime: "image/png", quality: 1, attempts: counter.attempts };
      }
    }
  }

  let scale = 1;
  let current = base;

  for (let round = 0; round < 8; round++) {
    const fit = await bestQualityFit(current, mime, maxBytes, counter);
    if (fit) {
      return { blob: fit.blob, finalWidth: current.width, finalHeight: current.height, mime, quality: fit.quality, attempts: counter.attempts };
    }
    scale *= 0.85;
    if (scale < 0.2 || current.width <= 64) break;
    current = drawScaled(base, Math.round(base.width * scale), Math.round(base.height * scale));
  }

  const fallback = (await canvasToBlob(current, mime, 0.3)) ?? (await canvasToBlob(current, "image/jpeg", 0.5));
  if (!fallback) throw new Error("No se pudo comprimir bajo el límite.");
  counter.attempts += 1;
  return { blob: fallback, finalWidth: current.width, finalHeight: current.height, mime: fallback.type, quality: 0.3, attempts: counter.attempts };
}
