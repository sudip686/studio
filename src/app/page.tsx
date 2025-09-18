'use client';

import { CesiumProvider } from '@/contexts/cesium-context';
import { useState, useEffect } from 'react';
import CesiumViewer from "@/components/cesium-viewer";
import GeospatialViewer from "@/components/geospatial-viewer";
import GeoVision, { GeoVisionDisplayMode } from "@/components/geo-vision";
import DrillholeLocationMap from "@/components/drillhole-location-map";
import DownholePlot from "@/components/downhole-plot";
import ResourceModelViewer from "@/components/resource-model-viewer";
import StatisticalAnalysis from "@/components/statistical-analysis";
import SubsurfaceCutawayViewer from "@/components/subsurface-cutaway-viewer";
import AnimatedRevealViewer from "@/components/animated-reveal-viewer";

import { ChapterMenu } from "@/components/ui/chapter-menu";

// Define the sequence of views
const viewSequence = ['original', 'exaggerated_kml', 'styled_kml', 'tiff_overlay', 'ion_imagery', 'drillhole_3d_combined', 'subsurface_deposit_view', 'drillhole_map', 'statistical_analysis', 'geojson_drillholes_lithology', 'geojson_drillholes_assay', 'geospatial_viewer', 'geovision_lithology', 'geovision_assay', 'geovision_block_carbon', 'geovision_block_resc', 'subsurface_cutaway', 'animated_reveal', 'resource_model_viewer', 'downhole_plot'] as const;
type ViewType = typeof viewSequence[number];

const viewTitles: { [key in ViewType]: string } = {
    original: "Tanga Graphite Project - Tanzania",
    exaggerated_kml: "Exaggerated 3D Terrain View",
    styled_kml: "Exploration License Area",
    tiff_overlay: "Exploration License Area View",
    ion_imagery: "High-Resolution Satellite Imagery",
    drillhole_3d_combined: "3D Drillhole Animation",
    subsurface_deposit_view: "Subsurface Deposit View",
    geojson_drillholes_lithology: "Drillhole Visualization - Lithology",
    geojson_drillholes_assay: "Drillhole Visualization - Assay Data",
    geospatial_viewer: "Interactive 2D Geospatial Viewer",
    drillhole_map: "Drillhole Location Map",
    downhole_plot: "Downhole Plot",
    statistical_analysis: "Statistical Analysis",
    resource_model_viewer: "Resource Estimation Block Model",
    geovision_lithology: "3D Drillholes - Lithology",
    geovision_assay: "3D Drillholes - Assay",
    geovision_block_carbon: "3D Block Model - Carbon",
    geovision_block_resc: "3D Block Model - Classification",
    subsurface_cutaway: "Interactive Subsurface Cutaway",
    animated_reveal: "Animated Reveal"
};

export default function Home() {
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [title, setTitle] = useState(viewTitles[viewSequence[0]]);
  const [titleVisible, setTitleVisible] = useState(true);

  useEffect(() => {
    setTitleVisible(false);
    setTimeout(() => {
        setTitle(viewTitles[viewSequence[currentViewIndex]]);
        setTitleVisible(true);
    }, 300); // Corresponds to the fade-out duration
  }, [currentViewIndex]);

  const currentView: ViewType = viewSequence[currentViewIndex];

  const isCesiumView = ['original', 'exaggerated_kml', 'styled_kml', 'tiff_overlay', 'ion_imagery', 'drillhole_3d_combined', 'subsurface_deposit_view', 'geojson_drillholes_lithology', 'geojson_drillholes_assay'].includes(currentView);

  const handleNext = () => {
    setCurrentViewIndex((prevIndex) => Math.min(prevIndex + 1, viewSequence.length - 1));
  };

  const handlePrev = () => {
    setCurrentViewIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  return (
    <CesiumProvider>
      <main className="h-screen w-full relative bg-transparent">
        <div
          className={`absolute top-8 left-1/2 -translate-x-1/2 text-3xl font-bold text-white bg-black bg-opacity-50 p-4 rounded-lg z-20 transition-opacity duration-300 ${
            titleVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {title}
        </div>
        <div className="fixed top-4 left-4 z-30">
          <ChapterMenu
            viewSequence={viewSequence}
            viewTitles={viewTitles}
            currentViewIndex={currentViewIndex}
            setCurrentViewIndex={setCurrentViewIndex}
          />
        </div>
        <div className="h-full w-full">
          {isCesiumView ? (
            <CesiumViewer
              view={
                currentView as
                  | "original"
                  | "exaggerated_kml"
                  | "styled_kml"
                  | "tiff_overlay"
                  | "ion_imagery"
                  | "drillhole_3d_combined"
                  | "subsurface_deposit_view"
                  | "geojson_drillholes_lithology"
                  | "geojson_drillholes_assay"
              }
            />
          ) : currentView === "geospatial_viewer" ? (
            <GeospatialViewer />
          ) : currentView.startsWith("geovision_") ? (
            <GeoVision displayMode={currentView.replace('geovision_', '') as GeoVisionDisplayMode} />
          ) : currentView === "drillhole_map" ? (
            <DrillholeLocationMap />
          ) : currentView === "downhole_plot" ? (
            <DownholePlot />
          ) : currentView === "statistical_analysis" ? (
            <StatisticalAnalysis />
          ) : currentView === "subsurface_cutaway" ? (
            <SubsurfaceCutawayViewer />
          ) : currentView === "animated_reveal" ? (
            <AnimatedRevealViewer />
          ) : currentView === "resource_model_viewer" ? (
            <ResourceModelViewer />
          ) : null}
        </div>

        {/* Navigation Arrows */}
        {currentViewIndex > 0 && (
          <div
            onClick={handlePrev}
            className="fixed top-1/2 left-8 transform -translate-y-1/2 text-5xl font-bold text-white bg-black bg-opacity-30 p-2 px-6 rounded-lg cursor-pointer z-20 select-none hover:bg-opacity-50"
          >
            &lt;
          </div>
        )}
        {currentViewIndex < viewSequence.length - 1 && (
          <div
            onClick={handleNext}
            className="fixed top-1/2 right-8 transform -translate-y-1/2 text-5xl font-bold text-white bg-black bg-opacity-30 p-2 px-6 rounded-lg cursor-pointer z-20 select-none hover:bg-opacity-50"
          >
            &gt;
          </div>
        )}
      </main>
    </CesiumProvider>
  );
}