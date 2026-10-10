import type { ImageQuantization } from "image-q";
import type { StyleDefinition, StyleParams } from "./types";

const DITHER_MAP: Record<string, ImageQuantization> = {
  none: "nearest",
  floyd: "floyd-steinberg",
  atkinson: "atkinson",
};

function colorDist(aR: number, aG: number, aB: number, bR: number, bG: number, bB: number): number {
  const dr = aR - bR;
  const dg = aG - bG;
  const db = aB - bB;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Pixel-art de verdad:
 * 1. Mosaico por promedio de bloque (muestreo correcto, sin aliasing).
 * 2. Boost de saturación pre-cuantización (el pixel art vive de color vivo).
 * 3. Paleta ADAPTATIVA con image-q (WuQuant, lazy) en vez de niveles
 *    uniformes por canal, que era lo que destruía los degradados.
 * 4. Mapeo nearest o con dithering (Floyd-Steinberg / Atkinson).
 * 5. Outline sutil entre bloques de distinto color (definición).
 */
async function applyPixelArt(input: ImageData, params: StyleParams): Promise<ImageData> {
  const block = Math.max(2, Math.round(Number(params.blockSize ?? 8)));
  const colors = Math.max(2, Math.min(64, Math.round(Number(params.colors ?? 32))));
  const saturate = Number(params.saturate ?? 20) / 100;
  const ditherKey = String(params.dither ?? "none");
  const outline = Number(params.outline ?? 25) / 100;

  const w = input.width;
  const h = input.height;
  const src = input.data;

  // 1+2. mosaico + saturación
  const mosaic = new Uint8ClampedArray(src.length);
  const blocksX = Math.ceil(w / block);
  const blocksY = Math.ceil(h / block);
  const avgs = new Float32Array(blocksX * blocksY * 3);

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const yMax = Math.min((by + 1) * block, h);
      const xMax = Math.min((bx + 1) * block, w);
      for (let y = by * block; y < yMax; y++) {
        for (let x = bx * block; x < xMax; x++) {
          const i = (y * w + x) * 4;
          r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3];
          n++;
        }
      }
      r /= n; g /= n; b /= n; a /= n;
      // saturación: aleja cada canal de la luminancia
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r += (r - lum) * saturate;
      g += (g - lum) * saturate;
      b += (b - lum) * saturate;

      const bi = by * blocksX + bx;
      avgs[bi * 3] = r;
      avgs[bi * 3 + 1] = g;
      avgs[bi * 3 + 2] = b;

      for (let y = by * block; y < yMax; y++) {
        for (let x = bx * block; x < xMax; x++) {
          const i = (y * w + x) * 4;
          mosaic[i] = r; mosaic[i + 1] = g; mosaic[i + 2] = b;
          mosaic[i + 3] = a;
        }
      }
    }
  }

  // 3+4. paleta adaptativa + mapeo (image-q en lazy: ~45KB solo si se usa).
  // La paleta se construye sobre los promedios por bloque (miles de puntos,
  // no millones): misma distribución, sin crear 1 objeto Point por píxel.
  const iq = await import("image-q");
  const paletteBuf = new Uint8ClampedArray(blocksX * blocksY * 4);
  for (let bi = 0; bi < blocksX * blocksY; bi++) {
    paletteBuf[bi * 4] = avgs[bi * 3];
    paletteBuf[bi * 4 + 1] = avgs[bi * 3 + 1];
    paletteBuf[bi * 4 + 2] = avgs[bi * 3 + 2];
    paletteBuf[bi * 4 + 3] = 255;
  }
  const palette = iq.buildPaletteSync(
    [iq.utils.PointContainer.fromUint8Array(paletteBuf, blocksX, blocksY)],
    {
      paletteQuantization: "wuquant",
      colorDistanceFormula: "euclidean-bt709",
      colors,
    }
  );
  // alpha opaco para cuantizar: la transparencia no debe comerse la paleta
  const savedAlpha = new Uint8ClampedArray(w * h);
  for (let i = 3, j = 0; i < mosaic.length; i += 4, j++) {
    savedAlpha[j] = mosaic[i];
    mosaic[i] = 255;
  }
  const container = iq.utils.PointContainer.fromUint8Array(mosaic, w, h);
  const mapped = iq.applyPaletteSync(container, palette, {
    colorDistanceFormula: "euclidean-bt709",
    imageQuantization: DITHER_MAP[ditherKey] ?? "nearest",
  });
  const out = mapped.toUint8Array();

  // restaura alpha original del mosaico
  for (let i = 3, j = 0; i < out.length; i += 4, j++) out[i] = savedAlpha[j];

  // 5. outline entre bloques vecinos de distinto color (1px interior)
  if (outline > 0 && ditherKey === "none") {
    const f = 1 - outline * 0.45;
    const darkens = (bx: number, by: number): boolean => {
      const bi = by * blocksX + bx;
      const r = avgs[bi * 3];
      const g = avgs[bi * 3 + 1];
      const b = avgs[bi * 3 + 2];
      if (bx + 1 < blocksX) {
        const ni = bi + 1;
        if (colorDist(r, g, b, avgs[ni * 3], avgs[ni * 3 + 1], avgs[ni * 3 + 2]) > 48) return true;
      }
      if (by + 1 < blocksY) {
        const ni = bi + blocksX;
        if (colorDist(r, g, b, avgs[ni * 3], avgs[ni * 3 + 1], avgs[ni * 3 + 2]) > 48) return true;
      }
      return false;
    };
    for (let by = 0; by < blocksY; by++) {
      for (let bx = 0; bx < blocksX; bx++) {
        if (!darkens(bx, by)) continue;
        const yMax = Math.min((by + 1) * block, h);
        const xMax = Math.min((bx + 1) * block, w);
        for (let y = by * block; y < yMax; y++) {
          for (let x = bx * block; x < xMax; x++) {
            const onBorder =
              x === xMax - 1 || y === yMax - 1;
            if (!onBorder) continue;
            const i = (y * w + x) * 4;
            out[i] *= f; out[i + 1] *= f; out[i + 2] *= f;
          }
        }
      }
    }
  }

  return new ImageData(new Uint8ClampedArray(out), w, h);
}

export const pixelArtStyle: StyleDefinition = {
  id: "pixel-art",
  name: "Pixel Art",
  description: "Mosaico retro + paleta adaptativa. Ideal para footers con carácter.",
  params: [
    { key: "blockSize", label: "Tamaño de bloque", type: "slider", min: 2, max: 32, step: 1, defaultValue: 8, unit: "px" },
    { key: "colors", label: "Colores", type: "slider", min: 4, max: 64, step: 1, defaultValue: 32 },
    { key: "saturate", label: "Viveza", type: "slider", min: 0, max: 100, step: 1, defaultValue: 20, unit: "%" },
    {
      key: "dither", label: "Tramado", type: "select", defaultValue: "none",
      options: [
        { value: "none", label: "Nítido" },
        { value: "floyd", label: "Floyd-Steinberg" },
        { value: "atkinson", label: "Atkinson" },
      ],
    },
    { key: "outline", label: "Contorno", type: "slider", min: 0, max: 100, step: 1, defaultValue: 25, unit: "%" },
  ],
  apply: applyPixelArt,
};
