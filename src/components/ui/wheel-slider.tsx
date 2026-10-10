import { useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import type * as React from "react";

type SliderProps = React.ComponentProps<typeof Slider>;

interface WheelSliderProps extends Omit<SliderProps, "value" | "onValueChange"> {
  value: number[];
  onValueChange: (value: number[]) => void;
  /** Multiplicador del paso con Shift. Por defecto 10. */
  shiftMultiplier?: number;
}

/**
 * Slider que también se ajusta con la rueda del ratón al pasar por encima.
 * Bloquea el scroll de la página mientras se ajusta. Shift = paso grande.
 */
export function WheelSlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  shiftMultiplier = 10,
  ...rest
}: WheelSliderProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef({ value, onValueChange, min, max, step, shiftMultiplier });
  stateRef.current = { value, onValueChange, min, max, step, shiftMultiplier };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // listener nativo no-pasivo: puede cancelar el scroll de la página
      e.preventDefault();
      const s = stateRef.current;
      const current = s.value[0] ?? s.min;
      const delta = (e.shiftKey ? s.step * s.shiftMultiplier : s.step) * (e.deltaY > 0 ? -1 : 1);
      const decimals = (String(s.step).split(".")[1] ?? "").length;
      const snapped = Number((Math.round((current + delta) / s.step) * s.step).toFixed(decimals));
      const next = Math.min(s.max, Math.max(s.min, snapped));
      if (next !== current) s.onValueChange([next]);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <span
      ref={wrapRef}
      className="block cursor-ew-resize"
      title="Ajusta también con la rueda del ratón (Shift = paso grande)"
    >
      <Slider value={value} onValueChange={onValueChange} min={min} max={max} step={step} {...rest} />
    </span>
  );
}
