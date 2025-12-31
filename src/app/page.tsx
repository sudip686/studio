'use client';

import { useState, useEffect } from 'react';
import { ChapterMenu } from "@/components/ui/chapter-menu";
import { CesiumProvider } from '@/contexts/cesium-context';
import CesiumViewSwitch from '@/components/CesiumViewSwitch';
import ThreeJsViewSwitch from '@/components/ThreeJsViewSwitch';
import { ThreeSceneProvider } from '@/contexts/three-scene-context';

// Simplified view sequence
const viewSequence = [
  'original', 'exaggerated_kml', 'styled_kml', 'tanaga_accessibility', 'tanga_geological_map',  
  'drillhole_location_assay', 'geojson_drillholes_lithology', 
  'geojson_drillholes_assay', 
  'drillhole_lithology_reveal',
  'lithology_view', 'assay_view', 'block_model_carbon_view', 'block_model_resc_view',
  'block_model_clip_view'
] as const;

type ViewType = typeof viewSequence[number];

const viewTitles: { [key in ViewType]: string } = {
  'original': 'Original View',
  'exaggerated_kml': 'Exaggerated KML',
  'styled_kml': 'Styled KML',
  'tanaga_accessibility': 'Tanaga Accessibility',
  'tanga_geological_map': 'Tanga Geological Map',
  'geojson_drillholes_lithology': 'GeoJSON Drillholes Lithology',
  'geojson_drillholes_assay': 'GeoJSON Drillholes Assay',
  'geospatial_lithology': 'Geospatial Lithology',
  'geospatial_assay': 'Geospatial Assay',
  // 'drillhole_location_lithology': 'Drillhole Location-Lithology',
  'drillhole_location_assay': 'Drillhole Location-Assay',
  'drillhole_lithology_reveal': 'Drillhole Lithology Reveal',
  // 'subsurface_cutaway': 'Subsurface Cutaway',
  // 'kml_focused_view': 'KML Focused View',
  //'terrain_traces': 'Terrain Traces',
  'lithology_view': '3D Lithology',
  'assay_view': '3D Assay',
  'block_model_carbon_view': '3D Block Model - Carbon',
  'block_model_resc_view': '3D Block Model - Resource Classification',
  'block_model_clip_view': 'Block Model Clip View'
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
]);

export default function Home() {
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [title, setTitle] = useState(viewTitles[viewSequence[0]]);
  const [titleVisible, setTitleVisible] = useState(true);
  const [assayCutoff, setAssayCutoff] = useState<number | undefined>(undefined);

  useEffect(() => {
    setTitleVisible(false);
    setTimeout(() => {
      setTitle(viewTitles[viewSequence[currentViewIndex]]);
      setTitleVisible(true);
    }, 300);
  }, [currentViewIndex]);

  const currentView: ViewType = viewSequence[currentViewIndex];
  const handleNext = () => setCurrentViewIndex(i => Math.min(i + 1, viewSequence.length - 1));
  const handlePrev = () => setCurrentViewIndex(i => Math.max(i - 1, 0));

  const isCesiumSwitcherView = cesiumSwitcherViews.has(currentView);
  const isThreeJsSwitcherView = threeJsSwitcherViews.has(currentView);
  const isStandalone2D = ['downhole_plot'].includes(currentView);

  console.log(`[page.tsx] Rendering view: ${currentView}`);

  return (
      <div className="h-full w-full relative bg-black">
        <main className="absolute top-0 left-0 h-full w-full pointer-events-none z-20">
          <div className={`absolute top-8 left-1/2 -translate-x-1/2 text-3xl font-bold text-white bg-black bg-opacity-50 p-4 rounded-lg transition-opacity duration-300 ${titleVisible ? "opacity-100" : "opacity-0"}`}>
            {title}
          </div>
        </main>
        <div className="fixed top-4 left-4 z-[9999] pointer-events-auto">
          <ChapterMenu viewSequence={viewSequence} viewTitles={viewTitles} currentViewIndex={currentViewIndex} setCurrentViewIndex={setCurrentViewIndex} />
        </div>
        {isThreeJsSwitcherView && (
            <div className="fixed top-4 right-4 z-[9999] pointer-events-auto bg-black bg-opacity-70 p-2 rounded-lg text-white">
                <label htmlFor="assayCutoff" className="mr-2">Assay Cutoff:</label>
                <input
                    id="assayCutoff"
                    type="number"
                    step="0.1"
                    value={assayCutoff ?? ''}
                    onChange={(e) => setAssayCutoff(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    className="w-24 p-1 rounded bg-gray-800 text-white border border-gray-700"
                />
            </div>
        )}
        {currentViewIndex > 0 && <div onClick={handlePrev} className="fixed top-1/2 left-8 transform -translate-y-1/2 text-5xl font-bold text-white bg-black bg-opacity-30 p-2 px-6 rounded-lg cursor-pointer z-30 select-none hover:bg-opacity-50 pointer-events-auto">&lt;</div>}
        {currentViewIndex < viewSequence.length - 1 && <div onClick={handleNext} className="fixed top-1/2 right-8 transform -translate-y-1/2 text-5xl font-bold text-white bg-black bg-opacity-30 p-2 px-6 rounded-lg cursor-pointer z-30 select-none hover:bg-opacity-50 pointer-events-auto">&gt;</div>}

        <ThreeSceneProvider active={isThreeJsSwitcherView}> {/* NEW: ThreeSceneProvider wraps the entire view area */}
          <div className="h-full w-full absolute inset-0">
              {isCesiumSwitcherView && (
                  <CesiumProvider>
                      <CesiumViewSwitch view={currentView as any} />
                  </CesiumProvider>
              )}

              {isThreeJsSwitcherView && (
                  <ThreeJsViewSwitch view={currentView as any} assayCutoff={assayCutoff} />
              )}

              {isStandalone2D && <div className="h-full w-full bg-white">{/* Standalone 2D content */}</div>}
          </div>
        </ThreeSceneProvider> {/* NEW: Closing tag for ThreeSceneProvider */}
         <div id="cesium-toolbar" className="absolute top-12 left-4 z-10 hidden bg-zinc-800/80 text-white p-2 rounded"></div>
      </div>
  );
}