# Tanga render-scale governor audit — 23 October 2026

## Implemented behavior

The desktop Three.js renderer keeps its settled resolution-governor scale and drops to 0.60 only during an active gesture or for 350 ms after the latest pointer interaction. Releasing the pointer restores the settled scale. This affects the drawing buffer only; source terrain values, assay data, block counts and geology geometry do not change. DOM controls remain full resolution.

## Browser verification

- Local development app at `http://localhost:3011`, Chromium, 1707 × 842, `#subsurface` ready.
- Before drag: render scale 0.75. During drag: 0.60. 500 ms after release: 0.75.
- Camera position changed through both drag samples; `data-ready="true"`; browser reported zero JavaScript errors in the tested page.
- One gesture-only sample: about 12 s of measured RAF intervals; median 16.7 ms, p90 54.3 ms, p95 58.4 ms, and 82.3% at or below 33.4 ms. This is not an isolated before/after comparison and does not prove reduced drag latency.

## Rejected permanent low-resolution experiment

A temporary experiment lowered the settled resolution floor from 0.75 to 0.50. On a 30.014 s foreground sample it produced 1,432 intervals, mean 21.0 ms, median 16.7 ms, p90 58.2 ms, p95 58.4 ms and p99 62.5 ms; 81.9% were at or below 33.4 ms. The map was visibly soft at this setting and p95 remained over the plan target, so the permanent 0.50 floor was reverted. For comparison, the earlier orbit baseline was a separate uncontrolled 30 s run at a 0.75 floor (857 intervals; median 33.3 ms, p95 50.1 ms; 59.3% at or below 33.4 ms). These different runs cannot establish an overall performance gain.

The desktop p95 target, cold-load transfer budget, native-device results and asset-detail adaptation remain open.
