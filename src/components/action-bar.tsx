import { CheckCircle2, Download, Loader2, RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormatBadge } from "@/components/format-badge";
import { Badge } from "@/components/ui/badge";
import { useForgeStore } from "@/store/use-forge-store";
import { formatBytes } from "@/lib/utils";

/** Exportación: badges del resultado + reprocesar/descargar + estado del límite. */
export function ActionBar() {
  const file = useForgeStore((s) => s.file);
  const result = useForgeStore((s) => s.result);
  const processing = useForgeStore((s) => s.processing);
  const maxBytes = useForgeStore((s) => s.maxBytes);
  const targetWidth = useForgeStore((s) => s.width);
  const run = useForgeStore((s) => s.run);
  const download = useForgeStore((s) => s.download);

  if (!file) return null;

  const downscaled =
    result != null &&
    (result.width < result.requestedWidth || result.height < result.requestedHeight);
  // la foto manda: si es más chica que el preset, no se amplía (no inventa píxeles)
  const sourceLimited = result != null && result.originalWidth < targetWidth;

  return (
    <div className="grid gap-3">
      {result && (
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <FormatBadge mime={result.mime} />
            <Badge variant="outline" className="font-mono text-[11px]">
              {result.width}×{result.height}
            </Badge>
            <Badge variant={result.underLimit ? "default" : "destructive"} className="font-mono text-[11px]">
              {formatBytes(result.size)}
            </Badge>
          </div>
          {downscaled && (
            <p className="animate-fade-in text-[11px] text-muted-foreground">
              Pedidos {result.requestedWidth}×{result.requestedHeight}px → reducidos a{" "}
              {result.width}×{result.height}px para caber en {formatBytes(maxBytes)}.
              Sube el límite o baja el ancho para más calidad.
            </p>
          )}
          {sourceLimited && (
            <p className="animate-fade-in text-[11px] text-muted-foreground">
              Tu foto mide {result.originalWidth}px de ancho: no se amplía a{" "}
              {targetWidth}px porque interpolar no crea calidad real. Usa una
              foto más grande si necesitas 4K de verdad.
            </p>
          )}
        </div>
      )}
      <div className="grid gap-2">
        <Button
          onClick={() => void run()}
          disabled={processing}
          className="w-full transition-transform duration-150 active:scale-95"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          {result ? "Reprocesar" : "Procesar"}
        </Button>
        <Button
          variant="secondary"
          onClick={download}
          disabled={!result}
          className="w-full transition-all duration-150 hover:-translate-y-px active:scale-95"
        >
          <Download className="h-4 w-4" /> Descargar ({result ? formatBytes(result.size) : "—"})
        </Button>
        {result &&
          (result.underLimit ? (
            <span className="inline-flex animate-fade-in items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> ≤ {formatBytes(maxBytes)}
            </span>
          ) : (
            <span className="inline-flex animate-fade-in items-center gap-1 text-xs font-medium text-destructive">
              <TriangleAlert className="h-3.5 w-3.5" /> excede el límite
            </span>
          ))}
      </div>
    </div>
  );
}
