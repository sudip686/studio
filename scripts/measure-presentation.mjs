import {chromium} from 'playwright';
import {parseArgs} from 'node:util';
import {writeFile} from 'node:fs/promises';
import {cameraInteraction, graphicsControl} from './measure-camera-interaction.mjs';

const mapChapters = ['project', 'tanzania', 'work_completed', 'ranking', 'accessibility', 'comparison'];
const chapterOrder = ['project', 'tanzania', 'work_completed', 'topography', 'drillholes', 'subsurface',
  'resource', 'ranking', 'mine_planning', 'metallurgy', 'accessibility', 'comparison'];
const {values: options} = parseArgs({options: {
  base: {type: 'string', default: 'http://localhost:3011'},
  chapters: {type: 'string', default: chapterOrder.join(',')},
  output: {type: 'string'},
  width: {type: 'string', default: '1366'},
  height: {type: 'string', default: '768'},
  'frame-ms': {type: 'string', default: '1500'},
  'interaction-ms': {type: 'string', default: '0'},
  'ready-timeout-ms': {type: 'string', default: '120000'},
  headless: {type: 'boolean'},
}});
const chapters = options.chapters.split(',');
if (chapters.some(chapter => !chapterOrder.includes(chapter))) throw new Error('Unknown chapter');
const viewport = {width: Number(options.width), height: Number(options.height)};
const frameMs = Number(options['frame-ms']);
const interactionMs = Number(options['interaction-ms']);
const readyTimeoutMs = Number(options['ready-timeout-ms']);
if (![viewport.width, viewport.height, frameMs, interactionMs, readyTimeoutMs].every(Number.isSafeInteger) ||
    viewport.width < 1 || viewport.height < 1 || frameMs < 0 || frameMs > 60_000 ||
    interactionMs < 0 || interactionMs > 60_000 || readyTimeoutMs < 1000 || readyTimeoutMs > 300_000) {
  throw new Error('Invalid viewport or frame sample duration');
}

// Each chapter starts in a new browser context. Reload once to measure the
// same URL with the HTTP cache warm. The SW is blocked in both samples.
const browser = await chromium.launch({channel: 'chrome', headless: options.headless ?? false});
const results = [];
let control = null;
try {
  if (interactionMs) control = await graphicsControl(browser, viewport);
  for (const chapter of chapters) {
    const context = await browser.newContext({viewport, serviceWorkers: 'block'});
    const page = await context.newPage();
    await context.addInitScript(() => performance.setResourceTimingBufferSize(4096));
    const errors = [];
    const failedRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => {
      // MapLibre intentionally cancels some tiles on camera transitions.
      if (request.failure()?.errorText !== 'net::ERR_ABORTED') failedRequests.push({url: request.url(), error: request.failure()?.errorText});
    });
    page.on('response', response => {
      if (response.status() >= 400) failedRequests.push({url: response.url(), status: response.status()});
    });
    try {
      for (const cache of ['cold', 'warm']) {
        errors.length = failedRequests.length = 0;
        const url = new URL(options.base);
        url.hash = chapter;
        if (interactionMs && chapter === 'subsurface' && !url.searchParams.has('view')) {
          url.searchParams.set('v', '1');
          url.searchParams.set('view', 'framework');
        }
        const result = {chapter, cache};
        try {
          const response = cache === 'cold'
            ? await page.goto(url.href, {waitUntil: 'domcontentloaded', timeout: readyTimeoutMs})
            : await page.reload({waitUntil: 'domcontentloaded', timeout: readyTimeoutMs});
          result.status = response?.status();
          result.finalUrl = page.url();
          await page.waitForFunction(({chapter, map}) => {
            const deck = document.querySelector('main[data-mode]');
            if (deck?.dataset.mode !== chapter) return false;
            if (chapter === 'metallurgy') return deck.querySelector('.tanga-process-canvas')?.dataset.ready === 'true';
            return deck.dataset[map ? 'mapState' : 'threeState'] === 'ready';
          }, {chapter, map: mapChapters.includes(chapter)}, {timeout: readyTimeoutMs});

          Object.assign(result, await page.evaluate(async duration => {
            const deck = document.querySelector('main[data-mode]');
            const readyObservedMs = Math.round(performance.now());
            const navigation = performance.getEntriesByType('navigation')[0];
            const timing = performance.getEntriesByType('resource');
            const sampleStarted = performance.now();
            let visibleThroughout = document.visibilityState === 'visible';
            const intervals = [];
            if (duration) await new Promise(resolve => {
              const started = performance.now();
              let previous;
              const deadline = setTimeout(resolve, duration + 2_000);
              const frame = now => {
                visibleThroughout &&= document.visibilityState === 'visible';
                if (previous !== undefined) intervals.push(now - previous);
                previous = now;
                if (now - started < duration + 1000 && performance.now() - started < duration) requestAnimationFrame(frame);
                else { clearTimeout(deadline); resolve(); }
              };
              requestAnimationFrame(frame);
            });
            intervals.sort((a, b) => a - b);
            const percentile = fraction => intervals.length ? Number(intervals[Math.ceil(fraction * intervals.length) - 1].toFixed(1)) : null;
            const canvases = [...deck.querySelectorAll('canvas')].filter(canvas => canvas.getClientRects().length).map(canvas => {
              const rect = canvas.getBoundingClientRect();
              return {width: canvas.width, height: canvas.height, cssWidth: Math.round(rect.width), cssHeight: Math.round(rect.height)};
            });
            return {
              revision: deck.querySelector('.tanga-presentation-tools__build code')?.textContent ?? null,
              documentTtfbMs: Math.round(navigation.responseStart),
              firstContentfulPaintMs: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1),
              readyObservedMs,
              mapFirstIdleMs: deck.dataset.mapFirstIdleMs ?? null,
              threeLoadMs: deck.dataset.threeLoadMs ?? null,
              canvases,
              sameOriginTransferBytes: navigation.transferSize + timing.filter(entry => new URL(entry.name).origin === location.origin).reduce((sum, entry) => sum + entry.transferSize, 0),
              frameSample: {visibleThroughout, requestedMs: duration, elapsedMs: Math.round(performance.now() - sampleStarted), count: intervals.length, medianMs: percentile(.5), p95Ms: percentile(.95)},
            };
          }, frameMs));
          if (interactionMs && cache === 'warm' && !mapChapters.includes(chapter)) {
            result.cameraInteraction = await cameraInteraction(page, chapter, interactionMs);
            console.log(`${chapter} camera input: ${result.cameraInteraction.frames} frames, p95 ${result.cameraInteraction.p95Ms} ms, verified ${result.cameraInteraction.verified}`);
          }
        } catch (error) {
          result.failure = error.message;
        }
        results.push({...result, pageErrors: [...errors], failedRequests: [...failedRequests]});
        console.log(`${chapter} ${cache}: ${result.failure?.split('\n')[0] ?? `${result.readyObservedMs} ms, revision ${result.revision}`}`);
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
const report = {base: options.base, browser: browser.version(), viewport, headless: Boolean(options.headless), control, results};
if (options.output) await writeFile(options.output, JSON.stringify(report, null, 2) + '\n');
else console.log(JSON.stringify(report, null, 2));
if (results.some(result => result.failure || result.pageErrors.length || result.failedRequests.length || result.cameraInteraction?.verified === false)) process.exitCode = 1;
