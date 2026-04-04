"use client";

type StageNavProps = {
  currentSlideNumber: number;
  slideCount: number;
  isAutoplay: boolean;
  isFirstSlide: boolean;
  isLastSlide: boolean;
  isLocked: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleAutoplay: () => void;
};

export function StageNav({
  currentSlideNumber,
  slideCount,
  isAutoplay,
  isFirstSlide,
  isLastSlide,
  isLocked,
  onPrev,
  onNext,
  onToggleAutoplay,
}: StageNavProps) {
  return (
    <div aria-label="Presentation navigation" data-testid="global-nav-dock" className="stage-nav">
      <button
        type="button"
        onClick={onToggleAutoplay}
        className={`stage-nav__autoplay ${isAutoplay ? "is-live" : ""}`}
      >
        {isAutoplay ? "Pause" : "Autoplay"}
      </button>

      <div className="stage-nav__pager">
        <button type="button" onClick={onPrev} disabled={isFirstSlide || isLocked} className="stage-nav__arrow">
          <span aria-hidden="true">&#8592;</span>
          <span className="sr-only">Previous</span>
        </button>
        <div className="stage-nav__status">
          <span>Slide</span>
          <strong>
            {String(currentSlideNumber).padStart(2, "0")} / {String(slideCount).padStart(2, "0")}
          </strong>
        </div>
        <button type="button" onClick={onNext} disabled={isLastSlide || isLocked} className="stage-nav__arrow">
          <span aria-hidden="true">&#8594;</span>
          <span className="sr-only">Next</span>
        </button>
      </div>
    </div>
  );
}
