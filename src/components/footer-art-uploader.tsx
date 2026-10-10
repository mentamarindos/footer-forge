"use client";

import { useEffect } from "react";
import { ActionBar } from "@/components/action-bar";
import { CompareView } from "@/components/compare-view";
import { Dropzone } from "@/components/dropzone";
import { FooterPreview } from "@/components/footer-preview";
import { OutputSettings } from "@/components/output-settings";
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
export function FooterArtUploader({
  defaultStyle = "pixel-art",
  availableStyles,
  targetWidth = 640,
  maxBytes = 102_400,
  output = "image/webp",
  onProcessed,
  showFooterPreview = true,
  className,
}: FooterArtUploaderProps) {
  const configure = useForgeStore((s) => s.configure);
  const result = useForgeStore((s) => s.result);

  useEffect(() => {
    configure({ defaultStyle, availableStyles, targetWidth, maxBytes, output, onProcessed });
  }, [configure, defaultStyle, availableStyles, targetWidth, maxBytes, output, onProcessed]);

  useAutoProcess();

  return (
    <div className={cn("grid gap-4", className)}>
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
      {result && showFooterPreview && <FooterPreview result={result} />}
    </div>
  );
}
