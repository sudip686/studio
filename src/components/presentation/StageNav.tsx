"use client";

import { Activity, ChevronLeft, ChevronRight, Compass, Pause, Play } from "lucide-react";

export interface StageNavProps {
  currentSlideNumber: number;
  slideCount: number;
  isAutoplay: boolean;
  isFirstSlide: boolean;
  isLastSlide: boolean;
  isLocked: boolean;
  isCompassActive?: boolean;
  isRuntimePanelOpen?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleAutoplay: () => void;
  onToggleCompass?: () => void;
  onToggleRuntimePanel?: () => void;
}

const formatSlideNumber = (num: number): string => String(num).padStart(2, "0");

export function StageNav({
  currentSlideNumber,
  slideCount,
  isAutoplay,
  isFirstSlide,
  isLastSlide,
  isLocked,
  isCompassActive = true,
  isRuntimePanelOpen = false,
  onPrev,
  onNext,
  onToggleAutoplay,
  onToggleCompass,
  onToggleRuntimePanel,
}: StageNavProps) {
  const progress = slideCount > 0 ? Math.min(100, (currentSlideNumber / slideCount) * 100) : 0;

  return (
    <nav className="stage-nav" aria-label="Presentation navigation" data-testid="global-nav-dock">
      <div className="stage-nav__group">
        <button
          type="button"
          onClick={onPrev}
          disabled={isLocked || isFirstSlide}
          className={`stage-nav__arrow stage-nav__arrow--prev ${isLocked || isFirstSlide ? "is-disabled" : ""}`}
          aria-label="Previous slide"
        >
          <ChevronLeft size={18} strokeWidth={2.2} />
          <span className="sr-only">Previous</span>
        </button>

        <div className="stage-nav__pager">
          <div className="stage-nav__status">
            <span className="stage-nav__label">Slide</span>
            <strong className="stage-nav__number">
              {formatSlideNumber(currentSlideNumber)} / {formatSlideNumber(slideCount)}
            </strong>
          </div>
          <div className="stage-nav__progress" aria-hidden="true">
            <div className="stage-nav__progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={isLastSlide || isLocked}
          className={`stage-nav__arrow stage-nav__arrow--next ${isLocked || isLastSlide ? "is-disabled" : ""}`}
          aria-label="Next slide"
        >
          <ChevronRight size={18} strokeWidth={2.2} />
          <span className="sr-only">Next</span>
        </button>
      </div>

      <div className="stage-nav__actions">
        <button
          type="button"
          onClick={onToggleAutoplay}
          className={`stage-nav__action stage-nav__action--autoplay ${isAutoplay ? "is-active" : ""}`}
          aria-label={isAutoplay ? "Pause presentation" : "Start autoplay"}
        >
          {isAutoplay ? <Pause size={16} strokeWidth={2.2} /> : <Play size={16} strokeWidth={2.2} />}
          <span className="stage-nav__action-label">{isAutoplay ? "Autoplay On" : "Autoplay Off"}</span>
        </button>

        {onToggleCompass ? (
          <button
            type="button"
            onClick={onToggleCompass}
            className={`stage-nav__action stage-nav__action--compass ${isCompassActive ? "is-active" : ""} neon-glow neon-primary`}
            title={isCompassActive ? "Hide compass" : "Show compass"}
            aria-label={isCompassActive ? "Hide compass" : "Show compass"}
          >
            <Compass size={18} strokeWidth={2.1} />
          </button>
        ) : null}

        {onToggleRuntimePanel ? (
          <button
            type="button"
            onClick={onToggleRuntimePanel}
            className={`stage-nav__action stage-nav__action--runtime ${isRuntimePanelOpen ? "is-active" : ""}`}
            title={isRuntimePanelOpen ? "Hide runtime panel" : "Show runtime panel"}
            aria-label={isRuntimePanelOpen ? "Hide runtime panel" : "Show runtime panel"}
          >
            <Activity size={18} strokeWidth={2.1} />
          </button>
        ) : null}
      </div>
    </nav>
  );
}
