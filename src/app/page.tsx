'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { deckSlides } from "@/data/deck";
import { useDeckController } from "@/hooks/useDeckController";
import { AnnotationsOverlay } from "@/components/deck/AnnotationsOverlay";
import { DeckCameraController } from "@/components/deck/DeckCameraController";
import { CesiumProvider } from '@/contexts/cesium-context';
import CesiumViewSwitch from '@/components/CesiumViewSwitch';
import ThreeJsViewSwitch from '@/components/ThreeJsViewSwitch';
import { ThreeSceneProvider } from '@/contexts/three-scene-context';
import { DeckRail } from '@/components/presentation/DeckRail';
import { StoryStageCard } from '@/components/presentation/StoryStageCard';
import { StageNav } from '@/components/presentation/StageNav';
import ThreeJsDataOverlay from '@/components/ThreeJsDataOverlay';
import GlobalOverlays from '@/components/shared/GlobalOverlays';
import { OverlayRoot } from '@/ui/overlays/OverlayRoot';
import { MetallurgyShowcase } from '@/components/presentation/MetallurgyShowcase';
import type {
  DeckSlide,
  PresentationMediaLayout,
  PresentationPanelVariant,
  PresentationStageMode,
  PresentationThemeTone,
} from '@/lib/deck';

type HomeView =
  | 'original'
  | 'exaggerated_kml'
  | 'styled_kml'
  | 'tanaga_accessibility'
  | 'tanga_geological_map'
  | 'geojson_drillholes_lithology'
  | 'geojson_drillholes_assay'
  | 'drillhole_location_assay'
  | 'drillhole_location_lithology'
  | 'lithology_view'
  | 'assay_view'
  | 'block_model_carbon_view'
  | 'block_model_resc_view';

const cesiumSwitcherViews = new Set<HomeView>([
  'original',
  'exaggerated_kml',
  'styled_kml',
  'tanaga_accessibility',
  'tanga_geological_map',
  'geojson_drillholes_lithology',
  'geojson_drillholes_assay',
  'drillhole_location_assay',
  'drillhole_location_lithology',
]);

const threeJsSwitcherViews = new Set<HomeView>([
  'lithology_view',
  'assay_view',
  'block_model_carbon_view',
  'block_model_resc_view',
]);

const technicalSlides = new Set([
  'drillholes',
  'drillholes_lithology',
  'drillholes_assay',
  'lithology',
  'assay',
  'carbon_model',
  'classification',
]);

const rightDataOverlaySlides = new Set([
  'drillholes',
  'drillholes_lithology',
  'drillholes_assay',
  'lithology',
  'assay',
  'carbon_model',
  'classification',
  'metallurgy',
  'product_quality',
]);

const mediaLayoutById: Partial<Record<string, PresentationMediaLayout>> = {
  drillholes: 'split-right',
  drillholes_lithology: 'split-right',
  drillholes_assay: 'split-right',
  lithology: 'split-right',
  assay: 'split-right',
  carbon_model: 'split-right',
  classification: 'split-right',
  metallurgy: 'split-right',
  product_quality: 'split-right',
};

const variantById: Partial<Record<string, PresentationPanelVariant>> = {
  overview: 'cover',
  drillholes: 'evidence',
  drillholes_assay: 'evidence',
  assay: 'evidence',
  carbon_model: 'evidence',
  classification: 'evidence',
  metallurgy: 'evidence',
  product_quality: 'evidence',
  investment_thesis: 'closing',
};

const actToneMap: Record<string, PresentationThemeTone> = {
  setup: 'sky',
  journey: 'emerald',
  resolution: 'amber',
};

const evidenceLabels = ['Location', 'Dataset', 'Advantage', 'Validation'];

const presentationSlides: DeckSlide[] = deckSlides.map((slide, index, slides) => {
  const stageMode: PresentationStageMode =
    slide.id === 'overview'
      ? 'hero'
      : slide.id === 'investment_thesis'
        ? 'closing'
        : technicalSlides.has(slide.id)
          ? 'technical'
          : 'narrative';

  return {
    ...slide,
    chapter: slide.chapter ?? slide.narrative?.chapterTitle ?? `Chapter ${index + 1}`,
    railTitle: slide.railTitle ?? slide.title,
    panelVariant:
      slide.panelVariant ??
      variantById[slide.id] ??
      (index === 0 ? 'cover' : index === slides.length - 1 ? 'closing' : 'focus'),
    themeTone: slide.themeTone ?? actToneMap[slide.narrative?.act ?? 'journey'] ?? 'sky',
    stageMode,
    mediaLayout: slide.mediaLayout ?? mediaLayoutById[slide.id] ?? 'full-bleed',
    hideSceneUtilities: slide.hideSceneUtilities ?? true,
    evidenceItems:
      slide.evidenceItems ??
      slide.facts?.slice(0, 3).map((fact, factIndex) => ({
        label: evidenceLabels[factIndex] ?? `Point ${factIndex + 1}`,
        value: fact,
      })),
  };
});

export default function Home() {
  const deck = useDeckController(presentationSlides);
  const lockRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const slideCount = deck.viewSequence.length;
  const currentSlide = deck.current;
  const currentView = (currentSlide?.view ?? 'original') as HomeView;
  const currentSlideNumber = deck.index + 1;
  const isFirstSlide = deck.index <= 0;
  const isLastSlide = deck.index >= slideCount - 1;
  const isCesiumSwitcherView = cesiumSwitcherViews.has(currentView);
  const isThreeJsSwitcherView = threeJsSwitcherViews.has(currentView);
  const isMetallurgySlide = currentSlide?.id === 'metallurgy';
  const showThreeDataOverlay = !!currentSlide && rightDataOverlaySlides.has(currentSlide.id);
  const showStorySidePanel = !showThreeDataOverlay;

  const releaseLock = useCallback(() => {
    lockRef.current = false;
    setIsTransitioning(false);
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const navigateToIndex = useCallback((nextIndex: number, preserveAutoplay = false) => {
    if (nextIndex < 0 || nextIndex >= presentationSlides.length || nextIndex === deck.index || lockRef.current) {
      return;
    }

    lockRef.current = true;
    setIsTransitioning(true);
    deck.setIndex(nextIndex);

    if (!preserveAutoplay) {
      deck.stopAutoplay();
    }

    const transitionMs = Math.max(
      900,
      Math.round((presentationSlides[nextIndex]?.camera?.duration ?? 1.3) * 1000) + 420
    );

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }

    transitionTimerRef.current = window.setTimeout(() => {
      lockRef.current = false;
      setIsTransitioning(false);
      transitionTimerRef.current = null;
    }, transitionMs);
  }, [deck.index, deck.setIndex, deck.stopAutoplay]);

  const goNext = useCallback((preserveAutoplay = false) => {
    if (deck.index >= slideCount - 1) {
      if (!preserveAutoplay) {
        deck.stopAutoplay();
      }
      return;
    }

    navigateToIndex(deck.index + 1, preserveAutoplay);
  }, [deck.index, deck.stopAutoplay, navigateToIndex, slideCount]);

  const goPrev = useCallback(() => {
    navigateToIndex(deck.index - 1);
  }, [deck.index, navigateToIndex]);

  const startGuidedTour = useCallback(() => {
    releaseLock();
    deck.setIndex(0);
    deck.startAutoplay();
  }, [deck.setIndex, deck.startAutoplay, releaseLock]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let interval: number | undefined;

    if (deck.isAutoplay && !isTransitioning && deck.index < slideCount - 1) {
      interval = window.setTimeout(() => {
        goNext(true);
      }, currentSlide?.durationMs ?? 9000);
    } else if (deck.isAutoplay && deck.index === slideCount - 1) {
      deck.stopAutoplay();
    }

    return () => {
      if (interval) {
        clearTimeout(interval);
      }
    };
  }, [currentSlide?.durationMs, deck.index, deck.isAutoplay, deck.stopAutoplay, goNext, isTransitioning, slideCount]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (lockRef.current) return;

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        goPrev();
      } else if (event.key === ' ' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        deck.toggleAutoplay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deck.toggleAutoplay, goNext, goPrev]);

  return (
    <div className="vrify-frame">
      <OverlayRoot
        leftOffsetPx="var(--vrify-overlay-left, 0px)"
        rightOffsetPx="var(--vrify-overlay-right, 0px)"
        topOffsetPx="var(--vrify-overlay-top, 0px)"
        bottomOffsetPx="var(--vrify-overlay-bottom, 0px)"
      >
        <div
          className="vrify-shell"
          data-scene-mode={isThreeJsSwitcherView ? 'three' : isCesiumSwitcherView ? 'cesium' : 'none'}
          data-story-tone={currentSlide?.themeTone ?? 'sky'}
        >
      <div className="vrify-shell__backdrop" />

      <DeckRail
        slides={presentationSlides}
        currentIndex={deck.index}
        isAutoplay={deck.isAutoplay}
        isLocked={isTransitioning}
        onJump={(index) => navigateToIndex(index)}
        onToggleAutoplay={deck.toggleAutoplay}
      />

      <main className="vrify-main">
        <div className="vrify-main__header">
          <div className="vrify-main__project-pill">
            <div className="vrify-main__project-brand">
              <Image src="/A_Logo.png" alt="Sakariya logo" width={28} height={28} className="vrify-main__project-mark" priority />
              <div className="vrify-main__project-copy">
                <span className="vrify-main__project-label">Tanga Graphite</span>
                <span className="vrify-main__project-subtitle">Investor story deck</span>
              </div>
            </div>
          </div>
          <div className="vrify-main__chapter-tag" data-no-deck-wheel>
            {currentSlide?.chapter ?? currentSlide?.narrative?.chapterTitle ?? "Project Story"}
          </div>
        </div>

        <section className="vrify-stage" data-no-deck-wheel>
          <div className="vrify-stage__media" data-no-deck-wheel>
            {isMetallurgySlide ? (
              <MetallurgyShowcase />
            ) : null}

            {isCesiumSwitcherView && !isMetallurgySlide && (
              <CesiumProvider interactionMode="presentation">
                {currentSlide?.cameraMode !== 'view' ? (
                  <DeckCameraController camera={currentSlide?.camera} />
                ) : null}
                <AnnotationsOverlay annotations={currentSlide?.annotations} />
                <CesiumViewSwitch view={currentView as any} deckControlled />
                <GlobalOverlays mode="cesium" hidden={false} currentView={currentSlide?.id} />
              </CesiumProvider>
            )}

            {isThreeJsSwitcherView && !isMetallurgySlide && (
              <ThreeSceneProvider active={isThreeJsSwitcherView}>
                <AnnotationsOverlay annotations={currentSlide?.annotations} />
                <ThreeJsViewSwitch view={currentView as any} />
                <GlobalOverlays mode="three" hidden={false} currentView={currentSlide?.id} />
              </ThreeSceneProvider>
            )}
          </div>

          <div className="vrify-stage__scrim" />
          <div className="vrify-stage__highlight" />

          <div className="vrify-stage__content">
            {currentSlide ? (
              <StoryStageCard
                slide={currentSlide}
                slideNumber={currentSlideNumber}
                slideCount={slideCount}
                isAutoplay={deck.isAutoplay}
                onStartTour={startGuidedTour}
                showSidePanel={showStorySidePanel}
              />
            ) : null}
          </div>

          {showThreeDataOverlay && currentSlide ? <ThreeJsDataOverlay slideId={currentSlide.id} /> : null}
        </section>

        <footer className="vrify-main__footer">
          <div className="vrify-main__footer-copy">
            <span>Investor Deck</span>
            <strong>
              {currentSlide?.chapter ?? currentSlide?.narrative?.chapterTitle ?? 'Project Story'}
            </strong>
          </div>
          <StageNav
            currentSlideNumber={currentSlideNumber}
            slideCount={slideCount}
            isAutoplay={deck.isAutoplay}
            isFirstSlide={isFirstSlide}
            isLastSlide={isLastSlide}
            isLocked={isTransitioning}
            onPrev={goPrev}
            onNext={() => goNext()}
            onToggleAutoplay={deck.toggleAutoplay}
          />
        </footer>
      </main>
        </div>
      </OverlayRoot>
    </div>
  );
}
