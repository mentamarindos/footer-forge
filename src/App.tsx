import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Toaster } from "sonner";
import { FooterArtUploader } from "@/components/footer-art-uploader";
import { Button } from "@/components/ui/button";

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

export default function App() {
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <main className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-10">
        <header className="grid gap-2 text-center">
          <div className="flex items-center justify-end">
            <Button variant="outline" size="icon" onClick={toggle} aria-label="Cambiar tema">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Footer Forge</h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Convierte cualquier imagen en arte liviano para footers de landing pages:
            7 estilos adaptativos, compresión automática a ≤ 100 KB y salida WebP.
          </p>
        </header>

        <FooterArtUploader />

        <section className="rounded-xl border bg-muted/50 p-4 text-xs text-muted-foreground">
          <p className="break-all font-mono">
            npx shadcn@latest add https://raw.githubusercontent.com/mentamarindos/footer-forge/main/public/r/footer-art-uploader.json
          </p>
        </section>
      </main>
    </div>
  );
}
