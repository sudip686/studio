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
console.log(`Terrain assets verified: ${meta.context_grid.width}×${meta.context_grid.height} regional grid; ${covered.toLocaleString()} valid survey samples; no LFS pointers.`);
