import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import JSZip from 'jszip';
import {XMLParser} from 'fast-xml-parser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'data/source/geology');
const outputDir = path.join(root, 'public/generated/geology-lithology');
const layerManifestPath = path.join(outputDir, 'layers.json');
const boundaryOutputPath = path.join(root, 'public/generated/merged-license-boundary.geojson');
const palette = [
  {source: 'Graphitic Schist.tiff', unit: 'Graphitic schist', color: '#d8d8e1'},
  {source: 'Khondalite.tiff', unit: 'Khondalite', color: '#a188da'},
  {source: 'Kyanite Sillimanite Schist.tiff', unit: 'Kyanite sillimanite schist', color: '#0755f5'},
  {source: 'Mafic Granulite.tiff', unit: 'Mafic granulite', color: '#b065ac'},
  {source: 'Quartzofeldspathic Rock.tiff', unit: 'Quartzofeldspathic rock', color: '#f169e1'},
  {source: 'Quartzite.tiff', unit: 'Quartzite', color: '#f5d333'},
  // The supplied raster is labelled Marble; the project map legend labels the
  // same source colour class Crystalline limestone. Preserve both source names.
  {source: 'Marble.tiff', unit: 'Crystalline limestone', sourceUnit: 'Marble', color: '#41a9ec'},
];

const TIFF_TYPE_BYTES = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8};

function tiffTags(buffer) {
  const little = buffer.toString('ascii', 0, 2) === 'II';
  if (!little && buffer.toString('ascii', 0, 2) !== 'MM') throw new Error('TIFF byte order is invalid.');
  const u16 = little ? buffer.readUInt16LE.bind(buffer) : buffer.readUInt16BE.bind(buffer);
  const u32 = little ? buffer.readUInt32LE.bind(buffer) : buffer.readUInt32BE.bind(buffer);
  const f64 = little ? buffer.readDoubleLE.bind(buffer) : buffer.readDoubleBE.bind(buffer);
  const ifdOffset = u32(4);
  const count = u16(ifdOffset);
  const wanted = new Set([256, 257, 33550, 33922, 34735, 34737]);
  const tags = new Map();
  for (let index = 0; index < count; index++) {
    const entry = ifdOffset + 2 + index * 12;
    const id = u16(entry), type = u16(entry + 2), itemCount = u32(entry + 4);
    if (!wanted.has(id)) continue;
    const bytesPerItem = TIFF_TYPE_BYTES[type];
    if (!bytesPerItem) throw new Error(`Unsupported TIFF type ${type} for tag ${id}.`);
    const byteCount = bytesPerItem * itemCount;
    const valueOffset = byteCount <= 4 ? entry + 8 : u32(entry + 8);
    if (id === 34737) {
      tags.set(id, buffer.toString('utf8', valueOffset, valueOffset + byteCount).replace(/\0/g, ''));
      continue;
    }
    const values = [];
    for (let item = 0; item < itemCount; item++) {
      const offset = valueOffset + item * bytesPerItem;
      if (type === 3) values.push(u16(offset));
      else if (type === 4) values.push(u32(offset));
      else if (type === 12) values.push(f64(offset));
      else throw new Error(`Unexpected TIFF type ${type} for numeric tag ${id}.`);
    }
    tags.set(id, values);
  }
  return tags;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function colorBytes(hex) { return hex.slice(1).match(/.{2}/g).map(value => parseInt(value, 16)); }
function darken(rgb) { return rgb.map(value => Math.round(value * .3)); }

function parseTiffGeoReference(buffer, filename) {
  const tags = tiffTags(buffer);
  const width = Number(tags.get(256)?.[0]);
  const height = Number(tags.get(257)?.[0]);
  const pixelScale = tags.get(33550);
  const tiePoint = tags.get(33922);
  const keys = tags.get(34735) ?? [];
  const epsgIndex = keys.findIndex((value, index) => index % 4 === 0 && value === 3072);
  const epsg = epsgIndex >= 0 ? keys[epsgIndex + 3] : null;
  if (!(width > 0 && height > 0) || !pixelScale || !tiePoint || epsg !== 32737) {
    throw new Error(`${filename} is missing a WGS 84 / UTM zone 37S GeoTIFF transform.`);
  }
  const [i, j, , x, y] = tiePoint;
  const [scaleX, scaleY] = pixelScale;
  const west = x - i * scaleX;
  const north = y + j * scaleY;
  return {
    width, height, epsg,
    pixelSize: [scaleX, scaleY],
    bounds: [west, north - height * scaleY, west + width * scaleX, north],
  };
}

function rasterizeMask(rgb, width, height, colorHex) {
  const fill = colorBytes(colorHex);
  const outline = darken(fill);
  const output = Buffer.alloc(width * height * 4);
  const mask = new Uint8Array(width * height);
  for (let p = 0, q = 0; p < rgb.length; p += 3, q++) {
    const difference = Math.max(255 - rgb[p], 255 - rgb[p + 1], 255 - rgb[p + 2]);
    mask[q] = difference >= 12 ? 1 : 0;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const pixel = y * width + x;
    if (!mask[pixel]) continue;
    let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || !mask[ny * width + nx]) { edge = true; break; }
    }
    const offset = pixel * 4;
    const rgbOut = edge ? outline : fill;
    output[offset] = rgbOut[0]; output[offset + 1] = rgbOut[1]; output[offset + 2] = rgbOut[2];
    output[offset + 3] = edge ? 242 : 224;
  }
  return output;
}

function collectByName(value, name, results = []) {
  if (Array.isArray(value)) { for (const item of value) collectByName(item, name, results); return results; }
  if (!value || typeof value !== 'object') return results;
  for (const [key, child] of Object.entries(value)) {
    if (key === name) results.push(...(Array.isArray(child) ? child : [child]));
    else collectByName(child, name, results);
  }
  return results;
}

function coordinatesToRing(value) {
  const text = typeof value === 'string' ? value : '';
  return text.trim().split(/\s+/).filter(Boolean).map(tuple => {
    const [longitude, latitude] = tuple.split(',').map(Number);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) throw new Error('KML contains an invalid longitude/latitude coordinate.');
    return [longitude, latitude];
  });
}

function polygonRings(polygon) {
  const outer = collectByName(polygon, 'outerBoundaryIs').flatMap(boundary => collectByName(boundary, 'coordinates')).map(coordinatesToRing);
  const holes = collectByName(polygon, 'innerBoundaryIs').flatMap(boundary => collectByName(boundary, 'coordinates')).map(coordinatesToRing);
  if (!outer.length || outer[0].length < 4) return null;
  return [...outer, ...holes].filter(ring => ring.length >= 4);
}

async function prepareRasterLayers() {
  const layers = [];
  for (const item of palette) {
    const file = path.join(sourceDir, item.source);
    const source = await fs.readFile(file);
    const georef = parseTiffGeoReference(source, item.source);
    const [west, south, east, north] = georef.bounds;
    const widthMetres = east - west;
    const heightMetres = north - south;
    // At 4 m/pixel the map edges remain sharper than the desktop scene can
    // resolve, while keeping the seven independent texture layers lightweight.
    const width = clamp(Math.ceil(widthMetres / 4), 128, 2048);
    const height = Math.max(128, Math.round(width * heightMetres / widthMetres));
    const resized = await sharp(source).resize(width, height, {fit: 'fill', kernel: 'lanczos3'}).removeAlpha().raw().toBuffer({resolveWithObject: true});
    const rgba = rasterizeMask(resized.data, resized.info.width, resized.info.height, item.color);
    const filename = `${item.unit.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.webp`;
    const output = path.join(outputDir, filename);
    await sharp(rgba, {raw: {width, height, channels: 4}}).webp({lossless: true, effort: 6, alphaQuality: 100}).toFile(output);
    const pixelCount = rgba.length / 4;
    let mappedPixels = 0;
    for (let pixel = 3; pixel < rgba.length; pixel += 4) if (rgba[pixel]) mappedPixels++;
    layers.push({
      unit: item.unit,
      sourceUnit: item.sourceUnit ?? item.unit,
      color: item.color,
      url: `/generated/geology-lithology/${filename}`,
      source: item.source,
      sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
      crs: 'EPSG:32737',
      bounds: georef.bounds,
      sourceDimensions: [georef.width, georef.height],
      pixelSizeMetres: georef.pixelSize,
      dimensions: [width, height],
      mappedPixelFraction: Number((mappedPixels / pixelCount).toFixed(5)),
      basis: 'User-supplied georeferenced lithology raster; WGS 84 / UTM zone 37S; colours follow the source project map.',
    });
  }
  await fs.writeFile(layerManifestPath, `${JSON.stringify({type: 'TangaGeologyRasterLayerCollection', crs: 'EPSG:32737', resolutionMetresPerPixel: 4, edgeKeyline: 'darkened source class colour', layers}, null, 2)}\n`);
}

async function prepareLicenseBoundary() {
  const filename = 'Megred License File.kmz';
  const source = await fs.readFile(path.join(sourceDir, filename));
  const zip = await JSZip.loadAsync(source);
  const kmlEntry = Object.values(zip.files).find(entry => !entry.dir && entry.name.toLowerCase().endsWith('.kml'));
  if (!kmlEntry) throw new Error(`${filename} does not contain a KML document.`);
  const kml = await kmlEntry.async('string');
  const parsed = new XMLParser({ignoreAttributes: true, removeNSPrefix: true, trimValues: true}).parse(kml);
  const placemarks = collectByName(parsed, 'Placemark');
  const features = [];
  for (const [placemarkIndex, placemark] of placemarks.entries()) {
    for (const [polygonIndex, polygon] of collectByName(placemark, 'Polygon').entries()) {
      const rings = polygonRings(polygon);
      if (!rings) continue;
      features.push({
        type: 'Feature',
        properties: {
          layer: 'Merged license boundary',
          name: `Merged licence outline ${String(features.length + 1).padStart(2, '0')}`,
          source: filename,
          kmlPlacemarkIndex: placemarkIndex,
          polygonIndex,
        },
        geometry: {type: 'Polygon', coordinates: rings},
      });
    }
  }
  if (!features.length) throw new Error(`${filename} contains no usable KML polygon outlines.`);
  const allCoordinates = features.flatMap(feature => feature.geometry.coordinates.flat());
  const bounds = [
    Math.min(...allCoordinates.map(point => point[0])),
    Math.min(...allCoordinates.map(point => point[1])),
    Math.max(...allCoordinates.map(point => point[0])),
    Math.max(...allCoordinates.map(point => point[1])),
  ];
  const collection = {
    type: 'FeatureCollection',
    name: 'Tanga merged licence outline',
    provenance: {source: filename, sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), coordinateSystem: 'KML longitude/latitude (WGS 84)', bounds, limitation: 'User-supplied merged outline. Polygon names and legal status are not encoded in the KML; each polygon is shown without inferring a separate licence name.'},
    features,
  };
  await fs.writeFile(boundaryOutputPath, `${JSON.stringify(collection)}\n`);
}

await fs.mkdir(outputDir, {recursive: true});
await prepareRasterLayers();
await prepareLicenseBoundary();
console.log(`Prepared ${palette.length} georeferenced lithology textures and the merged licence outline.`);
