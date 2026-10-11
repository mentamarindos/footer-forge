/**
 * Máscara de enfoque suave (unsharp mask) para recuperar la nitidez
 * percibida que se pierde al reducir. Cantidad fija y sutil: realza
 * bordes sin crear halos visibles ni inflar mucho los bytes.
 *
 * Puro (ImageData in → ImageData out), testeable sin DOM.
 */
export function unsharpMask(input: ImageData, amount = 0.16): ImageData {
  const w = input.width;
  const h = input.height;
  const src = input.data;

  // blur 3×3 separable en dos pasadas (box ≈ gaussiano barato)
  const tmp = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(w - 1, x + 1);
      const o = (row + x) * 4;
      for (let c = 0; c < 3; c++) {
        tmp[o + c] = (src[(row + x0) * 4 + c] + src[o + c] + src[(row + x1) * 4 + c]) / 3;
      }
    }
  }
  const blur = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - 1) * w;
    const y1 = Math.min(h - 1, y + 1) * w;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const o = (row + x) * 4;
      for (let c = 0; c < 3; c++) {
        blur[o + c] = (tmp[(y0 + x) * 4 + c] + tmp[o + c] + tmp[(y1 + x) * 4 + c]) / 3;
      }
    }
  }

  const out = new ImageData(w, h);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = src[i] + (src[i] - blur[i]) * amount;
    d[i + 1] = src[i + 1] + (src[i + 1] - blur[i + 1]) * amount;
    d[i + 2] = src[i + 2] + (src[i + 2] - blur[i + 2]) * amount;
    d[i + 3] = src[i + 3];
  }
  return out;
}
