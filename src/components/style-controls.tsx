import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { StyleDefinition, StyleParams } from "@/lib/image/styles/types";

interface Props {
  style: StyleDefinition;
  values: StyleParams;
  onChange: (next: StyleParams) => void;
}

/** Renderiza controles automáticamente según el schema de cada estilo (adaptativo). */
export function StyleControls({ style, values, onChange }: Props) {
  if (style.params.length === 0) return null;

  const set = (key: string, v: number | string) => onChange({ ...values, [key]: v });

  return (
    <div className="grid gap-4">
      {style.params.map((p) => {
        const current = values[p.key] ?? p.defaultValue;
        if (p.type === "slider") {
          return (
            <div key={p.key} className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={p.key}>{p.label}</Label>
                <span className="font-mono text-xs text-muted-foreground">
                  {String(current)}{p.unit ?? ""}
                </span>
              </div>
              <Slider
                id={p.key}
                min={p.min}
                max={p.max}
                step={p.step}
                value={[Number(current)]}
                onValueChange={([v]) => set(p.key, v)}
              />
            </div>
          );
        }
        if (p.type === "select") {
          // Oculta colorA/B salvo preset custom (solo duotono)
          return (
            <div key={p.key} className="grid gap-2">
              <Label>{p.label}</Label>
              <Select value={String(current)} onValueChange={(v) => set(p.key, v)}>
                <SelectTrigger>
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
        // color
        if (style.id === "duotone" && values["preset"] !== "custom" && (p.key === "colorA" || p.key === "colorB")) {
          return null;
        }
        return (
          <div key={p.key} className="flex items-center justify-between gap-3">
            <Label htmlFor={p.key}>{p.label}</Label>
            <input
              id={p.key}
              type="color"
              value={String(current)}
              onChange={(e) => set(p.key, e.target.value)}
              className="h-8 w-14 cursor-pointer rounded border bg-background"
            />
          </div>
        );
      })}
    </div>
  );
}
