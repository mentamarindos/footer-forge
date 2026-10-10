import { useEffect, useRef, useState } from "react";
import { Check, Compass, Copy } from "lucide-react";
import { Toaster } from "sonner";
import { ActionBar } from "@/components/action-bar";
import { Dropzone } from "@/components/dropzone";
import { FooterPreview } from "@/components/footer-preview";
import { OutputSettings } from "@/components/output-settings";
import { PreviewMinimap } from "@/components/preview-minimap";
import { StyleControls } from "@/components/style-controls";
import { StylePicker } from "@/components/style-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoProcess, useForgeStore } from "@/store/use-forge-store";
import { formatBytes } from "@/lib/utils";

const INSTALL_CMD =
  "npx shadcn@latest add https://raw.githubusercontent.com/mentamarindos/footer-forge/main/public/r/footer-art-uploader.json";

function InstallStrip() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = INSTALL_CMD;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border-b bg-muted/40">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-2 px-4 py-1.5">
        <span className="hidden shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
          shadcn
        </span>
        <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
          {INSTALL_CMD}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label="Copiar comando de instalación"
          title="Copiar"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground active:scale-90"
        >
          <span key={copied ? "check" : "copy"} className="animate-pop block">
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const dark = useForgeStore((s) => s.dark);
  const toggleDark = useForgeStore((s) => s.toggleDark);
  const result = useForgeStore((s) => s.result);
  const file = useForgeStore((s) => s.file);
  const maxBytes = useForgeStore((s) => s.maxBytes);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useAutoProcess();

  // imagen demo por defecto (una sola vez por sesión; respetar "quitar")
  const defaultLoaded = useRef(false);
  useEffect(() => {
    if (defaultLoaded.current) return;
    defaultLoaded.current = true;
    if (useForgeStore.getState().file) return;
    fetch("default-footer.jpg")
      .then((res) => {
        if (!res.ok) throw new Error(`default ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (useForgeStore.getState().file) return;
        useForgeStore.getState().pickFile(
          new File([blob], "default-footer.jpg", { type: blob.type || "image/jpeg" })
        );
      })
      .catch(() => {
        /* sin demo no pasa nada: el dropzone queda vacío */
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />

      {/* top bar compacta */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-13 w-full max-w-[1400px] items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Compass className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold tracking-tight">Footer Forge</span>
            <span className="hidden rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              ≤ {formatBytes(maxBytes)}
            </span>
          </div>
          <ThemeToggle dark={dark} onToggle={toggleDark} />
        </div>
        <InstallStrip />
      </header>

      <main className="mx-auto grid w-full max-w-[1400px] gap-4 px-4 py-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        {/* sidebar: entrada + estilo + salida */}
        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Imagen</CardTitle>
            </CardHeader>
            <CardContent>
              <Dropzone />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Estilo</CardTitle>
            </CardHeader>
            <CardContent>
              <StylePicker />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Salida</CardTitle>
            </CardHeader>
            <CardContent>
              <OutputSettings />
            </CardContent>
          </Card>
        </aside>

        {/* workspace: ajustes + exportar (el resultado vive en el footer) */}
        <section className="grid content-start gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Ajustes del estilo</CardTitle>
            </CardHeader>
            <CardContent>
              <StyleControls />
              {!file && (
                <p className="text-xs text-muted-foreground">
                  Sube una imagen para ver los ajustes del estilo activo.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Exportar</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionBar />
              {!file && (
                <p className="text-xs text-muted-foreground">
                  Aquí verás el peso final y la descarga en cuanto subas una imagen.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      {/* footer real a 100% del ancho, alimentado en vivo desde el store */}
      <FooterPreview result={result} />

      {/* minimapa flotante para dimensionar el preview */}
      <PreviewMinimap />
    </div>
  );
}
