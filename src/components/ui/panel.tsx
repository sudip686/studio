import { uiTheme } from '@/ui/overlays/uiTheme';
import { cn } from '@/lib/utils';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return (
    <div
      className={cn(
        uiTheme.panel.base,
        uiTheme.panel.background,
        uiTheme.panel.border,
        uiTheme.panel.blur,
        uiTheme.panel.radius,
        uiTheme.panel.padding,
        uiTheme.panel.shadow,
        'pointer-events-auto text-white',
        className
      )}
    >
      {children}
    </div>
  );
}
