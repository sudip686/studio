import {spawnSync} from 'node:child_process';
import {readdir, readFile, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import('./verify-terrain-assets.mjs');
const maxStaticAssetBytes = 25 * 1024 * 1024;
const requiredR2Assets = new Set([
  'height.bin',
  'texture_rgb_8192.png',
  'media/tanga-google-earth-intro-corrected-preview.mp4',
]);
const intentionallyOmittedAssets = new Set([
  '0424046 Tanga Graphite Mineral Resource Estimate Draft.docx',
  'generated/forge3d_test_terrain.obj',
  'media/tanga-first-slide-story.mp4',
  'media/tanga-google-earth-intro-corrected-8k-bright.mp4',
  'media/tanga-google-earth-intro-corrected-8k.mp4',
  'media/tanga-google-earth-intro-corrected-preview-original.mp4',
  'media/tanga-google-earth-intro-draft.mp4',
  'media/tanga12-8k-polished.mp4',
  'media/tanga12-intro-8k-merged.mp4',
  'media/Tanga14.mp4',
  'media/Tanga15.mp4',
]);

async function loadEnvFiles() {
  for (const filename of ['.env.production', '.env.local', '.env']) {
    const file = path.join(root, filename);
    try {
      const content = await readFile(file, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (match && process.env[match[1]] === undefined) {
          process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
        }
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

async function* walk(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(absolute);
    else if (entry.isFile()) yield absolute;
  }
}

await loadEnvFiles();
process.env.TANGA_BUILD_TARGET = 'Cloudflare Workers · OpenNext';
if (process.env.NEXT_PUBLIC_ASSET_BASE_URL) {
  const devVarsPath = path.join(root, '.dev.vars');
  let devVars = '';
  try { devVars = await readFile(devVarsPath, 'utf8'); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  if (!/^NEXT_PUBLIC_ASSET_BASE_URL\s*=/m.test(devVars)) {
    const line = `NEXT_PUBLIC_ASSET_BASE_URL=${process.env.NEXT_PUBLIC_ASSET_BASE_URL}`;
    await writeFile(devVarsPath, `${devVars.trimEnd()}${devVars.trimEnd() ? '\n' : ''}${line}\n`, {encoding: 'utf8', mode: 0o600});
  }
}
const cli = path.join(root, 'node_modules', '@opennextjs', 'cloudflare', 'dist', 'cli', 'index.js');
const build = spawnSync(process.execPath, [cli, 'build'], {cwd: root, env: process.env, stdio: 'inherit'});
if (build.status !== 0) process.exit(build.status ?? 1);

const assetsDirectory = path.resolve(root, '.open-next', 'assets');
const insideRoot = path.relative(root, assetsDirectory);
if (insideRoot.startsWith('..') || path.isAbsolute(insideRoot)) throw new Error('Unsafe Cloudflare assets directory');
let omittedBytes = 0;
let requiredCount = 0;
let unresolved = [];

for await (const filename of walk(assetsDirectory)) {
  const info = await stat(filename);
  if (info.size <= maxStaticAssetBytes) continue;
  const key = path.relative(assetsDirectory, filename).split(path.sep).join('/');
  if (requiredR2Assets.has(key)) {
    if (!process.env.NEXT_PUBLIC_ASSET_BASE_URL) unresolved.push(key);
    else requiredCount += 1;
  } else if (!intentionallyOmittedAssets.has(key)) {
    unresolved.push(key);
  }
}

if (unresolved.length) {
  throw new Error(`Cloudflare static assets exceed 25 MiB and need an explicit delivery route: ${unresolved.join(', ')}`);
}

for (const key of [...requiredR2Assets, ...intentionallyOmittedAssets]) {
  const filename = path.resolve(assetsDirectory, ...key.split('/'));
  const relative = path.relative(assetsDirectory, filename);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Unsafe asset path: ${key}`);
  try {
    const info = await stat(filename);
    if (info.size > maxStaticAssetBytes) {
      await rm(filename);
      omittedBytes += info.size;
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

for await (const filename of walk(assetsDirectory)) {
  const info = await stat(filename);
  if (info.size > maxStaticAssetBytes) throw new Error(`Cloudflare asset still exceeds 25 MiB: ${path.relative(assetsDirectory, filename)}`);
}

console.log(`Cloudflare static assets ready: ${requiredCount} large files routed to the configured R2 base; omitted ${omittedBytes.toLocaleString()} bytes of large/unused source files.`);
