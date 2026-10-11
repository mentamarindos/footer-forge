import { describe, expect, test } from "bun:test";
import { unsharpMask } from "@/lib/image/sharpen";

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

/** Mitad izquierda negra, mitad derecha gris: borde vertical duro en x=8. */
function hardEdge(w = 16, h = 8, v = 200): ImageData {
  const img = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const c = x < w / 2 ? 0 : v;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
      img.data[i + 3] = 255;
    }
  }
  return img;
}

describe("unsharpMask", () => {
  test("sólido queda intacto (nada que realzar)", () => {
    const out = unsharpMask(solid(16, 16, 120, 130, 140));
    expect(Array.from(out.data)).toEqual(Array.from(solid(16, 16, 120, 130, 140).data));
  });

  test("preserva dimensiones y alpha", () => {
    const out = unsharpMask(solid(12, 7, 10, 20, 30, 200));
    expect(out.width).toBe(12);
    expect(out.height).toBe(7);
    for (let i = 3; i < out.data.length; i += 4) {
      expect(out.data[i]).toBe(200);
    }
  });

  test("realza el borde sin subimpulso visible (clamp)", () => {
    const out = unsharpMask(hardEdge(), 0.5);
    // justo a la derecha del borde: el blur local es menor → sube
    const right = (4 * 16 + 8) * 4;
    expect(out.data[right]).toBeGreaterThan(200);
    expect(out.data[right]).toBeLessThanOrEqual(255);
    // justo a la izquierda (negro): el término negativo se clampa a 0
    const left = (4 * 16 + 7) * 4;
    expect(out.data[left]).toBe(0);
  });

  test("amount 0 es identidad", () => {
    const input = hardEdge();
    const out = unsharpMask(input, 0);
    expect(Array.from(out.data)).toEqual(Array.from(input.data));
  });

  test("determinista", () => {
    const input = hardEdge();
    expect(Array.from(unsharpMask(input).data)).toEqual(Array.from(unsharpMask(input).data));
  });
});
