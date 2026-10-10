import { describe, expect, test } from "bun:test";
import { STYLE_LIST, defaultParamsFor, getDefaultParams, getStyle } from "@/lib/image/styles";
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
  test("ningún estilo muta la entrada y preserva dimensiones", () => {
    const input = horizontalGradient(32, 24);
    const snapshot = Uint8ClampedArray.from(input.data);
    for (const s of STYLE_LIST) {
      const params: StyleParams = {};
      for (const p of s.params) params[p.key] = p.defaultValue;
      const out = s.apply(input, params);
      expect(out).not.toBe(input);
      expect(out.width).toBe(32);
      expect(out.height).toBe(24);
      expect(out.data.length).toBe(input.data.length);
    }
    expect(Array.from(input.data)).toEqual(Array.from(snapshot));
  });
});

describe("pixel-art", () => {
  test("uniformiza cada bloque", () => {
    const out = getStyle("pixel-art").apply(horizontalGradient(32, 32), { blockSize: 8, colors: 64 });
    // bloque 8x8 en (0,0): todos los píxeles iguales
    const first = [out.data[0], out.data[1], out.data[2]];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const i = (y * 32 + x) * 4;
        expect([out.data[i], out.data[i + 1], out.data[i + 2]]).toEqual(first);
      }
    }
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

  test("negro sólido → todo tinta", () => {
    const out = getStyle("ballpoint").apply(solid(16, 16, 0, 0, 0), defaults);
    for (let i = 0; i < out.data.length; i += 4) {
      expect([out.data[i], out.data[i + 1], out.data[i + 2]]).toEqual([30, 64, 160]);
    }
  });

  test("blanco sólido → todo papel", () => {
    const out = getStyle("ballpoint").apply(solid(16, 16, 255, 255, 255), defaults);
    for (let i = 0; i < out.data.length; i += 4) {
      const px = [out.data[i], out.data[i + 1], out.data[i + 2]];
      // papel #f6eeda ± grano 7
      for (const [c, base] of [[px[0], 246], [px[1], 238], [px[2], 218]] as Array<[number, number]>) {
        expect(Math.abs(c - base)).toBeLessThanOrEqual(4);
      }
    }
  });

  test("cada píxel es tinta o papel (nada intermedio salvo grano)", () => {
    const out = getStyle("ballpoint").apply(horizontalGradient(48, 32), defaults);
    for (let i = 0; i < out.data.length; i += 4) {
      const px = [out.data[i], out.data[i + 1], out.data[i + 2]];
      const isInk = px[0] === 30 && px[1] === 64 && px[2] === 160;
      const nearPaper =
        Math.abs(px[0] - 246) <= 4 && Math.abs(px[1] - 238) <= 4 && Math.abs(px[2] - 218) <= 4;
      expect(isInk || nearPaper).toBe(true);
    }
  });

  test("determinista: misma entrada → misma salida", () => {
    const input = horizontalGradient(48, 32);
    const a = getStyle("ballpoint").apply(input, defaults);
    const b = getStyle("ballpoint").apply(input, defaults);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
  });

  test("más contraste → más tinta", () => {
    const input = horizontalGradient(48, 32);
    const count = (img: ImageData) => {
      let n = 0;
      for (let i = 0; i < img.data.length; i += 4) {
        if (img.data[i] === 30 && img.data[i + 1] === 64) n++;
      }
      return n;
    };
    const soft = count(getStyle("ballpoint").apply(input, { ...defaults, contrast: 60 }));
    const hard = count(getStyle("ballpoint").apply(input, { ...defaults, contrast: 180 }));
    expect(hard).toBeGreaterThan(soft);
  });
});

describe("grayscale", () => {
  test("r == g == b en cada píxel", () => {
    const out = getStyle("grayscale").apply(solid(8, 8, 200, 100, 50), { contrast: 100 });
    for (let i = 0; i < out.data.length; i += 4) {
      expect(out.data[i]).toBe(out.data[i + 1]);
      expect(out.data[i + 1]).toBe(out.data[i + 2]);
    }
  });
});

describe("duotone", () => {
  test("negro → colorA y blanco → colorB (custom)", () => {
    const duotone = getStyle("duotone");
    const black = duotone.apply(solid(4, 4, 0, 0, 0), { preset: "custom", colorA: "#ff0000", colorB: "#0000ff" });
    expect([black.data[0], black.data[1], black.data[2]]).toEqual([255, 0, 0]);
    const white = duotone.apply(solid(4, 4, 255, 255, 255), { preset: "custom", colorA: "#ff0000", colorB: "#0000ff" });
    expect([white.data[0], white.data[1], white.data[2]]).toEqual([0, 0, 255]);
  });
});

describe("dither", () => {
  test("solo emite blanco o negro puros", () => {
    const out = getStyle("dither").apply(horizontalGradient(16, 16), {
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

  test("respeta tintas personalizadas", () => {
    const out = getStyle("dither").apply(horizontalGradient(16, 16), {
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
  test("to-top: arriba más teñido que abajo", () => {
    const fade = getStyle("footer-fade");
    const params: StyleParams = { direction: "to-top", fadeStart: 0, overlay: "#000000", strength: 100 };
    const out = fade.apply(solid(8, 8, 255, 255, 255), params);
    const top = out.data[0] + out.data[1] + out.data[2];
    const bottom = out.data[(7 * 8 + 0) * 4] + out.data[(7 * 8 + 0) * 4 + 1] + out.data[(7 * 8 + 0) * 4 + 2];
    expect(top).toBeLessThan(bottom);
    expect(top).toBe(0);
  });
});

describe("blur", () => {
  test("darken 0 sobre color sólido lo deja intacto", () => {
    const out = getStyle("blur").apply(solid(8, 8, 100, 150, 200), { darken: 0 });
    for (let i = 0; i < out.data.length; i += 4) {
      expect(out.data[i]).toBe(100);
      expect(out.data[i + 1]).toBe(150);
      expect(out.data[i + 2]).toBe(200);
    }
  });

  test("darken 50 reduce la luminosidad media a la mitad", () => {
    const out = getStyle("blur").apply(solid(8, 8, 200, 200, 200), { darken: 50 });
    expect(mean(out)).toBeCloseTo(100, 0);
  });
});

describe("frosted", () => {
  test("sin efectos es casi identidad salvo juntas", () => {
    const out = getStyle("frosted").apply(solid(8, 8, 120, 130, 140), {
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

  test("glow alto palidece los bordes", () => {
    const frosted = getStyle("frosted");
    const base = { tileSize: 64, frost: 0, warmth: 0, grain: 0, edgeTint: "#ffffff", warmTint: "#ff6a3d" };
    const plain = frosted.apply(solid(16, 16, 200, 0, 0), { ...base, glow: 0 });
    const glowed = frosted.apply(solid(16, 16, 200, 0, 0), { ...base, glow: 100 });
    // esquina con glow: más cerca del blanco que sin glow
    const c = (15 * 16 + 15) * 4;
    const distPlain = 255 * 3 - (plain.data[c] + plain.data[c + 1] + plain.data[c + 2]);
    const distGlowed = 255 * 3 - (glowed.data[c] + glowed.data[c + 1] + glowed.data[c + 2]);
    expect(distGlowed).toBeLessThan(distPlain);
  });
});
