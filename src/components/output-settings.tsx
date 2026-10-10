import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { OutputFormat } from "@/store/use-forge-store";
import { useForgeStore } from "@/store/use-forge-store";
import { cn } from "@/lib/utils";

const FORMATS: Array<{ value: OutputFormat; label: string }> = [
  { value: "image/webp", label: "WebP" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
];

/** Ancho de salida + formato segmentado, en fila compacta. */
export function OutputSettings() {
  const width = useForgeStore((s) => s.width);
  const format = useForgeStore((s) => s.format);
  const setWidth = useForgeStore((s) => s.setWidth);
  const setFormat = useForgeStore((s) => s.setFormat);

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Ancho salida</Label>
          <span className="font-mono text-[11px] text-muted-foreground">{width}px</span>
        </div>
        <Slider min={160} max={1200} step={10} value={[width]} onValueChange={([v]) => setWidth(v)} />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs">Formato</Label>
        <div className="grid grid-cols-3 gap-1 rounded-lg border bg-muted p-1" role="group" aria-label="Formato de salida">
          {FORMATS.map((f) => {
            const isActive = f.value === format;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={isActive}
                title={f.value === "image/webp" ? "WebP (recomendado)" : f.label}
                onClick={() => setFormat(f.value)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  "active:scale-95",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
