import { Check, Loader2, RotateCw } from "lucide-react";
import { useForgeStore } from "@/store/use-forge-store";
import { cn } from "@/lib/utils";

/** Reprocesar flotante (abajo-derecha): spinner al procesar, check verde al listo. */
export function ReprocessFab() {
  const file = useForgeStore((s) => s.file);
  const result = useForgeStore((s) => s.result);
  const processing = useForgeStore((s) => s.processing);
  const run = useForgeStore((s) => s.run);

  if (!file) return null;
  const ready = result != null && !processing;

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={processing}
      aria-label={processing ? "Procesando imagen" : "Reprocesar imagen"}
      title={processing ? "Procesando…" : "Reprocesar"}
      className={cn(
        "fixed bottom-4 right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border bg-card/95 shadow-xl backdrop-blur",
        "transition-all duration-150 hover:-translate-y-0.5 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        processing ? "cursor-wait opacity-90" : "cursor-pointer"
      )}
    >
      <span key={processing ? "loading" : ready ? "ready" : "idle"} className="animate-pop block">
        {processing ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : ready ? (
          <Check className="h-5 w-5 text-green-600 dark:text-green-400" strokeWidth={3} />
        ) : (
          <RotateCw className="h-5 w-5" />
        )}
      </span>
    </button>
  );
}
