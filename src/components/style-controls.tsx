import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getStyle } from "@/lib/image/styles";
import { useForgeStore } from "@/store/use-forge-store";

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
              <Select value={String(current)} onValueChange={(v) => updateParam(p.key, v)}>
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {p.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
