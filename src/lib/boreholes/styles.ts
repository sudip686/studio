// styles.ts
import * as Cesium from "cesium";
import { Style } from "./borehole-cylinders";

// Helper to interpolate between two colors
function lerpColor(color1: Cesium.Color, color2: Cesium.Color, t: number): Cesium.Color {
    const r = color1.red + (color2.red - color1.red) * t;
    const g = color1.green + (color2.green - color1.green) * t;
    const b = color1.blue + (color2.blue - color1.blue) * t;
    return new Cesium.Color(r, g, b, 1.0);
}

const GREEN = Cesium.Color.fromCssColorString("rgb(0, 255, 0)");
const RED = Cesium.Color.fromCssColorString("rgb(255, 0, 0)");

export function assayStyle(value: number, min: number, max: number): Style {
  let t = 0;
  if (max > min) {
    t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  }
  
  const material = lerpColor(GREEN, RED, t);

  return {
    material: material,
    opacity: 0.35,
    outline: true,
    outlineColor: Cesium.Color.BLACK,
    radiusMeters: 8,
  };
}

export function lithologyStyle(key: string, map: Record<string,string>): Style {
  const css = map[key] ?? "#cccccc";
  return {
    material: Cesium.Color.fromCssColorString(css),
    opacity: 0.35,
    outline: true,
    outlineColor: Cesium.Color.BLACK,
    radiusMeters: 8,
  };
}
