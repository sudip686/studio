import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {performance} from 'node:perf_hooks';
import proj4 from 'proj4';

const workerSource = readFileSync('public/workers/block-model-parser.js', 'utf8');
const listeners = new Map<string, (event: {data: unknown}) => void>();
const messages: Array<{blocks?: Array<Record<string, number | string>>; error?: string; featureCount?: number}> = [];
const workerScope = {
  addEventListener: (type: string, listener: (event: {data: unknown}) => void) => listeners.set(type, listener),
  postMessage: (data: (typeof messages)[number]) => messages.push(data),
};
runInNewContext(workerSource, {self: workerScope, TextDecoder, performance, Error, JSON, Number, Math, String, Array, Object});

const features = [
  {geometry: {coordinates: [38.72, -4.86, 712]}, properties: {'Kr, GRAPHITIC_CARBON in GM_Litho: GRSC': 5.7, dX: 25, dY: 20, dZ: 10, RescCalc: 'Indicated'}},
  {geometry: {coordinates: [39.11, -5.03, 684]}, properties: {'Kr, GRAPHITIC_CARBON in GM_Litho: GRSC': 8.2, dX: 50, dY: 25, dZ: 12, classification: 'Measured'}},
  {geometry: {coordinates: [39.11, -5.03, 684]}, properties: {'Kr, GRAPHITIC_CARBON in GM_Litho: GRSC': 0, dX: 25, dY: 25, dZ: 10}},
  {geometry: {coordinates: [38.9]}, properties: {'Kr, GRAPHITIC_CARBON in GM_Litho: GRSC': 6, dX: 25, dY: 25, dZ: 10}},
];
const payload = new TextEncoder().encode(JSON.stringify({features}));
const [centerEasting, centerNorthing] = proj4('WGS84', 'EPSG:32737', [38.785, -4.813]) as [number, number];
listeners.get('message')?.({data: {buffer: payload.buffer, centerEasting, centerNorthing, localVerticalDatum: 700}});

const result = messages[0];
assert.ok(result, 'Worker returns a result');
assert.equal(result.error, undefined);
assert.equal(result.featureCount, features.length);
assert.equal(result.blocks?.length, 2, 'Invalid coordinates and non-carbon rows are discarded');

for (const [index, feature] of features.slice(0, 2).entries()) {
  const block: Record<string, number | string> = result.blocks![index];
  const coordinates = feature.geometry.coordinates;
  const [easting, northing] = proj4('WGS84', 'EPSG:32737', [coordinates[0], coordinates[1]]) as [number, number];
  assert.ok(Math.abs(Number(block.x) - (easting - centerEasting)) < 0.01, `Feature ${index} easting matches proj4 within 1 cm`);
  assert.ok(Math.abs(Number(block.z) + northing - centerNorthing) < 0.01, `Feature ${index} northing matches proj4 within 1 cm`);
  assert.equal(block.y, coordinates[2] - 700, `Feature ${index} elevation datum is preserved`);
  assert.equal(block.dx, feature.properties.dX);
  assert.equal(block.dy, feature.properties.dY);
  assert.equal(block.dz, feature.properties.dZ);
}
assert.equal(result.blocks![0].classification, 'Indicated');
assert.equal(result.blocks![1].classification, 'Measured');
console.log('PASS: worker GeoJSON parsing, WGS84 → UTM 37S precision, grade/property filtering, dimensions and classifications');
