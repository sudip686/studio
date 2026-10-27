import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Both Vercel and Cloudflare must receive complete rasters, not LFS pointers
// or a regional grid from an older, differently sized terrain release.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFileSync(path.join(root, 'public', name));
const meta = JSON.parse(read('terrain_hires_meta.json'));
assert.equal(meta.crs_epsg, 32737);
assert.ok(meta.context_grid, 'Missing bundled regional grid description');
const size = meta.width * meta.height;
const floats = (name, count) => {
  const buffer = read(name);
  assert.ok(!buffer.subarray(0, 80).toString().startsWith('version https://git-lfs.github.com/'), `${name} is an LFS pointer`);
  assert.equal(buffer.byteLength, count * 4, `${name}: raster/metadata dimensions disagree`);
  return new Float32Array(buffer.buffer, buffer.byteOffset, count);
};
const context = floats(meta.context_grid.file, meta.context_grid.width * meta.context_grid.height);
const survey = floats('survey_height_hires.bin', size);
const slope = floats('survey_slope_hires.bin', size);
const coverage = read('survey_coverage_hires.bin');
assert.equal(coverage.byteLength, size);
for (const elevation of context) assert.ok(Number.isFinite(elevation) && elevation > 0 && elevation < 2000, 'Invalid regional elevation');
let covered = 0;
for (let i = 0; i < size; i++) {
  assert.ok(coverage[i] === 0 || coverage[i] === 1, 'Invalid coverage mask');
  if (!coverage[i]) continue;
  covered++;
  assert.ok(Number.isFinite(survey[i]) && survey[i] >= meta.survey_surface.elevation_range_m[0] && survey[i] <= meta.survey_surface.elevation_range_m[1], 'Invalid surveyed elevation');
  assert.ok(slope[i] === -32767 || (Number.isFinite(slope[i]) && slope[i] >= 0 && slope[i] <= 90), 'Invalid slope sample');
}
assert.ok(Math.abs(covered / size - meta.survey_surface.valid_output_fraction) < 1e-6, 'Survey coverage does not match metadata');
const resourceBlocks = read('resource_blocks_v1.bin');
assert.ok(!resourceBlocks.subarray(0, 80).toString().startsWith('version https://git-lfs.github.com/'), 'resource_blocks_v1.bin is an LFS pointer');
assert.equal(resourceBlocks.toString('ascii', 0, 8), 'TGRBIN01', 'Unexpected compact resource block format');
const blockCount = resourceBlocks.readUInt32LE(8);
const blockStride = resourceBlocks.readUInt32LE(12);
const blockMetadataLength = resourceBlocks.readUInt32LE(16);
assert.equal(blockStride, 44, 'Compact resource block record layout changed');
assert.equal(20 + blockMetadataLength + blockCount * blockStride, resourceBlocks.byteLength, 'Compact resource block header and payload disagree');
const blockMetadata = JSON.parse(resourceBlocks.toString('utf8', 20, 20 + blockMetadataLength));
assert.equal(blockMetadata.formatVersion, 1, 'Unsupported compact resource block version');
assert.equal(blockMetadata.sourceFeatureCount, blockCount, 'Compact block model does not retain every source feature');
assert.ok(Array.isArray(blockMetadata.classes) && blockMetadata.classes.length > 0, 'Compact resource block classifications are missing');
console.log(`Terrain and presentation assets verified: ${meta.context_grid.width}×${meta.context_grid.height} regional grid; ${covered.toLocaleString()} valid survey samples; ${blockCount.toLocaleString()} source resource cells; no LFS pointers.`);
