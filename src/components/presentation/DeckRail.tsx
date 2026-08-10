"use client";

import Image from "next/image";
import type { DeckSlide } from "@/lib/deck";

type DeckRailProps = {
  slides: DeckSlide[];
  currentIndex: number;
  isAutoplay: boolean;
  isLocked: boolean;
  onJump: (index: number) => void;
  onToggleAutoplay: () => void;
};

const actLabels: Record<string, string> = {
  setup: "Act I",
  journey: "Act II",
  resolution: "Act III",
};

export function DeckRail({
  slides,
  currentIndex,
  isAutoplay,
  isLocked,
  onJump,
  onToggleAutoplay,
}: DeckRailProps) {
  const progress = `${Math.max(8, ((currentIndex + 1) / slides.length) * 100)}%`;

  return (
    <aside className="deck-rail" aria-label="Presentation chapters">
      <div className="deck-rail__brand">
        <div className="deck-rail__brand-mark">
          <div className="deck-rail__brand-lockup">
            <Image
              src="/A_Logo.png"
              alt="Sakariya mark"
              width={34}
              height={34}
              className="deck-rail__brand-mark-icon"
              priority
            />
            <Image
              src="/sakariya-wordmark.png"
              alt="Sakariya Mines & Minerals"
              width={182}
              height={40}
              className="deck-rail__brand-logo"
              priority
            />
          </div>
          <span className="deck-rail__brand-badge">Investor Deck 2026</span>
        </div>
        <p className="deck-rail__company">Sakariya Mines & Minerals</p>
        <h2 className="deck-rail__project">Tanga Graphite</h2>
        <p className="deck-rail__subtitle">Presentation workspace for the live project narrative.</p>
        <div className="deck-rail__progress" aria-hidden="true">
          <div className="deck-rail__progress-copy">
            <span>Deck progress</span>
            <strong>
              {String(currentIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </strong>
          </div>
          <div className="deck-rail__progress-track">
            <span className="deck-rail__progress-fill" style={{ width: progress }} />
          </div>
        </div>
      </div>

      <div className="deck-rail__items" data-no-deck-wheel data-scrollable="chapters">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          const act = slide.narrative?.act ?? "journey";

          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => onJump(index)}
              disabled={isLocked && !isActive}
              className={`deck-rail__item ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "step" : undefined}
            >
              <div className={`deck-rail__thumb deck-rail__thumb--${slide.themeTone ?? "sky"}`}>
                <div className="deck-rail__thumb-top">
                  <span className="deck-rail__number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="deck-rail__act">{actLabels[act] ?? act}</span>
                </div>
                <div className="deck-rail__thumb-body">
                  <p className="deck-rail__thumb-chapter">
                    {slide.chapter ?? slide.narrative?.chapterTitle ?? "Story"}
                  </p>
                  <p className="deck-rail__thumb-title">{slide.railTitle ?? slide.title}</p>
                </div>
                <span className="deck-rail__thumb-indicator" />
              </div>
              <p className="deck-rail__caption">
                {slide.narrative?.storyBeat ?? slide.subtitle ?? "Project chapter"}
              </p>
            </button>
          );
        })}
      </div>

      <div className="deck-rail__footer">
        <button type="button" onClick={onToggleAutoplay} className="deck-rail__autoplay">
          {isAutoplay ? "Autoplay On" : "Autoplay Off"}
        </button>
        <p className="deck-rail__hint">Use chapters, arrow keys, or the pager to move through the deck.</p>
      </div>
    </aside>
  );
}
