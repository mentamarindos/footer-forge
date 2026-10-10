import { ballpointStyle } from "./ballpoint";
import { blurStyle, ditherStyle, duotoneStyle, footerFadeStyle, grayscaleStyle } from "./classic";
import { frostedStyle } from "./frosted";
import { pixelArtStyle } from "./pixel-art";
import { defaultParamsFor, type StyleDefinition } from "./types";

export const STYLE_REGISTRY: Record<string, StyleDefinition> = {
  [pixelArtStyle.id]: pixelArtStyle,
  [frostedStyle.id]: frostedStyle,
  [ballpointStyle.id]: ballpointStyle,
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
