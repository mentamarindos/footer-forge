import type { StyleDefinition } from "./types";

/** Quantize one channel to N levels */
function q(v: number, levels: number): number {
  if (levels <= 1) return v > 127 ? 255 : 0;
  const step = 255 / (levels - 1);
  return Math.round(Math.round(v / step) * step);
}

function clone(d: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(d.data), d.width, d.height);
}

/** Pixel-art: mosaic via block averaging + uniform color quantization */
function applyPixelArt(input: ImageData, params: Record<string, number | string>): ImageData {
  const block = Math.max(2, Math.round(Number(params.blockSize ?? 8)));
  const colors = Math.max(2, Math.round(Number(params.colors ?? 24)));
  const w = input.width;
  const h = input.height;
  const out = clone(input);
  const d = out.data;
  const src = input.data;

  // levels per channel approximating total colors (cube root)
  const levels = Math.max(2, Math.round(Math.cbrt(colors)));

  for (let by = 0; by < h; by += block) {
    for (let bx = 0; bx < w; bx += block) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const yMax = Math.min(by + block, h);
      const xMax = Math.min(bx + block, w);
      for (let y = by; y < yMax; y++) {
        for (let x = bx; x < xMax; x++) {
          const i = (y * w + x) * 4;
          r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3];
          n++;
        }
      }
      r = q(r / n, levels); g = q(g / n, levels); b = q(b / n, levels); a = a / n;
      for (let y = by; y < yMax; y++) {
        for (let x = bx; x < xMax; x++) {
          const i = (y * w + x) * 4;
          d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
        }
      }
    }
  }
  return out;
}

export const pixelArtStyle: StyleDefinition = {
  id: "pixel-art",
  name: "Pixel Art",
  description: "Mosaico retro + paleta reducida. Ideal para footers con carácter.",
  params: [
    { key: "blockSize", label: "Tamaño de bloque", type: "slider", min: 2, max: 32, step: 1, defaultValue: 8, unit: "px" },
    { key: "colors", label: "Colores", type: "slider", min: 4, max: 64, step: 1, defaultValue: 24 },
  ],
  apply: applyPixelArt,
};
