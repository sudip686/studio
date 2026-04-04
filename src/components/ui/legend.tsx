import React from 'react';
import { uiTheme } from '@/ui/overlays/uiTheme';

interface LegendProps {
  title: string;
  items?: { label: string; color: string }[]; // Make items optional for gradient type
  type?: 'categorical' | 'gradient';
  gradient?: string;
  minLabel?: string;
  maxLabel?: string;
  show?: boolean;
  guidance?: string;
}

export const Legend: React.FC<LegendProps> = ({
  title,
  items,
  type = 'categorical',
  gradient,
  minLabel,
  maxLabel,
  show = true,
  guidance,
}) => {
  if (!show) return null;

  return (
    <div
      data-testid={`legend-${title.toLowerCase().replace(/\s+/g, '-')}`}
      data-no-deck-wheel
      className={`pointer-events-auto relative overflow-hidden text-white ${uiTheme.panel.background} ${uiTheme.panel.border} ${uiTheme.panel.blur} ${uiTheme.panel.radius} ${uiTheme.panel.shadow} ${uiTheme.panel.padding} ${
        type === 'gradient' ? uiTheme.legend.width.gradient : uiTheme.legend.width.categorical
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_34%)]" />
      <div className="relative">
        <div className="mb-2.5 flex items-start justify-between gap-3 border-b border-white/8 pb-2.5">
          <div>
            <p className={uiTheme.text.label}>Legend</p>
            <h4 className={`${uiTheme.text.title} mt-0.5 text-[1rem]`}>{title}</h4>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="mt-1 h-6 w-px bg-gradient-to-b from-white/30 via-white/10 to-transparent" />
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-white/48">
              Visible now
            </span>
          </div>
        </div>
        {guidance && (
          <p className="mb-2.5 max-w-[28ch] text-[10px] leading-4.5 text-white/62">
            {guidance}
          </p>
        )}
        {type === 'categorical' && items && (
          <div className="space-y-1.5">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 rounded-[18px] border border-white/8 bg-white/[0.045] px-3 py-2 text-[13px] text-white/88"
              >
                <span
                  className="h-3 w-3 rounded-full border border-white/20 shadow-[0_0_14px_rgba(255,255,255,0.1)]"
                  style={{ backgroundColor: item.color }}
                />
                <span className="leading-tight">{item.label}</span>
              </div>
            ))}
          </div>
        )}
        {type === 'gradient' && gradient && (
          <div className="mt-1.5 rounded-[18px] border border-white/8 bg-white/[0.045] px-3 py-2.5">
            <div
              className="h-4 w-full rounded-full border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
              style={{ background: gradient }}
            />
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-white/82">
              <span>{minLabel}</span>
              <span className="text-white/34">Range</span>
              <span>{maxLabel}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
