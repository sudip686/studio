import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
};

export async function serveGeoJson(filename: string, label: string) {
  const localPath = path.join(process.cwd(), 'public', filename);

  try {
    const localPayload = await fs.readFile(localPath, 'utf8');
    return new NextResponse(localPayload, { headers: JSON_HEADERS });
  } catch {
    // Fall through to remote fetch when the file is not available locally.
  }

  const assetBaseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '');
  if (!assetBaseUrl) {
    return NextResponse.json(
      { error: `${label} is not configured on the server.` },
      { status: 404, headers: JSON_HEADERS }
    );
  }

  const remoteUrl = `${assetBaseUrl}/${filename}`;

  try {
    const response = await fetch(remoteUrl, { cache: 'no-store' });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Remote ${label} request failed with ${response.status}.` },
        { status: 502, headers: JSON_HEADERS }
      );
    }

    if (response.body) {
      return new NextResponse(response.body, { headers: JSON_HEADERS });
    }

    const payload = await response.text();
    return new NextResponse(payload, { headers: JSON_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : `Unable to fetch the remote ${label}.`,
      },
      { status: 502, headers: JSON_HEADERS }
    );
  }
}
