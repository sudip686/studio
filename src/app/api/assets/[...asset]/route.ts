import {NextResponse} from 'next/server';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import path from 'node:path';
import {createReadStream, promises as fs} from 'node:fs';
import {Readable} from 'node:stream';
import {maybeGzipStreamResponse} from '@/lib/server/stream-compression';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STREAMABLE_ASSETS = new Set([
  'height.bin',
  'height_hires.bin',
  'height_preview_1024.bin',
  'terrain_texture_8k.jpg',
  'texture_rgb_8192.png',
  'geologicalModel.glb',
  'assay_data.geojson',
  'lithology_data.geojson',
  'resource_model.bin',
  'media/tanga-first-slide-story-poster.jpg',
  'media/tanga-google-earth-intro-corrected-preview.mp4',
]);

function contentTypeFor(key: string) {
  if (key.endsWith('.json') || key.endsWith('.geojson')) return 'application/json; charset=utf-8';
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg';
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.mp4')) return 'video/mp4';
  if (key.endsWith('.glb')) return 'model/gltf-binary';
  return 'application/octet-stream';
}

type RouteContext = {params: Promise<{asset: string[]}>};

type R2AssetObject = {
  body?: ReadableStream<Uint8Array>;
  httpEtag: string;
  range?: {offset?: number; length?: number; suffix?: number};
  size: number;
  writeHttpMetadata(headers: Headers): void;
};

type R2AssetBucket = {
  get(key: string, options?: {range?: Headers}): Promise<R2AssetObject | null>;
  head(key: string): Promise<R2AssetObject | null>;
};

function contentRangeFor(range: NonNullable<R2AssetObject['range']>, size: number) {
  const start = range.offset ?? (range.suffix ? Math.max(0, size - range.suffix) : 0);
  const length = range.length ?? (range.suffix ? Math.min(size, range.suffix) : size - start);
  const end = Math.min(size - 1, start + length - 1);
  return length > 0 && end >= start ? {value: `bytes ${start}-${end}/${size}`, length: end - start + 1} : null;
}

async function cloudflareR2Response(request: Request, key: string) {
  if (!process.env.NEXT_PUBLIC_PRESENTATION_BUILD_TARGET?.startsWith('Cloudflare Workers')) return null;

  try {
    const {env} = await getCloudflareContext({async: true});
    const bucket = (env as unknown as {TANGA_R2?: R2AssetBucket}).TANGA_R2;
    if (!bucket) return null;

    const object = request.method === 'HEAD'
      ? await bucket.head(key)
      : await bucket.get(key, {range: request.headers});
    // Wrangler's local R2 simulator is empty unless explicitly seeded. Let
    // development and an unavailable binding retain the public R2 fallback.
    if (!object || (request.method === 'GET' && !object.body)) return null;

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('accept-ranges', 'bytes');
    headers.set('x-content-type-options', 'nosniff');
    if (!headers.has('content-type')) headers.set('content-type', contentTypeFor(key));
    if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=300');

    const contentRange = request.method === 'GET' && request.headers.has('range') && object.range
      ? contentRangeFor(object.range, object.size)
      : null;
    if (contentRange) {
      headers.set('content-range', contentRange.value);
      headers.set('content-length', String(contentRange.length));
    } else if (!headers.has('content-length')) {
      headers.set('content-length', String(object.size));
    }
    if (key.endsWith('.geojson') && request.method === 'GET' && !contentRange && object.body) {
      return maybeGzipStreamResponse(object.body, request, {headers});
    }
    return new Response(request.method === 'HEAD' ? null : object.body, {
      status: contentRange ? 206 : 200,
      headers,
    });
  } catch {
    return null;
  }
}

async function assetResponse(request: Request, context: RouteContext) {
  const {asset} = await context.params;
  const key = asset.join('/');
  if (!STREAMABLE_ASSETS.has(key) || asset.some((part) => part === '.' || part === '..' || part.includes('\\'))) {
    return NextResponse.json({error: 'Asset not found.'}, {status: 404});
  }
  const isGeoJson = key.endsWith('.geojson');

  const cloudflareResponse = await cloudflareR2Response(request, key);
  if (cloudflareResponse) return cloudflareResponse;

  const headers = new Headers();
  const range = request.headers.get('range');
  if (range) headers.set('range', range);
  const assetBaseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '');

  if (assetBaseUrl) {
    try {
      const response = await fetch(`${assetBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`, {
        method: request.method,
        headers,
        cache: 'no-store',
      });
      const responseHeaders = new Headers();
      for (const header of ['accept-ranges', 'cache-control', 'content-length', 'content-range', 'content-type', 'etag', 'last-modified']) {
        const value = response.headers.get(header);
        if (value) responseHeaders.set(header, value);
      }
      if (!responseHeaders.has('content-type')) responseHeaders.set('content-type', contentTypeFor(key));
      responseHeaders.set('x-content-type-options', 'nosniff');
      if (isGeoJson && request.method === 'GET' && response.body) {
        return maybeGzipStreamResponse(response.body, request, {status: response.status, statusText: response.statusText, headers: responseHeaders});
      }
      return new Response(response.body, {status: response.status, statusText: response.statusText, headers: responseHeaders});
    } catch {
      // A local public file can still serve this request in development.
    }
  }

  try {
    const localFile = path.join(process.cwd(), 'public', ...asset);
    const headers = {'cache-control': 'public, max-age=300', 'content-type': contentTypeFor(key), 'accept-ranges': 'none', 'x-content-type-options': 'nosniff'};
    if (isGeoJson && request.method === 'GET') {
      const info = await fs.stat(localFile);
      if (!info.isFile()) throw new Error('Asset not found.');
      const body = Readable.toWeb(createReadStream(localFile)) as ReadableStream<Uint8Array>;
      return maybeGzipStreamResponse(body, request, {headers: {...headers, 'content-length': String(info.size)}});
    }
    const body = await fs.readFile(localFile);
    return new Response(body, {headers: {...headers, 'content-length': String(body.byteLength)}});
  } catch {
    return NextResponse.json({error: 'Asset delivery is not configured.'}, {status: 404});
  }
}

export async function GET(request: Request, context: RouteContext) {
  return assetResponse(request, context);
}

export async function HEAD(request: Request, context: RouteContext) {
  return assetResponse(request, context);
}
