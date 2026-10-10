import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { WheelSlider } from "@/components/ui/wheel-slider";
import { MAX_PREVIEW_WIDTH, MAX_PREVIEW_ZOOM, MIN_PREVIEW_WIDTH, MIN_PREVIEW_ZOOM, useForgeStore } from "@/store/use-forge-store";
import { cn } from "@/lib/utils";

/**
 * Minimapa flotante (abajo-izquierda) para dimensionar el preview:
 * vista en miniatura + sliders de ancho (simula pantallas) y alto.
 * Colapsable a una píldora.
 */
export function PreviewMinimap() {
  // en móvil arranca colapsado para no tapar el footer
  const [open, setOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 768
  );
  const result = useForgeStore((s) => s.result);
  const previewWidth = useForgeStore((s) => s.previewWidth);
  const previewHeight = useForgeStore((s) => s.previewHeight);
  const previewBlur = useForgeStore((s) => s.previewBlur);
  const setPreviewWidth = useForgeStore((s) => s.setPreviewWidth);
  const setPreviewHeight = useForgeStore((s) => s.setPreviewHeight);
  const previewZoom = useForgeStore((s) => s.previewZoom);
  const setPreviewZoom = useForgeStore((s) => s.setPreviewZoom);
  const setPreviewBlur = useForgeStore((s) => s.setPreviewBlur);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir minimapa del preview"
        className="fixed bottom-4 left-4 z-50 inline-flex animate-pop items-center gap-1.5 rounded-full border bg-card/95 px-3 py-2 text-xs font-medium shadow-xl backdrop-blur transition-transform duration-150 hover:-translate-y-0.5 active:scale-95"
      >
        <ChevronUp className="h-4 w-4" /> Preview
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 grid w-60 animate-pop gap-2.5 rounded-xl border bg-card/95 p-3 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs font-semibold">Preview</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-mono text-[10px] text-muted-foreground">
            {previewWidth ?? "100%"} × {previewHeight}
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Minimizar minimapa"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </span>
      </div>

      {/* minimapa: la imagen del footer en miniatura */}
      <div className="h-20 overflow-hidden rounded-lg border bg-muted">
        {result ? (
          <img
            key={result.url}
            src={result.url}
            alt="Miniatura del footer"
            className="h-full w-full animate-fade-in object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center border border-dashed">
            <span className="px-2 text-center text-[11px] text-muted-foreground">
              Sube una imagen para verla aquí
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-1">
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Ancho</Label>
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground">
              {previewWidth == null ? "100%" : `${previewWidth}px`}
            </span>
            <button
              type="button"
              onClick={() => setPreviewWidth(null)}
              aria-pressed={previewWidth == null}
              title="Ancho completo"
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all duration-150 active:scale-95",
                previewWidth == null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              Full
            </button>
          </span>
        </div>
        <WheelSlider
          min={MIN_PREVIEW_WIDTH}
          max={MAX_PREVIEW_WIDTH}
          step={20}
          value={[previewWidth ?? MAX_PREVIEW_WIDTH]}
          onValueChange={([v]) => setPreviewWidth(v)}
        />
      </div>

      <div className="grid gap-1">
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Alto</Label>
          <span className="font-mono text-[10px] text-muted-foreground">{previewHeight}px</span>
        </div>
        <WheelSlider
          min={360}
          max={1000}
          step={20}
          value={[previewHeight]}
          onValueChange={([v]) => setPreviewHeight(v)}
        />
      </div>

      <div className="grid gap-1">
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Imagen</Label>
          <span className="font-mono text-[10px] text-muted-foreground">
            {Math.round(previewZoom * 100)}%
          </span>
        </div>
        <WheelSlider
          min={MIN_PREVIEW_ZOOM}
          max={MAX_PREVIEW_ZOOM}
          step={0.05}
          value={[previewZoom]}
          onValueChange={([v]) => setPreviewZoom(v)}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px]">Difuminado arriba</Label>
        <button
          type="button"
          role="switch"
          aria-checked={previewBlur}
          onClick={() => setPreviewBlur(!previewBlur)}
          title={previewBlur ? "Quitar difuminado" : "Poner difuminado"}
          className={cn(
            "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            previewBlur ? "bg-primary" : "bg-muted-foreground/30"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-150",
              previewBlur ? "left-[18px]" : "left-0.5"
            )}
          />
        </button>
      </div>
    </div>
  );
}
