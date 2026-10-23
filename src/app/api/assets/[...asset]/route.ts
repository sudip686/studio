import {NextResponse} from 'next/server';
import path from 'node:path';
import {promises as fs} from 'node:fs';

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

async function assetResponse(request: Request, context: RouteContext) {
  const {asset} = await context.params;
  const key = asset.join('/');
  if (!STREAMABLE_ASSETS.has(key) || asset.some((part) => part === '.' || part === '..' || part.includes('\\'))) {
    return NextResponse.json({error: 'Asset not found.'}, {status: 404});
  }

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
      return new Response(response.body, {status: response.status, statusText: response.statusText, headers: responseHeaders});
    } catch {
      // A local public file can still serve this request in development.
    }
  }

  try {
    const localFile = path.join(process.cwd(), 'public', ...asset);
    const body = await fs.readFile(localFile);
    return new Response(body, {headers: {'cache-control': 'public, max-age=300', 'content-length': String(body.byteLength), 'content-type': contentTypeFor(key), 'accept-ranges': 'none'}});
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
