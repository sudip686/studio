import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';

const worker = await readFile(new URL('../public/service-worker.js', import.meta.url));
let servedWorker = Buffer.from(`
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
`);
const assets = new Map(await Promise.all(['A_Logo.png', 'icon.png'].map(async name => [
  `/${name}`, await readFile(new URL(`../public/${name}`, import.meta.url)),
])));
let revision = 'previous';
let navigationDelay = 0;
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  response.setHeader('Cache-Control', 'no-store');
  if (pathname === '/service-worker.js') {
    response.writeHead(200, {'Content-Type': 'application/javascript'});
    return response.end(servedWorker);
  }
  if (assets.has(pathname)) {
    response.writeHead(200, {'Content-Type': 'image/png'});
    return response.end(assets.get(pathname));
  }
  if (pathname !== '/') {
    response.writeHead(404);
    return response.end();
  }
  await delay(navigationDelay);
  response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  response.end(`<!doctype html><title>${revision}</title><main>${revision}</main>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({channel: 'chrome', headless: true});
  const context = await browser.newContext({serviceWorkers: 'allow'});
  const page = await context.newPage();
  await page.goto(origin);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/service-worker.js', {updateViaCache: 'none'});
  });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, {timeout: 20_000});
  // Simulate a returning viewer with a controlled page and HTML left in the
  // generic cache by a previous release. Swap the served script and wait for
  // the actual browser update and controller handoff.
  await page.evaluate(async () => {
    const legacy = await caches.open('default-nf-v2');
    await legacy.put(location.origin + '/', new Response('<!doctype html><title>previous</title>', {
      headers: {'Content-Type': 'text/html'},
    }));
  });
  servedWorker = worker;
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const handoff = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Updated worker did not take control')), 20_000);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        clearTimeout(timer);
        resolve();
      }, {once: true});
    });
    await Promise.all([registration.update(), handoff]);
  });
  const previous = await page.goto(origin);
  assert.equal(previous.fromServiceWorker(), true, 'the warm-up navigation must be controlled');
  assert.equal(await page.title(), 'previous');
  await page.waitForFunction(async () => (await caches.keys()).includes('tanga-documents-v1') &&
    Boolean(await caches.match(location.origin + '/', {cacheName: 'tanga-documents-v1'})));

  navigationDelay = 5300;
  revision = 'current';
  const online = await page.goto(origin, {timeout: 15_000});
  assert.equal(online.fromServiceWorker(), true, 'the delayed navigation must be controlled');
  assert.equal(await page.title(), 'current', 'slow online navigation returned stale HTML');
  await page.waitForFunction(async () => {
    const cached = await caches.match(location.origin + '/', {cacheName: 'tanga-documents-v1'});
    return (await cached?.text())?.includes('<title>current</title>');
  });

  await context.setOffline(true);
  const offline = await page.goto(origin, {timeout: 15_000});
  assert.equal(offline.fromServiceWorker(), true, 'offline navigation must use the worker');
  assert.equal(await page.title(), 'current', 'offline navigation should use the last successful document');
  console.log('PASS: the updated worker took control, loaded current HTML over a slow connection, and reused it offline.');
} finally {
  try { await browser?.close(); }
  finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
