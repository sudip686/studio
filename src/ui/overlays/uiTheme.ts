export const uiTheme = {
  // Consistent spacing scale (used everywhere)
  spacing: {
    xs: "0.25rem",   // 4px
    sm: "0.5rem",    // 8px
    md: "1rem",      // 16px
    lg: "1.5rem",    // 24px
    xl: "2rem",      // 32px
    xxl: "3rem",     // 48px
  },

  // Border radius scale - consistent across all components
  radius: {
    sm: "0.375rem",  // 6px - small elements
    md: "0.5rem",    // 8px - medium elements
    lg: "0.75rem",   // 12px - large elements
    xl: "1rem",      // 16px - cards, panels
    xxl: "1.5rem",   // 24px - major panels
    full: "9999px", // pill shapes
  },

  // Consistent typography
  font: {
    // Font families
    family: {
      body: '"Inter", ui-sans-serif, system-ui, sans-serif',
      headline: '"Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif',
    },
    // Font sizes - consistent scale
    size: {
      xs: "0.6875rem",  // 11px - labels, captions
      sm: "0.75rem",    // 12px - small text
      base: "0.875rem", // 14px - body text
      lg: "1rem",       // 16px - large body
      xl: "1.125rem",   // 18px - headings
      "2xl": "1.25rem", // 20px - subheadings
      "3xl": "1.5rem",  // 24px - headings
      "4xl": "1.875rem", // 30px - large headings
      "5xl": "2.25rem", // 36px - hero text
      "6xl": "3rem",    // 48px - display
    },
    // Font weights
    weight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    // Letter spacing
    tracking: {
      tighter: "-0.04em",
      tight: "-0.02em",
      normal: "0",
      wide: "0.06em",
      wider: "0.18em",
      widest: "0.28em",
    },
  },

  // Colors - warm, premium palette
  colors: {
    // Primary accent - copper/amber
    accent: {
      DEFAULT: "#cc5a28", // Rich copper
      light: "#f1d2bf",  // Light cream
      dark: "#8b3a1a",   // Dark copper
      muted: "rgba(204, 90, 40, 0.12)",
      subtle: "rgba(204, 90, 40, 0.08)",
    },
    // Text colors
    text: {
      primary: "rgba(248, 250, 252, 0.98)",
      secondary: "rgba(226, 232, 240, 0.82)",
      muted: "rgba(203, 213, 225, 0.66)",
      disabled: "rgba(148, 163, 184, 0.46)",
    },
    // Border colors
    border: {
      DEFAULT: "rgba(191, 219, 254, 0.18)",
      light: "rgba(226, 232, 240, 0.24)",
      subtle: "rgba(191, 219, 254, 0.10)",
    },
    // Background colors
    background: {
      primary: "rgba(18, 39, 59, 0.84)",
      secondary: "rgba(25, 50, 74, 0.76)",
      tertiary: "rgba(40, 68, 96, 0.68)",
      overlay: "rgba(7, 24, 40, 0.22)",
    },
  },

  // Panel styling - consistent for all panels
  panel: {
    base: "relative overflow-hidden isolate",
    radius: "rounded-[1.25rem]",
    blur: "backdrop-blur-xl",
    background: "bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.20),transparent_34%),linear-gradient(180deg,rgba(20,42,63,0.92),rgba(30,58,84,0.78))]",
    border: "border border-[rgba(191,219,254,0.24)]",
    shadow: "shadow-[0_22px_54px_rgba(15,23,42,0.20)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.30),transparent)]",
    padding: "px-4 py-3.5",
  },

  // Button styling - consistent across all buttons
  button: {
    radius: "rounded-full",
    padding: {
      sm: "px-3 py-1.5",
      md: "px-4 py-2",
      lg: "px-6 py-3",
    },
    font: {
      size: "text-sm",
      weight: "font-semibold",
    },
    // Primary button
    primary: {
      background: "bg-gradient-to-r from-accent via-accent to-amber-600",
      color: "text-black",
      shadow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]",
      hover: "hover:shadow-[0_0_45px_rgba(245,158,11,0.5)]",
    },
    // Secondary button
    secondary: {
      background: "bg-white/14",
      color: "text-white",
      border: "border border-white/24",
      hover: "hover:bg-white/20",
    },
    // Ghost button
    ghost: {
      color: "text-white/80",
      hover: "hover:text-white hover:bg-white/10",
    },
  },

  // Input styling
  input: {
    radius: "rounded-lg",
    background: "bg-white/12",
    border: "border border-white/16",
    focus: "focus:border-accent/50 focus:ring-accent/20",
    padding: "px-3 py-2",
    font: "text-sm",
  },

  // Slider styling
  slider: {
    track: {
      background: "bg-white/14",
      height: "h-2",
    },
    range: {
      background: "bg-accent",
    },
    thumb: {
      size: "h-4 w-4",
      background: "bg-white",
      border: "border-2 border-white",
      shadow: "shadow-lg",
    },
  },

  // Tabs styling
  tabs: {
    list: {
      background: "bg-white/12",
      radius: "rounded-lg",
      padding: "p-1",
    },
    trigger: {
      radius: "rounded-md",
      padding: "px-3 py-1.5",
      font: "text-sm font-medium",
      inactive: "text-slate-200/72",
      active: "text-white bg-white/18",
      hover: "hover:text-white hover:bg-white/16",
    },
    content: {
      padding: "pt-2",
    },
  },

  // Text styles - reusable text patterns
  text: {
    label: "text-[10px] uppercase tracking-[0.28em] text-[#dbeafe]/78",
    body: "text-xs md:text-sm leading-relaxed text-slate-50/88",
    title: "text-lg md:text-xl font-semibold tracking-[-0.03em] text-white",
    // Eyebrow - small uppercase
    eyebrow: "text-xs font-semibold uppercase tracking-wider text-white/72",
    // Caption - small secondary
    caption: "text-xs text-white/64",
  },

  // Legend styling
  legend: {
    width: {
      categorical: "w-fit max-w-[min(22rem,78vw)]",
      gradient: "w-fit min-w-[12.5rem] max-w-[min(22rem,78vw)]",
    },
  },

  // Z-index layers - ensure proper stacking
  zIndex: {
    base: 0,
    overlays: 1000,
    tooltips: 1100,
    drawers: 1200,
    modals: 1300,
    toasts: 1400,
    hero: 5000,
  },

  // Transitions - consistent animation timing
  transition: {
    fast: "150ms ease",
    normal: "200ms ease",
    slow: "300ms ease",
  },
} as const;

// Helper type for using theme values
export type UITheme = typeof uiTheme;



