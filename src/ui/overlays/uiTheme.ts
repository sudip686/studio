export const uiTheme = {
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
  },
  panel: {
    radius: "rounded-[18px]",
    blur: "backdrop-blur-md",
    background: "bg-black/60",
    border: "border border-white/10",
    shadow: "shadow-[0_18px_45px_rgba(0,0,0,0.65)]",
    padding: "px-4 py-3",
  },
  text: {
    label: "text-xs uppercase tracking-[0.3em] text-accent/80",
    body: "text-xs md:text-sm text-gray-300",
    title: "text-lg md:text-xl font-semibold font-headline",
  },
  legend: {
    width: {
      categorical: "min-w-[200px]",
      gradient: "w-96",
    },
  },
  zIndex: {
    overlays: 1000,
    tooltips: 1100,
    drawers: 1200,
    toasts: 1300,
  },
} as const;