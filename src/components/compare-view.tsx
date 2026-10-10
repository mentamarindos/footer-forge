import { ImageIcon, Loader2 } from "lucide-react";
import { FormatBadge } from "@/components/format-badge";
import { Badge } from "@/components/ui/badge";
import { getStyle } from "@/lib/image/styles";
import { useForgeStore } from "@/store/use-forge-store";
import { formatBytes } from "@/lib/utils";

/** Comparativa original/resultado con badges de estado. */
export function CompareView() {
  const file = useForgeStore((s) => s.file);
  const originalUrl = useForgeStore((s) => s.originalUrl);
  const fileKey = useForgeStore((s) => s.fileKey);
  const result = useForgeStore((s) => s.result);
  const processing = useForgeStore((s) => s.processing);
  const styleId = useForgeStore((s) => s.styleId);

  if (!file) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 text-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          Sube una imagen para ver la comparativa
        </p>
        <p className="max-w-xs text-xs text-muted-foreground/70">
          El resultado se genera solo y se actualiza al mover cualquier control.
        </p>
      </div>
    );
  }

  const style = getStyle(styleId);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <figure className="grid gap-1.5">
        <figcaption className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Original
        </figcaption>
        {originalUrl && (
          <img
            key={`orig-${fileKey}-${originalUrl}`}
            src={originalUrl}
            alt="Original"
            className="max-h-80 w-full rounded-lg border bg-muted object-contain"
          />
        )}
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-[11px]">
            {formatBytes(file.size)}
          </Badge>
        </div>
      </figure>

      <figure className="grid gap-1.5">
        <figcaption className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Resultado · {style.name}
        </figcaption>
        <div className="relative flex min-h-40 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {result && (
            <img
              key={result.url}
              src={result.url}
              alt="Resultado"
              className="max-h-80 w-full animate-fade-in object-contain"
            />
          )}
          {processing && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/60 backdrop-blur-[1px]">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Procesando…</span>
            </div>
          )}
        </div>
        {result && (
          <div className="flex flex-wrap items-center gap-1.5">
            <FormatBadge mime={result.mime} />
            <Badge variant="outline" className="font-mono text-[11px]">
              {result.width}×{result.height}
            </Badge>
            <Badge variant={result.underLimit ? "default" : "destructive"} className="font-mono text-[11px]">
              {formatBytes(result.size)}
            </Badge>
          </div>
        )}
      </figure>
    </div>
  );
}
