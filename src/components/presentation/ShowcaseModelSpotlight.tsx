'use client';

import type { CSSProperties } from 'react';
import { ShowcaseModelScene, showcaseAccentMap, type AccentTone, type ShowcaseModelVariant } from './ShowcaseModelScene';

export function ShowcaseModelSpotlight({
  eyebrow,
  title,
  note,
  variant,
  accent = 'amber',
  className = '',
  style,
}: {
  eyebrow: string;
  title: string;
  note: string;
  variant: ShowcaseModelVariant;
  accent?: AccentTone;
  className?: string;
  style?: CSSProperties;
}) {
  const accentStyle = showcaseAccentMap[accent];

  return (
    <div
      className={`pointer-events-none absolute z-[1] hidden h-[17rem] w-[18.5rem] overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(7,10,14,0.92),rgba(5,7,10,0.8))] shadow-[0_24px_70px_rgba(0,0,0,0.28)] xl:block ${className}`}
      style={style}
      data-no-deck-wheel
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accentStyle.glow}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_26%,rgba(255,255,255,0.02)_100%)]" />

      <div className={`absolute left-4 top-4 z-[2] inline-flex rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] ${accentStyle.badge}`}>
        {eyebrow}
      </div>

      <div className="absolute inset-0">
        <ShowcaseModelScene variant={variant} ringColor={accentStyle.ring} />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-[2] bg-[linear-gradient(180deg,rgba(4,5,8,0),rgba(4,5,8,0.92)_52%,rgba(4,5,8,0.98)_100%)] px-4 pb-4 pt-10">
        <p className="text-[0.98rem] font-semibold tracking-[-0.03em] text-white">{title}</p>
        <p className="mt-1.5 text-[12px] leading-5 text-white/74">{note}</p>
      </div>
    </div>
  );
}
