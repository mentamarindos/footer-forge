import { beforeEach, describe, expect, test } from "bun:test";
import { DEFAULT_MAX_BYTES, DEFAULT_PREVIEW_HEIGHT, DEFAULT_WIDTH, MAX_PREVIEW_ZOOM, WIDTH_PRESETS, useForgeStore } from "@/store/use-forge-store";

function fakeFile(name = "foto.png", size = 2048): File {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

beforeEach(() => {
  const s = useForgeStore.getState();
  s.clearFile();
  s.setDark(false);
  s.setUpscale(false);
  s.configure({});
});

describe("forge store: estado inicial", () => {
  test("defaults", () => {
    const s = useForgeStore.getState();
    expect(s.styleId).toBe("pixel-art");
    expect(s.width).toBe(DEFAULT_WIDTH);
    expect(s.maxBytes).toBe(DEFAULT_MAX_BYTES);
    expect(s.format).toBe("image/webp");
    expect(s.upscale).toBe(false);
    expect(s.file).toBeNull();
    expect(s.result).toBeNull();
    expect(s.processing).toBe(false);
    expect(s.previewHeight).toBe(DEFAULT_PREVIEW_HEIGHT);
    expect(s.previewWidth).toBeNull();
    expect(s.previewZoom).toBe(MAX_PREVIEW_ZOOM);
    expect(s.previewBlur).toBe(true);
    expect(s.dark).toBe(false);
    expect(s.availableStyles.length).toBe(8);
  });

  test("toggleDark alterna el tema", () => {
    const s = useForgeStore.getState();
    expect(s.dark).toBe(false);
    s.toggleDark();
    expect(useForgeStore.getState().dark).toBe(true);
    s.toggleDark();
    expect(useForgeStore.getState().dark).toBe(false);
  });

  test("presets cubren de mobile a 4K en orden", () => {
    const widths = WIDTH_PRESETS.map((p) => p.width);
    expect(widths[0]).toBeLessThanOrEqual(480);
    expect(widths[widths.length - 1]).toBeGreaterThanOrEqual(3840);
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
    expect(WIDTH_PRESETS.map((p) => p.id)).toContain("mobile");
  });
});

describe("forge store: configure", () => {
  test("aplica config y resuelve estilos disponibles", () => {
    useForgeStore.getState().configure({
      defaultStyle: "duotone",
      availableStyles: ["duotone", "blur", "inexistente"],
      targetWidth: 800,
      maxBytes: 50_000,
      output: "image/jpeg",
    });
    const s = useForgeStore.getState();
    expect(s.styleId).toBe("duotone");
    expect(s.availableStyles).toEqual(["duotone", "blur"]);
    expect(s.width).toBe(800);
    expect(s.maxBytes).toBe(50_000);
    expect(s.format).toBe("image/jpeg");
    expect(s.paramsByStyle["duotone"]?.["preset"]).toBe("ink-paper");
  });

  test("configure no resetea ajustes existentes si no se proveen", () => {
    const s = useForgeStore.getState();
    s.setStyle("duotone");
    s.updateParam("preset", "ocean");
    // re-configura sin defaultStyle: conserva estilo y sus params
    s.configure({ targetWidth: 900 });
    const next = useForgeStore.getState();
    expect(next.styleId).toBe("duotone");
    expect(next.paramsByStyle["duotone"]?.["preset"]).toBe("ocean");
    expect(next.width).toBe(900);
  });

  test("defaultStyle fuera de la lista cae al primero disponible", () => {
    useForgeStore.getState().configure({
      defaultStyle: "pixel-art",
      availableStyles: ["blur"],
    });
    expect(useForgeStore.getState().styleId).toBe("blur");
  });
});

describe("forge store: acciones", () => {
  test("pickFile guarda archivo y genera URL, limpiando el resultado", () => {
    const s = useForgeStore.getState();
    s.pickFile(fakeFile());
    const next = useForgeStore.getState();
    expect(next.file?.name).toBe("foto.png");
    expect(next.originalUrl?.startsWith("blob:")).toBe(true);
    expect(next.result).toBeNull();
  });

  test("pickFile(null) no hace nada", () => {
    const before = useForgeStore.getState().fileKey;
    useForgeStore.getState().pickFile(null);
    expect(useForgeStore.getState().file).toBeNull();
    expect(useForgeStore.getState().fileKey).toBe(before);
  });

  test("pickFile activa processing al instante e incrementa fileKey", () => {
    const before = useForgeStore.getState().fileKey;
    useForgeStore.getState().pickFile(fakeFile());
    const next = useForgeStore.getState();
    expect(next.processing).toBe(true);
    expect(next.fileKey).toBe(before + 1);
  });

  test("setStyle conserva los params de cada estilo", () => {
    const s = useForgeStore.getState();
    s.setStyle("pixel-art");
    s.updateParam("blockSize", 32);
    s.setStyle("grayscale");
    const next = useForgeStore.getState();
    expect(next.styleId).toBe("grayscale");
    expect(next.paramsByStyle["grayscale"]).toEqual({ contrast: 110 });
    // al volver, pixel-art recuerda su blockSize
    next.setStyle("pixel-art");
    const back = useForgeStore.getState();
    expect(back.paramsByStyle["pixel-art"]?.["blockSize"]).toBe(32);
  });

  test("setStyle ignora ids no disponibles", () => {
    useForgeStore.getState().configure({ availableStyles: ["blur"] });
    useForgeStore.getState().setStyle("duotone");
    expect(useForgeStore.getState().styleId).toBe("blur");
  });

  test("updateParam fusiona sin borrar el resto", () => {
    const s = useForgeStore.getState();
    s.setStyle("pixel-art");
    s.updateParam("blockSize", 16);
    expect(useForgeStore.getState().paramsByStyle["pixel-art"]).toEqual({
      blockSize: 16,
      colors: 32,
      saturate: 20,
      dither: "none",
      outline: 25,
    });
  });

  test("setWidth / setFormat / setMaxBytes / setDragOver / setPreviewHeight / setPreviewWidth", () => {
    const s = useForgeStore.getState();
    s.setWidth(320);
    s.setFormat("image/png");
    s.setMaxBytes(256_000);
    s.setDragOver(true);
    s.setPreviewHeight(800);
    s.setPreviewWidth(900);
    const next = useForgeStore.getState();
    expect(next.width).toBe(320);
    expect(next.format).toBe("image/png");
    expect(next.maxBytes).toBe(256_000);
    expect(next.dragOver).toBe(true);
    expect(next.previewHeight).toBe(800);
    expect(next.previewWidth).toBe(900);
    s.setPreviewWidth(null);
    expect(useForgeStore.getState().previewWidth).toBeNull();
    s.setUpscale(true);
    expect(useForgeStore.getState().upscale).toBe(true);
    s.setPreviewZoom(0.5);
    expect(useForgeStore.getState().previewZoom).toBe(0.5);
    s.setPreviewBlur(false);
    expect(useForgeStore.getState().previewBlur).toBe(false);
  });

  test("clearFile limpia todo", () => {
    const s = useForgeStore.getState();
    s.pickFile(fakeFile());
    s.clearFile();
    const next = useForgeStore.getState();
    expect(next.file).toBeNull();
    expect(next.originalUrl).toBeNull();
    expect(next.result).toBeNull();
  });
});
