import type { BoreholeSegment } from "./borehole-core";
import * as THREE from 'three';

const LITHOLOGY_COLOR_MAP: Record<string, string> = {
  "Quartz-Feldspathic": "#dead5f",
  GRSC: "#19292a",
  Granulite: "#a1089a",
  Khondalite: "#c58fc1",
  Marble: "#D4E6F1",
  "Not Recovearble": "#515A5A",
  SOIL: "#2df27c",
  Schist: "#153224",
  nan: "#ffffff",
  UNKNOWN: "#cccccc",
};

export function lithologyColor(Cesium: any) {
  return (seg: BoreholeSegment) => {
    const lith = String(seg.props.lithology ?? "UNKNOWN");
    const css = LITHOLOGY_COLOR_MAP[lith] ?? LITHOLOGY_COLOR_MAP.UNKNOWN;
    return Cesium.Color.fromCssColorString(css).withAlpha(0.85);
  };
}

export function assayColor(Cesium: any, min: number, max: number) {
  return (seg: BoreholeSegment) => {
    const v = Number(seg.props.graphitic_carbon ?? 0);
    const alpha = max > min ? (v - min) / (max - min) : 0.5;
    // green -> red
    return Cesium.Color.fromHsl((1 - alpha) * 0.33, 1, 0.5, 0.85);
  };
}

export function lithologyColorThree() {
  const cache: Record<string, THREE.Color> = {};
  return (seg: BoreholeSegment) => {
    const lith = String(seg.props.lithology ?? "UNKNOWN");
    if (cache[lith]) return cache[lith];
    const css = LITHOLOGY_COLOR_MAP[lith] ?? LITHOLOGY_COLOR_MAP.UNKNOWN;
    const color = new THREE.Color(css);
    cache[lith] = color;
    return color;
  };
}

export function assayColorThree(min: number, max: number) {
  return (seg: BoreholeSegment) => {
    const v = Number(seg.props.graphitic_carbon ?? 0);
    const t = max > min ? (v - min) / (max - min) : 0.5;
    // green -> red
    return new THREE.Color(t, 1 - t, 0);
  };
}
