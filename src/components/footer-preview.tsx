import { ArrowRight, Globe, Mail } from "lucide-react";
import type { ProcessResult } from "@/lib/image/pipeline";
import { formatBytes } from "@/lib/utils";

interface Props {
  /** Último resultado procesado. Si es null se muestra el footer con placeholder. */
  result: ProcessResult | null;
}

const COLUMNS: Array<{ title: string; links: string[] }> = [
  { title: "Producto", links: ["Características", "Precios", "Integraciones", "Changelog"] },
  { title: "Empresa", links: ["Nosotros", "Blog", "Empleo", "Contacto"] },
  { title: "Recursos", links: ["Documentación", "Guías", "Comunidad", "Soporte"] },
  { title: "Legal", links: ["Privacidad", "Términos", "Cookies", "Licencias"] },
];

/**
 * Mock de footer de landing a ancho completo.
 * La imagen procesada va como tira superior full-bleed; debajo,
 * columnas de links, social y barra inferior como un footer real.
 */
export function FooterPreview({ result }: Props) {
  return (
    <footer className="w-full border-t">
      {/* tira de imagen full-bleed */}
      <div className="relative h-56 w-full overflow-hidden bg-muted sm:h-72">
        {result ? (
          <img
            src={result.url}
            alt={`Footer estilo ${result.style.name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center border-2 border-dashed bg-muted/50">
            <p className="px-4 text-center text-sm text-muted-foreground">
              Tu imagen procesada aparecerá aquí en cuanto subas una
            </p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-4xl flex-col items-center gap-3 px-4 pb-6 text-center">
          <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Tu próximo lanzamiento empieza aquí
          </p>
          <p className="max-w-md text-xs text-zinc-300 sm:text-sm">
            Únete a 12.000 equipos que ya construyen landings que convierten.
          </p>
          <div className="flex w-full max-w-sm items-center gap-2">
            <input
              type="email"
              placeholder="tu@email.com"
              className="h-9 w-full rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/50"
            />
            <button
              type="button"
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
            >
              Empezar <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* cuerpo del footer */}
      <div className="w-full bg-zinc-950 text-zinc-400">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="grid gap-3 lg:col-span-2">
            <p className="text-base font-bold text-white">Acme Inc.</p>
            <p className="max-w-xs text-xs leading-relaxed">
              La plataforma para lanzar landing pages rápidas, ligeras y bonitas.
              Esta imagen de cabecera pesa {result ? formatBytes(result.size) : "≤ 100 KB"}.
            </p>
            <div className="flex gap-2">
              <a
                href="#"
                aria-label="Web"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <Globe className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Email"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title} className="grid content-start gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                {col.title}
              </p>
              <ul className="grid gap-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-xs hover:text-white hover:underline">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* barra inferior */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-zinc-500 sm:flex-row">
            <p>© 2026 Acme Inc. Todos los derechos reservados.</p>
            <p className="font-mono">
              {result
                ? `${result.style.name} · ${result.width}×${result.height} · ${formatBytes(result.size)}`
                : "Hecho con Footer Forge"}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
