/**
 * Máscara de enfoque suave (unsharp mask) para recuperar la nitidez
 * percibida que se pierde al reducir. Cantidad fija y sutil: realza
 * bordes sin crear halos visibles ni inflar mucho los bytes.
 *
 * - Memoria O(ancho): ring buffers de 3 filas, no 2× la imagen en Float32.
 * - No es alpha-aware por diseño: si hay algo de transparencia se devuelve
 *   una copia intacta (el blur sangraría negro hacia dentro del borde).
 *
 * Puro (ImageData in → ImageData NUEVO out), testeable sin DOM.
 */
export function unsharpMask(input: ImageData, amount = 0.16): ImageData {
  const w = input.width;
  const h = input.height;
  const src = input.data;

  const copy = () => new ImageData(new Uint8ClampedArray(src), w, h);

  // Con alpha variable el blur RGB sangra el (0,0,0) transparente hacia el
  // borde opaco: mejor no enfocar que crear un halo oscuro.
  for (let i = 3; i < src.length; i += 4) {
    if (src[i] < 250) return copy();
  }

  // Blur 3×3 separable con ring buffers: 3 filas horizontales reutilizadas.
  const buf = [new Float32Array(w * 3), new Float32Array(w * 3), new Float32Array(w * 3)];

  const hblurInto = (dst: Float32Array, y: number): void => {
    const yy = Math.min(h - 1, Math.max(0, y));
    const row = yy * w;
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(w - 1, x + 1);
      const o = x * 3;
      const a = (row + x0) * 4;
      const b = (row + x) * 4;
      const c = (row + x1) * 4;
      dst[o] = (src[a] + src[b] + src[c]) / 3;
      dst[o + 1] = (src[a + 1] + src[b + 1] + src[c + 1]) / 3;
      dst[o + 2] = (src[a + 2] + src[b + 2] + src[c + 2]) / 3;
    }
  };

  hblurInto(buf[0], -1);
  hblurInto(buf[1], 0);
  hblurInto(buf[2], 1);
  let i0 = 0;
  let i1 = 1;
  let i2 = 2;

  const out = new ImageData(w, h);
  const d = out.data;
  for (let y = 0; y < h; y++) {
    const r0 = buf[i0];
    const r1 = buf[i1];
    const r2 = buf[i2];
    const srow = y * w;
    for (let x = 0; x < w; x++) {
      const o3 = x * 3;
      const o4 = (srow + x) * 4;
      for (let c = 0; c < 3; c++) {
        const blur = (r0[o3 + c] + r1[o3 + c] + r2[o3 + c]) / 3;
        d[o4 + c] = src[o4 + c] + (src[o4 + c] - blur) * amount;
      }
      d[o4 + 3] = src[o4 + 3];
    }
    // rota: el buffer más viejo se reutiliza para la fila y+2
    const next = i0;
    i0 = i1;
    i1 = i2;
    i2 = next;
    hblurInto(buf[i2], y + 2);
  }
  return out;
}
