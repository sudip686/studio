/**
 * Keep streamed route bodies unencoded and let Next.js or the hosting edge
 * negotiate gzip/Brotli. Manually encoding inside an App Router response can
 * be re-encoded by Vercel/Next while retaining the wrong Content-Encoding,
 * leaving browser fetch consumers with compressed bytes instead of JSON.
 */
export function streamResponse(
  body: ReadableStream<Uint8Array>,
  init: ResponseInit = {},
) {
  return new Response(body, init);
}
