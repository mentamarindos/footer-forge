import { useSyncExternalStore } from "react";
import { Command } from "lucide-react";
import type { ProcessResult } from "@/lib/image/pipeline";
import { useForgeStore } from "@/store/use-forge-store";
import { cn, formatBytes } from "@/lib/utils";

interface Props {
  /** Último resultado procesado. Si es null se muestra el footer con placeholder. */
  result: ProcessResult | null;
}

/** Lee el tema (clase .dark) y se actualiza solo al cambiar. */
function useIsDark(): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof document === "undefined") return () => {};
      const observer = new MutationObserver(notify);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
    () => false
  );
}

const LINK_COLUMNS: Array<{ title: string; links: string[] }> = [
  { title: "Company", links: ["About", "Careers", "Contact"] },
  { title: "Product", links: ["Features", "Pricing", "Integrations"] },
  { title: "Resources", links: ["Docs", "Blog", "Guides", "Community"] },
  { title: "Legal", links: ["Privacy", "Terms", "Cookies", "Security"] },
];

function ColumnHeading({ children }: { children: string }) {
  return (
    <div className="grid gap-2">
      <p className="font-serif text-sm uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
        {children}
      </p>
      <span className="h-px w-8 bg-zinc-400 dark:bg-zinc-500" aria-hidden />
    </div>
  );
}

/**
 * Mock de footer de landing con el layout de referencia.
 * La imagen procesada es EL fondo (mismo plano que el texto).
 * El difuminado alto es inteligente: blur + brillo según el tema
 * (oscurece sutil en dark, aclara en light), sin sombras planas.
 */
export function FooterPreview({ result }: Props) {
  const previewHeight = useForgeStore((s) => s.previewHeight);
  const previewWidth = useForgeStore((s) => s.previewWidth);
  const previewZoom = useForgeStore((s) => s.previewZoom);
  const previewBlur = useForgeStore((s) => s.previewBlur);
  const isDark = useIsDark();
  const constrained = previewWidth != null;

  return (
    <footer
      className={cn(
        "relative w-full overflow-hidden bg-[#f4edda] text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
        constrained && "mx-auto border-x border-zinc-900/10 shadow-2xl dark:border-white/10"
      )}
      style={{ minHeight: previewHeight, maxWidth: previewWidth ?? undefined }}
      // mockup: los links del preview no navegan
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) e.preventDefault();
      }}
    >
      {result && (
        <>
          <img
            key={result.url}
            src={result.url}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-bottom transition-transform duration-200"
            style={{ transform: `scale(${previewZoom})`, transformOrigin: "bottom center" }}
          />
          {/* velo inteligente: en dark nace negro y se funde abajo; en light aclara */}
          {previewBlur && (
            <div
              aria-hidden
              className={cn(
                "absolute inset-x-0 top-0 h-[68%] [mask-image:linear-gradient(to_bottom,black_45%,transparent)]",
                isDark
                  ? "bg-gradient-to-b from-zinc-950 via-zinc-950/60 to-transparent backdrop-blur-md"
                  : "backdrop-blur-md backdrop-brightness-[1.12]"
              )}
            />
          )}
        </>
      )}

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pb-6 pt-12 sm:grid-cols-2 lg:grid-cols-12">
        {/* marca */}
        <div className="grid content-start gap-5 sm:col-span-2 lg:col-span-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
            <Command className="h-7 w-7" strokeWidth={2} />
            <span className="text-2xl font-bold tracking-tight">Acme</span>
          </div>
          <p className="max-w-xs font-serif text-base italic leading-relaxed">
            Helping teams build, ship, and scale modern digital products.
          </p>
        </div>

        {/* columnas de links */}
        {LINK_COLUMNS.map((col) => (
          <div key={col.title} className="grid content-start gap-4 lg:col-span-2">
            <ColumnHeading>{col.title}</ColumnHeading>
            <ul className="grid gap-2.5">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="font-serif text-[15px] hover:text-zinc-900 hover:underline dark:hover:text-white dark:hover:underline">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* barra inferior */}
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-2 text-center font-serif text-sm italic text-zinc-500 dark:text-zinc-400">
        2026 Acme Inc. All rights reserved.
      </div>

      {/* chapita con datos del procesado */}
      {result ? (
        <p className="absolute bottom-2 right-3 rounded bg-black/60 px-2 py-0.5 font-mono text-[11px] text-zinc-200">
          {result.style.name} · {result.width}×{result.height} · {formatBytes(result.size)}
        </p>
      ) : (
        <p className="relative mx-auto w-full max-w-6xl px-4 pb-8 text-center font-serif text-sm italic text-zinc-500">
          Tu imagen procesada será el fondo de este footer en cuanto subas una
        </p>
      )}
    </footer>
  );
}
