'use client';

const THREE_STEPS = [
  { id: 'lithology', label: 'Lithology' },
  { id: 'assay', label: 'Assay' },
  { id: 'carbon_model', label: 'Carbon' },
  { id: 'classification', label: 'Class' },
] as const;

export default function ThreeJsNavigationBlock({
  currentSlideId,
  onJump,
}: {
  currentSlideId: string;
  onJump: (slideId: string) => void;
}) {
  return (
    <div
      aria-label="3D chapter navigation"
      data-testid="three-nav"
      className="pointer-events-auto relative overflow-hidden rounded-[30px] border border-white/14 bg-[linear-gradient(180deg,rgba(9,15,25,0.95),rgba(5,9,16,0.8))] px-4 py-4 text-white shadow-[0_30px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_30%)]" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/42">3D Navigation</p>
            <p className="mt-1 text-sm font-semibold tracking-[0.03em] text-white/92">Resource model chapters</p>
          </div>
          <div className="hidden h-10 w-px bg-gradient-to-b from-white/30 via-white/10 to-transparent sm:block" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {THREE_STEPS.map((step, index) => {
            const active = currentSlideId === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onJump(step.id)}
                className={`rounded-[20px] border px-3 py-3 text-left transition-all duration-200 ${
                  active
                    ? 'border-sky-300/35 bg-[linear-gradient(180deg,rgba(56,189,248,0.24),rgba(14,116,144,0.12))] text-white shadow-[0_16px_36px_rgba(14,165,233,0.18)]'
                    : 'border-white/10 bg-white/[0.06] text-white/78 hover:border-white/18 hover:bg-white/[0.1]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.26em] text-white/40">
                    0{index + 1}
                  </p>
                  <span
                    className={`h-2.5 w-2.5 rounded-full border ${
                      active ? 'border-sky-200/60 bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.9)]' : 'border-white/20 bg-white/20'
                    }`}
                  />
                </div>
                <p className="mt-2 text-sm font-semibold tracking-[0.02em]">{step.label}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
