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
    // Keep UI chrome subtle and as small as possible.
    // Use a lighter background so panels don't feel like large blocks.
    background: "bg-black/30",
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
      // Legends should never be wider than their content.
      // `w-fit` prevents full-width panels while still allowing reasonable wrapping.
      categorical: "w-fit max-w-[70vw]",
      gradient: "w-fit max-w-[70vw]",
    },
  },
  zIndex: {
    overlays: 1000,
    tooltips: 1100,
    drawers: 1200,
    toasts: 1300,
  },
} as const;