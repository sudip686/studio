import { serveAsset } from '@/lib/server/asset-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return serveAsset('height.bin', 'terrain height data');
}
