import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_PREFIX = "https://raw.githubusercontent.com/mentamarindos/footer-forge/main/";

interface RegistryFile {
  path: string;
  type: string;
  target: string;
}

interface RegistryItem {
  name: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
}

function loadItem(): RegistryItem {
  return JSON.parse(
    readFileSync(join(ROOT, "public", "r", "footer-art.json"), "utf8")
  ) as RegistryItem;
}

function loadIndex(): { items: RegistryItem[] } {
  return JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8")) as {
    items: RegistryItem[];
  };
}

function localPath(urlOrPath: string): string {
  const rel = urlOrPath.startsWith(RAW_PREFIX) ? urlOrPath.slice(RAW_PREFIX.length) : urlOrPath;
  return join(ROOT, rel);
}

describe("registry shadcn (footer-art)", () => {
  test("public/r coincide con el item de registry.json", () => {
    const index = loadIndex();
    expect(index.items.length).toBe(1);
    expect(index.items[0].name).toBe("footer-art");
    expect(loadItem()).toEqual(index.items[0]);
  });

  test("cada archivo del registry existe en el repo", () => {
    const item = loadItem();
    expect(item.files.length).toBe(2);
    for (const f of item.files) {
      expect(existsSync(localPath(f.path))).toBe(true);
    }
  });

  test("sin dependencias: el componente es autocontenido", () => {
    const item = loadItem();
    expect(item.dependencies ?? []).toEqual([]);
    expect(item.registryDependencies ?? []).toEqual([]);
  });

  test("footer-art no importa motor, store ni UI del estudio", () => {
    const src = readFileSync(join(ROOT, "src", "components", "footer-art.tsx"), "utf8");
    for (const banned of [
      "@/store/",
      "@/lib/image/",
      "@/components/ui/",
      "zustand",
      "sonner",
      "lucide-react",
      "image-q",
    ]) {
      expect(src.includes(banned)).toBe(false);
    }
  });
});
