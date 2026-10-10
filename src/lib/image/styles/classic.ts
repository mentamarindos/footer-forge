import type { StyleDefinition, StyleParams } from "./types";

function clone(d: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(d.data), d.width, d.height);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

// ---- Posterize ----
export const posterizeStyle: StyleDefinition = {
  id: "posterize",
  name: "Posterize",
  description: "Reduce tonos por canal. Look plano moderno para footers.",
  params: [
    { key: "levels", label: "Niveles", type: "slider", min: 2, max: 8, step: 1, defaultValue: 4 },
  ],
  apply(input, params: StyleParams) {
    const levels = Math.max(2, Math.round(Number(params.levels ?? 4)));
    const step = 255 / (levels - 1);
    const out = clone(input);
    const d = out.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.round(Math.round(d[i] / step) * step);
      d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step);
      d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step);
    }
    return out;
  },
};

// ---- Grayscale ----
export const grayscaleStyle: StyleDefinition = {
  id: "grayscale",
  name: "Grises",
  description: "Blanco y negro con contraste. Elegante y liviano.",
  params: [
    { key: "contrast", label: "Contraste", type: "slider", min: 50, max: 200, step: 1, defaultValue: 110, unit: "%" },
  ],
  apply(input, params: StyleParams) {
    const c = Number(params.contrast ?? 110) / 100;
    const out = clone(input);
    const d = out.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      const v = Math.max(0, Math.min(255, (lum - 128) * c + 128));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    return out;
  },
};

// ---- Duotone ----
const DUOTONE_PRESETS: Record<string, [string, string]> = {
  "ink-paper": ["#0f172a", "#f8fafc"],
  "ocean": ["#0c4a6e", "#7dd3fc"],
  "sunset": ["#7c2d12", "#fdba74"],
  "forest": ["#14532d", "#bbf7d0"],
  "grape": ["#4c1d95", "#ddd6fe"],
};

export const duotoneStyle: StyleDefinition = {
  id: "duotone",
  name: "Duotono",
  description: "Mapea luces/sombras a 2 colores de marca. Perfecto para footers.",
  params: [
    {
      key: "preset", label: "Paleta", type: "select", defaultValue: "ink-paper",
      options: [
        { value: "ink-paper", label: "Tinta / Papel" },
        { value: "ocean", label: "Océano" },
        { value: "sunset", label: "Atardecer" },
        { value: "forest", label: "Bosque" },
        { value: "grape", label: "Uva" },
        { value: "custom", label: "Personalizado" },
      ],
    },
    { key: "colorA", label: "Sombras", type: "color", defaultValue: "#0f172a" },
    { key: "colorB", label: "Luces", type: "color", defaultValue: "#f8fafc" },
  ],
  apply(input, params: StyleParams) {
    const preset = String(params.preset ?? "ink-paper");
    let [h1, h2] = DUOTONE_PRESETS[preset] ?? DUOTONE_PRESETS["ink-paper"];
    if (preset === "custom") {
      h1 = String(params.colorA ?? h1);
      h2 = String(params.colorB ?? h2);
    }
    const [r1, g1, b1] = hexToRgb(h1);
    const [r2, g2, b2] = hexToRgb(h2);
    const out = clone(input);
    const d = out.data;
    for (let i = 0; i < d.length; i += 4) {
      const t = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      d[i] = r1 + (r2 - r1) * t;
      d[i + 1] = g1 + (g2 - g1) * t;
      d[i + 2] = b1 + (b2 - b1) * t;
    }
    return out;
  },
};

// ---- Dither (Bayer 4x4) ----
const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

export const ditherStyle: StyleDefinition = {
  id: "dither",
  name: "Dither",
  description: "Tramado Bayer estilo 1-bit / retro mac, con tintas a elegir.",
  params: [
    { key: "threshold", label: "Umbral", type: "slider", min: 0, max: 255, step: 1, defaultValue: 128 },
    { key: "ink", label: "Tinta", type: "color", defaultValue: "#000000" },
    { key: "paper", label: "Papel", type: "color", defaultValue: "#ffffff" },
  ],
  apply(input, params: StyleParams) {
    const th = Number(params.threshold ?? 128);
    const [ir, ig, ib] = hexToRgb(String(params.ink ?? "#000000"));
    const [pr, pg, pb] = hexToRgb(String(params.paper ?? "#ffffff"));
    const out = clone(input);
    const d = out.data;
    const w = input.width;
    for (let y = 0; y < input.height; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        const bias = (BAYER_4[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 64;
        const isPaper = lum + bias > th;
        d[i] = isPaper ? pr : ir;
        d[i + 1] = isPaper ? pg : ig;
        d[i + 2] = isPaper ? pb : ib;
      }
    }
    return out;
  },
};

// ---- Footer fade ----
export const footerFadeStyle: StyleDefinition = {
  id: "footer-fade",
  name: "Footer Fade",
  description: "Desvanece la imagen para poner texto encima. El más útil en landings.",
  params: [
    {
      key: "direction", label: "Dirección", type: "select", defaultValue: "to-top",
      options: [
        { value: "to-top", label: "Hacia arriba" },
        { value: "to-bottom", label: "Hacia abajo" },
        { value: "to-left", label: "Hacia izquierda" },
        { value: "to-right", label: "Hacia derecha" },
      ],
    },
    { key: "fadeStart", label: "Inicio del fade", type: "slider", min: 0, max: 90, step: 1, defaultValue: 30, unit: "%" },
    { key: "overlay", label: "Tinte", type: "color", defaultValue: "#0f172a" },
    { key: "strength", label: "Intensidad", type: "slider", min: 0, max: 100, step: 1, defaultValue: 70, unit: "%" },
  ],
  apply(input, params: StyleParams) {
    const dir = String(params.direction ?? "to-top");
    const start = Number(params.fadeStart ?? 30) / 100;
    const strength = Number(params.strength ?? 70) / 100;
    const [or, og, ob] = hexToRgb(String(params.overlay ?? "#0f172a"));
    const out = clone(input);
    const d = out.data;
    const w = input.width;
    const h = input.height;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let t: number;
        if (dir === "to-top") t = 1 - y / h;
        else if (dir === "to-bottom") t = y / h;
        else if (dir === "to-left") t = 1 - x / w;
        else t = x / w;
        // t=1 Muss stark überlagert sein (Seite wo texto va), t=0 imagen pura
        const mask = Math.max(0, Math.min(1, (t - start) / (1 - start))) * strength;
        const i = (y * w + x) * 4;
        d[i] = d[i] * (1 - mask) + or * mask;
        d[i + 1] = d[i + 1] * (1 - mask) + og * mask;
        d[i + 2] = d[i + 2] * (1 - mask) + ob * mask;
      }
    }
    return out;
  },
};

// ---- Blur ----
export const blurStyle: StyleDefinition = {
  id: "blur",
  name: "Blur fondo",
  description: "Suavizado para usar como fondo tenue del footer.",
  params: [
    { key: "darken", label: "Oscurecer", type: "slider", min: 0, max: 80, step: 1, defaultValue: 30, unit: "%" },
  ],
  apply(input, params: StyleParams) {
    // Box-blur rápido 3x3 x2 pasadas + darken. El blur fuerte real se hace en canvas con ctx.filter.
    const dark = Number(params.darken ?? 30) / 100;
    const w = input.width;
    const h = input.height;
    let src = new Uint8ClampedArray(input.data);
    for (let pass = 0; pass < 2; pass++) {
      const dst = new Uint8ClampedArray(src);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            dst[i + c] =
              (src[i + c] * 4 +
                src[i - 4 + c] + src[i + 4 + c] +
                src[i - w * 4 + c] + src[i + w * 4 + c]) / 8;
          }
        }
      }
      src = dst;
    }
    const out = new ImageData(src, w, h);
    const d = out.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] *= 1 - dark;
      d[i + 1] *= 1 - dark;
      d[i + 2] *= 1 - dark;
    }
    return out;
  },
};
