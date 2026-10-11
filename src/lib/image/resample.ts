/** Re-muestreo progresivo de alta calidad para reducciones grandes. */

export interface StepSize {
  w: number;
  h: number;
}

/**
 * Planifica pasos intermedios de reducción: mientras el lado mayor duplique
 * al destino, baja a la mitad (promediado de área, cercano a Lanczos y muy
 * superior al salto único bilinear del resize nativo). Upscale o ratios <2×
 * van en un solo paso con smoothing high.
 *
 * Puro y testeable sin DOM.
 */
export function planSteps(fromW: number, fromH: number, toW: number, toH: number): StepSize[] {
  const tW = Math.max(1, Math.round(toW));
  const tH = Math.max(1, Math.round(toH));
  let w = Math.max(1, Math.round(fromW));
  let h = Math.max(1, Math.round(fromH));
  if (w === tW && h === tH) return [{ w: tW, h: tH }];

  const steps: StepSize[] = [];
  // Cada lado baja por su cuenta: con `&&` un panorama alargado frenaba el
  // lado largo en un salto de ~2× cuando el corto ya no podía seguir.
  while (w / tW >= 2 || h / tH >= 2) {
    // Nunca baja de 1px por lado (evita pasos degenerados en rarezas).
    w = Math.max(1, Math.round(w / 2));
    h = Math.max(1, Math.round(h / 2));
    steps.push({ w, h });
    // Freno de seguridad ante redondeos que no convergen.
    if (steps.length > 32) break;
  }
  const last = steps[steps.length - 1];
  if (!last || last.w !== tW || last.h !== tH) steps.push({ w: tW, h: tH });
  return steps;
}

function paintStep(
  target: HTMLCanvasElement,
  source: CanvasImageSource,
  w: number,
  h: number,
  willReadFrequently: boolean
): void {
  target.width = w;
  target.height = h;
  // El flag solo vale en la CREACIÓN del contexto: pasarlo después es no-op.
  const ctx = target.getContext("2d", { willReadFrequently })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
}

/**
 * Reduce (o amplía) con pasos intermedios según `planSteps`.
 * Cada paso usa su propio canvas: nunca se dibuja un canvas sobre sí mismo.
 */
export function drawStepped(
  source: CanvasImageSource,
  fromW: number,
  fromH: number,
  toW: number,
  toH: number,
  opts: { willReadFrequently?: boolean } = {}
): HTMLCanvasElement {
  const steps = planSteps(fromW, fromH, toW, toH);
  const { willReadFrequently = false } = opts;
  let current: CanvasImageSource = source;
  let out = document.createElement("canvas");
  for (const s of steps) {
    const next = document.createElement("canvas");
    paintStep(next, current, s.w, s.h, willReadFrequently);
    current = next;
    out = next;
  }
  return out;
}
