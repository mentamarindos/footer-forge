import type { StyleDefinition, StyleParams } from "./types";
import { clamp01, hash2, hexToRgb } from "@/lib/image/color";

function smooth(a: number, b: number, t: number): number {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
}

/**
 * Frosted Mosaic Glass: teselas promediadas con velo esmerilado,
 * resplandor radial (centro vivo → bordes pálidos), calidez central,
 * juntas de vidrio y grano fino. Inspirado en mosaicos de luz cálida.
 */
function applyFrosted(input: ImageData, params: StyleParams): ImageData {
  const tile = Math.max(4, Math.round(Number(params.tileSize ?? 20)));
  const frost = Number(params.frost ?? 45) / 100;
  const glow = Number(params.glow ?? 65) / 100;
  const warmth = Number(params.warmth ?? 30) / 100;
  const grain = Number(params.grain ?? 10);
  const [er, eg, eb] = hexToRgb(String(params.edgeTint ?? "#fbeef1"));
  const [wr, wg, wb] = hexToRgb(String(params.warmTint ?? "#ff6a3d"));

  const w = input.width;
  const h = input.height;
  const src = input.data;
  const out = new ImageData(w, h);
  const d = out.data;

  const cx = w / 2;
  const cy = h / 2;

  for (let ty = 0; ty < h; ty += tile) {
    for (let tx = 0; tx < w; tx += tile) {
      // color medio de la tesela
      let r = 0, g = 0, b = 0, n = 0;
      const yMax = Math.min(ty + tile, h);
      const xMax = Math.min(tx + tile, w);
      for (let y = ty; y < yMax; y++) {
        for (let x = tx; x < xMax; x++) {
          const i = (y * w + x) * 4;
          r += src[i]; g += src[i + 1]; b += src[i + 2];
          n++;
        }
      }
      r /= n; g /= n; b /= n;

      // velo esmerilado: desatura + levanta hacia blanco
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r += (lum - r) * frost * 0.7 + (255 - r) * frost * 0.3;
      g += (lum - g) * frost * 0.7 + (255 - g) * frost * 0.3;
      b += (lum - b) * frost * 0.7 + (255 - b) * frost * 0.3;

      for (let y = ty; y < yMax; y++) {
        // valores por fila: dy y junta horizontal salen del bucle interno
        const dy = (y - cy) / cy;
        const dyy = dy * dy;
        const groutY = y % tile === 0;
        for (let x = tx; x < xMax; x++) {
          // distancia radial normalizada 0 (centro) → 1 (esquina)
          const dx = (x - cx) / cx;
          const t = clamp01(Math.sqrt(dx * dx + dyy) / Math.SQRT2);

          // glow: funde bordes hacia el tinte pálido
          const m = smooth(0.15, 1, t) * glow;
          let pr = r + (er - r) * m;
          let pg = g + (eg - g) * m;
          let pb = b + (eb - b) * m;

          // calidez central
          const c = (1 - t) * (1 - t) * warmth;
          pr += (wr - pr) * c * 0.55;
          pg += (wg - pg) * c * 0.55;
          pb += (wb - pb) * c * 0.55;

          // junta de vidrio (borde superior/izquierdo de cada tesela)
          if (groutY || x % tile === 0) {
            pr += (255 - pr) * 0.45;
            pg += (255 - pg) * 0.45;
            pb += (255 - pb) * 0.45;
          }

          // grano fino determinista (estable entre renders)
          if (grain > 0) {
            const nz = (hash2(x, y) - 0.5) * grain;
            pr += nz; pg += nz; pb += nz;
          }

          const i = (y * w + x) * 4;
          d[i] = pr; d[i + 1] = pg; d[i + 2] = pb;
          d[i + 3] = src[i + 3];
        }
      }
    }
  }
  return out;
}

export const frostedStyle: StyleDefinition = {
  id: "frosted",
  name: "Frosted Mosaic",
  description: "Vidrio esmerilado en teselas con resplandor radial cálido.",
  params: [
    { key: "tileSize", label: "Tamaño de tesela", type: "slider", min: 6, max: 48, step: 1, defaultValue: 20, unit: "px" },
    { key: "frost", label: "Esmerilado", type: "slider", min: 0, max: 100, step: 1, defaultValue: 45, unit: "%" },
    { key: "glow", label: "Resplandor bordes", type: "slider", min: 0, max: 100, step: 1, defaultValue: 65, unit: "%" },
    { key: "warmth", label: "Calidez central", type: "slider", min: 0, max: 100, step: 1, defaultValue: 30, unit: "%" },
    { key: "grain", label: "Grano", type: "slider", min: 0, max: 60, step: 1, defaultValue: 10 },
    { key: "edgeTint", label: "Tinte bordes", type: "color", defaultValue: "#fbeef1" },
    { key: "warmTint", label: "Tinte cálido", type: "color", defaultValue: "#ff6a3d" },
  ],
  apply: applyFrosted,
};
