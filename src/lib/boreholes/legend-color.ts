// legend-color.ts
import * as Cesium from "cesium";

/** A single numeric bin or a categorical mapping entry */
export type NumericBin = {
  /** inclusive lower bound, optional */
  min?: number;
  /** exclusive upper bound, optional */
  max?: number;
  /** CSS color like "#66cc00" or "rgb(...)" */
  color: string;
  /** label (optional, for legends/tooltips) */
  label?: string;
};

export type CategoricalLegend = Record<string | number, string>; // value -> css color

export type Legend =
  | { type: "numeric"; bins: NumericBin[]; default?: string }
  | { type: "categorical"; map: CategoricalLegend; default?: string };

export function colorFromLegend(
  legend: Legend,
  value: unknown
): Cesium.Color {
  let css: string | undefined;

  if (legend.type === "numeric") {
    const v = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(v)) {
      // First matching bin wins: [min, max)
      const bin = legend.bins.find(b =>
        (b.min === undefined || v >= b.min) &&
        (b.max === undefined || v <  b.max)
      );
      css = bin?.color;
    }
    if (!css && legend.default) css = legend.default;
  } else {
    const key = value as keyof typeof legend.map;
    css = legend.map[key] ?? legend.default;
  }

  // Fallback if legend/default didn’t match
  if (!css) css = "#cccccc";

  return Cesium.Color.fromCssColorString(css);
}
