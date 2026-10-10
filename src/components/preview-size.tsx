import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useForgeStore } from "@/store/use-forge-store";

/** Slider compacto para el alto del preview del footer. */
export function PreviewSize() {
  const previewHeight = useForgeStore((s) => s.previewHeight);
  const setPreviewHeight = useForgeStore((s) => s.setPreviewHeight);

  return (
    <div className="flex items-center gap-3">
      <Label className="shrink-0 text-xs">Alto del footer</Label>
      <Slider
        min={360}
        max={1000}
        step={20}
        value={[previewHeight]}
        onValueChange={([v]) => setPreviewHeight(v)}
        className="flex-1"
      />
      <span className="w-14 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
        {previewHeight}px
      </span>
    </div>
  );
}
