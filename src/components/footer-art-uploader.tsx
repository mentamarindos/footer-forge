"use client";

import { useEffect, useRef } from "react";
import { Toaster } from "sonner";
import { ActionBar } from "@/components/action-bar";
import { CompareView } from "@/components/compare-view";
import { Dropzone } from "@/components/dropzone";
import { FooterPreview } from "@/components/footer-preview";
import { OutputSettings } from "@/components/output-settings";
import { PreviewMinimap } from "@/components/preview-minimap";
import { StyleControls } from "@/components/style-controls";
import { StylePicker } from "@/components/style-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoProcess, useForgeStore, type OutputFormat } from "@/store/use-forge-store";
import type { ProcessResult } from "@/lib/image/pipeline";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface FooterArtUploaderProps {
  defaultStyle?: string;
  availableStyles?: string[];
  targetWidth?: number;
  maxBytes?: number;
  output?: OutputFormat;
  onProcessed?: (result: ProcessResult) => void;
  /** Muestra el mock de footer en vivo con la imagen resultante. */
  showFooterPreview?: boolean;
  className?: string;
}

/**
 * Componente shadcn autocontenido. Usa el store de Zustand interno
 * (una instancia por página) y compone los bloques especializados.
 */
let mountedInstances = 0;

export function FooterArtUploader({
  defaultStyle = "pixel-art",
  availableStyles,
  targetWidth = 1280,
  maxBytes = 102_400,
  output = "image/webp",
  onProcessed,
  showFooterPreview = true,
  className,
}: FooterArtUploaderProps) {
  const configure = useForgeStore((s) => s.configure);
  const result = useForgeStore((s) => s.result);

  // Config estable: se aplica una vez al montar (los arrays/callbacks inline
  // del host cambiarían de identidad en cada render y resetearían ajustes).
  // Nota: una sola instancia por página (store singleton compartido).
  const onProcessedRef = useRef(onProcessed);
  onProcessedRef.current = onProcessed;
  const initialCfg = useRef({ defaultStyle, availableStyles, targetWidth, maxBytes, output }).current;
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    if (++mountedInstances > 1) {
      console.warn(
        "[footer-art-uploader] Solo se soporta una instancia por página: el store es compartido."
      );
    }
    configure({
      ...initialCfg,
      onProcessed: (r) => {
        if (mounted.current) onProcessedRef.current?.(r);
      },
    });
    return () => {
      mounted.current = false;
      mountedInstances = Math.max(0, mountedInstances - 1);
      useForgeStore.setState({ onProcessed: null });
    };
  }, [configure, initialCfg]);

  useAutoProcess();

  return (
    <div className={cn("grid gap-4", className)}>
      <Toaster richColors position="top-center" />
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Footer art uploader</CardTitle>
          <CardDescription className="text-xs">
            Sube una imagen → se estiliza y comprime a ≤ {formatBytes(maxBytes)} lista para el footer.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Dropzone />
          <StylePicker />
          <CompareView />
          <StyleControls />
          <OutputSettings />
          <ActionBar />
        </CardContent>
      </Card>
      {result && showFooterPreview && (
        <div className="grid gap-2">
          <FooterPreview result={result} />
          <PreviewMinimap />
        </div>
      )}
    </div>
  );
}
