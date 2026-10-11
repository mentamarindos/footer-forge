import { useSyncExternalStore } from "react";

export type FooterTheme = "auto" | "light" | "dark";

/** Observa la clase `.dark` del documento y se actualiza solo al cambiar. */
export function usePrefersDark(): boolean {
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

/** Resuelve el tema efectivo: forzado o heredado de la página. */
export function resolveDark(theme: FooterTheme, autoDark: boolean): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return autoDark;
}
