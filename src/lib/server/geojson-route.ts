import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import {streamResponse} from './stream-response';

function geoJsonResponse(body: ReadableStream<Uint8Array>) {
  return streamResponse(body, {headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
  }});
}

export async function serveGeoJson(filename: string, label: string) {
  const localPath = path.join(process.cwd(), 'public', filename);

  try {
    const info = await fs.stat(localPath);
    if (!info.isFile()) throw new Error(`${label} is not a file.`);
    const fileBody = Readable.toWeb(createReadStream(localPath)) as ReadableStream<Uint8Array>;
    return geoJsonResponse(fileBody);
  } catch {
    // Fall through to remote fetch when the file is not available locally.
  }

  const assetBaseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '');
  if (!assetBaseUrl) {
    return NextResponse.json(
      { error: `${label} is not configured on the server.` },
      { status: 404, headers: {'cache-control': 'no-store, max-age=0'} }
    );
  }

  const remoteUrl = `${assetBaseUrl}/${filename}`;

  try {
    const response = await fetch(remoteUrl, { cache: 'no-store' });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Remote ${label} request failed with ${response.status}.` },
        { status: 502, headers: {'cache-control': 'no-store, max-age=0'} }
      );
    }

    if (response.body) {
      return geoJsonResponse(response.body);
    }

    const payload = await response.text();
    return geoJsonResponse(new Blob([payload]).stream());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : `Unable to fetch the remote ${label}.`,
      },
      { status: 502, headers: {'cache-control': 'no-store, max-age=0'} }
    );
  }
}
