'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShowcaseDepositHero } from './ShowcaseDepositHero';

const investmentMetrics = [
  { label: 'Resource base', value: '183 Mt @ 4.86% TGC' },
  { label: 'Confidence', value: '148 Mt indicated' },
  { label: 'Logistics', value: '80 km to Tanga port' },
];

const investmentReasons = [
  'JORC-aligned scale already exists in the current draft estimate.',
  'Metallurgy, location, and product profile line up to support a credible path from resource tonnes to saleable concentrate and battery-material demand growth.',
];

export function InvestmentShowcase() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      data-no-deck-wheel
      data-testid="investment-showcase"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.16),transparent_22%),radial-gradient(circle_at_82%_14%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(180deg,rgba(8,8,11,0.24),rgba(6,7,9,0.74)_54%,rgba(4,5,7,0.96)_100%)]" />

      <div className="absolute inset-y-0 right-0 flex w-[36%] min-w-[22rem] flex-col gap-4 border-l border-white/10 bg-[linear-gradient(180deg,rgba(11,13,18,0.42),rgba(6,7,9,0.9))] p-5">
        <div className="grid min-h-0 flex-[1.05] grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[30px] border border-white/14 bg-[linear-gradient(180deg,rgba(10,12,15,0.96),rgba(6,7,9,0.92))] shadow-[0_28px_70px_rgba(0,0,0,0.34)]">
          <div className="relative min-h-0 overflow-hidden">
            <Image
              src="/presentation-assets/resource-map-overview.png"
              alt="Resource plan imagery extracted from the Tanga graphite resource documentation"
              fill
              className="object-contain bg-[#0a0c10] p-4"
              priority
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,8,0.04),rgba(4,6,8,0.16)_35%,rgba(4,6,8,0.3)_100%)]" />
            <div className="absolute left-5 top-5 rounded-full border border-white/12 bg-black/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/74">
              Resource context
            </div>
          </div>
          <div className="border-t border-white/10 bg-black/58 px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/54">Plan view</p>
            <p className="mt-2 text-sm leading-6 text-white/84">
              Plan-view context keeps the closing argument grounded in the actual resource footprint and development setting.
            </p>
          </div>
        </div>

        <div className="grid min-h-0 flex-[0.78] grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,12,15,0.96),rgba(6,7,9,0.92))] shadow-[0_20px_56px_rgba(0,0,0,0.3)]">
          <div className="relative min-h-0 overflow-hidden">
            <Image
              src="/presentation-assets/resource-summary-figure.png"
              alt="Resource summary figure extracted from the Tanga graphite mineral resource draft"
              fill
              className="object-contain bg-[#0a0c10] p-4"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,8,0.04),rgba(4,6,8,0.14)_44%,rgba(4,6,8,0.26)_100%)]" />
          </div>
          <div className="border-t border-white/10 bg-black/62 px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/54">MRE-derived figure</p>
            <p className="mt-2 text-sm leading-6 text-white/86">
              The closing evidence comes directly from the current project documentation and resource summary material.
            </p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: 'easeOut' }}
        className="relative grid h-full grid-rows-[auto_minmax(0,1fr)_auto] gap-4 px-6 py-6 pr-[39%] pb-[8rem] xl:pl-8 xl:pr-[39%] xl:pt-7 xl:pb-[8rem]"
      >
        <div className="max-w-[35rem]">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/72">
            Investment case
          </div>
          <h3 className="mt-5 max-w-[12ch] text-[2.7rem] font-semibold leading-[0.95] tracking-[-0.06em] text-white">
            Scale, logistics access, and product quality now land in one deposit story.
          </h3>
          <p className="mt-4 max-w-[31rem] text-[14px] leading-6 text-white/76">
            The close stays direct: a meaningful resource base, evidence of conversion quality, and a logistics position that supports development rather than delaying it.
          </p>
        </div>

        <div className="min-h-0 py-1">
          <ShowcaseDepositHero
            eyebrow="Deposit view"
            title="Tanga deposit development context"
            note="The deposit model now carries the closing frame while the resource summary and plan-view evidence support the investment thesis."
            variant="geology"
            accent="sky"
            metrics={investmentMetrics}
            className="h-full min-h-[23rem]"
          />
        </div>

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.12fr)_minmax(15rem,0.88fr)]">
          <div className="rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,12,15,0.84),rgba(6,7,9,0.94))] px-4 py-3">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2.5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/52">Why this closes cleanly</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/36">Investor lens</p>
            </div>
            <div className="mt-3 space-y-2">
              {investmentReasons.map((reason) => (
                <div key={reason} className="flex gap-3">
                  <span className="mt-[0.45rem] h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_0_6px_rgba(245,158,11,0.08)]" />
                  <p className="text-[12.5px] leading-[1.4] text-white/82">{reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(245,158,11,0.14),rgba(255,255,255,0.04))] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/54">Next milestone</p>
            <p className="mt-2.5 text-[1.05rem] font-semibold tracking-[-0.03em] text-white">Advance toward study work and market engagement.</p>
            <p className="mt-2 text-[12.5px] leading-[1.4] text-white/82">
              Convert more tonnes into higher-confidence categories, keep scaling testwork, and move the project toward study-level economics.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
