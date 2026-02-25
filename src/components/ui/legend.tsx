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
      className={`pointer-events-auto text-white ${uiTheme.panel.background} ${uiTheme.panel.border} ${uiTheme.panel.blur} ${uiTheme.panel.radius} ${uiTheme.panel.shadow} ${uiTheme.panel.padding} ${
        type === 'gradient' ? uiTheme.legend.width.gradient : uiTheme.legend.width.categorical
      }`}
    >
      <h4 className="font-semibold text-base md:text-lg tracking-wide mb-2">{title}</h4>
      {guidance && (
        <p className="text-xs text-gray-200/90 leading-snug mb-2 max-w-[52ch]">
          {guidance}
        </p>
      )}
      {type === 'categorical' && items && (
        <div className="space-y-1">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm md:text-base">
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/20"
                style={{ backgroundColor: item.color }}
              ></span>
              <span className="leading-tight">{item.label}</span>
            </div>
          ))}
        </div>
      )}
      {type === 'gradient' && gradient && (
        <div className="flex flex-col items-stretch mt-2">
          <div
            className="h-5 w-full rounded-md border border-white/20"
            style={{ background: gradient }}
          ></div>
          <div className="flex justify-between text-xs md:text-sm mt-1 font-medium">
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};