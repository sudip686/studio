'use client';

import { useState, useEffect } from 'react';
import { ChapterMenu } from "@/components/ui/chapter-menu";
import { CesiumProvider } from '@/contexts/cesium-context';
import CesiumViewSwitch from '@/components/CesiumViewSwitch';
import ThreeJsViewSwitch from '@/components/ThreeJsViewSwitch';
import { ThreeSceneProvider } from '@/contexts/three-scene-context';
import GlobalOverlays from '@/components/shared/GlobalOverlays';

// Simplified view sequence
const viewSequence = [
  'original', 'exaggerated_kml', 'styled_kml', 'tanaga_accessibility', 'tanga_geological_map',
  'drillhole_location_assay',
  'geojson_drillholes_lithology',
  'geojson_drillholes_assay',
  // 'drillhole_lithology_reveal',
  'lithology_view', 'assay_view', 'block_model_carbon_view', 'block_model_resc_view',
  'block_model_clip_view',
  // Immersive Presentation
  'immersive_presentation'
] as const;

type ViewType = typeof viewSequence[number];

const viewTitles: { [key in ViewType]: string } = {
  'original': 'Original View',
  'exaggerated_kml': 'Tanga Topography',
  'styled_kml': 'Tanga Licenses',
  'tanaga_accessibility': 'Tanaga Accessibility',
  'tanga_geological_map': 'Tanga Geological Map',
  'drillhole_location_assay': 'Drillhole Location-Assay',
  'geojson_drillholes_lithology': 'Drillholes with Lithology',
  'geojson_drillholes_assay': 'Drillholes with Assay',

  'lithology_view': '3D Lithology',
  'assay_view': '3D Assay',
  'block_model_carbon_view': '3D Block Model - Carbon',
  'block_model_resc_view': '3D Block Model - Resource Classification',
  'block_model_clip_view': 'Block Model Clip View',

  // Immersive Presentation
  'immersive_presentation': 'Immersive Presentation Experience'
};

const cesiumSwitcherViews = new Set<string>([
    'original', 'exaggerated_kml', 'styled_kml', 'tanaga_accessibility', 'tanga_geological_map',
    'geojson_drillholes_lithology', 'geojson_drillholes_assay', 'tiff_overlay', 'project_location',
    'geospatial_lithology', 'geospatial_assay', 'drillhole_lithology_reveal', 'subsurface_cutaway', 'kml_focused_view', 'resource_model_viewer',
    'block_model_box_cutter_grade', 'block_model_box_cutter_class', 'block_model_clip_view', 'drillhole_location_assay'
]);

const threeJsSwitcherViews = new Set<string>([
    'lithology_view',
    'assay_view',
    'block_model_carbon_view',
    'block_model_resc_view',
    // Immersive Presentation
    'immersive_presentation'
]);

export default function Home() {
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [title, setTitle] = useState(viewTitles[viewSequence[0]]);
  const [titleVisible, setTitleVisible] = useState(true);
  const [isAutoplay, setIsAutoplay] = useState(false);

  useEffect(() => {
    setTitleVisible(false);
    setTimeout(() => {
      setTitle(viewTitles[viewSequence[currentViewIndex]]);
      setTitleVisible(true);
    }, 300);
  }, [currentViewIndex]);

  // Autoplay effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoplay && currentViewIndex < viewSequence.length - 1) {
      interval = setTimeout(() => {
        handleNext();
      }, 10000); // 10 seconds per view
    } else if (isAutoplay && currentViewIndex === viewSequence.length - 1) {
      // Stop autoplay at the end
      setIsAutoplay(false);
    }
    return () => {
      if (interval) clearTimeout(interval);
    };
  }, [isAutoplay, currentViewIndex]);

  const toggleAutoplay = () => {
    setIsAutoplay(!isAutoplay);
  };

  const startGuidedTour = () => {
    setCurrentViewIndex(0);
    setIsAutoplay(true);
  };

  const currentView: ViewType = viewSequence[currentViewIndex];
  const handleNext = () => setCurrentViewIndex(i => Math.min(i + 1, viewSequence.length - 1));
  const handlePrev = () => setCurrentViewIndex(i => Math.max(i - 1, 0));

  const isCesiumSwitcherView = cesiumSwitcherViews.has(currentView);
  const isThreeJsSwitcherView = threeJsSwitcherViews.has(currentView);
  const isStandalone2D = ['downhole_plot'].includes(currentView);

  console.log(`[page.tsx] Rendering view: ${currentView}`);

  return (
      <div className="h-full w-full relative bg-canvas text-gray-100">
        <main className="absolute top-0 left-0 h-full w-full pointer-events-none z-20">
          <div className={`absolute top-8 left-1/2 -translate-x-1/2 text-3xl font-bold text-white bg-black bg-opacity-50 p-4 rounded-lg transition-opacity duration-300 ${titleVisible ? "opacity-100" : "opacity-0"}`}>
            {title}
          </div>
        </main>

        {/* Hero overlay - top left */}
        <div className="absolute top-6 left-6 z-30 pointer-events-auto">
          <div className="rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.7)] max-w-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-accent/80">Sakariya Mines & Minerals</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold font-headline">Tanga Graphite  GeoVision3D</h1>
            <p className="mt-2 text-xs md:text-sm text-gray-400 max-w-sm">
              Explore drill collars, proposed pits and regional structures in an interactive 3D environment.
            </p>
            <button
              onClick={startGuidedTour}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-black hover:bg-orange-400 transition"
            >
              Start guided tour
              <span>’</span>
            </button>
            <button
              onClick={() => {
                // Navigate to immersive presentation
                const presentationIndex = viewSequence.indexOf('immersive_presentation');
                setCurrentViewIndex(presentationIndex);
              }}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-purple-500 transition"
            >
              🎭 Immersive Experience
            </button>
          </div>
        </div>

        <div className="fixed top-4 right-4 z-[9999] pointer-events-auto flex flex-col gap-2">
          {isAutoplay && (
            <button
              onClick={() => setIsAutoplay(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
            >
              ⏸️ Stop Tour
            </button>
          )}
          <ChapterMenu viewSequence={viewSequence} viewTitles={viewTitles} currentViewIndex={currentViewIndex} setCurrentViewIndex={setCurrentViewIndex} />
        </div>

        {currentViewIndex > 0 && <div onClick={handlePrev} className="fixed top-1/2 left-8 transform -translate-y-1/2 text-5xl font-bold text-white bg-black bg-opacity-30 p-2 px-6 rounded-lg cursor-pointer z-30 select-none hover:bg-opacity-50 pointer-events-auto">&lt;</div>}
        {currentViewIndex < viewSequence.length - 1 && <div onClick={handleNext} className="fixed top-1/2 right-8 transform -translate-y-1/2 text-5xl font-bold text-white bg-black bg-opacity-30 p-2 px-6 rounded-lg cursor-pointer z-30 select-none hover:bg-opacity-50 pointer-events-auto">&gt;</div>}

        <div className="h-full w-full absolute inset-0">
          {isCesiumSwitcherView && (
            <CesiumProvider>
              <CesiumViewSwitch view={currentView as any} />
              <GlobalOverlays
                mode="cesium"
                hidden={false}
                currentView={currentView}
              />
            </CesiumProvider>
          )}

          {isThreeJsSwitcherView && (
            <ThreeSceneProvider active={isThreeJsSwitcherView}>
              <ThreeJsViewSwitch view={currentView as any} />
              <GlobalOverlays
                mode="three"
                hidden={false}
                currentView={currentView}
              />
            </ThreeSceneProvider>
          )}

          {isStandalone2D && <div className="h-full w-full bg-transparent">{/* Standalone 2D content */}</div>}
        </div>
         <div id="cesium-toolbar" className="absolute top-12 left-4 z-10 hidden bg-zinc-800/80 text-white p-2 rounded"></div>
      </div>
  );
}