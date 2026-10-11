"use client";

import type { CSSProperties, ReactNode } from "react";
import { resolveDark, usePrefersDark, type FooterTheme } from "@/lib/footer-theme";

export interface FooterArtLink {
  label: string;
  href?: string;
}

export interface FooterArtColumn {
  title: string;
  links: FooterArtLink[];
}

export interface FooterArtBrand {
  name: string;
  tagline?: string;
  /** Logo del usuario. Por defecto, marca genérica. */
  logo?: ReactNode;
}

export interface FooterArtProps {
  /** URL o import de la imagen de fondo ya procesada. Sin src muestra `placeholder`. */
  src?: string | null;
  alt?: string;
  brand?: FooterArtBrand;
  columns?: FooterArtColumn[];
  copyright?: string;
  /** "auto" hereda el tema de la página (.dark). */
  theme?: FooterTheme;
  /** Difuminado en la zona alta para legibilidad. */
  veil?: boolean;
  /** Intensidad del difuminado en px. */
  veilBlur?: number;
  /** Escala literal de la imagen (1 = completa). */
  imageScale?: number;
  /** Alto mínimo del footer. */
  height?: number | string;
  /** Ancho máximo (simula pantallas). Sin valor = 100%. */
  maxWidth?: number;
  /** Contenido alternativo cuando no hay `src`. */
  placeholder?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_BRAND: FooterArtBrand = {
  name: "Acme",
  tagline: "Helping teams build, ship, and scale modern digital products.",
};

const DEFAULT_COLUMNS: FooterArtColumn[] = [
  { title: "Company", links: [{ label: "About" }, { label: "Careers" }, { label: "Contact" }] },
  { title: "Product", links: [{ label: "Features" }, { label: "Pricing" }, { label: "Integrations" }] },
  { title: "Resources", links: [{ label: "Docs" }, { label: "Blog" }, { label: "Guides" }, { label: "Community" }] },
  { title: "Legal", links: [{ label: "Privacy" }, { label: "Terms" }, { label: "Cookies" }, { label: "Security" }] },
];

function DefaultMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 3 3 9l6 6-6 6 6-6 6 6-6-6 6-6-6 6-3-9z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

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
 * Footer visual puro para landings. Sin lógica de imagen ni dependencias:
 * recibe la imagen ya procesada (`src`) y textos por props.
 */
export function FooterArt({
  src,
  alt = "Footer art",
  brand = DEFAULT_BRAND,
  columns = DEFAULT_COLUMNS,
  copyright = "2026 Acme Inc. All rights reserved.",
  theme = "auto",
  veil = true,
  veilBlur = 12,
  imageScale = 1,
  height = 560,
  maxWidth,
  placeholder,
  className,
  style,
}: FooterArtProps) {
  const autoDark = usePrefersDark();
  const isDark = resolveDark(theme, autoDark);
  const constrained = maxWidth != null;

  const footer = (
    <footer
      className={[
        "relative w-full overflow-hidden bg-[#f4edda] text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
        constrained ? "mx-auto border-x border-zinc-900/10 shadow-2xl dark:border-white/10" : "",
        className ?? "",
      ].join(" ")}
      style={{ minHeight: height, maxWidth: maxWidth ?? undefined, ...style }}
      // mockup: los links del preview no navegan si no tienen href
      onClick={(e) => {
        const anchor = (e.target as HTMLElement).closest("a");
        if (anchor && anchor.getAttribute("href") === "#") e.preventDefault();
      }}
    >
      {src ? (
        <>
          <img
            key={src}
            src={src}
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover object-bottom transition-transform duration-200"
            style={{ transform: `scale(${imageScale})`, transformOrigin: "bottom center" }}
          />
          {/* velo inteligente: en dark nace negro y se funde abajo; en light aclara */}
          {veil && (
            <div
              aria-hidden
              className={[
                "absolute inset-x-0 top-0 h-[68%] [mask-image:linear-gradient(to_bottom,black_45%,transparent)]",
                isDark
                  ? "bg-gradient-to-b from-zinc-950 via-zinc-950/60 to-transparent"
                  : "",
              ].join(" ")}
              style={{ backdropFilter: `blur(${veilBlur}px)${isDark ? "" : " brightness(1.12)"}` }}
            />
          )}
        </>
      ) : (
        placeholder ?? (
          <p className="relative mx-auto w-full max-w-6xl px-4 pb-8 pt-12 text-center font-serif text-sm italic text-zinc-500">
            Pasa una imagen en `src` para vestir este footer
          </p>
        )
      )}

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pb-6 pt-12 sm:grid-cols-2 lg:grid-cols-12">
        <div className="grid content-start gap-5 sm:col-span-2 lg:col-span-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
            {brand.logo ?? <DefaultMark />}
            <span className="text-2xl font-bold tracking-tight">{brand.name}</span>
          </div>
          {brand.tagline && (
            <p className="max-w-xs font-serif text-base italic leading-relaxed">{brand.tagline}</p>
          )}
        </div>

        {columns.map((col) => (
          <div key={col.title} className="grid content-start gap-4 lg:col-span-2">
            <ColumnHeading>{col.title}</ColumnHeading>
            <ul className="grid gap-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href ?? "#"}
                    className="font-serif text-[15px] hover:text-zinc-900 hover:underline dark:hover:text-white dark:hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-2 text-center font-serif text-sm italic text-zinc-500 dark:text-zinc-400">
        {copyright}
      </div>
    </footer>
  );

  // tema forzado a oscuro: envuelve con .dark para activar las variantes
  if (theme === "dark") return <div className="dark">{footer}</div>;
  return footer;
}
