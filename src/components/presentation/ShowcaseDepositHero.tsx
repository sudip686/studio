'use client';

import { ShowcaseModelScene, showcaseAccentMap, type AccentTone, type ShowcaseModelVariant } from './ShowcaseModelScene';

type ShowcaseHeroMetric = {
  label: string;
  value: string;
};

export function ShowcaseDepositHero({
  eyebrow,
  title,
  note,
  variant,
  accent = 'amber',
  metrics = [],
  className = '',
}: {
  eyebrow: string;
  title: string;
  note: string;
  variant: ShowcaseModelVariant;
  accent?: AccentTone;
  metrics?: ShowcaseHeroMetric[];
  className?: string;
}) {
  const accentStyle = showcaseAccentMap[accent];

  return (
    <div
      className={`pointer-events-none relative isolate overflow-hidden rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(7,10,14,0.96),rgba(5,7,10,0.82))] shadow-[0_30px_86px_rgba(0,0,0,0.32)] ${className}`}
      data-no-deck-wheel
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accentStyle.glow}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.12),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%,rgba(255,255,255,0.02)_100%)]" />

      <div className={`absolute left-5 top-5 z-[2] inline-flex rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] ${accentStyle.badge}`}>
        {eyebrow}
      </div>

      <div className="absolute inset-0">
        <ShowcaseModelScene variant={variant} ringColor={accentStyle.ring} cameraPosition={[0, 0.15, 5.55]} fov={25} />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-[2] border-t border-white/10 bg-[linear-gradient(180deg,rgba(4,5,8,0),rgba(4,5,8,0.78)_36%,rgba(4,5,8,0.94)_72%,rgba(4,5,8,0.98)_100%)] px-5 pb-5 pt-14">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-[30rem]">
            <p className="text-[1.12rem] font-semibold tracking-[-0.03em] text-white">{title}</p>
            <p className="mt-1.5 max-w-[26rem] text-[12.5px] leading-5 text-white/74">{note}</p>
          </div>
          <div className="mt-1 h-10 w-10 rounded-full border border-white/10 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
        </div>

        {metrics.length > 0 ? (
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={`${metric.label}-${metric.value}`}
                className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-3.5 py-3 backdrop-blur-sm"
              >
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/54">{metric.label}</p>
                <p className="mt-2 text-[1rem] font-semibold tracking-[-0.03em] text-white">{metric.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
