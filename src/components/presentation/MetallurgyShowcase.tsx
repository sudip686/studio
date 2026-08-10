'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShowcaseDepositHero } from './ShowcaseDepositHero';

const metallurgySampleRows = [
  {
    sample: 'TDM003',
    domain: 'Fresh',
    interval: '51.8-57.8 m',
    tgc: '5.0',
    totalCarbon: '5.93',
    carbonate: '0.12',
    note: 'Balanced fresh composite',
  },
  {
    sample: 'TDM004',
    domain: 'Fresh',
    interval: '46.3-52.9 m',
    tgc: '6.0',
    totalCarbon: '8.11',
    carbonate: '1.17',
    note: 'Carbonate-rich outlier',
  },
  {
    sample: 'TDM006',
    domain: 'Oxidised',
    interval: '2.2-12.2 m',
    tgc: '7.0',
    totalCarbon: '8.83',
    carbonate: '0.77',
    note: 'Oxide optimisation feed',
  },
  {
    sample: 'TDM007',
    domain: 'Oxidised',
    interval: '10.2-22.2 m',
    tgc: '7.6',
    totalCarbon: '8.13',
    carbonate: '0.11',
    note: 'Cleaner oxide composite',
  },
  {
    sample: 'TDM008',
    domain: 'Kaolinised',
    interval: '68.3-81.8 m',
    tgc: '9.7',
    totalCarbon: '8.13',
    carbonate: '0.41',
    note: 'High-grade altered feed',
  },
];

const metallurgyMetrics = [
  { label: 'Fresh optimisation', value: '98.6% TC' },
  { label: 'Oxide optimisation', value: '98.4% TC' },
  { label: 'Recovery band', value: '89.1-95.2%' },
];

const metallurgyNotes = [
  'All composites finished above 97% total carbon.',
  'The weaker response is tied to carbonate-rich TDM004, while the broader programme still supports bulk concentrate and battery-market follow-on work.',
];

export function MetallurgyShowcase() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      data-no-deck-wheel
      data-testid="metallurgy-showcase"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(245,158,11,0.18),transparent_24%),radial-gradient(circle_at_86%_12%,rgba(56,189,248,0.16),transparent_26%),linear-gradient(180deg,rgba(8,9,12,0.34),rgba(8,9,12,0.68)_48%,rgba(4,5,7,0.94)_100%)]" />

      <div className="absolute inset-y-0 right-0 flex w-[36%] min-w-[22rem] flex-col gap-4 border-l border-white/10 bg-[linear-gradient(180deg,rgba(13,15,20,0.5),rgba(7,8,10,0.88))] p-5">
        <div className="grid min-h-0 flex-[1.15] grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[30px] border border-white/14 bg-[linear-gradient(180deg,rgba(14,16,20,0.94),rgba(7,8,10,0.96))] shadow-[0_30px_80px_rgba(0,0,0,0.38)]">
          <div className="min-h-0 overflow-hidden px-4 pb-3 pt-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/52">Project 0424046 draft</p>
                <h4 className="mt-2 text-[1.05rem] font-semibold tracking-[-0.03em] text-white">
                  Metallurgy sample matrix
                </h4>
                <p className="mt-2 max-w-[24rem] text-[12px] leading-5 text-white/74">
                  Composite chemistry and interval context rebuilt from the draft report so the metallurgy evidence reads cleanly.
                </p>
              </div>
              <div className="rounded-full border border-amber-300/22 bg-amber-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-100/82">
                Rebuilt table
              </div>
            </div>

            <div className="mt-3 min-h-0 overflow-auto rounded-[24px] border border-white/10 bg-black/24">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-[rgba(13,16,20,0.98)] backdrop-blur-md">
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/54">
                    <th className="px-3 py-2.5 font-medium">Sample</th>
                    <th className="px-3 py-2.5 font-medium">Domain</th>
                    <th className="px-3 py-2.5 font-medium">Interval</th>
                    <th className="px-3 py-2.5 font-medium text-right">TGC %</th>
                    <th className="px-3 py-2.5 font-medium text-right">TC %</th>
                    <th className="px-3 py-2.5 font-medium text-right">CO3 %</th>
                  </tr>
                </thead>
                <tbody>
                  {metallurgySampleRows.map((row) => (
                    <tr
                      key={row.sample}
                      className={`border-t border-white/8 align-top ${
                        row.sample === 'TDM004' ? 'bg-amber-400/8' : 'bg-transparent'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <p className="text-[12px] font-semibold tracking-[-0.02em] text-white">{row.sample}</p>
                        <p className="mt-1 text-[10px] leading-4 text-white/58">{row.note}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-white/86">{row.domain}</td>
                      <td className="px-3 py-2.5 text-[12px] text-white/78">{row.interval}</td>
                      <td className="px-3 py-2.5 text-right text-[12px] font-semibold text-white/94">{row.tgc}</td>
                      <td className="px-3 py-2.5 text-right text-[12px] font-semibold text-white/94">{row.totalCarbon}</td>
                      <td className="px-3 py-2.5 text-right text-[12px] font-semibold text-white/94">{row.carbonate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 grid gap-2 xl:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/52">Feed selection</p>
                <p className="mt-1.5 text-[12px] leading-5 text-white/82">
                  Oxidised, fresh, and kaolinised material are all represented so the metallurgy story is not built on a single ore type.
                </p>
              </div>
              <div className="rounded-[20px] border border-amber-300/12 bg-amber-300/8 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/52">Key exception</p>
                <p className="mt-1.5 text-[12px] leading-5 text-white/82">
                  TDM004 stands out because the carbonate-rich chemistry is materially higher than the other composites.
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 bg-black/58 px-4 py-3.5 backdrop-blur-md">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/56">Source anchor</p>
            <p className="mt-2 text-sm leading-6 text-white/86">
              Values align with the sample chemistry tables and the flotation performance summary in the Tanga Graphite MRE draft.
            </p>
          </div>
        </div>

        <div className="grid min-h-0 flex-[0.78] grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(12,14,18,0.96),rgba(7,8,10,0.94))] shadow-[0_22px_64px_rgba(0,0,0,0.34)]">
          <div className="relative min-h-0 overflow-hidden">
            <Image
              src="/presentation-assets/metallurgy-samples.jpg"
              alt="Metallurgy sample imagery extracted from the Tanga graphite mineral resource report"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,8,0.05),rgba(4,6,8,0.12)_45%,rgba(4,6,8,0.24)_100%)]" />
          </div>
          <div className="border-t border-white/10 bg-black/62 px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/56">Representative composite samples</p>
            <p className="mt-2 text-sm leading-6 text-white/88">
              Fresh, oxidised, and altered composites show how conversion quality holds across multiple domains of the deposit.
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
          <div className="inline-flex items-center gap-3 rounded-full border border-amber-300/16 bg-amber-400/8 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-50/74">
            Conversion confidence
          </div>
          <h3 className="mt-5 max-w-[12ch] text-[2.7rem] font-semibold leading-[0.95] tracking-[-0.06em] text-white">
            Premium concentrate performance is supported across the deposit.
          </h3>
          <p className="mt-4 max-w-[31rem] text-[14px] leading-6 text-white/76">
            The deposit view now works with the metallurgy evidence: strong fresh and oxide recoveries, saleable concentrate quality,
            and one clearly isolated carbonate-rich exception rather than a broader process problem.
          </p>
        </div>

        <div className="min-h-0 py-1">
          <ShowcaseDepositHero
            eyebrow="Deposit view"
            title="Tanga deposit metallurgy context"
            note="Composite testwork is tied back to the deposit geometry so recovery and concentrate quality read in geological context."
            variant="geology"
            accent="amber"
            metrics={metallurgyMetrics}
            className="h-full min-h-[23rem]"
          />
        </div>

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.14fr)_minmax(15rem,0.86fr)]">
          <div className="rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,12,15,0.84),rgba(6,7,9,0.94))] px-4 py-3">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2.5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/52">Metallurgical read-through</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/36">Report-backed</p>
            </div>
            <div className="mt-3 space-y-2">
              {metallurgyNotes.map((note) => (
                <div key={note} className="flex gap-3">
                  <span className="mt-[0.45rem] h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_0_6px_rgba(245,158,11,0.08)]" />
                  <p className="text-[12.5px] leading-[1.4] text-white/82">{note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(245,158,11,0.14),rgba(255,255,255,0.04))] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/54">Critical interpretation</p>
            <p className="mt-2.5 text-[1.05rem] font-semibold tracking-[-0.03em] text-white">TDM004 is the isolated exception.</p>
            <p className="mt-2 text-[12.5px] leading-[1.4] text-white/82">
              Elevated carbonate content explains the weaker recovery without changing the broader flotation route indicated by the rest of the programme.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
