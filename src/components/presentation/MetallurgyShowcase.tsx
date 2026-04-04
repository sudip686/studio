"use client";

import { motion } from "framer-motion";

const flowSteps = [
  {
    label: "Composite selection",
    value: "Oxide and fresh domains",
    note: "Representative samples capture weathering and lithology variability before flotation optimisation.",
  },
  {
    label: "Flotation optimisation",
    value: "Cleaner circuit tuning",
    note: "Reagent suite and grind conditions lifted concentrate quality while maintaining strong recovery.",
  },
  {
    label: "Saleable product",
    value: ">97% TC concentrate",
    note: "Premium concentrate quality is consistently above typical commercial saleable thresholds.",
  },
];

const headlineMetrics = [
  { label: "Oxide optimisation", value: "98.4% TC", subvalue: "93.0% recovery" },
  { label: "Fresh optimisation", value: "98.6% TC", subvalue: "94.4% recovery" },
  { label: "Recovery envelope", value: "89.1-95.2%", subvalue: "Across composite programme" },
];

const performanceBands = [
  { name: "Oxide composites", value: "97.6-98.4% TC", width: "78%" },
  { name: "Fresh composites", value: "97.18-98.64% TC", width: "84%" },
  { name: "Outlier case", value: "75.8% recovery", width: "42%" },
];

export function MetallurgyShowcase() {
  return (
    <div
      className="metallurgy-showcase absolute inset-0 overflow-hidden"
      data-no-deck-wheel
      data-testid="metallurgy-showcase"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(56,189,248,0.24),transparent_28%),radial-gradient(circle_at_80%_12%,rgba(251,191,36,0.26),transparent_22%),linear-gradient(180deg,rgba(8,20,34,0.22),rgba(5,12,21,0.16)_40%,rgba(4,10,18,0.78)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[38%] bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04),transparent)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative flex h-full flex-col justify-between px-6 py-6 md:px-8 md:py-7"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(21rem,0.92fr)]">
          <div className="rounded-[30px] border border-white/18 bg-[linear-gradient(180deg,rgba(11,19,30,0.96),rgba(8,13,22,0.92))] p-5 shadow-[0_18px_44px_rgba(2,8,23,0.3)] backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-100/58">
                  Process confidence
                </p>
                <h3 className="mt-3 text-[1.7rem] font-semibold tracking-[-0.04em] text-white">
                  Metallurgical path to premium graphite product
                </h3>
                <p className="mt-3 max-w-[40rem] text-sm leading-6 text-white/88">
                  The slide now explains metallurgical relevance directly: representative composite selection,
                  flotation optimisation, and premium concentrate quality with clear recovery context.
                </p>
              </div>
              <div className="rounded-full border border-amber-300/18 bg-amber-300/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-100">
                IMO Report 6798
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {headlineMetrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 + index * 0.08 }}
                  className="rounded-[24px] border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] px-4 py-4"
                >
                  <p className="text-[10px] uppercase tracking-[0.26em] text-white/68">{metric.label}</p>
                  <p className="mt-3 text-[1.5rem] font-semibold tracking-[-0.04em] text-white">{metric.value}</p>
                  <p className="mt-2 text-sm text-white/84">{metric.subvalue}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {flowSteps.map((step, index) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.38, delay: 0.18 + index * 0.08 }}
                  className="relative rounded-[26px] border border-white/16 bg-[linear-gradient(180deg,rgba(12,21,33,0.94),rgba(9,15,24,0.88))] px-4 py-4"
                >
                  <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
                    0{index + 1}
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-white/64">{step.label}</p>
                  <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-white">{step.value}</p>
                  <p className="mt-3 text-sm leading-6 text-white/84">{step.note}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] p-5 shadow-[0_18px_44px_rgba(2,8,23,0.26)] backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-100/56">
              Performance detail
            </p>
            <div className="mt-4 space-y-4">
              {performanceBands.map((band, index) => (
                <motion.div
                  key={band.name}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.38, delay: 0.22 + index * 0.08 }}
                  className="rounded-[24px] border border-white/16 bg-black/28 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold tracking-[-0.02em] text-white">{band.name}</p>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-white/72">Observed</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,rgba(56,189,248,0.92),rgba(251,191,36,0.94))] shadow-[0_0_18px_rgba(56,189,248,0.32)]"
                      style={{ width: band.width }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-white/88">{band.value}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.36 }}
              className="mt-5 rounded-[26px] border border-white/16 bg-[linear-gradient(180deg,rgba(251,191,36,0.22),rgba(255,255,255,0.08))] px-4 py-4"
            >
              <p className="text-[10px] uppercase tracking-[0.28em] text-amber-100/62">Key interpretation</p>
              <h4 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-white">
                TDM004 is the exception, not the rule
              </h4>
              <p className="mt-3 text-sm leading-6 text-white/88">
                The weakest recovery is explained by elevated carbonate content around 1.8%, which depressed
                flotation response. That isolates the issue to mineralogical variability rather than a broader
                process limitation across the deposit.
              </p>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.32 }}
          className="mt-4 grid gap-3 md:grid-cols-3"
        >
          <div className="rounded-[24px] border border-white/16 bg-[linear-gradient(180deg,rgba(5,15,26,0.92),rgba(5,12,20,0.84))] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/62">Cleaner 6 quality</p>
            <p className="mt-3 text-base font-semibold text-white">Premium concentrate threshold comfortably exceeded</p>
          </div>
          <div className="rounded-[24px] border border-white/16 bg-[linear-gradient(180deg,rgba(5,15,26,0.92),rgba(5,12,20,0.84))] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/62">Investor meaning</p>
            <p className="mt-3 text-base font-semibold text-white">Resource confidence now extends to product conversion confidence</p>
          </div>
          <div className="rounded-[24px] border border-white/16 bg-[linear-gradient(180deg,rgba(5,15,26,0.92),rgba(5,12,20,0.84))] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/62">Recommended next step</p>
            <p className="mt-3 text-base font-semibold text-white">Bulk concentrate generation and battery-spec follow-up work</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
