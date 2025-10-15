import React from 'react';

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
    <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg shadow-lg z-50">
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
            className="h-4 w-full rounded-md"
            style={{ background: gradient }}
          ></div>
          <div className="flex justify-between text-xs mt-1">
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};