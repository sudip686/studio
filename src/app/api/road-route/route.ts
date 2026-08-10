import {NextResponse} from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteTarget = 'port' | 'power' | 'rail';

const PROJECT_CENTER = {lon: 38.785, lat: -4.813};

const ROUTE_TARGETS: Record<RouteTarget, {label: string; lon: number; lat: number}> = {
  port: {label: 'Tanga Port', lon: 39.105, lat: -5.064},
  power: {label: 'Hale Hydroelectric Power Station', lon: 38.6145868, lat: -5.2980925},
  rail: {label: 'Tanga rail terminal', lon: 39.101, lat: -5.073},
};

function routeTarget(value: string | null): RouteTarget {
  if (value === 'power' || value === 'rail') return value;
  return 'port';
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      cache: 'no-store',
      headers: {
        'user-agent': 'Tanga Earth Studio route preview',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const targetKey = routeTarget(searchParams.get('target'));
  const target = ROUTE_TARGETS[targetKey];
  const coordinates = `${PROJECT_CENTER.lon},${PROJECT_CENTER.lat};${target.lon},${target.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&alternatives=false&steps=false`;

  try {
    const response = await fetchWithTimeout(url, 8000);
    const payload = await response.json();
    const route = payload?.routes?.[0];
    const geometry = route?.geometry;

    if (!response.ok || !geometry || !Array.isArray(geometry.coordinates)) {
      return NextResponse.json(
        {error: payload?.message ?? 'OSRM did not return a route', target: targetKey, targetLabel: target.label},
        {status: 502}
      );
    }

    return NextResponse.json({
      target: targetKey,
      targetLabel: target.label,
      source: 'osrm',
      distanceMeters: Number(route.distance ?? 0),
      durationSeconds: Number(route.duration ?? 0),
      geometry,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'OSRM route request failed',
        target: targetKey,
        targetLabel: target.label,
      },
      {status: 502}
    );
  }
}
