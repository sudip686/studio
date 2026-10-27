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
runInNewContext(workerSource, {self: workerScope, TextDecoder, TextEncoder, DataView, Uint8Array, performance, Error, JSON, Number, Math, String, Array, Object});

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

const compactClasses = ['Indicated', 'Inferred', 'Measured', 'Unknown'];
const compactClassIndex = new Map(compactClasses.map((name, index) => [name, index]));
const metadata = new TextEncoder().encode(JSON.stringify({formatVersion: 1, classes: compactClasses}));
const stride = 44;
const headerBytes = 20 + metadata.byteLength;
const compactBuffer = new ArrayBuffer(headerBytes + features.length * stride);
const compactBytes = new Uint8Array(compactBuffer);
compactBytes.set(new TextEncoder().encode('TGRBIN01'), 0);
const compactView = new DataView(compactBuffer);
compactView.setUint32(8, features.length, true);
compactView.setUint32(12, stride, true);
compactView.setUint32(16, metadata.byteLength, true);
compactBytes.set(metadata, 20);
for (const [index, feature] of features.entries()) {
  const offset = headerBytes + index * stride;
  const coordinates = feature.geometry.coordinates;
  compactView.setFloat64(offset, coordinates[0], true);
  compactView.setFloat64(offset + 8, coordinates[1] ?? Number.NaN, true);
  compactView.setFloat64(offset + 16, coordinates[2] ?? 0, true);
  compactView.setFloat32(offset + 24, feature.properties.dX, true);
  compactView.setFloat32(offset + 28, feature.properties.dY, true);
  compactView.setFloat32(offset + 32, feature.properties.dZ, true);
  compactView.setFloat32(offset + 36, Number(feature.properties['Kr, GRAPHITIC_CARBON in GM_Litho: GRSC'] ?? 0), true);
  const classification = String(feature.properties.RescCalc ?? feature.properties.classification ?? 'Unknown');
  compactView.setUint32(offset + 40, compactClassIndex.get(classification) ?? 0, true);
}
listeners.get('message')?.({data: {buffer: compactBuffer, centerEasting, centerNorthing, localVerticalDatum: 700}});
const compactResult = messages[1];
assert.ok(compactResult, 'Worker returns a compact-binary result');
assert.equal(compactResult.error, undefined);
assert.equal(compactResult.featureCount, features.length);
assert.equal(compactResult.blocks?.length, 2, 'Compact binary filters invalid coordinates and non-carbon rows');
assert.equal(compactResult.blocks![0].classification, 'Indicated');
assert.equal(compactResult.blocks![1].classification, 'Measured');
assert.ok(Math.abs(Number(compactResult.blocks![0].x) - Number(result.blocks![0].x)) < 0.001, 'Compact WGS84 projection matches the GeoJSON route');
assert.ok(Math.abs(Number(compactResult.blocks![1].z) - Number(result.blocks![1].z)) < 0.001, 'Compact northing matches the GeoJSON route');
assert.equal(compactResult.blocks![0].dx, 25);
assert.equal(compactResult.blocks![0].dy, 20);
assert.equal(compactResult.blocks![0].dz, 10);
assert.ok(Math.abs(Number(compactResult.blocks![0].carbon) - 5.7) < 0.00001, 'Compact grade retains display precision');

const sourceCompactBytes = readFileSync('public/resource_blocks_v1.bin');
const sourceCompactBuffer = Uint8Array.from(sourceCompactBytes).buffer;
listeners.get('message')?.({data: {buffer: sourceCompactBuffer, centerEasting, centerNorthing, localVerticalDatum: 700}});
const sourceResult = messages[2];
assert.ok(sourceResult, 'Worker parses the generated project source asset');
assert.equal(sourceResult.error, undefined);
assert.equal(sourceResult.featureCount, 155_952, 'Generated asset retains every reported source feature');
assert.equal(sourceResult.blocks?.length, 155_853, 'Generated asset retains all valid positive-grade source cells');
assert.equal(sourceResult.blocks![0].classification, 'Indicated');
console.log('PASS: worker parses GeoJSON fixtures, compact-binary fixtures and all 155,952 generated source features with WGS84 → UTM 37S placement and source properties');
