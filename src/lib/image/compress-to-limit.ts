export interface FitResult {
  blob: Blob;
  mime: string;
  quality: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}

export function encodeCanvas(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Blob | null> {
  return canvasToBlob(canvas, mime, quality);
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

/**
 * JPEG no tiene alpha: aplana sobre fondo claro para no dejar bandas negras.
 * Llamar solo cuando el mime final no soporta transparencia.
 */
export function flattenAlpha(source: HTMLCanvasElement, bg = "#ffffff"): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0);
  return out;
}

/** Resuelve el mime real (WebP sin soporte cae a JPEG). */
export async function resolveMime(
  preferred: "image/webp" | "image/jpeg" | "image/png"
): Promise<"image/webp" | "image/jpeg" | "image/png"> {
  if (preferred === "image/webp" && !(await supportsMime("image/webp"))) return "image/jpeg";
  return preferred;
}

/**
 * Mejor calidad que quepa en maxBytes a ESTA escala (búsqueda binaria,
 * tolerancia 0.02: no se regala calidad).
 *
 * No re-escala nunca: si ni q=0.3 cabe devuelve null y el pipeline
 * re-estiliza a menor tamaño. Re-escalar lo ya estilizado rompería la
 * alineación de bloques de pixel-art/dither (bordes sucios).
 */
export async function tryFitAtScale(
  canvas: HTMLCanvasElement,
  preferred: "image/webp" | "image/jpeg" | "image/png",
  maxBytes: number
): Promise<FitResult | null> {
  const mime = await resolveMime(preferred);
  // el canvas de trabajo: sin alpha si el destino no lo soporta
  const base = mime === "image/jpeg" ? flattenAlpha(canvas) : canvas;

  if (mime === "image/png") {
    // PNG no tiene quality: un solo intento, cabe o no cabe
    const blob = await canvasToBlob(base, "image/png", 1);
    if (!blob || blob.size > maxBytes) return null;
    return { blob, mime: "image/png", quality: 1 };
  }

  const probe = (q: number) => canvasToBlob(base, mime, q);

  const first = await probe(0.95);
  if (!first) return null;
  if (first.size <= maxBytes) return { blob: first, mime, quality: 0.95 };

  const worst = await probe(0.3);
  if (!worst || worst.size > maxBytes) return null;

  let lo = 0.3;
  let hi = 0.95;
  let candidate: { blob: Blob; quality: number } = { blob: worst, quality: lo };
  while (hi - lo > 0.02) {
    const mid = (lo + hi) / 2;
    const blob = await probe(mid);
    if (!blob) break;
    if (blob.size <= maxBytes) {
      candidate = { blob, quality: mid };
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { blob: candidate.blob, mime, quality: candidate.quality };
}
