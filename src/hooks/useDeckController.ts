"use client";

import { useCallback, useMemo, useState } from "react";
import type { DeckSlide } from "@/lib/deck";

export function useDeckController(slides: DeckSlide[]) {
  const [index, setIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(false);

  const current = slides[index];

  const next = useCallback(
    () => setIndex((i) => Math.min(i + 1, slides.length - 1)),
    [slides.length]
  );
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);
  const goTo = useCallback(
    (i: number) => setIndex(Math.max(0, Math.min(i, slides.length - 1))),
    [slides.length]
  );

  const toggleAutoplay = useCallback(() => setIsAutoplay((v) => !v), []);
  const stopAutoplay = useCallback(() => setIsAutoplay(false), []);
  const startAutoplay = useCallback(() => setIsAutoplay(true), []);

  const viewSequence = useMemo(() => slides.map((slide) => slide.id), [slides]);
  const viewTitles = useMemo(() => {
    return slides.reduce<Record<string, string>>((acc, slide) => {
      acc[slide.id] = slide.title;
      return acc;
    }, {});
  }, [slides]);

  return {
    index,
    current,
    isAutoplay,
    setIndex: goTo,
    next,
    prev,
    toggleAutoplay,
    stopAutoplay,
    startAutoplay,
    viewSequence,
    viewTitles,
  };
}