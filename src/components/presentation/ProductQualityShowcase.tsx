'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShowcaseDepositHero } from './ShowcaseDepositHero';

const productMetrics = [
  { label: 'Purity threshold', value: '>97% TC' },
  { label: 'Large + jumbo flake', value: '>60%' },
  { label: 'Standout composite', value: '>73%' },
];

const productSignals = [
  'Oxide composites delivered premium-price flake distribution above 57% at +150 um.',
  'Fresh composites TDM003 to TDM005 all exceeded 61% large-flake content, showing the flake result complements the 183 Mt resource base rather than standing alone as a niche datapoint.',
];

export function ProductQualityShowcase() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      data-no-deck-wheel
      data-testid="product-quality-showcase"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(250,204,21,0.16),transparent_22%),radial-gradient(circle_at_82%_12%,rgba(45,212,191,0.16),transparent_24%),linear-gradient(180deg,rgba(8,9,11,0.28),rgba(6,7,9,0.72)_50%,rgba(4,5,7,0.96)_100%)]" />

      <div className="absolute inset-y-0 right-0 flex w-[37%] min-w-[23rem] flex-col gap-4 border-l border-white/10 bg-[linear-gradient(180deg,rgba(12,15,18,0.42),rgba(7,8,10,0.9))] p-5">
        <div className="grid min-h-0 flex-[1.08] grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[30px] border border-white/14 bg-[linear-gradient(180deg,rgba(10,12,15,0.96),rgba(6,7,9,0.94))] shadow-[0_28px_68px_rgba(0,0,0,0.34)]">
          <div className="relative min-h-0 overflow-hidden">
            <Image
              src="/presentation-assets/product-flake-chart.png"
              alt="Flake size chart extracted from the Tanga graphite mineral resource documentation"
              fill
              className="object-contain bg-[#0a0c10] p-4"
              priority
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,8,0.04),rgba(4,6,8,0.16)_42%,rgba(4,6,8,0.28)_100%)]" />
            <div className="absolute left-5 top-5 rounded-full border border-white/12 bg-black/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/74">
              Flake distribution
            </div>
          </div>
          <div className="border-t border-white/10 bg-black/58 px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/54">Primary chart</p>
            <p className="mt-2 text-sm leading-6 text-white/84">
              Large-flake distribution remains the lead evidence because it is the clearest bridge from resource scale to product value.
            </p>
          </div>
        </div>

        <div className="grid min-h-0 flex-[0.92] grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,12,15,0.96),rgba(6,7,9,0.94))] shadow-[0_20px_56px_rgba(0,0,0,0.3)]">
          <div className="relative min-h-0 overflow-hidden">
            <Image
              src="/presentation-assets/product-distribution-chart.png"
              alt="Product distribution figure extracted from Sakariya graphite resource documentation"
              fill
              className="object-contain bg-[#0a0c10] p-4"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,8,0.04),rgba(4,6,8,0.14)_44%,rgba(4,6,8,0.26)_100%)]" />
          </div>
          <div className="border-t border-white/10 bg-black/62 px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/54">Document figure</p>
            <p className="mt-2 text-sm leading-6 text-white/86">
              Supporting documentation shows the flake-size argument is grounded in project data, not just summary messaging.
            </p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: 'easeOut' }}
        className="relative grid h-full grid-rows-[auto_minmax(0,1fr)_auto] gap-4 px-6 py-6 pr-[40%] pb-[8rem] xl:pl-8 xl:pr-[40%] xl:pt-7 xl:pb-[8rem]"
      >
        <div className="max-w-[35rem]">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/72">
            Product quality and value
          </div>
          <h3 className="mt-5 max-w-[12ch] text-[2.7rem] font-semibold leading-[0.95] tracking-[-0.06em] text-white">
            Large-flake graphite sits on top of scale and purity.
          </h3>
          <p className="mt-4 max-w-[31rem] text-[14px] leading-6 text-white/76">
            The deposit model and flake figures now read together: strong concentrate quality, strong large-flake distribution,
            and a product profile that complements the 183 Mt resource base.
          </p>
        </div>

        <div className="min-h-0 py-1">
          <ShowcaseDepositHero
            eyebrow="Deposit view"
            title="Tanga deposit product-quality context"
            note="The deposit model holds the stage while purity and flake-size evidence define how the ore could sell into premium graphite markets."
            variant="geology"
            accent="teal"
            metrics={productMetrics}
            className="h-full min-h-[23rem]"
          />
        </div>

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.16fr)_minmax(15rem,0.84fr)]">
          <div className="rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,12,15,0.84),rgba(6,7,9,0.94))] px-4 py-3">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2.5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/52">Premium product read-through</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/36">Report-backed</p>
            </div>
            <div className="mt-3 space-y-2">
              {productSignals.map((signal) => (
                <div key={signal} className="flex gap-3">
                  <span className="mt-[0.45rem] h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_0_6px_rgba(245,158,11,0.08)]" />
                  <p className="text-[12.5px] leading-[1.4] text-white/82">{signal}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(20,184,166,0.14),rgba(255,255,255,0.04))] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/54">Commercial framing</p>
            <p className="mt-2.5 text-[1.05rem] font-semibold tracking-[-0.03em] text-white">Scale, purity, and flake profile sit in the same premium bucket.</p>
            <p className="mt-2 text-[12.5px] leading-[1.4] text-white/82">
              The product case points directly to premium flake positioning while still leaning on resource scale rather than isolated sample wins.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
