import { Panel } from './ui/panel';

export function HeroOverlay() {
  return (
    <div className="absolute top-6 left-6 z-20 max-w-md">
      <Panel>
        <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-accent/80">
          Sakariya Mines & Minerals
        </p>

        <h1 className="mt-2 text-2xl md:text-3xl font-semibold font-headline">
          Tanga Graphite – Interactive Site Tour
        </h1>

        <p className="mt-2 text-xs md:text-sm text-gray-400">
          Explore our exploration licenses, drill collars and conceptual pit shells
          in an immersive 3D environment designed for investors and technical teams.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="rounded-full bg-gradient-to-r from-accent to-accent2 px-4 py-1.5 text-xs font-medium text-black shadow-[0_0_30px_rgba(248,113,22,0.5)] hover:brightness-110 transition">
            Start guided tour →
          </button>
          <span className="text-[11px] text-gray-500">
            Use your mouse to rotate, scroll to zoom.
          </span>
        </div>
      </Panel>
    </div>
  );
}