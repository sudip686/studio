import { cn } from '@/lib/utils';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.7)] pointer-events-auto',
        className
      )}
    >
      {children}
    </div>
  );
}