import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { getStyle } from "@/lib/image/styles";
import { useForgeStore } from "@/store/use-forge-store";
import { cn } from "@/lib/utils";

/** Controles generados del schema del estilo activo (adaptativo, desde el store). */
export function StyleControls() {
  const styleId = useForgeStore((s) => s.styleId);
  const values = useForgeStore((s) => s.params);
  const updateParam = useForgeStore((s) => s.updateParam);
  const file = useForgeStore((s) => s.file);

  const style = getStyle(styleId);
  if (!file || style.params.length === 0) return null;

  return (
    <div className="grid gap-3">
      {style.params.map((p) => {
        const current = values[p.key] ?? p.defaultValue;
        if (p.type === "slider") {
          return (
            <div key={p.key} className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={p.key} className="text-xs">{p.label}</Label>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {String(current)}{p.unit ?? ""}
                </span>
              </div>
              <Slider
                id={p.key}
                min={p.min}
                max={p.max}
                step={p.step}
                value={[Number(current)]}
                onValueChange={([v]) => updateParam(p.key, v)}
              />
            </div>
          );
        }
        if (p.type === "select") {
          return (
            <div key={p.key} className="grid gap-1.5">
              <Label className="text-xs">{p.label}</Label>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={p.label}>
                {p.options.map((o) => {
                  const isActive = String(current) === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => updateParam(p.key, o.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        "active:scale-95",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
        if (style.id === "duotone" && values["preset"] !== "custom" && (p.key === "colorA" || p.key === "colorB")) {
          return null;
        }
        return (
          <div key={p.key} className="flex items-center justify-between gap-3">
            <Label htmlFor={p.key} className="text-xs">{p.label}</Label>
            <input
              id={p.key}
              type="color"
              value={String(current)}
              onChange={(e) => updateParam(p.key, e.target.value)}
              className="h-7 w-12 cursor-pointer rounded border bg-background transition-transform duration-150 hover:scale-105"
            />
          </div>
        );
      })}
    </div>
  );
}
