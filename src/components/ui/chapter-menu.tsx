"use client"

import * as React from "react"
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChapterMenuProps {
  viewSequence: readonly string[];
  viewTitles: { [key: string]: string };
  currentViewIndex: number;
  setCurrentViewIndex: (index: number) => void;
  className?: string;
}

export function ChapterMenu({
  viewSequence,
  viewTitles,
  currentViewIndex,
  setCurrentViewIndex,
  className,
}: ChapterMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Define chapter descriptions for storytelling
  const chapterDescriptions: { [key: string]: { title: string; description: string; facts: string[] } } = {
    'original': {
      title: 'Regional Setting',
      description: 'Overview of the Tanga graphite project location and regional geology.',
      facts: ['Tanzania East Africa', 'Graphite-rich province', 'Historic mining region']
    },
    'exaggerated_kml': {
      title: 'Topography & Terrain',
      description: 'Understanding the landscape and elevation of the project area.',
      facts: ['Elevated terrain', 'Drainage patterns', 'Access considerations']
    },
    'styled_kml': {
      title: 'Mining Licenses',
      description: 'Current mining license boundaries and permit areas.',
      facts: ['Active exploration licenses', '100 DD holes completed', 'Resource definition drilling']
    },
    'tanga_geological_map': {
      title: 'Geological Framework',
      description: 'Regional geological mapping and structural controls.',
      facts: ['Graphite-bearing formations', 'Regional shear zones', 'Structural complexity']
    },
    'drillhole_location_assay': {
      title: 'Drilling Program',
      description: 'Location and distribution of drill collars across the project.',
      facts: ['100 diamond drill holes', 'Average depth 120m', 'High-grade intercepts']
    },
    'lithology_view': {
      title: 'Lithology Model',
      description: '3D visualization of rock types and geological units.',
      facts: ['Graphite schist units', 'Host rock characterization', 'Alteration patterns']
    },
    'assay_view': {
      title: 'Assay Results',
      description: 'Graphitic carbon grades and mineralization distribution.',
      facts: ['Top 10% Avg: 8.41% Cg', 'Peak grade 14.48% Cg', 'Resource potential']
    },
    'block_model_carbon_view': {
      title: 'Carbon Block Model',
      description: '3D block model showing graphitic carbon distribution.',
      facts: ['Resource classification', 'Grade continuity', 'Mining considerations']
    },
    'block_model_resc_view': {
      title: 'Resource Classification',
      description: 'JORC-compliant resource classification and categories.',
      facts: ['Measured & Indicated', 'Inferred resources', 'Grade-tonnage curves']
    },
    'block_model_clip_view': {
      title: 'Pit Optimization',
      description: 'Preliminary pit designs and mining scenarios.',
      facts: ['Open pit potential', 'Strip ratio analysis', 'Economic optimization']
    }
  };

  return (
    <div className={`h-full pointer-events-auto ${className ?? ""}`}>
      {/* Burger Icon */}
      <button
        data-ui-chapter-trigger
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 p-2 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md text-white hover:bg-white/5 transition-colors"
        title={isOpen ? "Hide Chapters" : "Show Chapters"}
      >
        <div className="w-6 h-6 flex flex-col justify-center items-center">
          <span className={`block h-0.5 w-5 bg-white transition-transform duration-200 ${isOpen ? 'rotate-45 translate-y-1' : '-translate-y-1'}`}></span>
          <span className={`block h-0.5 w-5 bg-white transition-opacity duration-200 ${isOpen ? 'opacity-0' : 'opacity-100'}`}></span>
          <span className={`block h-0.5 w-5 bg-white transition-transform duration-200 ${isOpen ? '-rotate-45 -translate-y-1' : 'translate-y-1'}`}></span>
        </div>
      </button>

      {/* Collapsible Menu */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{
          width: isOpen ? 320 : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="w-80 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md p-4 shadow-[0_18px_45px_rgba(0,0,0,0.7)] h-full overflow-hidden" data-ui-chapter-sidebar>
          <h2 className="text-lg font-semibold font-headline mb-4 text-white">Project Chapters</h2>
          <ScrollArea className="h-[calc(100%-3rem)]">
            <div className="space-y-3">
              {viewSequence.map((view, index) => {
                const chapter = chapterDescriptions[view] || { title: viewTitles[view], description: '', facts: [] };
                const isActive = currentViewIndex === index;

                return (
                  <motion.div
                    key={view}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => setCurrentViewIndex(index)}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      isActive
                        ? 'bg-accent/20 border border-accent/50'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`font-medium text-sm ${isActive ? 'text-accent' : 'text-gray-200'}`}>
                        {chapter.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isActive ? 'bg-accent text-black' : 'bg-white/10 text-gray-400'
                      }`}>
                        {index + 1}
                      </span>
                    </div>

                    {chapter.description && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="text-xs text-gray-400 mb-2 leading-relaxed"
                      >
                        {chapter.description}
                      </motion.p>
                    )}

                    {chapter.facts.length > 0 && (
                      <motion.ul
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                        className="space-y-1"
                      >
                        {chapter.facts.slice(0, 2).map((fact, factIndex) => (
                          <li key={factIndex} className="text-xs text-gray-500 flex items-center">
                            <span className="w-1 h-1 bg-accent rounded-full mr-2 flex-shrink-0"></span>
                            {fact}
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </motion.div>
    </div>
  );
}
