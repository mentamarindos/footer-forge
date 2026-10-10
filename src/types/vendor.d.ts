declare module "utif" {
  const UTIF: {
    decode: (buf: ArrayBuffer) => Array<Record<string, number[] | number> & { width: number; height: number; data?: Uint8Array }>;
    decodeImage: (buf: ArrayBuffer, ifd: unknown) => void;
    toRGBA8: (ifd: unknown) => Uint8Array;
    default?: unknown;
  };
  export default UTIF;
}

declare module "heic-to" {
  export function heicTo(options: { blob: Blob; type: "bitmap"; options?: ImageBitmapOptions }): Promise<ImageBitmap>;
  export function heicTo(options: { blob: Blob; type: string; quality?: number }): Promise<Blob>;
  export function isHeic(blob: Blob | File): Promise<boolean>;
}
