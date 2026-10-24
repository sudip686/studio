import { serveGeoJson } from '@/lib/server/geojson-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return serveGeoJson('BlockModel.geojson', 'block model data', request);
}
