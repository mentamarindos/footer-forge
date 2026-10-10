import { useRef } from "react";
import { ImagePlus, RefreshCw, X } from "lucide-react";
import { SUPPORTED_INPUT_ACCEPT, useForgeStore } from "@/store/use-forge-store";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Zona de subida compacta: thumbnail + nombre una vez hay archivo. */
export function Dropzone() {
  const file = useForgeStore((s) => s.file);
  const originalUrl = useForgeStore((s) => s.originalUrl);
  const dragOver = useForgeStore((s) => s.dragOver);
  const pickFile = useForgeStore((s) => s.pickFile);
  const clearFile = useForgeStore((s) => s.clearFile);
  const setDragOver = useForgeStore((s) => s.setDragOver);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Subir imagen"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        pickFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left transition-all duration-150",
        "active:scale-[0.99]",
        dragOver
          ? "scale-[1.01] border-primary bg-accent"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
      )}
    >
      {file && originalUrl ? (
        <>
          <img
            src={originalUrl}
            alt="Original"
            className="h-12 w-12 shrink-0 rounded-lg border object-cover"
          />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <span
            role="button"
            tabIndex={0}
            aria-label="Cambiar imagen"
            title="Cambiar imagen"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                inputRef.current?.click();
              }
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Quitar imagen"
            title="Quitar imagen"
            onClick={(e) => {
              e.stopPropagation();
              clearFile();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                clearFile();
              }
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </span>
        </>
      ) : (
        <>
          <span
            className={cn(
              "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted transition-transform duration-150",
              dragOver ? "scale-110" : "group-hover:scale-105"
            )}
          >
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          </span>
          <div className="grid gap-0.5">
            <p className="text-sm font-medium">Arrastra o haz clic</p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              JPG · PNG · WebP · AVIF · GIF · SVG · BMP · TIFF · HEIC
            </p>
          </div>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_INPUT_ACCEPT}
        className="hidden"
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          // resetea el input: re-seleccionar el mismo archivo vuelve a disparar change
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
