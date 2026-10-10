import { blurStyle, ditherStyle, duotoneStyle, footerFadeStyle, grayscaleStyle, posterizeStyle } from "./classic";
import { pixelArtStyle } from "./pixel-art";
import { defaultParamsFor, type StyleDefinition } from "./types";

export const STYLE_REGISTRY: Record<string, StyleDefinition> = {
  [pixelArtStyle.id]: pixelArtStyle,
  [posterizeStyle.id]: posterizeStyle,
  [duotoneStyle.id]: duotoneStyle,
  [grayscaleStyle.id]: grayscaleStyle,
  [ditherStyle.id]: ditherStyle,
  [footerFadeStyle.id]: footerFadeStyle,
  [blurStyle.id]: blurStyle,
};

export const STYLE_LIST: StyleDefinition[] = Object.values(STYLE_REGISTRY);

export function getStyle(id: string): StyleDefinition {
  return STYLE_REGISTRY[id] ?? pixelArtStyle;
}

export function getDefaultParams(id: string) {
  return defaultParamsFor(getStyle(id));
}

export type { StyleDefinition };
export { defaultParamsFor };
