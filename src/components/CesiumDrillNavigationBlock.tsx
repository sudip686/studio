'use client';

const DRILL_STEPS = [
  { id: 'drillholes', label: 'Coverage' },
  { id: 'drillholes_lithology', label: 'Lithology' },
  { id: 'drillholes_assay', label: 'Assay' },
] as const;

export default function CesiumDrillNavigationBlock({
  currentSlideId,
  onJump,
}: {
  currentSlideId: string;
  onJump: (slideId: string) => void;
}) {
  return (
    <div
      aria-label="Drill chapter navigation"
      data-testid="drill-nav"
      className="pointer-events-auto rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(7,11,18,0.92),rgba(4,8,13,0.74))] px-4 py-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl"
    >
      <div className="mb-3 flex items-center justify-between gap-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Drill Navigation</p>
          <p className="mt-1 text-sm font-semibold text-white/88">Coverage and drill analytics</p>
        </div>
        <div className="hidden h-10 w-px bg-gradient-to-b from-white/30 via-white/10 to-transparent sm:block" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {DRILL_STEPS.map((step, index) => {
          const active = currentSlideId === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onJump(step.id)}
              className={`rounded-[18px] border px-3 py-3 text-left transition-colors ${
                active
                  ? 'border-emerald-300/30 bg-emerald-300/14 text-white'
                  : 'border-white/10 bg-white/6 text-white/72 hover:bg-white/10'
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">0{index + 1}</p>
              <p className="mt-2 text-sm font-semibold tracking-[0.02em]">{step.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
