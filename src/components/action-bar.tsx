import { CheckCircle2, Download, Loader2, RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useForgeStore } from "@/store/use-forge-store";
import { formatBytes } from "@/lib/utils";

/** Estado del límite + acciones reprocesar/descargar. */
export function ActionBar() {
  const file = useForgeStore((s) => s.file);
  const result = useForgeStore((s) => s.result);
  const processing = useForgeStore((s) => s.processing);
  const maxBytes = useForgeStore((s) => s.maxBytes);
  const run = useForgeStore((s) => s.run);
  const download = useForgeStore((s) => s.download);

  if (!file) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        onClick={() => void run()}
        disabled={processing}
        className="transition-transform duration-150 active:scale-95"
      >
        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
        {result ? "Reprocesar" : "Procesar"}
      </Button>
      <Button
        variant="secondary"
        onClick={download}
        disabled={!result}
        className="transition-all duration-150 hover:-translate-y-px active:scale-95"
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
  );
}
