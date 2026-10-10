import { Toaster } from "sonner";
import { FooterArtUploader } from "@/components/footer-art-uploader";

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <main className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-10">
        <header className="grid gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Footer Forge</h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Convierte cualquier imagen en arte liviano para footers de landing pages:
            7 estilos adaptativos, compresión automática a ≤ 100 KB y salida WebP.
          </p>
        </header>

        <FooterArtUploader />

        {/* ejemplo de footer con imagen generada */}
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">VISTA PREVIA EN FOOTER</h2>
          <footer className="overflow-hidden rounded-xl border">
            <div className="flex flex-col items-center gap-1 bg-zinc-950 px-6 py-8 text-center text-zinc-100">
              <p className="text-lg font-bold">Tu landing aquí</p>
              <p className="max-w-md text-xs text-zinc-400">
                La imagen procesada va como fondo o tira superior del footer. Pesa ≤ 100 KB,
                así que no lastra el LCP.
              </p>
            </div>
          </footer>
        </section>

        <section className="rounded-xl border bg-muted/50 p-4 text-xs text-muted-foreground">
          <p className="font-mono">
            npx shadcn@latest add https://raw.githubusercontent.com/mentamarindos/footer-forge/main/public/r/footer-art-uploader.json
          </p>
        </section>
      </main>
    </div>
  );
}
