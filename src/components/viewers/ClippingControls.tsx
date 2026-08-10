'use client';

import { Box, Layers, Scissors, SlidersHorizontal } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { OverlaySlot } from '@/ui/overlays';
import { useSubsurface } from '@/contexts/subsurface-context';

const panelClass =
  'pointer-events-auto overflow-hidden rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(9,13,20,0.94),rgba(8,10,14,0.82))] text-white shadow-[0_22px_56px_rgba(0,0,0,0.42)] backdrop-blur-xl';

const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f1d2bf]/62';

export default function ClippingControls() {
  const {
    transparency,
    setTransparency,
    showBoreholes,
    setShowBoreholes,
    showBlockModel,
    setShowBlockModel,
    clippingMode,
    setClippingMode,
    clippingRadius,
    setClippingRadius,
  } = useSubsurface();

  return (
    <OverlaySlot slot="top-left">
      <div className="flex max-w-[calc(100vw-2rem)] flex-col gap-3" data-no-deck-wheel>
        <div className={`${panelClass} w-[19rem] p-3.5`}>
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <div className={labelClass}>Layers</div>
              <h3 className="mt-1 text-sm font-semibold tracking-[-0.01em] text-white">Resource scene</h3>
              <p className="mt-1 text-[11px] leading-4 text-white/56">
                Surface context, boreholes, blocks, and section clipping.
              </p>
            </div>
            <Layers className="mt-1 h-4 w-4 text-[#f1d2bf]/70" />
          </div>

          <div className="mt-3 space-y-2">
            <label className="flex items-center justify-between gap-3 rounded-[14px] border border-white/8 bg-white/[0.045] px-3 py-2 text-[12px] text-white/82">
              <span>Resource blocks</span>
              <Switch checked={showBlockModel} onCheckedChange={setShowBlockModel} aria-label="Show Block Model" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-[14px] border border-white/8 bg-white/[0.045] px-3 py-2 text-[12px] text-white/82">
              <span>Borehole traces</span>
              <Switch checked={showBoreholes} onCheckedChange={setShowBoreholes} aria-label="Show Boreholes" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-[14px] border border-white/8 bg-white/[0.045] px-3 py-2 text-[12px] text-white/82">
              <span>Clipping plane</span>
              <Switch
                checked={clippingMode !== 'none'}
                onCheckedChange={(checked) => setClippingMode(checked ? 'elevation' : 'none')}
                aria-label="Enable clipping"
              />
            </label>
          </div>
        </div>

        <div className={`${panelClass} w-[19rem] p-3.5`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={labelClass}>Model tuning</div>
              <h3 className="mt-1 text-sm font-semibold tracking-[-0.01em] text-white">Display controls</h3>
            </div>
            <SlidersHorizontal className="h-4 w-4 text-[#f1d2bf]/70" />
          </div>

          <div className="mt-3 space-y-4">
            <label className="block">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/70">
                <span>Block opacity</span>
                <span>{Math.round(transparency * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.15"
                max="1"
                step="0.05"
                value={transparency}
                onChange={(e) => setTransparency(parseFloat(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-[#e6743b]"
                aria-label="Transparency"
              />
            </label>

            <label className="block">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/70">
                <span>Clipping mode</span>
                <Scissors className="h-3.5 w-3.5 text-white/45" />
              </div>
              <select
                value={clippingMode}
                onChange={(e) => setClippingMode(e.target.value as any)}
                className="h-9 w-full rounded-[12px] border border-white/10 bg-white/[0.06] px-3 text-xs text-white outline-none transition focus:border-[#f1d2bf]/35"
                aria-label="Clipping Mode"
              >
                <option value="none">None</option>
                <option value="box">Box cutter</option>
                <option value="polygon">AOI polygon</option>
                <option value="elevation">Elevation slice</option>
              </select>
            </label>

            <label className="block">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/70">
                <span>Clip height</span>
                <span>{Math.round(clippingRadius)} m</span>
              </div>
              <input
                type="range"
                min="-500"
                max="500"
                step="10"
                value={clippingRadius}
                disabled={clippingMode === 'none'}
                onChange={(e) => setClippingRadius(parseFloat(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-[#e6743b] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Clipping Height"
              />
            </label>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[14px] border border-white/8 bg-white/[0.045] px-3 py-2 text-[11px] leading-4 text-white/58">
            <Box className="h-3.5 w-3.5 shrink-0 text-[#f1d2bf]/70" />
            Classification colors remain tied to the current block model layer.
          </div>
        </div>
      </div>
    </OverlaySlot>
  );
}