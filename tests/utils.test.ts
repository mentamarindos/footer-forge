import { describe, expect, test } from "bun:test";
import { cn, formatBytes, formatTimestamp } from "@/lib/utils";

describe("formatBytes", () => {
  test("0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  test("KB exactos", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(102_400)).toBe("100 KB");
  });

  test("decimales", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  test("MB", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
  });
});

describe("formatTimestamp", () => {
  test("YYYYMMDD-HHmm en 24h", () => {
    // 11 oct 2026, 07:08 y 19:08 hora local
    expect(formatTimestamp(new Date(2026, 9, 11, 7, 8))).toBe("20261011-0708");
    expect(formatTimestamp(new Date(2026, 9, 11, 19, 8))).toBe("20261011-1908");
  });

  test("medianoche y fin de año con ceros", () => {
    expect(formatTimestamp(new Date(2026, 0, 1, 0, 5))).toBe("20260101-0005");
  });

  test("formato de 13 dígitos siempre", () => {
    expect(formatTimestamp()).toMatch(/^\d{8}-\d{4}$/);
  });
});

describe("cn", () => {
  test("concatena clases", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  test("tailwind-merge resuelve conflictos", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  test("ignora falsy", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
