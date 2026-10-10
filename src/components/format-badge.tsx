import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MIME_LABELS: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "image/gif": "GIF",
  "image/bmp": "BMP",
  "image/x-icon": "ICO",
  "image/svg+xml": "SVG",
  "image/tiff": "TIFF",
  "image/heic": "HEIC",
  "image/heif": "HEIF",
};

export function FormatBadge({ mime, className }: { mime: string; className?: string }) {
  const label = MIME_LABELS[mime] ?? (mime.replace("image/", "").toUpperCase() || "IMG");
  return (
    <Badge variant="secondary" className={cn("font-mono text-[11px]", className)}>
      {label}
    </Badge>
  );
}
