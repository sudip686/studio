import { Panel } from './ui/panel';

export function HeroOverlay({ onStart }: { onStart?: () => void }) {
  return (
    <Panel className="max-w-md">
      <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-accent/80">
        Sakariya Mines &amp; Minerals
      </p>

      <h1 className="mt-2 text-2xl md:text-3xl font-semibold font-headline">
        Tanga Graphite
      </h1>

      <p className="mt-1 text-xs md:text-sm text-gray-400">
        Investor-ready 3D story of resource potential and drilling progress.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-3 text-[11px] text-gray-300">
        <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
          <p className="text-lg font-semibold text-white">56</p>
          <p className="uppercase tracking-[0.2em] text-[9px] text-gray-400">Holes</p>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
          <p className="text-lg font-semibold text-white">3.71%</p>
          <p className="uppercase tracking-[0.2em] text-[9px] text-gray-400">Avg Grade</p>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
          <p className="text-lg font-semibold text-white">120 km²</p>
          <p className="uppercase tracking-[0.2em] text-[9px] text-gray-400">Area</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={onStart}
          className="rounded-full bg-gradient-to-r from-accent to-accent2 px-4 py-1.5 text-xs font-medium text-black shadow-[0_0_30px_rgba(248,113,22,0.5)] hover:brightness-110 transition pointer-events-auto"
        >
          Start Tour →
        </button>
        <span className="text-[11px] text-gray-500">
          Drag to rotate, scroll to zoom.
        </span>
      </div>
    </Panel>
  );
}