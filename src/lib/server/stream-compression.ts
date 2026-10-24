/** Stream gzip only when the caller explicitly accepts it. */
export function maybeGzipStreamResponse(
  body: ReadableStream<Uint8Array>,
  request: Request,
  init: ResponseInit = {},
) {
  const headers = new Headers(init.headers);
  const acceptEncoding = request.headers.get('accept-encoding') ?? '';
  const acceptsGzip = acceptEncoding.split(',').some((entry) => {
    const [coding, ...parameters] = entry.trim().toLowerCase().split(';');
    if (coding.trim() !== 'gzip') return false;
    const qualityParameter = parameters.find((parameter) => /^\s*q\s*=/.test(parameter));
    const quality = qualityParameter ? Number(qualityParameter.split('=')[1]) : 1;
    return Number.isFinite(quality) && quality > 0 && quality <= 1;
  });
  const cloudflareWorkerBuild = process.env.NEXT_PUBLIC_PRESENTATION_BUILD_TARGET?.startsWith('Cloudflare Workers');
  const canCompress = acceptsGzip
    // The OpenNext response adapter discards Workers' non-standard
    // `encodeBody: 'manual'` flag. Return ordinary JSON from the Worker build
    // and let Cloudflare's edge Compression Rules negotiate gzip/Brotli.
    // This also keeps local OpenNext preview responses parseable.
    && !cloudflareWorkerBuild
    && !request.headers.has('range')
    && init.status !== 206
    && !headers.has('content-encoding')
    && typeof CompressionStream !== 'undefined';

  if (canCompress) {
    headers.delete('content-length');
    headers.delete('content-range');
    headers.delete('accept-ranges');
    headers.delete('etag');
    headers.set('content-encoding', 'gzip');
    const vary = headers.get('vary');
    if (vary !== '*') {
      const values = new Set((vary ?? '').split(',').map((value) => value.trim()).filter(Boolean));
      values.add('Accept-Encoding');
      headers.set('vary', [...values].join(', '));
    }
    const gzip = new CompressionStream('gzip') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>;
    return new Response(body.pipeThrough(gzip), {...init, headers});
  }

  return new Response(body, {...init, headers});
}
