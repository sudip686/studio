'use client';

import { useState, useEffect } from 'react';
import { ChapterMenu } from "@/components/ui/chapter-menu";
import { deckSlides } from "@/data/deck";
import { useDeckController } from "@/hooks/useDeckController";
import { AnnotationsOverlay } from "@/components/deck/AnnotationsOverlay";
import { DeckCameraController } from "@/components/deck/DeckCameraController";
import { OverlayRoot } from "@/ui/overlays/OverlayRoot";
import { uiTheme } from "@/ui/overlays";
import { HeroOverlay } from "@/components/HeroOverlay";
import TilesetQualityToggle from "@/components/TilesetQualityToggle";
import { CesiumProvider } from '@/contexts/cesium-context';
import CesiumViewSwitch from '@/components/CesiumViewSwitch';
import ThreeJsViewSwitch from '@/components/ThreeJsViewSwitch';
import { ThreeSceneProvider } from '@/contexts/three-scene-context';
import GlobalOverlays from '@/components/shared/GlobalOverlays';
import UiChromeMeasure from '@/components/shared/UiChromeMeasure';

// Simplified view sequence
const viewSequence = [
  'original', 'exaggerated_kml', 'styled_kml', 'tanaga_accessibility', 'tanga_geological_map',
  'drillhole_location_assay',
  'geojson_drillholes_lithology',
  'geojson_drillholes_assay',
  // 'drillhole_lithology_reveal',
  'lithology_view', 'assay_view', 'block_model_carbon_view', 'block_model_resc_view'
] as const;

type ViewType = typeof viewSequence[number];

const cesiumSwitcherViews = new Set<string>([
    'original', 'exaggerated_kml', 'styled_kml', 'tanaga_accessibility', 'tanga_geological_map',
    'geojson_drillholes_lithology', 'geojson_drillholes_assay', 'tiff_overlay', 'project_location',
    'geospatial_lithology', 'geospatial_assay', 'drillhole_lithology_reveal', 'subsurface_cutaway', 'kml_focused_view', 'resource_model_viewer',
    'block_model_box_cutter_class', 'block_model_clip_view', 'drillhole_location_assay', 'modular_subsurface'
]);

const threeJsSwitcherViews = new Set<string>([
    'lithology_view',
    'assay_view',
    'block_model_carbon_view',
    'block_model_resc_view'
]);

export default function Home() {
  const deck = useDeckController(deckSlides);
  const [title, setTitle] = useState(deckSlides[0]?.title ?? "");
  const [titleVisible, setTitleVisible] = useState(true);

  useEffect(() => {
    setTitleVisible(false);
    setTimeout(() => {
      setTitle(deck.current?.title ?? "");
      setTitleVisible(true);
    }, 500); // Increased delay for smoother transition
  }, [deck.index, deck.current]);

  // Autoplay effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (deck.isAutoplay && deck.index < deck.viewSequence.length - 1) {
      interval = setTimeout(() => {
        deck.next();
      }, deck.current?.durationMs ?? 10000);
    } else if (deck.isAutoplay && deck.index === deck.viewSequence.length - 1) {
      deck.stopAutoplay();
    }
    return () => {
      if (interval) clearTimeout(interval);
    };
  }, [deck.index, deck.isAutoplay, deck.current, deck.viewSequence.length, deck.next, deck.stopAutoplay]);

  // Scrolling functionality
  useEffect(() => {
    let lastScrollTime = 0;
    const handleWheel = (e: WheelEvent) => {
      // Ignore scroll if interacting with a canvas (3D Viewer zoom)
      if ((e.target as HTMLElement).tagName === 'CANVAS') return;

      const now = Date.now();
      if (now - lastScrollTime < 1000) return; // 1 second throttle

      if (e.deltaY > 50) {
        deck.next();
        lastScrollTime = now;
      } else if (e.deltaY < -50) {
        deck.prev();
        lastScrollTime = now;
      }
    };
    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const startGuidedTour = () => {
    deck.setIndex(0);
    deck.startAutoplay();
  };

  const resetToHomeView = () => {
    console.log('Reset to home view triggered');
    deck.setIndex(0);
    deck.stopAutoplay();
  };

  const currentView: ViewType = (deck.current?.view ?? viewSequence[0]) as ViewType;
  const handleNext = () => deck.next();
  const handlePrev = () => deck.prev();

  const isCesiumSwitcherView = cesiumSwitcherViews.has(currentView);
  const isThreeJsSwitcherView = threeJsSwitcherViews.has(currentView);
  const isStandalone2D = ['downhole_plot'].includes(currentView);

  console.log(`[page.tsx] Rendering view: ${currentView}`);

  return (
      <div className="h-full w-full relative bg-canvas text-gray-100 transition-all duration-700 ease-in-out">
        <UiChromeMeasure />
        <OverlayRoot
          baseSlots={{
            "top-left": (
              <div className="flex flex-col gap-3">
                <HeroOverlay onStart={startGuidedTour} />
              </div>
            ),
            "top-center": (
              <div className={`text-2xl md:text-3xl font-bold text-white ${uiTheme.panel.background} ${uiTheme.panel.border} ${uiTheme.panel.blur} ${uiTheme.panel.radius} ${uiTheme.panel.shadow} ${uiTheme.panel.padding} transition-opacity duration-300 ${titleVisible ? "opacity-100" : "opacity-0"}`}>
                {deck.current?.title ?? title}
              </div>
            ),
            "top-right": (
              <div className="w-[320px] flex flex-col gap-3 items-end max-md:hidden">
                {deck.isAutoplay && (
                  <button
                    onClick={deck.stopAutoplay}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors pointer-events-auto"
                  >
                    ⏸️ Stop Tour
                  </button>
                )}
                <ChapterMenu
                  viewSequence={deck.viewSequence}
                  viewTitles={deck.viewTitles}
                  currentViewIndex={deck.index}
                  setCurrentViewIndex={deck.setIndex}
                />
                <TilesetQualityToggle />
              </div>
            ),
            "bottom-center": (
              <div className="flex items-center gap-3">
                {deck.index > 0 && (
                  <button
                    onClick={handlePrev}
                    className="text-2xl font-semibold text-white bg-black/40 rounded-lg px-4 py-1 hover:bg-black/60 pointer-events-auto"
                  >
                    ← Prev
                  </button>
                )}
                <button
                  onClick={deck.toggleAutoplay}
                  className="text-sm font-medium text-white bg-black/50 rounded-full px-4 py-2 pointer-events-auto"
                >
                  {deck.isAutoplay ? "Stop Tour" : "Start Tour"}
                </button>
                {deck.index < deck.viewSequence.length - 1 && (
                  <button
                    onClick={handleNext}
                    className="text-2xl font-semibold text-white bg-black/40 rounded-lg px-4 py-1 hover:bg-black/60 pointer-events-auto"
                  >
                    Next →
                  </button>
                )}
              </div>
            ),
            "bottom-right": (
              <div className="flex flex-col gap-2 items-end md:hidden">
                <ChapterMenu
                  viewSequence={deck.viewSequence}
                  viewTitles={deck.viewTitles}
                  currentViewIndex={deck.index}
                  setCurrentViewIndex={deck.setIndex}
                />
              </div>
            ),
          }}
        >
          <div className="h-full w-full absolute inset-0">
            {isCesiumSwitcherView && (
              <CesiumProvider>
                <DeckCameraController camera={deck.current?.camera} />
                <AnnotationsOverlay annotations={deck.current?.annotations} />
                <CesiumViewSwitch view={currentView as any} />
                <GlobalOverlays
                  mode="cesium"
                  hidden={false}
                  currentView={currentView}
                  onLogoClick={resetToHomeView}
                />
              </CesiumProvider>
            )}

            {isThreeJsSwitcherView && (
              <ThreeSceneProvider active={isThreeJsSwitcherView}>
                <AnnotationsOverlay annotations={deck.current?.annotations} />
                <ThreeJsViewSwitch view={currentView as any} />
                <GlobalOverlays
                  mode="three"
                  hidden={false}
                  currentView={currentView}
                  onLogoClick={resetToHomeView}
                />
              </ThreeSceneProvider>
            )}

            {isStandalone2D && (
              <div className="h-full w-full bg-transparent">
                {/* Standalone 2D content */}
              </div>
            )}
          </div>
          <div id="cesium-toolbar" className="absolute top-12 left-4 z-10 hidden bg-zinc-800/80 text-white p-2 rounded"></div>
        </OverlayRoot>
      </div>
  );
}