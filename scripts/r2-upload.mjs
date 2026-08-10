// ─────────────────────────────────────────────────────────────────────────────
// Upload the Tanga deck's large assets to Cloudflare R2 (bucket: my-geo-assets)
// via the S3-compatible API. Handles the big intro videos (R2 single-PUT limit
// is 5 GB — all our files are under that).
//
// CREDENTIALS come from environment variables — this script never prints them,
// and you never paste them into chat:
//   R2_ACCOUNT_ID          e.g. ebe5c114128b858b4d5a1a680311826d
//   R2_ACCESS_KEY_ID       from Cloudflare → R2 → Manage R2 API Tokens
//   R2_SECRET_ACCESS_KEY   (Object Read & Write on my-geo-assets)
//
// Run:  node scripts/r2-upload.mjs           (uploads the app-referenced assets)
//       node scripts/r2-upload.mjs --videos  (also uploads every file in public/media)
// ─────────────────────────────────────────────────────────────────────────────
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream, statSync, existsSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import mime from 'mime-types';

const BUCKET = 'my-geo-assets';
const PUBLIC = 'public';
const ACCOUNT = process.env.R2_ACCOUNT_ID;
const KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET = process.env.R2_SECRET_ACCESS_KEY;

if (!ACCOUNT || !KEY || !SECRET) {
  console.error('Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: KEY, secretAccessKey: SECRET },
});

// Object keys mirror the /public paths the app fetches.
const KEYS = [
  'terrain_preview_meta.json',
  'height_preview_1024.bin',
  'topography.png',
  'terrain_texture_8k.jpg',
  'texture_rgb_8192.png',
  'resource_model.bin',
  'assay_data.geojson',
  'lithology_data.geojson',
  'media/tanga-google-earth-intro-corrected-preview.mp4',
  'media/tanga-first-slide-story-poster.jpg',
];

if (process.argv.includes('--videos') && existsSync(join(PUBLIC, 'media'))) {
  for (const f of readdirSync(join(PUBLIC, 'media'))) {
    const abs = join(PUBLIC, 'media', f);
    if (!statSync(abs).isFile()) continue;          // skip subdirectories
    if (f === '.gitkeep' || f.startsWith('.')) continue;
    const k = posix.join('media', f);
    if (!KEYS.includes(k)) KEYS.push(k);
  }
}

const mb = (n) => (n / 1048576).toFixed(1);

async function upload(key) {
  const src = join(PUBLIC, ...key.split('/'));
  if (!existsSync(src)) { console.log(`  skip (missing): ${key}`); return; }
  const size = statSync(src).size;
  process.stdout.write(`  ↑ ${key} (${mb(size)} MB) ... `);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: createReadStream(src),
    ContentLength: size,
    ContentType: mime.lookup(src) || 'application/octet-stream',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  // Verify
  const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  console.log(head.ContentLength === size ? 'ok' : `WARN size ${head.ContentLength} != ${size}`);
}

console.log(`Uploading ${KEYS.length} objects to r2://${BUCKET} ...`);
let failed = 0;
for (const key of KEYS) {
  try { await upload(key); }
  catch (e) { failed++; console.log(`FAILED: ${key} — ${e.name}: ${e.message}`); }
}
console.log(failed ? `Done with ${failed} failure(s).` : 'Done — all objects uploaded.');
process.exit(failed ? 1 : 0);
