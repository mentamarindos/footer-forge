export type StyleParamType = "slider" | "select" | "color";

export interface StyleParamSlider {
  key: string;
  label: string;
  type: "slider";
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

export interface StyleParamSelect {
  key: string;
  label: string;
  type: "select";
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}

export interface StyleParamColor {
  key: string;
  label: string;
  type: "color";
  defaultValue: string;
}

export type StyleParamDef = StyleParamSlider | StyleParamSelect | StyleParamColor;

export type StyleParams = Record<string, number | string>;

export interface StyleDefinition {
  id: string;
  name: string;
  description: string;
  params: StyleParamDef[];
  /**
   * Pure pixel transform. Must return a NEW ImageData.
   * May be async (heavy work like adaptive palettes should lazy-load).
   */
  apply: (input: ImageData, params: StyleParams) => ImageData | Promise<ImageData>;
}

export function defaultParamsFor(def: StyleDefinition): StyleParams {
  const out: StyleParams = {};
  for (const p of def.params) out[p.key] = p.defaultValue;
  return out;
}
