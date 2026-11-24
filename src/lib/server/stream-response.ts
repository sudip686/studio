/** Fetch can decode upstream Content-Encoding, while some R2 objects contain
 * gzip bytes without metadata. Inspect the body actually received. */
export async function streamResponse(body: ReadableStream<Uint8Array>, init: ResponseInit = {}) {
  const [sample, payload] = body.tee();
  const reader = sample.getReader();
  const signature: number[] = [];
  try {
    while (signature.length < 2) {
      const {done, value} = await reader.read();
      if (done) break;
      signature.push(...value.subarray(0, 2 - signature.length));
    }
  } finally {
    void reader.cancel().catch(() => {});
  }

  const headers = new Headers(init.headers);
  for (const name of ['content-encoding', 'content-length', 'etag', 'content-range']) headers.delete(name);
  headers.set('accept-ranges', 'none');
  const gzip = signature[0] === 0x1f && signature[1] === 0x8b;
  return new Response(gzip ? new Response(payload).body!.pipeThrough(new DecompressionStream('gzip')) : payload, {...init, headers});
}
