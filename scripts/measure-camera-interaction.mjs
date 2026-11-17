import {setTimeout as delay} from 'node:timers/promises';

const sceneSelectors = {
  metallurgy: '.tanga-process-canvas',
  evidence: '.tanga-three.is-visible > .tanga-three__canvas',
};

// A browser can be focused but still deliver very few callbacks to a page.
// Record the blank control and app samples with the same clock and visibility rules.
export async function sampleFrames(page, duration, sceneSelector = null) {
  return page.evaluate(({duration, sceneSelector}) => new Promise(resolve => {
    const scene = sceneSelector && document.querySelector(sceneSelector);
    const cameraPosition = () => {
      const value = scene?.dataset.cameraPosition;
      const parts = value?.replace(/[\[\]]/g, '').split(',').map(Number);
      return parts?.length === 3 && parts.every(Number.isFinite) ? parts : null;
    };
    const start = performance.now();
    const origin = cameraPosition();
    let previous = start;
    let cameraTravel = 0;
    let maxCameraDisplacement = 0;
    let position = origin;
    let pointerMoves = 0;
    let wheelEvents = 0;
    let visibleThroughout = !document.hidden;
    let lastFrame;
    let timer;
    const frameTimes = [];
    const moved = event => { if (event.isTrusted && event.buttons === 1) pointerMoves++; };
    const wheeled = event => { if (event.isTrusted) wheelEvents++; };
    const visibilityChanged = () => { visibleThroughout &&= !document.hidden; };
    scene?.addEventListener('pointermove', moved, true);
    scene?.addEventListener('wheel', wheeled, true);
    document.addEventListener('visibilitychange', visibilityChanged);

    function finish() {
      cancelAnimationFrame(lastFrame);
      clearTimeout(timer);
      scene?.removeEventListener('pointermove', moved, true);
      scene?.removeEventListener('wheel', wheeled, true);
      document.removeEventListener('visibilitychange', visibilityChanged);
      frameTimes.sort((a, b) => a - b);
      const round = value => Math.round(value * 10) / 10;
      const percentile = fraction => frameTimes.length
        ? round(frameTimes[Math.ceil(fraction * frameTimes.length) - 1])
        : null;
      resolve({
        elapsedMs: Math.round(performance.now() - start),
        requestedMs: duration, visibleThroughout, frames: frameTimes.length,
        medianMs: percentile(.5), p95Ms: percentile(.95),
        above33ms: frameTimes.filter(ms => ms > 33.33).length,
        pointerMoves, wheelEvents, cameraTravel: round(cameraTravel),
        maxCameraDisplacement: round(maxCameraDisplacement),
        sceneReadyAtEnd: scene ? scene.dataset.ready === 'true' : null,
      });
    }
    function frame() {
      const now = performance.now();
      // Ignore the first interval, which includes callback registration time.
      if (previous !== start) frameTimes.push(now - previous);
      previous = now;
      if (scene) {
        const next = cameraPosition();
        if (next && position) cameraTravel += Math.hypot(...next.map((v, i) => v - position[i]));
        if (next && origin) maxCameraDisplacement = Math.max(maxCameraDisplacement, Math.hypot(...next.map((v, i) => v - origin[i])));
        if (next) position = next;
      }
      if (now - start >= duration) finish();
      else lastFrame = requestAnimationFrame(frame);
    }
    timer = setTimeout(finish, duration + 2000);
    lastFrame = requestAnimationFrame(frame);
  }), {duration, sceneSelector});
}

export async function cameraInteraction(page, chapter, duration) {
  const selector = chapter === 'metallurgy' ? sceneSelectors.metallurgy : sceneSelectors.evidence;
  await page.bringToFront();
  await page.waitForFunction(selector => {
    const data = document.querySelector(selector)?.dataset;
    return Boolean(data?.cameraPosition) && data.cameraMoving !== 'true' && data.cameraSettled !== 'false';
  }, selector);
  // Select a strip that really hits the canvas so an overlay cannot turn the
  // whole timing window into an idle sample.
  const strip = await page.locator(`${selector} canvas`).evaluate(canvas => {
    const rect = canvas.getBoundingClientRect();
    const halfSpan = Math.min(70, rect.width * .09);
    for (const yFraction of [.51, .38, .63, .28, .73]) {
      for (const xFraction of [.5, .44, .58, .36, .66]) {
        const x = Math.round(rect.left + rect.width * xFraction);
        const y = Math.round(rect.top + rect.height * yFraction);
        if ([-halfSpan, 0, halfSpan].every(dx => document.elementFromPoint(x + dx, y) === canvas)) {
          return {x, y, halfSpan};
        }
      }
    }
    return null;
  });
  if (!strip) throw new Error('No unobstructed canvas strip for the interaction probe');
  await page.mouse.move(strip.x, strip.y);
  const started = performance.now();
  const sample = sampleFrames(page, duration, selector);
  let interactionError;
  let pressed = false;
  try {
    await page.mouse.down();
    pressed = true;
    let lastZoom = 0;
    while (performance.now() - started < duration) {
      const ms = performance.now() - started;
      // Eight-second cycles keep drags bounded and add zoom both ways.
      if (ms - lastZoom >= 4000) {
        await page.mouse.up();
        pressed = false;
        await page.mouse.wheel(0, Math.floor(ms / 4000) % 2 ? -110 : 110);
        await page.mouse.down();
        pressed = true;
        lastZoom = ms;
      }
      await page.mouse.move(strip.x + strip.halfSpan * Math.sin(ms / 500), strip.y);
      await delay(32);
    }
  } catch (error) {
    interactionError = error;
  } finally {
    if (pressed) await page.mouse.up().catch(() => undefined);
  }
  const result = await sample;
  if (interactionError) throw interactionError;
  return {...result, verified: result.visibleThroughout && result.sceneReadyAtEnd &&
    result.elapsedMs >= duration && result.frames >= 2 && result.pointerMoves > 0 &&
    (duration < 8000 || result.wheelEvents > 0) && result.maxCameraDisplacement > 0};
}

export async function graphicsControl(browser, viewport) {
  const context = await browser.newContext({viewport});
  try {
    const page = await context.newPage();
    await page.bringToFront();
    const renderer = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2', {powerPreference: 'high-performance'});
      const debug = gl?.getExtension('WEBGL_debug_renderer_info');
      const description = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null;
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      return description;
    });
    return {renderer, ...await sampleFrames(page, 3000)};
  } finally {
    await context.close();
  }
}
