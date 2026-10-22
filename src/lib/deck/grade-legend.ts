/** Shared legend definitions for the 3D renderer and investor evidence rail. */
export const TGC_GRADE_BINS = [
  {key: 'very-high', label: 'Very high', range: '>=8% TGC', detail: 'highest grade blocks', min: 8, color: '#ef4444'},
  {key: 'high', label: 'High', range: '6-8% TGC', detail: 'priority graphite zone', min: 6, color: '#f97316'},
  {key: 'medium', label: 'Medium', range: '4-6% TGC', detail: 'continuous mineralisation', min: 4, color: '#facc15'},
  {key: 'low', label: 'Low', range: '1-4% TGC', detail: 'lower grade halo', min: 1, color: '#2dd4bf'},
  {key: 'trace', label: 'Trace', range: '<1% TGC', detail: 'background / dilution', min: 0, color: '#7dd3fc'},
] as const;

export const ASSAY_INTERVAL_BINS = [
  {key: 'very-high', label: '>8% TGC', detail: 'very high graphite interval', min: 8, color: '#9d00ff'},
  {key: 'high', label: '6-8% TGC', detail: 'high-grade interval', min: 6, color: '#ff1616'},
  {key: 'medium', label: '3-6% TGC', detail: 'mineralised interval', min: 3, color: '#ff9f0a'},
  {key: 'low', label: '1-3% TGC', detail: 'lower-grade halo', min: 1, color: '#fff200'},
] as const;

