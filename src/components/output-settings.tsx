import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { OutputFormat } from "@/store/use-forge-store";
import { useForgeStore } from "@/store/use-forge-store";

/** Ancho de salida + formato, en fila compacta. */
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
        <Select value={format} onValueChange={(v) => setFormat(v as OutputFormat)}>
          <SelectTrigger className="h-8 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image/webp">WebP (recomendado)</SelectItem>
            <SelectItem value="image/jpeg">JPEG</SelectItem>
            <SelectItem value="image/png">PNG</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
