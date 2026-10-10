/**
 * Bun no tiene DOM, así que polifilleamos el mínimo ImageData
 * que usan los estilos (constructor + width/height/data).
 */
class ImageDataPolyfill {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly colorSpace: string = "srgb";

  constructor(sw: number, sh: number);
  constructor(data: Uint8ClampedArray, sw: number, sh?: number);
  constructor(a: number | Uint8ClampedArray, b: number, c?: number) {
    if (typeof a === "number") {
      this.width = a;
      this.height = b;
      this.data = new Uint8ClampedArray(a * b * 4);
    } else {
      this.data = a;
      this.width = b;
      this.height = c ?? Math.floor(a.length / 4 / b);
    }
  }
}

(globalThis as unknown as { ImageData: unknown }).ImageData = ImageDataPolyfill;

// URL Blob (navegador) para tests del store
if (typeof URL.createObjectURL !== "function") {
  let n = 0;
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => `blob:mock-${++n}`;
  (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
}
