const azimuth = 315 * Math.PI / 180;
const altitude = 34 * Math.PI / 180;
const horizontal = Math.cos(altitude);

/** East, north and up. Three.js uses east, up and south. */
export const PRESENTATION_SUN = [
  horizontal * Math.sin(azimuth),
  horizontal * Math.cos(azimuth),
  Math.sin(altitude),
] as const;
export const PRESENTATION_SUN_COLOR = 0xfff1d8;
