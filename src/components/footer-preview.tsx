import { useSyncExternalStore } from "react";
import { ArrowRight, Compass, Mail, MapPin, Phone } from "lucide-react";
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
  {
    title: "Shop",
    links: ["All Collections", "Vases", "Tableware", "Decor", "Limited Editions", "Gift Sets"],
  },
  {
    title: "About Us",
    links: ["Our Story", "Craftsmanship", "Sustainability", "Careers", "Press & Media"],
  },
  {
    title: "Help & Support",
    links: ["FAQs", "Shipping & Delivery", "Track Your Order", "Contact Us"],
  },
];

const SOCIALS = ["Facebook", "X", "Instagram", "LinkedIn"];

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
    >
      {result && (
        <>
          <img
            key={result.url}
            src={result.url}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* velo inteligente: blur + luminosidad según tema, disipado hacia abajo */}
          {previewBlur && (
            <div
              aria-hidden
              className={cn(
                "absolute inset-x-0 top-0 h-[68%] backdrop-blur-md [mask-image:linear-gradient(to_bottom,black_45%,transparent)]",
                isDark ? "backdrop-brightness-[.85]" : "backdrop-brightness-[1.12]"
              )}
            />
          )}
        </>
      )}

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pb-6 pt-12 sm:grid-cols-2 lg:grid-cols-12">
        {/* marca + contacto */}
        <div className="grid content-start gap-5 sm:col-span-2 lg:col-span-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
            <Compass className="h-8 w-8" strokeWidth={1.5} />
            <span className="font-serif text-4xl">sequel</span>
          </div>
          <p className="max-w-xs font-serif text-base italic leading-relaxed">
            Building digital experiences that inspire, connect, and create lasting value.
          </p>
          <ul className="grid gap-2 text-sm">
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0" /> hello@sequel.com
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0" /> +91 00000 00000
            </li>
            <li className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0" /> India
            </li>
          </ul>
          <div className="flex gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s}
                href="#"
                aria-label={s}
                title={s}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-900/15 font-serif text-sm italic hover:bg-zinc-900/5 hover:text-zinc-900 dark:border-white/15 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {s[0]}
              </a>
            ))}
          </div>
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

        {/* newsletter */}
        <div className="grid content-start gap-4 sm:col-span-2 lg:col-span-2">
          <ColumnHeading>Newsletter</ColumnHeading>
          <p className="font-serif text-[15px] italic leading-relaxed">
            Subscribe to get updates on new collections, stories &amp; exclusive offers.
          </p>
          <form
            className="flex"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              required
              placeholder="Enter your email"
              aria-label="Email para newsletter"
              className="h-11 w-full min-w-0 border border-zinc-900/25 bg-transparent px-3 font-serif text-sm italic text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-900/40 dark:border-white/25 dark:text-white dark:placeholder:text-zinc-400 dark:focus:ring-white/60"
            />
            <button
              type="submit"
              aria-label="Suscribirse"
              className="inline-flex h-11 w-12 shrink-0 items-center justify-center bg-zinc-900 text-amber-50 transition-colors hover:bg-zinc-700 dark:bg-amber-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      {/* fila legal */}
      <div className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-10 font-serif text-sm italic text-zinc-500 sm:justify-end dark:text-zinc-400">
        <a href="#" className="hover:text-zinc-900 hover:underline dark:hover:text-white dark:hover:underline">Privacy Policy</a>
        <span className="text-zinc-400 dark:text-zinc-600">|</span>
        <a href="#" className="hover:text-zinc-900 hover:underline dark:hover:text-white dark:hover:underline">Terms of Service</a>
        <span className="text-zinc-400 dark:text-zinc-600">|</span>
        <a href="#" className="hover:text-zinc-900 hover:underline dark:hover:text-white dark:hover:underline">Cookie Policy</a>
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
