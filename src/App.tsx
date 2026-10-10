import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { Toaster } from "sonner";
import { ActionBar } from "@/components/action-bar";
import { CompareView } from "@/components/compare-view";
import { Dropzone } from "@/components/dropzone";
import { FooterPreview } from "@/components/footer-preview";
import { OutputSettings } from "@/components/output-settings";
import { PreviewSize } from "@/components/preview-size";
import { StyleControls } from "@/components/style-controls";
import { StylePicker } from "@/components/style-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoProcess, useForgeStore } from "@/store/use-forge-store";

function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("footer-forge-theme");
    if (saved) return saved === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("footer-forge-theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

export default function App() {
  const { dark, toggle } = useTheme();
  const result = useForgeStore((s) => s.result);

  useAutoProcess();

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
              ≤ 100 KB
            </span>
          </div>
          <ThemeToggle dark={dark} onToggle={toggle} />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1400px] gap-4 px-4 py-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        {/* sidebar: controles */}
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
              <CardTitle className="text-[13px]">Ajustes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <StyleControls />
              <OutputSettings />
            </CardContent>
          </Card>
        </aside>

        {/* workspace: comparativa + acciones */}
        <section className="grid content-start gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px]">Comparativa</CardTitle>
              <SectionTitle>antes / después</SectionTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <CompareView />
              <ActionBar />
            </CardContent>
          </Card>

          <section className="rounded-xl border bg-muted/50 p-3 text-[11px] text-muted-foreground">
            <p className="break-all font-mono">
              npx shadcn@latest add https://raw.githubusercontent.com/mentamarindos/footer-forge/main/public/r/footer-art-uploader.json
            </p>
          </section>
        </section>
      </main>

      {/* footer real a 100% del ancho, alimentado en vivo desde el store */}
      <div className="border-t bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-2.5">
          <PreviewSize />
        </div>
      </div>
      <FooterPreview result={result} />
    </div>
  );
}
