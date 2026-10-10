import type { StyleDefinition, StyleParams } from "./types";
import { clamp01, hash2, hexToRgb } from "@/lib/image/color";

function frac(v: number): number {
  return v - Math.floor(v);
}

/**
 * Ballpoint: dibujo a boli sobre papel con tramas de grabado.
 * - Niveles auto (percentiles) para que funcione con cualquier foto.
 * - Sobel realza contornos como trazo de contorno.
 * - Dos capas de rayado (45° / -45°): el grosor de línea sigue la
 *   oscuridad local; la segunda capa solo entra en las sombras.
 * - Wobble determinista para que el trazo respire como hecho a mano.
 */
function applyBallpoint(input: ImageData, params: StyleParams): ImageData {
  const spacing = Math.max(2, Math.round(Number(params.spacing ?? 4)));
  const contrast = Number(params.contrast ?? 120) / 100;
  const cross = Number(params.crosshatch ?? 70) / 100;
  const [ir, ig, ib] = hexToRgb(String(params.ink ?? "#1e40a0"));
  const [pr, pg, pb] = hexToRgb(String(params.paper ?? "#f6eeda"));

  const w = input.width;
  const h = input.height;
  const src = input.data;

  // 1. luminancia + histograma para niveles auto (p1/p99)
  const lum = new Float32Array(w * h);
  const hist = new Uint32Array(256);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const l = 0.2126 * src[o] + 0.7152 * src[o + 1] + 0.0722 * src[o + 2];
    lum[i] = l;
    hist[Math.max(0, Math.min(255, Math.round(l)))]++;
  }
  const total = w * h;
  let lo = 0;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc / total >= 0.01) { lo = v; break; }
  }
  let hi = 255;
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc / total >= 0.01) { hi = v; break; }
  }
  const span = Math.max(1, hi - lo);
  // Imagen casi plana: sin rango que normalizar, usa luminancia absoluta
  const flat = span < 12;

  // 2. magnitud de borde (Sobel) normalizada
  const edge = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1] +
        lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1];
      const gy =
        -lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1] +
        lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1];
      edge[i] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 420);
    }
  }

  // 3. rayado (wobble precalculado por celda: 2 tablas en vez de 2 sin() por píxel)
  const out = new ImageData(w, h);
  const d = out.data;
  const c = Math.SQRT1_2; // cos/sin 45°
  const cell = 7; // grano del wobble
  const cellsX = Math.ceil(w / cell);
  const cellsY = Math.ceil(h / cell);
  const wob1 = new Float32Array(cellsX * cellsY);
  const wob2 = new Float32Array(cellsX * cellsY);
  for (let cy = 0; cy < cellsY; cy++) {
    for (let cx = 0; cx < cellsX; cx++) {
      const ci = cy * cellsX + cx;
      wob1[ci] = (hash2(cx, cy) - 0.5) * 0.85;
      wob2[ci] = (hash2(cx + 57, cy + 31) - 0.5) * 0.85;
    }
  }

  for (let y = 0; y < h; y++) {
    const cy = Math.min(cellsY - 1, Math.floor(y / cell));
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;

      const v = flat ? lum[i] / 255 : clamp01((lum[i] - lo) / span);
      const dark = clamp01((1 - v) * contrast + edge[i] * 0.38);

      // capa 1: 45°
      const ci = cy * cellsX + Math.min(cellsX - 1, Math.floor(x / cell));
      const t1 = frac((x * c + y * c) / spacing + wob1[ci]);
      let inked = t1 < dark;

      // capa 2: -45°, solo sombras
      if (!inked && cross > 0) {
        const dark2 = clamp01((dark - 0.42) / 0.58) * cross;
        if (dark2 > 0) {
          const t2 = frac((x * c - y * c) / spacing + wob2[ci]);
          inked = t2 < dark2;
        }
      }

      if (inked) {
        d[o] = ir; d[o + 1] = ig; d[o + 2] = ib;
      } else {
        // papel con grano sutil
        const g = (hash2(x, y) - 0.5) * 7;
        d[o] = pr + g; d[o + 1] = pg + g; d[o + 2] = pb + g;
      }
      d[o + 3] = src[o + 3];
    }
  }
  return out;
}

export const ballpointStyle: StyleDefinition = {
  id: "ballpoint",
  name: "Ballpoint",
  description: "Dibujo a boli sobre papel: tramas de grabado duotono.",
  params: [
    { key: "spacing", label: "Densidad de trazo", type: "slider", min: 2, max: 8, step: 1, defaultValue: 4, unit: "px" },
    { key: "contrast", label: "Contraste", type: "slider", min: 50, max: 200, step: 1, defaultValue: 120, unit: "%" },
    { key: "crosshatch", label: "Entrecruzado", type: "slider", min: 0, max: 100, step: 1, defaultValue: 70, unit: "%" },
    { key: "ink", label: "Tinta", type: "color", defaultValue: "#1e40a0" },
    { key: "paper", label: "Papel", type: "color", defaultValue: "#f6eeda" },
  ],
  apply: applyBallpoint,
};
