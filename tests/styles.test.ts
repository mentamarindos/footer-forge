import { describe, expect, test } from "bun:test";
import { STYLE_LIST, defaultParamsFor, getDefaultParams, getStyle } from "@/lib/image/styles";
import { resolveSpacing } from "@/lib/image/styles/ballpoint";
import { resolveFrostTile } from "@/lib/image/styles/frosted";
import { resolvePixelBlock } from "@/lib/image/styles/pixel-art";
import type { StyleParams } from "@/lib/image/styles/types";

function solid(w: number, h: number, r: number, g: number, b: number, a = 255): ImageData {
  const img = new ImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = r;
    img.data[i + 1] = g;
    img.data[i + 2] = b;
    img.data[i + 3] = a;
  }
  return img;
}

function horizontalGradient(w: number, h: number): ImageData {
  const img = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = Math.round((x / (w - 1)) * 255);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  return img;
}

function distinctColors(img: ImageData): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < img.data.length; i += 4) {
    set.add(`${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`);
  }
  return set;
}

function mean(img: ImageData): number {
  let s = 0;
  for (let i = 0; i < img.data.length; i += 4) s += (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
  return s / (img.data.length / 4);
}

describe("style registry", () => {
  test("expone 8 estilos", () => {
    expect(STYLE_LIST.length).toBe(8);
  });

  test("cada estilo tiene schema válido", () => {
    for (const s of STYLE_LIST) {
      expect(typeof s.id).toBe("string");
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
      expect(typeof s.apply).toBe("function");
      for (const p of s.params) {
        expect(typeof p.key).toBe("string");
        expect(["slider", "select", "color"]).toContain(p.type);
      }
    }
  });

  test("getStyle con id desconocido cae a pixel-art", () => {
    expect(getStyle("no-existe").id).toBe("pixel-art");
  });

  test("defaultParamsFor devuelve los defaults del schema", () => {
    const def = getStyle("duotone");
    const params = defaultParamsFor(def);
    expect(params["preset"]).toBe("ink-paper");
    expect(getDefaultParams("pixel-art")).toEqual(defaultParamsFor(getStyle("pixel-art")));
  });
});

describe("propiedades generales de los estilos", () => {
  test("ningún estilo muta la entrada y preserva dimensiones", async () => {
    const input = horizontalGradient(32, 24);
    const snapshot = Uint8ClampedArray.from(input.data);
    for (const s of STYLE_LIST) {
      const params: StyleParams = {};
      for (const p of s.params) params[p.key] = p.defaultValue;
      const out = await s.apply(input, params);
      expect(out).not.toBe(input);
      expect(out.width).toBe(32);
      expect(out.height).toBe(24);
      expect(out.data.length).toBe(input.data.length);
    }
    expect(Array.from(input.data)).toEqual(Array.from(snapshot));
  });
});

describe("pixel-art", () => {
  const sharp = { blockSize: 8, colors: 16, saturate: 0, dither: "none", outline: 0 };

  test("uniformiza cada bloque (sin tramado ni contorno)", async () => {
    const out = await getStyle("pixel-art").apply(horizontalGradient(32, 32), sharp);
    const first = [out.data[0], out.data[1], out.data[2]];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const i = (y * 32 + x) * 4;
        expect([out.data[i], out.data[i + 1], out.data[i + 2]]).toEqual(first);
      }
    }
  });

  test("la paleta adaptativa respeta el límite de colores", async () => {
    const out = await getStyle("pixel-art").apply(horizontalGradient(64, 48), sharp);
    expect(distinctColors(out).size).toBeLessThanOrEqual(16);
  });

  test("más colores → igual o más colores distintos", async () => {
    const input = horizontalGradient(64, 48);
    const few = distinctColors(await getStyle("pixel-art").apply(input, { ...sharp, colors: 6 })).size;
    const many = distinctColors(await getStyle("pixel-art").apply(input, { ...sharp, colors: 32 })).size;
    expect(many).toBeGreaterThanOrEqual(few);
  });

  test("preserva alpha", async () => {
    const out = await getStyle("pixel-art").apply(solid(16, 16, 120, 130, 140, 200), sharp);
    for (let i = 3; i < out.data.length; i += 4) {
      expect(out.data[i]).toBe(200);
    }
  });
});

describe("densidad proporcional al ancho", () => {
  test("resolvePixelBlock: 80 bloques se ven igual a 640px que a 4K", () => {
    expect(resolvePixelBlock({ blocks: 80 }, 640)).toBe(8);
    expect(resolvePixelBlock({ blocks: 80 }, 3840)).toBe(48);
  });

  test("resolvePixelBlock respeta el blockSize legacy", () => {
    expect(resolvePixelBlock({ blockSize: 8 }, 32)).toBe(8);
    expect(resolvePixelBlock({ blockSize: 8 }, 3840)).toBe(8);
    // lo nuevo manda sobre lo legacy
    expect(resolvePixelBlock({ blocks: 80, blockSize: 8 }, 640)).toBe(8);
  });

  test("resolvePixelBlock: valores corruptos caen al default (80 bloques)", () => {
    expect(resolvePixelBlock({ blocks: 0 }, 640)).toBe(8);
    expect(resolvePixelBlock({ blocks: -5 }, 640)).toBe(8);
    expect(resolvePixelBlock({ blocks: "roto" }, 640)).toBe(8);
    expect(resolvePixelBlock({}, 640)).toBe(8);
  });

  test("blocks equivalentes dan bloques uniformes (4 bloques en 32px = 8px)", async () => {
    const out = await getStyle("pixel-art").apply(horizontalGradient(32, 32), {
      blocks: 4,
      colors: 16,
      saturate: 0,
      dither: "none",
      outline: 0,
    });
    const first = [out.data[0], out.data[1], out.data[2]];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const i = (y * 32 + x) * 4;
        expect([out.data[i], out.data[i + 1], out.data[i + 2]]).toEqual(first);
      }
    }
  });

  test("resolveFrostTile: 32 teselas a 640px = 20px; legacy intacto", () => {
    expect(resolveFrostTile({ tiles: 32 }, 640)).toBe(20);
    expect(resolveFrostTile({ tileSize: 20 }, 100)).toBe(20);
    expect(resolveFrostTile({ tiles: 0 }, 640)).toBe(20);
    expect(resolveFrostTile({}, 640)).toBe(20);
  });

  test("resolveSpacing escala con el ancho con mínimo 2", () => {
    expect(resolveSpacing({ spacing: 4 }, 640)).toBe(4);
    expect(resolveSpacing({ spacing: 4 }, 3840)).toBe(24);
    expect(resolveSpacing({ spacing: 4 }, 32)).toBe(2);
  });
});

describe("posterize eliminado, ballpoint presente", () => {
  test("ids del registry", () => {
    const ids = STYLE_LIST.map((s) => s.id);
    expect(ids).toContain("ballpoint");
    expect(ids).not.toContain("posterize");
    expect(STYLE_LIST.length).toBe(8);
  });
});

describe("ballpoint", () => {
  const defaults = {
    spacing: 4,
    contrast: 120,
    crosshatch: 70,
    ink: "#1e40a0",
    paper: "#f6eeda",
  };

  test("negro sólido → todo tinta", async () => {
    const out = await getStyle("ballpoint").apply(solid(16, 16, 0, 0, 0), defaults);
    for (let i = 0; i < out.data.length; i += 4) {
      expect([out.data[i], out.data[i + 1], out.data[i + 2]]).toEqual([30, 64, 160]);
    }
  });

  test("blanco sólido → todo papel", async () => {
    const out = await getStyle("ballpoint").apply(solid(16, 16, 255, 255, 255), defaults);
    for (let i = 0; i < out.data.length; i += 4) {
      const px = [out.data[i], out.data[i + 1], out.data[i + 2]];
      // papel #f6eeda ± grano 7
      for (const [c, base] of [[px[0], 246], [px[1], 238], [px[2], 218]] as Array<[number, number]>) {
        expect(Math.abs(c - base)).toBeLessThanOrEqual(4);
      }
    }
  });

  test("cada píxel es tinta o papel (nada intermedio salvo grano)", async () => {
    const out = await getStyle("ballpoint").apply(horizontalGradient(48, 32), defaults);
    for (let i = 0; i < out.data.length; i += 4) {
      const px = [out.data[i], out.data[i + 1], out.data[i + 2]];
      const isInk = px[0] === 30 && px[1] === 64 && px[2] === 160;
      const nearPaper =
        Math.abs(px[0] - 246) <= 4 && Math.abs(px[1] - 238) <= 4 && Math.abs(px[2] - 218) <= 4;
      expect(isInk || nearPaper).toBe(true);
    }
  });

  test("determinista: misma entrada → misma salida", async () => {
    const input = horizontalGradient(48, 32);
    const a = await getStyle("ballpoint").apply(input, defaults);
    const b = await getStyle("ballpoint").apply(input, defaults);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
  });

  test("más contraste → más tinta", async () => {
    const input = horizontalGradient(48, 32);
    const count = (img: ImageData) => {
      let n = 0;
      for (let i = 0; i < img.data.length; i += 4) {
        if (img.data[i] === 30 && img.data[i + 1] === 64) n++;
      }
      return n;
    };
    const soft = count(await getStyle("ballpoint").apply(input, { ...defaults, contrast: 60 }));
    const hard = count(await getStyle("ballpoint").apply(input, { ...defaults, contrast: 180 }));
    expect(hard).toBeGreaterThan(soft);
  });
});

describe("grayscale", () => {
  test("r == g == b en cada píxel", async () => {
    const out = await getStyle("grayscale").apply(solid(8, 8, 200, 100, 50), { contrast: 100 });
    for (let i = 0; i < out.data.length; i += 4) {
      expect(out.data[i]).toBe(out.data[i + 1]);
      expect(out.data[i + 1]).toBe(out.data[i + 2]);
    }
  });
});

describe("duotone", () => {
  test("negro → colorA y blanco → colorB (custom)", async () => {
    const duotone = getStyle("duotone");
    const black = await duotone.apply(solid(4, 4, 0, 0, 0), { preset: "custom", colorA: "#ff0000", colorB: "#0000ff" });
    expect([black.data[0], black.data[1], black.data[2]]).toEqual([255, 0, 0]);
    const white = await duotone.apply(solid(4, 4, 255, 255, 255), { preset: "custom", colorA: "#ff0000", colorB: "#0000ff" });
    expect([white.data[0], white.data[1], white.data[2]]).toEqual([0, 0, 255]);
  });
});

describe("dither", () => {
  test("solo emite blanco o negro puros", async () => {
    const out = await getStyle("dither").apply(horizontalGradient(16, 16), {
      threshold: 128,
      ink: "#000000",
      paper: "#ffffff",
    });
    for (let i = 0; i < out.data.length; i += 4) {
      expect([0, 255]).toContain(out.data[i]);
      expect(out.data[i]).toBe(out.data[i + 1]);
      expect(out.data[i + 1]).toBe(out.data[i + 2]);
    }
  });

  test("respeta tintas personalizadas", async () => {
    const out = await getStyle("dither").apply(horizontalGradient(16, 16), {
      threshold: 128,
      ink: "#ff0000",
      paper: "#0000ff",
    });
    for (let i = 0; i < out.data.length; i += 4) {
      const px = [out.data[i], out.data[i + 1], out.data[i + 2]];
      expect([[255, 0, 0], [0, 0, 255]]).toContainEqual(px);
    }
  });
});

describe("footer-fade", () => {
  test("to-top: arriba más teñido que abajo", async () => {
    const fade = getStyle("footer-fade");
    const params: StyleParams = { direction: "to-top", fadeStart: 0, overlay: "#000000", strength: 100 };
    const out = await fade.apply(solid(8, 8, 255, 255, 255), params);
    const top = out.data[0] + out.data[1] + out.data[2];
    const bottom = out.data[(7 * 8 + 0) * 4] + out.data[(7 * 8 + 0) * 4 + 1] + out.data[(7 * 8 + 0) * 4 + 2];
    expect(top).toBeLessThan(bottom);
    expect(top).toBe(0);
  });
});

describe("blur", () => {
  test("darken 0 sobre color sólido lo deja intacto", async () => {
    const out = await getStyle("blur").apply(solid(8, 8, 100, 150, 200), { darken: 0 });
    for (let i = 0; i < out.data.length; i += 4) {
      expect(out.data[i]).toBe(100);
      expect(out.data[i + 1]).toBe(150);
      expect(out.data[i + 2]).toBe(200);
    }
  });

  test("darken 50 reduce la luminosidad media a la mitad", async () => {
    const out = await getStyle("blur").apply(solid(8, 8, 200, 200, 200), { darken: 50 });
    expect(mean(out)).toBeCloseTo(100, 0);
  });

  test("radius alto sangra los bordes duros", async () => {
    const edge = new ImageData(16, 8);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 16; x++) {
        const i = (y * 16 + x) * 4;
        const v = x < 8 ? 0 : 255;
        edge.data[i] = edge.data[i + 1] = edge.data[i + 2] = v;
        edge.data[i + 3] = 255;
      }
    }
    const sharp = await getStyle("blur").apply(edge, { radius: 0, darken: 0 });
    // radio 0: borde intacto
    expect(sharp.data[(0 * 16 + 7) * 4]).toBe(0);
    expect(sharp.data[(0 * 16 + 8) * 4]).toBe(255);
    const soft = await getStyle("blur").apply(edge, { radius: 8, darken: 0 });
    // radio 8: el negro se aclara y el blanco se oscurece junto al borde
    expect(soft.data[(0 * 16 + 7) * 4]).toBeGreaterThan(0);
    expect(soft.data[(0 * 16 + 8) * 4]).toBeLessThan(255);
  });
});

describe("frosted", () => {
  test("sin efectos es casi identidad salvo juntas", async () => {
    const out = await getStyle("frosted").apply(solid(8, 8, 120, 130, 140), {
      tileSize: 48,
      frost: 0,
      glow: 0,
      warmth: 0,
      grain: 0,
      edgeTint: "#ffffff",
      warmTint: "#ff6a3d",
    });
    // píxel interior (4,4): sin junta, sin efectos → intacto
    const i = (4 * 8 + 4) * 4;
    expect([out.data[i], out.data[i + 1], out.data[i + 2]]).toEqual([120, 130, 140]);
  });

  test("glow alto palidece los bordes", async () => {
    const frosted = getStyle("frosted");
    const base = { tileSize: 64, frost: 0, warmth: 0, grain: 0, edgeTint: "#ffffff", warmTint: "#ff6a3d" };
    const plain = await frosted.apply(solid(16, 16, 200, 0, 0), { ...base, glow: 0 });
    const glowed = await frosted.apply(solid(16, 16, 200, 0, 0), { ...base, glow: 100 });
    // esquina con glow: más cerca del blanco que sin glow
    const c = (15 * 16 + 15) * 4;
    const distPlain = 255 * 3 - (plain.data[c] + plain.data[c + 1] + plain.data[c + 2]);
    const distGlowed = 255 * 3 - (glowed.data[c] + glowed.data[c + 1] + glowed.data[c + 2]);
    expect(distGlowed).toBeLessThan(distPlain);
  });

  test("determinista: el grano no cambia entre corridas", async () => {
    const input = horizontalGradient(32, 24);
    const p = { tileSize: 8, frost: 40, glow: 50, warmth: 30, grain: 12, edgeTint: "#fbeef1", warmTint: "#ff6a3d" };
    const a = await getStyle("frosted").apply(input, p);
    const b = await getStyle("frosted").apply(input, p);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
  });
});
