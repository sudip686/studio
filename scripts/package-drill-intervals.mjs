import {readFileSync, writeFileSync} from 'node:fs';

// Preserve every feature and property. Whitespace is the only removed data.
for (const name of ['assay_data', 'lithology_data']) {
  const data = JSON.parse(readFileSync(new URL('../public/' + name + '.geojson', import.meta.url), 'utf8'));
  if (data.type !== 'FeatureCollection' || !data.features.length) throw new Error('Empty interval source: ' + name);
  writeFileSync(new URL('../public/generated/' + name + '.json', import.meta.url), JSON.stringify(data));
}
