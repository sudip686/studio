import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

type AssetRouteOptions = {
  contentType?: string;
};

export async function serveAsset(filename: string, label: string, options: AssetRouteOptions = {}) {
  const headers = new Headers({
    'cache-control': 'no-store, max-age=0',
    'content-type': options.contentType ?? 'application/octet-stream',
  });

  const localPath = path.join(process.cwd(), 'public', filename);

  try {
    const localPayload = await fs.readFile(localPath);
    return new NextResponse(localPayload, { headers });
  } catch {
    // Fall through to the remote asset when the file is not available locally.
  }

  const assetBaseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '');
  if (!assetBaseUrl) {
    return NextResponse.json(
      { error: `${label} is not configured on the server.` },
      { status: 404, headers }
    );
  }

  const remoteUrl = `${assetBaseUrl}/${filename}`;

  try {
    const response = await fetch(remoteUrl, { cache: 'no-store' });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Remote ${label} request failed with ${response.status}.` },
        { status: 502, headers }
      );
    }

    if (response.body) {
      return new NextResponse(response.body, { headers });
    }

    const payload = await response.arrayBuffer();
    return new NextResponse(payload, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : `Unable to fetch the remote ${label}.`,
      },
      { status: 502, headers }
    );
  }
}
