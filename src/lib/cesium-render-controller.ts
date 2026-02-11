// lib/cesium-render-controller.ts
export type RenderController = {
  pulse: () => void;                        // render exactly one frame
  animateFor: (ms: number) => void;         // temporary render loop
  stop: () => void;                         // stop any loop
  bindUserInput: () => void;                // render on drag/wheel for a short while
  isAnimating: () => boolean;
};

export function createRenderController(viewer: any): RenderController {
  let anim = false;
  let stopped = false;
  let rafId: number | null = null;

  const renderOnce = () => {
    try { viewer.resize(); viewer.render(); } catch (e) { console.error('[RenderController] Error in render loop:', e); }
  };

  const loop = () => {
    if (stopped) return;
    renderOnce();
    rafId = requestAnimationFrame(loop);
  };

  const pulse = () => {
    renderOnce();
  };

  const animateFor = (ms: number) => {
    if (stopped) return;
    anim = true;
    const start = performance.now();
    const tick = () => {
      if (stopped) { anim = false; return; }
      renderOnce();
      if (performance.now() - start < ms) {
        rafId = requestAnimationFrame(tick);
      } else {
        anim = false;
      }
    };
    rafId && cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  };

  const stop = () => {
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    anim = false;
  };

  const isAnimating = () => anim;

  // Render briefly after user input to show inertia / movement
  const bindUserInput = () => {
    const canvas = viewer.scene?.canvas; // Add nullish coalescing
    if (!canvas) return; // Guard against undefined canvas
    const kick = () => animateFor(600);
    canvas.addEventListener('mousedown', kick);
    canvas.addEventListener('mousemove', kick);
    canvas.addEventListener('wheel', kick, { passive: true });
    canvas.addEventListener('touchstart', kick, { passive: true });
    canvas.addEventListener('touchmove', kick, { passive: true });
  };

  return { pulse, animateFor, stop, bindUserInput, isAnimating };
}
