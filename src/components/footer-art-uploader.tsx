"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, ImagePlus, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { FormatBadge } from "@/components/format-badge";
import { StyleControls } from "@/components/style-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SUPPORTED_INPUT_ACCEPT } from "@/lib/image/decode-image";
import { processImage, type ProcessResult } from "@/lib/image/pipeline";
import { STYLE_LIST, getDefaultParams, getStyle } from "@/lib/image/styles";
import type { StyleParams } from "@/lib/image/styles/types";
import { cn, formatBytes } from "@/lib/utils";

export interface FooterArtUploaderProps {
  defaultStyle?: string;
  availableStyles?: string[];
  targetWidth?: number;
  maxBytes?: number;
  output?: "image/webp" | "image/jpeg" | "image/png";
  onProcessed?: (result: ProcessResult) => void;
  className?: string;
}

export function FooterArtUploader({
  defaultStyle = "pixel-art",
  availableStyles,
  targetWidth = 640,
  maxBytes = 102_400,
  output = "image/webp",
  onProcessed,
  className,
}: FooterArtUploaderProps) {
  const styles = useMemo(
    () => (availableStyles ? STYLE_LIST.filter((s) => availableStyles.includes(s.id)) : STYLE_LIST),
    [availableStyles]
  );

  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [styleId, setStyleId] = useState(
    styles.some((s) => s.id === defaultStyle) ? defaultStyle : styles[0]?.id ?? "pixel-art"
  );
  const style = getStyle(styleId);
  const [params, setParams] = useState<StyleParams>(() => getDefaultParams(defaultStyle));
  const [width, setWidth] = useState(targetWidth);
  const [format, setFormat] = useState(output);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const runId = useRef(0);

  // al cambiar de estilo, resetea sus params por defecto
  const handleStyleChange = useCallback((id: string) => {
    setStyleId(id);
    setParams(getDefaultParams(id));
  }, []);

  const pickFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setOriginalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  }, []);

  const run = useCallback(async () => {
    if (!file) return;
    const id = ++runId.current;
    setProcessing(true);
    try {
      const r = await processImage(file, {
        styleId,
        styleParams: params,
        targetWidth: width,
        maxBytes,
        output: format,
      });
      if (runId.current !== id) {
        URL.revokeObjectURL(r.url);
        return;
      }
      setResult((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return r;
      });
      onProcessed?.(r);
      if (!r.underLimit) {
        toast.warning(`Pesa ${formatBytes(r.size)}: no se pudo bajar de ${formatBytes(maxBytes)}.`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al procesar la imagen.";
      toast.error(msg);
    } finally {
      if (runId.current === id) setProcessing(false);
    }
  }, [file, styleId, params, width, format, maxBytes, onProcessed]);

  // reproceso automático con debounce (adaptativo: cualquier cambio re-renderiza)
  useEffect(() => {
    if (!file) return;
    const t = setTimeout(() => void run(), 350);
    return () => clearTimeout(t);
  }, [file, run]);

  const download = useCallback(() => {
    if (!result) return;
    const a = document.createElement("a");
    const base = file?.name.replace(/\.[^.]+$/, "") ?? "footer";
    const ext = result.mime === "image/png" ? "png" : result.mime === "image/jpeg" ? "jpg" : "webp";
    a.href = result.url;
    a.download = `${base}-${result.style.id}.${ext}`;
    a.click();
  }, [result, file]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Footer art uploader</CardTitle>
        <CardDescription>
          Sube una imagen → se estiliza y comprime a ≤ {formatBytes(maxBytes)} lista para el footer.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {/* dropzone */}
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
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            dragOver ? "border-primary bg-accent" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
          )}
        >
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {file ? file.name : "Arrastra una imagen o haz clic para elegirla"}
          </p>
          <p className="text-xs text-muted-foreground">JPG · PNG · WebP · AVIF · GIF · SVG · BMP · TIFF · HEIC</p>
          <input
            ref={inputRef}
            type="file"
            accept={SUPPORTED_INPUT_ACCEPT}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        {/* selector de estilo */}
        <div className="grid gap-2">
          <Label>Estilo</Label>
          <Select value={styleId} onValueChange={handleStyleChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {styles.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{style.description}</p>
        </div>

        {/* previews */}
        {file && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">ORIGINAL</span>
              {originalUrl && (
                <img src={originalUrl} alt="Original" className="max-h-64 w-full rounded-lg border object-contain bg-muted" />
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline">{formatBytes(file.size)}</Badge>
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">RESULTADO · {style.name}</span>
              <div className="flex min-h-40 items-center justify-center rounded-lg border bg-muted">
                {processing && !result ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : result ? (
                  <img src={result.url} alt="Resultado" className="max-h-64 w-full rounded-lg object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">Procesando…</span>
                )}
              </div>
              {result && (
                <div className="flex flex-wrap items-center gap-2">
                  <FormatBadge mime={result.mime} />
                  <Badge variant="outline">
                    {result.width}×{result.height}
                  </Badge>
                  <Badge variant={result.underLimit ? "default" : "destructive"}>
                    {formatBytes(result.size)}
                  </Badge>
                  {result.underLimit ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> ≤ {formatBytes(maxBytes)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-destructive">
                      <TriangleAlert className="h-3.5 w-3.5" /> excede el límite
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* controles adaptativos del estilo */}
        {file && <StyleControls style={style} values={params} onChange={setParams} />}

        {/* salida */}
        {file && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Ancho salida</Label>
                <span className="font-mono text-xs text-muted-foreground">{width}px</span>
              </div>
              <Slider min={160} max={1200} step={10} value={[width]} onValueChange={([v]) => setWidth(v)} />
            </div>
            <div className="grid gap-2">
              <Label>Formato</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                <SelectTrigger>
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
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void run()} disabled={!file || processing}>
            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            {result ? "Reprocesar" : "Procesar"}
          </Button>
          <Button variant="secondary" onClick={download} disabled={!result}>
            <Download className="h-4 w-4" /> Descargar ({result ? formatBytes(result.size) : "—"})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
