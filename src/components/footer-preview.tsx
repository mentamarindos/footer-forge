import { ArrowRight, Compass, Mail, MapPin, Phone } from "lucide-react";
import type { ProcessResult } from "@/lib/image/pipeline";
import { formatBytes } from "@/lib/utils";

interface Props {
  /** Último resultado procesado. Si es null se muestra el footer con placeholder. */
  result: ProcessResult | null;
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
      <p className="font-serif text-sm uppercase tracking-[0.2em] text-zinc-100">{children}</p>
      <span className="h-px w-8 bg-zinc-500" aria-hidden />
    </div>
  );
}

/**
 * Mock de footer de landing con el layout de referencia:
 * marca + contacto a la izquierda, columnas de links, newsletter
 * a la derecha, fila legal y la imagen procesada como tira
 * inferior a ancho completo.
 */
export function FooterPreview({ result }: Props) {
  return (
    <footer className="relative w-full overflow-hidden bg-zinc-950 text-zinc-300">
      {/* la imagen procesada es EL fondo del footer: mismo plano que el texto */}
      {result && (
        <>
          <img
            key={result.url}
            src={result.url}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* velo: sólido arriba para legibilidad, se abre abajo como en la referencia */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950/85 to-zinc-950/35" />
        </>
      )}

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pb-6 pt-12 sm:grid-cols-2 lg:grid-cols-12">
        {/* marca + contacto */}
        <div className="grid content-start gap-5 sm:col-span-2 lg:col-span-4">
          <div className="flex items-center gap-2 text-white">
            <Compass className="h-8 w-8" strokeWidth={1.5} />
            <span className="font-serif text-4xl">sequel</span>
          </div>
          <p className="max-w-xs font-serif text-base italic leading-relaxed text-zinc-300">
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 font-serif text-sm italic text-zinc-300 hover:bg-white/10 hover:text-white"
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
                  <a href="#" className="font-serif text-[15px] hover:text-white hover:underline">
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
              className="h-11 w-full min-w-0 border border-white/25 bg-transparent px-3 font-serif text-sm italic text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/60"
            />
            <button
              type="submit"
              aria-label="Suscribirse"
              className="inline-flex h-11 w-12 shrink-0 items-center justify-center bg-amber-100 text-zinc-900 hover:bg-white"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      {/* fila legal */}
      <div className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-10 font-serif text-sm italic sm:justify-end">
        <a href="#" className="hover:text-white hover:underline">Privacy Policy</a>
        <span className="text-zinc-600">|</span>
        <a href="#" className="hover:text-white hover:underline">Terms of Service</a>
        <span className="text-zinc-600">|</span>
        <a href="#" className="hover:text-white hover:underline">Cookie Policy</a>
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
