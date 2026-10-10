import { describe, expect, test } from "bun:test";
import { clamp01, hash2, hexToRgb } from "@/lib/image/color";

describe("hexToRgb", () => {
  test("hex de 6 dígitos", () => {
    expect(hexToRgb("#1e40a0")).toEqual([30, 64, 160]);
  });

  test("hex de 3 dígitos", () => {
    expect(hexToRgb("#f80")).toEqual([255, 136, 0]);
  });

  test("sin # también vale", () => {
    expect(hexToRgb("ffffff")).toEqual([255, 255, 255]);
  });

  test("inválido → fallback", () => {
    expect(hexToRgb("no-es-color")).toEqual([0, 0, 0]);
    expect(hexToRgb("#12", [1, 2, 3])).toEqual([1, 2, 3]);
    expect(hexToRgb("")).toEqual([0, 0, 0]);
  });
});

describe("clamp01", () => {
  test("recorta a [0,1]", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(7)).toBe(1);
  });
});

describe("hash2", () => {
  test("rango 0..1 y determinista", () => {
    for (const [x, y] of [[0, 0], [13, 7], [999, 999]] as Array<[number, number]>) {
      const h = hash2(x, y);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
      expect(hash2(x, y)).toBe(h);
    }
  });
});
