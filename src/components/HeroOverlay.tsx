"use client";

import * as React from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  value: string;
  label: string;
}

function StatCard({ value, label }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="relative overflow-hidden rounded-[22px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] p-4 backdrop-blur-lg"
    >
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/10 to-transparent opacity-0 animate-shimmer" />

      <p className="relative text-3xl md:text-4xl font-bold font-headline tracking-[-0.04em] text-white">
        {value}
      </p>
      <p className="relative mt-1 uppercase tracking-[0.25em] text-[10px] text-gray-400">
        {label}
      </p>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />
    </motion.div>
  );
}

export function HeroOverlay({ onStart }: { onStart?: () => void }) {
  const [isVisible, setIsVisible] = React.useState(true);
  const [isMounted, setIsMounted] = React.useState(true);

  React.useEffect(() => {
    const autoDismiss = window.setTimeout(() => {
      setIsVisible(false);
    }, 6000);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsVisible(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(autoDismiss);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const dismiss = React.useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleStart = React.useCallback(() => {
    onStart?.();
    setIsVisible(false);
  }, [onStart]);

  if (!isMounted) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 6, ease: "easeInOut" }}
      onClick={dismiss}
      onAnimationComplete={() => {
        if (!isVisible) {
          setIsMounted(false);
        }
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden ${
        isVisible ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Dark gradient background - Vrify style */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(3,6,12,0.96),rgba(8,12,18,0.86),rgba(18,22,28,0.92))]" />

      {/* Radial glow effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[600px] w-[600px] rounded-full bg-gradient-radial from-accent/14 via-accent/6 to-transparent blur-3xl md:h-[800px] md:w-[800px]" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.1),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_30%)]" />

      {/* Content container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 16 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        onClick={(event) => event.stopPropagation()}
        className="relative z-10 text-center pointer-events-auto max-w-4xl mx-4 px-4"
      >
        {/* Company name - small, elegant */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-4 text-[11px] uppercase tracking-[0.4em] text-amber-200/76 md:text-xs"
        >
          Sakariya Mines & Minerals
        </motion.p>

        {/* Main title - large, bold with gradient */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="mb-4 font-headline text-5xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl"
        >
          <span className="bg-gradient-to-b from-white via-white to-gray-300 bg-clip-text text-transparent">
            Tanga
          </span>
          <br />
          <span className="text-gradient-gold">Graphite</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-gray-300 md:text-xl lg:text-2xl"
        >
          A world-class graphite discovery in Tanzania's Mozambique Belt
        </motion.p>

        {/* Key stats in premium cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="grid grid-cols-3 gap-4 md:gap-6 mb-12 max-w-3xl mx-auto"
        >
          <StatCard value="100" label="Diamond Drill Holes" />
          <StatCard value="8.41%" label="Top 10% Grade (TGC)" />
          <StatCard value="10.56 km²" label="Strategic Land Position" />
        </motion.div>

        {/* CTA Button with glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.6 }}
          className="flex justify-center mb-8"
        >
          <button
            onClick={handleStart}
            className="group relative overflow-hidden rounded-full bg-gradient-to-r from-accent via-accent to-amber-600 px-10 py-4 text-sm font-semibold text-black shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_rgba(245,158,11,0.6)] transition-all duration-300 hover:brightness-110"
          >
            <span className="relative z-10 flex items-center gap-2">
              Begin the Journey
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            {/* Button shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer" />
          </button>
        </motion.div>

        {/* Dismiss hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 2.2 }}
          className="text-xs text-gray-500"
        >
          Press Esc or click anywhere to skip intro
        </motion.p>
      </motion.div>

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
    </motion.div>
  );
}
