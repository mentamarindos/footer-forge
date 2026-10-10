import {
  Blend,
  Contrast,
  Droplets,
  Grid2x2,
  LayoutGrid,
  Moon,
  PanelBottom,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { STYLE_LIST, getStyle } from "@/lib/image/styles";
import { useForgeStore } from "@/store/use-forge-store";
import { cn } from "@/lib/utils";

export const STYLE_ICONS: Record<string, LucideIcon> = {
  "pixel-art": LayoutGrid,
  frosted: Droplets,
  ballpoint: PenLine,
  duotone: Contrast,
  grayscale: Moon,
  dither: Grid2x2,
  "footer-fade": PanelBottom,
  blur: Blend,
};

/** Grid compacto de toggles con icono; respeta availableStyles del store. */
export function StylePicker() {
  const available = useForgeStore((s) => s.availableStyles);
  const styleId = useForgeStore((s) => s.styleId);
  const setStyle = useForgeStore((s) => s.setStyle);

  const styles = STYLE_LIST.filter((s) => available.includes(s.id));
  const active = getStyle(styleId);

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Estilo de imagen">
        {styles.map((s) => {
          const Icon = STYLE_ICONS[s.id] ?? LayoutGrid;
          const isActive = s.id === styleId;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={isActive}
              title={s.description}
              onClick={() => setStyle(s.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center",
                "transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "active:scale-95",
                isActive
                  ? "scale-[1.02] border-primary bg-primary text-primary-foreground shadow"
                  : "border-input bg-background hover:-translate-y-px hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-medium leading-tight">{s.name}</span>
            </button>
          );
        })}
      </div>
      <p key={active.id} className="animate-fade-in text-xs text-muted-foreground">
        {active.description}
      </p>
    </div>
  );
}
