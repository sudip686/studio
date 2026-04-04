export const uiTheme = {
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
  },
  panel: {
    radius: "rounded-[24px]",
    blur: "backdrop-blur-sm",
    background:
      "bg-[linear-gradient(180deg,rgba(26,18,13,0.98),rgba(13,10,8,0.94))]",
    border: "border border-[#f1d2bf]/24",
    shadow: "shadow-[0_18px_42px_rgba(0,0,0,0.34)]",
    padding: "px-4 py-4",
  },
  text: {
    label: "text-[10px] uppercase tracking-[0.28em] text-[#f1d2bf]/82",
    body: "text-xs md:text-sm leading-relaxed text-white/86",
    title: "text-lg md:text-xl font-semibold tracking-[-0.02em] text-white",
  },
  legend: {
    width: {
      categorical: "w-fit max-w-[min(22rem,78vw)]",
      gradient: "w-fit min-w-[12.5rem] max-w-[min(22rem,78vw)]",
    },
  },
  zIndex: {
    overlays: 1000,
    tooltips: 1100,
    drawers: 1200,
    toasts: 1300,
  },
} as const;
