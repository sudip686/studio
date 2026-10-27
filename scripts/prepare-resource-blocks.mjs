import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const sourceBase = process.env.TANGA_BLOCK_MODEL_SOURCE_BASE
  ?? JSON.parse(await readFile('wrangler.jsonc', 'utf8')).vars.NEXT_PUBLIC_ASSET_BASE_URL;
if (!sourceBase) throw new Error('Set TANGA_BLOCK_MODEL_SOURCE_BASE or NEXT_PUBLIC_ASSET_BASE_URL in wrangler.jsonc.');

const sourceUrl = `${sourceBase.replace(/\/$/, '')}/BlockModel.geojson`;
const response = await fetch(sourceUrl, {cache: 'no-store'});
if (!response.ok) throw new Error(`Block model source returned HTTP ${response.status}.`);
const sourceEtag = response.headers.get('etag');
const sourceBytes = Number(response.headers.get('content-length')) || null;
const sourceText = await response.text();
if (sourceBytes !== null && Buffer.byteLength(sourceText, 'utf8') !== sourceBytes) {
  throw new Error(`Incomplete source response: expected ${sourceBytes} bytes, received ${Buffer.byteLength(sourceText, 'utf8')}.`);
}

const payload = JSON.parse(sourceText);
if (payload?.type !== 'FeatureCollection' || !Array.isArray(payload.features)) {
  throw new Error('The R2 source is not a GeoJSON FeatureCollection.');
}

const features = payload.features;
const classValues = [...new Set(features.map((feature) => String(feature?.properties?.RescCalc ?? feature?.properties?.classification ?? 'Unknown')))]
  .sort((a, b) => a === 'Unknown' ? -1 : b === 'Unknown' ? 1 : a.localeCompare(b));
const classIndex = new Map(classValues.map((value, index) => [value, index]));
const stride = 44;
const metadata = Buffer.from(JSON.stringify({
  formatVersion: 1,
  sourceAsset: 'BlockModel.geojson',
  sourceEtag,
  sourceBytes,
  sourceFeatureCount: features.length,
  coordinateEncoding: 'WGS84 longitude, latitude, elevation; numeric source dimensions and TGC retained.',
  classes: classValues,
}), 'utf8');
const headerBytes = 20 + metadata.byteLength;
const output = Buffer.allocUnsafe(headerBytes + features.length * stride);
output.write('TGRBIN01', 0, 8, 'ascii');
output.writeUInt32LE(features.length, 8);
output.writeUInt32LE(stride, 12);
output.writeUInt32LE(metadata.byteLength, 16);
metadata.copy(output, 20);

const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
for (let index = 0; index < features.length; index += 1) {
  const feature = features[index];
  const coordinates = feature?.geometry?.coordinates;
  const properties = feature?.properties ?? {};
  const offset = headerBytes + index * stride;
  view.setFloat64(offset, Number(coordinates?.[0]), true);
  view.setFloat64(offset + 8, Number(coordinates?.[1]), true);
  view.setFloat64(offset + 16, Number(coordinates?.[2] ?? 0), true);
  view.setFloat32(offset + 24, Number(properties.dX ?? 25), true);
  view.setFloat32(offset + 28, Number(properties.dY ?? 25), true);
  view.setFloat32(offset + 32, Number(properties.dZ ?? 10), true);
  view.setFloat32(offset + 36, Number(properties['Kr, GRAPHITIC_CARBON in GM_Litho: GRSC'] ?? 0), true);
  view.setUint32(offset + 40, classIndex.get(String(properties.RescCalc ?? properties.classification ?? 'Unknown')) ?? 0, true);
}

const outputPath = path.join('public', 'resource_blocks_v1.bin');
await writeFile(outputPath, output);
console.log(JSON.stringify({
  output: outputPath,
  outputBytes: output.byteLength,
  sourceBytes,
  sourceEtag,
  sourceFeatures: features.length,
  classes: Object.fromEntries(classValues.map((name, index) => [name, index])),
}));
