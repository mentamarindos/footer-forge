import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { toast } from "sonner";
import { SUPPORTED_INPUT_ACCEPT } from "@/lib/image/decode-image";
import { processImage, type ProcessResult } from "@/lib/image/pipeline";
import { STYLE_LIST, getDefaultParams } from "@/lib/image/styles";
import type { StyleParams } from "@/lib/image/styles/types";
import { formatBytes } from "@/lib/utils";

export type OutputFormat = "image/webp" | "image/jpeg" | "image/png";

export interface WidthPreset {
  id: string;
  label: string;
  width: number;
  hint: string;
}

/** Anchos de salida por tamaño de pantalla, de mobile a 4K. */
export const WIDTH_PRESETS: WidthPreset[] = [
  { id: "mobile", label: "Mobile", width: 480, hint: "≤480p" },
  { id: "tablet", label: "Tablet", width: 768, hint: "768p" },
  { id: "laptop", label: "Laptop", width: 1280, hint: "720p" },
  { id: "desktop", label: "Desktop", width: 1920, hint: "1080p" },
  { id: "qhd", label: "QHD", width: 2560, hint: "1440p" },
  { id: "uhd", label: "4K", width: 3840, hint: "2160p" },
];

export const DEFAULT_WIDTH = 1280;
export const DEFAULT_PREVIEW_HEIGHT = 560;
export const MIN_PREVIEW_WIDTH = 360;
export const MAX_PREVIEW_WIDTH = 1600;
export const MIN_PREVIEW_ZOOM = 0.3;
export const MAX_PREVIEW_ZOOM = 1;

export interface ForgeConfig {
  defaultStyle?: string;
  availableStyles?: string[];
  targetWidth?: number;
  maxBytes?: number;
  output?: OutputFormat;
  onProcessed?: (result: ProcessResult) => void;
}

interface ForgeState {
  file: File | null;
  originalUrl: string | null;
  /** Nonce que cambia en cada pick/clear: fuerza remontaje de <img>. */
  fileKey: number;
  styleId: string;
  /** Ajustes por estilo: al alternar, cada uno recuerda los suyos. */
  paramsByStyle: Record<string, StyleParams>;
  width: number;
  format: OutputFormat;
  maxBytes: number;
  availableStyles: string[];
  result: ProcessResult | null;
  processing: boolean;
  /** Fase actual del procesado (para feedback en UI). */
  stage: "idle" | "decode" | "style" | "compress";
  dragOver: boolean;
  onProcessed: ((result: ProcessResult) => void) | null;
  /** Alto mínimo del preview del footer (px). */
  previewHeight: number;
  /** Ancho máximo del preview (px). null = ancho completo. */
  previewWidth: number | null;
  /** Escala literal de la imagen de fondo (0.3–1). */
  previewZoom: number;
  /** Difuminado en la zona alta del preview (legibilidad según la foto). */
  previewBlur: boolean;

  configure: (cfg: ForgeConfig) => void;
  pickFile: (f: File | undefined | null) => void;
  clearFile: () => void;
  setStyle: (id: string) => void;
  updateParam: (key: string, value: number | string) => void;
  setWidth: (w: number) => void;
  setFormat: (f: OutputFormat) => void;
  setMaxBytes: (b: number) => void;
  setDragOver: (v: boolean) => void;
  setPreviewHeight: (h: number) => void;
  setPreviewWidth: (w: number | null) => void;
  setPreviewZoom: (z: number) => void;
  setPreviewBlur: (v: boolean) => void;
  /** Tema de la página (también persiste). */
  dark: boolean;
  setDark: (v: boolean) => void;
  toggleDark: () => void;
  run: () => Promise<void>;
  download: () => void;
}

export const DEFAULT_MAX_BYTES = 102_400;

let runSeq = 0;

/** Tema inicial: migra la clave legacy (y la limpia) o usa el sistema. */
function initialDark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const legacy = window.localStorage.getItem("footer-forge-theme");
    if (legacy === "dark" || legacy === "light") {
      window.localStorage.removeItem("footer-forge-theme");
      return legacy === "dark";
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  } catch {
    return false;
  }
}

const memoryFallback = new Map<string, string>();

/** Storage a prueba de SSR/tests/privado: cae a memoria si no hay localStorage. */
const safeStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    try {
      if (typeof localStorage === "undefined") return memoryFallback.get(name) ?? null;
      return localStorage.getItem(name);
    } catch {
      return memoryFallback.get(name) ?? null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      if (typeof localStorage === "undefined") memoryFallback.set(name, value);
      else localStorage.setItem(name, value);
    } catch {
      /* modo privado: ignora */
    }
  },
  removeItem: (name: string) => {
    try {
      if (typeof localStorage === "undefined") memoryFallback.delete(name);
      else localStorage.removeItem(name);
    } catch {
      /* modo privado: ignora */
    }
  },
}));

function resolveStyles(available?: string[]): string[] {
  const ids = new Set(STYLE_LIST.map((s) => s.id));
  const list = available?.filter((id) => ids.has(id)) ?? [...ids];
  return list.length > 0 ? list : [...ids];
}

/** Params activos con defaults garantizados (estable si la entrada existe). */
export function activeParams(s: { paramsByStyle: Record<string, StyleParams>; styleId: string }): StyleParams {
  return s.paramsByStyle[s.styleId] ?? getDefaultParams(s.styleId);
}

function withStyleEntry(
  paramsByStyle: Record<string, StyleParams>,
  styleId: string
): Record<string, StyleParams> {
  if (paramsByStyle[styleId]) return paramsByStyle;
  return { ...paramsByStyle, [styleId]: getDefaultParams(styleId) };
}

export const useForgeStore = create<ForgeState>()(
  persist(
    (set, get) => ({
  file: null,
  originalUrl: null,
  fileKey: 0,
  styleId: "pixel-art",
  paramsByStyle: { "pixel-art": getDefaultParams("pixel-art") },
  width: DEFAULT_WIDTH,
  format: "image/webp",
  maxBytes: DEFAULT_MAX_BYTES,
  availableStyles: STYLE_LIST.map((s) => s.id),
  result: null,
  processing: false,
  stage: "idle",
  dragOver: false,
  onProcessed: null,
  previewHeight: DEFAULT_PREVIEW_HEIGHT,
  previewWidth: null,
  previewZoom: MAX_PREVIEW_ZOOM,
  previewBlur: true,
  dark: initialDark(),

  configure: (cfg) => {
    // merge defensivo: solo aplica lo provisto; conserva estilo/params/ajustes.
    // Sin availableStyles se asume la lista completa (default del componente).
    const s = get();
    const available = cfg.availableStyles ? resolveStyles(cfg.availableStyles) : STYLE_LIST.map((x) => x.id);
    const styleId =
      cfg.defaultStyle && available.includes(cfg.defaultStyle)
        ? cfg.defaultStyle
        : available.includes(s.styleId)
          ? s.styleId
          : available[0];
    set({
      styleId,
      paramsByStyle: withStyleEntry(s.paramsByStyle, styleId),
      width: cfg.targetWidth ?? s.width,
      maxBytes: cfg.maxBytes ?? s.maxBytes,
      format: cfg.output ?? s.format,
      availableStyles: available,
      onProcessed: cfg.onProcessed !== undefined ? cfg.onProcessed : s.onProcessed,
    });
  },

  pickFile: (f) => {
    if (!f) return;
    const { originalUrl, result } = get();
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result) URL.revokeObjectURL(result.url);
    runSeq++; // invalida al instante cualquier run en vuelo del archivo anterior
    set((s) => ({
      file: f,
      originalUrl: URL.createObjectURL(f),
      result: null,
      processing: true, // feedback inmediato, sin ventana muerta hasta el debounce
      fileKey: s.fileKey + 1,
    }));
  },

  clearFile: () => {
    const { originalUrl, result } = get();
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result) URL.revokeObjectURL(result.url);
    runSeq++;
    set((s) => ({ file: null, originalUrl: null, result: null, processing: false, fileKey: s.fileKey + 1 }));
  },

  setStyle: (id) => {
    const s = get();
    if (!s.availableStyles.includes(id)) return;
    // no resetea: cada estilo conserva sus params en paramsByStyle
    set({ styleId: id, paramsByStyle: withStyleEntry(s.paramsByStyle, id) });
  },

  updateParam: (key, value) =>
    set((s) => ({
      paramsByStyle: {
        ...s.paramsByStyle,
        [s.styleId]: { ...activeParams(s), [key]: value },
      },
    })),
  setWidth: (width) => set({ width }),
  setFormat: (format) => set({ format }),
  setMaxBytes: (maxBytes) => set({ maxBytes }),
  setDragOver: (dragOver) => set({ dragOver }),
  setPreviewHeight: (previewHeight) => set({ previewHeight }),
  setPreviewWidth: (previewWidth) => set({ previewWidth }),
  setPreviewZoom: (previewZoom) => set({ previewZoom }),
  setPreviewBlur: (previewBlur) => set({ previewBlur }),
  setDark: (dark) => set({ dark }),
  toggleDark: () => set((s) => ({ dark: !s.dark })),

  run: async () => {
    const { file, styleId, width, maxBytes, format, onProcessed, result: prev } = get();
    const params = activeParams(get());
    if (!file) return;
    const id = ++runSeq;
    set({ processing: true, stage: "decode" });
    try {
      const r = await processImage(file, {
        styleId,
        styleParams: params,
        targetWidth: width,
        maxBytes,
        output: format,
        onStage: (stage) => {
          if (runSeq === id && stage !== "done") set({ stage });
        },
      });
      if (runSeq !== id) {
        URL.revokeObjectURL(r.url);
        return;
      }
      set((s) => {
        if (s.result) URL.revokeObjectURL(s.result.url);
        return { result: r, stage: "idle" as const };
      });
      onProcessed?.(r);
      // avisa solo en la transición a excedido (no spam al arrastrar sliders)
      if (!r.underLimit && (prev?.underLimit ?? true)) {
        toast.warning(`Pesa ${formatBytes(r.size)}: no se pudo bajar de ${formatBytes(maxBytes)}.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al procesar la imagen.");
    } finally {
      if (runSeq === id) set({ processing: false, stage: "idle" });
    }
  },

  download: () => {
    const { result, file } = get();
    if (!result) return;
    const a = document.createElement("a");
    const base = file?.name.replace(/\.[^.]+$/, "") ?? "footer";
    const ext = result.mime === "image/png" ? "png" : result.mime === "image/jpeg" ? "jpg" : "webp";
    a.href = result.url;
    a.download = `${base}-${result.style.id}.${ext}`;
    a.click();
  },
    }),
    {
      name: "footer-forge-settings",
      version: 2,
      storage: safeStorage,
      migrate: (persisted: unknown) => {
        // v1 -> v2: params plano pasa a paramsByStyle
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (p["params"] && !p["paramsByStyle"]) {
          const styleId = typeof p["styleId"] === "string" ? p["styleId"] : "pixel-art";
          p["paramsByStyle"] = { [styleId]: p["params"] };
          delete p["params"];
        }
        return p;
      },
      // Solo settings serializables: nunca File, blob URLs, callbacks ni flags efímeros
      partialize: (s) => ({
        styleId: s.styleId,
        paramsByStyle: s.paramsByStyle,
        width: s.width,
        format: s.format,
        maxBytes: s.maxBytes,
        previewHeight: s.previewHeight,
        previewWidth: s.previewWidth,
        previewZoom: s.previewZoom,
        previewBlur: s.previewBlur,
        dark: s.dark,
      }),
    }
  )
);

/** Reprocesa con debounce ante cualquier cambio (imagen, estilo, params, salida). */
export function useAutoProcess(delay = 350) {
  const file = useForgeStore((s) => s.file);
  const styleId = useForgeStore((s) => s.styleId);
  const params = useForgeStore((s) => activeParams(s));
  const width = useForgeStore((s) => s.width);
  const format = useForgeStore((s) => s.format);
  const maxBytes = useForgeStore((s) => s.maxBytes);
  const run = useForgeStore((s) => s.run);

  useEffect(() => {
    if (!file) return;
    const t = setTimeout(() => void run(), delay);
    return () => clearTimeout(t);
  }, [file, styleId, params, width, format, maxBytes, run, delay]);
}

export { SUPPORTED_INPUT_ACCEPT };
