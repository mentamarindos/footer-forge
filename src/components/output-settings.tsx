import { Label } from "@/components/ui/label";
import type { OutputFormat } from "@/store/use-forge-store";
import { WIDTH_PRESETS, useForgeStore } from "@/store/use-forge-store";
import { cn } from "@/lib/utils";

const FORMATS: Array<{ value: OutputFormat; label: string }> = [
  { value: "image/webp", label: "WebP" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
];

/** Ancho por presets de pantalla + formato segmentado. */
export function OutputSettings() {
  const width = useForgeStore((s) => s.width);
  const format = useForgeStore((s) => s.format);
  const setWidth = useForgeStore((s) => s.setWidth);
  const setFormat = useForgeStore((s) => s.setFormat);

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label className="text-xs">Ancho salida</Label>
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Ancho de salida por pantalla">
          {WIDTH_PRESETS.map((p) => {
            const isActive = p.width === width;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={isActive}
                title={`${p.label} · ${p.width}px (${p.hint})`}
                onClick={() => setWidth(p.width)}
                className={cn(
                  "grid gap-0.5 rounded-lg border px-2 py-1.5 text-center transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  "active:scale-95",
                  isActive
                    ? "scale-[1.02] border-primary bg-primary text-primary-foreground shadow"
                    : "border-input bg-background hover:-translate-y-px hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
                )}
              >
                <span className="text-xs font-semibold leading-none">{p.label}</span>
                <span className={cn("font-mono text-[10px] leading-none", isActive ? "opacity-80" : "text-muted-foreground")}>
                  {p.width}px
                </span>
              </button>
            );
          })}
        </div>
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
