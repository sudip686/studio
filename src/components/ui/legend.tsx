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
}

export const Legend: React.FC<LegendProps> = ({
  title,
  items,
  type = 'categorical',
  gradient,
  minLabel,
  maxLabel,
  show = true,
}) => {
  if (!show) return null;

  return (
    <div
      className={`pointer-events-auto text-white ${uiTheme.panel.background} ${uiTheme.panel.border} ${uiTheme.panel.blur} ${uiTheme.panel.radius} ${uiTheme.panel.shadow} ${uiTheme.panel.padding} ${
        type === 'gradient' ? uiTheme.legend.width.gradient : uiTheme.legend.width.categorical
      }`}
    >
      <h4 className="font-bold text-lg mb-2">{title}</h4>
      {type === 'categorical' && items && (
        <div className="space-y-1">
          {items.map((item, index) => (
            <div key={index} className="flex items-center">
              <span
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: item.color }}
              ></span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
      {type === 'gradient' && gradient && (
        <div className="flex flex-col items-stretch mt-2">
          <div
            className="h-6 w-full rounded-md border border-white/20"
            style={{ background: gradient }}
          ></div>
          <div className="flex justify-between text-sm mt-1 font-medium">
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};