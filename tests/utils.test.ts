import { describe, expect, test } from "bun:test";
import { cn, formatBytes } from "@/lib/utils";

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
