import { useEffect } from "react";
import { create } from "zustand";
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
  params: StyleParams;
  width: number;
  format: OutputFormat;
  maxBytes: number;
  availableStyles: string[];
  result: ProcessResult | null;
  processing: boolean;
  dragOver: boolean;
  onProcessed: ((result: ProcessResult) => void) | null;

  configure: (cfg: ForgeConfig) => void;
  pickFile: (f: File | undefined | null) => void;
  clearFile: () => void;
  setStyle: (id: string) => void;
  updateParam: (key: string, value: number | string) => void;
  setWidth: (w: number) => void;
  setFormat: (f: OutputFormat) => void;
  setDragOver: (v: boolean) => void;
  run: () => Promise<void>;
  download: () => void;
}

export const DEFAULT_MAX_BYTES = 102_400;

let runSeq = 0;

function resolveStyles(available?: string[]): string[] {
  const ids = new Set(STYLE_LIST.map((s) => s.id));
  const list = available?.filter((id) => ids.has(id)) ?? [...ids];
  return list.length > 0 ? list : [...ids];
}

export const useForgeStore = create<ForgeState>()((set, get) => ({
  file: null,
  originalUrl: null,
  fileKey: 0,
  styleId: "pixel-art",
  params: getDefaultParams("pixel-art"),
  width: DEFAULT_WIDTH,
  format: "image/webp",
  maxBytes: DEFAULT_MAX_BYTES,
  availableStyles: STYLE_LIST.map((s) => s.id),
  result: null,
  processing: false,
  dragOver: false,
  onProcessed: null,

  configure: (cfg) => {
    const available = resolveStyles(cfg.availableStyles);
    const styleId = cfg.defaultStyle && available.includes(cfg.defaultStyle)
      ? cfg.defaultStyle
      : available[0];
    set({
      styleId,
      params: getDefaultParams(styleId),
      width: cfg.targetWidth ?? DEFAULT_WIDTH,
      maxBytes: cfg.maxBytes ?? DEFAULT_MAX_BYTES,
      format: cfg.output ?? "image/webp",
      availableStyles: available,
      onProcessed: cfg.onProcessed ?? null,
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
    if (!get().availableStyles.includes(id)) return;
    set({ styleId: id, params: getDefaultParams(id) });
  },

  updateParam: (key, value) => set((s) => ({ params: { ...s.params, [key]: value } })),
  setWidth: (width) => set({ width }),
  setFormat: (format) => set({ format }),
  setDragOver: (dragOver) => set({ dragOver }),

  run: async () => {
    const { file, styleId, params, width, maxBytes, format, onProcessed } = get();
    if (!file) return;
    const id = ++runSeq;
    set({ processing: true });
    try {
      const r = await processImage(file, { styleId, styleParams: params, targetWidth: width, maxBytes, output: format });
      if (runSeq !== id) {
        URL.revokeObjectURL(r.url);
        return;
      }
      set((s) => {
        if (s.result) URL.revokeObjectURL(s.result.url);
        return { result: r };
      });
      onProcessed?.(r);
      if (!r.underLimit) {
        toast.warning(`Pesa ${formatBytes(r.size)}: no se pudo bajar de ${formatBytes(maxBytes)}.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al procesar la imagen.");
    } finally {
      if (runSeq === id) set({ processing: false });
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
}));

/** Reprocesa con debounce ante cualquier cambio (imagen, estilo, params, salida). */
export function useAutoProcess(delay = 350) {
  const file = useForgeStore((s) => s.file);
  const styleId = useForgeStore((s) => s.styleId);
  const params = useForgeStore((s) => s.params);
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
