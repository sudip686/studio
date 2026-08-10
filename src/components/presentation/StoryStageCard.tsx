"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { DeckSlide } from "@/lib/deck";

type StoryStageCardProps = {
  slide: DeckSlide;
  slideNumber: number;
  slideCount: number;
  isAutoplay: boolean;
  onStartTour: () => void;
  showSidePanel?: boolean;
};

const actLabels: Record<string, string> = {
  setup: "Act I",
  journey: "Act II",
  resolution: "Act III",
};

const defaultEvidenceLabels = ["Location", "Dataset", "Signal"];

export function StoryStageCard({
  slide,
  slideNumber,
  slideCount,
  isAutoplay,
  onStartTour,
  showSidePanel = true,
}: StoryStageCardProps) {
  const stageMode = slide.stageMode ?? "narrative";
  const mediaLayout = slide.mediaLayout ?? "full-bleed";
  const resolvedMediaLayout =
    !showSidePanel && mediaLayout === "split-right" ? "full-bleed" : mediaLayout;
  const isHero = stageMode === "hero";
  const isTechnical = stageMode === "technical";
  const isClosing = stageMode === "closing";
  const evidenceItems =
    slide.evidenceItems ??
    slide.facts?.slice(0, 3).map((fact, index) => ({
      label: defaultEvidenceLabels[index] ?? `Point ${index + 1}`,
      value: fact,
    })) ??
    [];

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={slide.id}
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -18 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
        className={`story-stage story-stage--${stageMode} story-stage--${resolvedMediaLayout}`}
        data-testid="story-panel"
      >
        <div className="story-stage__surface">
          <div className="story-stage__topline">
            <div className="story-stage__meta">
              <span className="story-stage__act">{actLabels[slide.narrative?.act ?? "journey"] ?? "Act II"}</span>
              <span className="story-stage__chapter">
                {slide.chapter ?? slide.narrative?.chapterTitle ?? "Project story"}
              </span>
            </div>
            <div className="story-stage__counter">
              <span>{String(slideNumber).padStart(2, "0")}</span>
              <small>{String(slideCount).padStart(2, "0")}</small>
            </div>
          </div>

          <div className="story-stage__content">
            <div className="story-stage__copy">
              <p className="story-stage__eyebrow">{slide.narrative?.storyBeat ?? "Project narrative"}</p>
              <h1 className="story-stage__title">{slide.title}</h1>
              {slide.subtitle ? <p className="story-stage__subtitle">{slide.subtitle}</p> : null}
              {slide.narrative?.narrationScript ? (
                <p className="story-stage__script">{slide.narrative.narrationScript}</p>
              ) : null}

              {isHero ? (
                <div className="story-stage__hero-actions">
                  <button type="button" onClick={onStartTour} className="story-stage__primary">
                    {isAutoplay ? "Autoplay Running" : "Start Autoplay"}
                  </button>
                  <p className="story-stage__hero-note">
                    Step through the deck from regional context to resource confidence.
                  </p>
                </div>
              ) : null}
            </div>

            {showSidePanel && (isTechnical || isClosing) && evidenceItems.length > 0 ? (
              <div className="story-stage__side-panel">
                <p className="story-stage__side-label">{isClosing ? "Investment Case" : "Key Evidence"}</p>
                <div className="story-stage__evidence-grid">
                  {evidenceItems.map((item) => (
                    <div key={`${item.label}-${item.value}`} className="story-stage__evidence-card">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {!isTechnical && slide.facts && slide.facts.length > 0 ? (
          <div className="story-stage__fact-strip">
            {slide.facts.map((fact) => (
              <div key={fact} className="story-stage__fact-pill">
                <span />
                <p>{fact}</p>
              </div>
            ))}
          </div>
        ) : null}

        {isTechnical && slide.facts && slide.facts.length > 0 ? (
          <div className="story-stage__bottom-caption">
            {slide.facts.map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
          </div>
        ) : null}
      </motion.section>
    </AnimatePresence>
  );
}
