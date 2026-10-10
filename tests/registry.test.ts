import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
    readFileSync(join(ROOT, "public", "r", "footer-art-uploader.json"), "utf8")
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

describe("registry shadcn", () => {
  test("public/r coincide con el item de registry.json", () => {
    const index = loadIndex();
    expect(index.items.length).toBeGreaterThan(0);
    expect(loadItem()).toEqual(index.items[0]);
  });

  test("cada archivo del registry existe en el repo", () => {
    const item = loadItem();
    expect(item.files.length).toBeGreaterThan(10);
    for (const f of item.files) {
      expect(existsSync(localPath(f.path))).toBe(true);
    }
  });

  test("todos los estilos están registrados", () => {
    const item = loadItem();
    const paths = item.files.map((f) => f.path);
    const styleDir = join(ROOT, "src", "lib", "image", "styles");
    for (const entry of readdirSync(styleDir)) {
      if (!entry.endsWith(".ts")) continue;
      expect(paths).toContain(`${RAW_PREFIX}src/lib/image/styles/${entry}`);
    }
  });

  test("store y componentes clave están registrados", () => {
    const targets = loadItem().files.map((f) => f.target);
    for (const t of [
      "store/use-forge-store.ts",
      "components/footer-art-uploader.tsx",
      "components/dropzone.tsx",
      "components/compare-view.tsx",
      "components/footer-preview.tsx",
      "lib/image/pipeline.ts",
      "lib/image/decode-image.ts",
      "lib/image/compress-to-limit.ts",
    ]) {
      expect(targets).toContain(t);
    }
  });

  test("dependencias runtime necesarias presentes", () => {
    const deps = loadItem().dependencies ?? [];
    for (const dep of ["sonner", "lucide-react", "heic-to", "utif", "zustand", "image-q"]) {
      expect(deps).toContain(dep);
    }
  });
});
