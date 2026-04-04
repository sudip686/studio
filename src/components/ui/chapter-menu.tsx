"use client"

import * as React from "react"
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChapterMenuProps {
  viewSequence: readonly string[];
  viewTitles: { [key: string]: string };
  currentViewIndex: number;
  setCurrentViewIndex: (index: number) => void;
  currentSlideId?: string;
  className?: string;
}

// Narrative data matching deck.ts
const narrativeData: Record<string, {
  act: string;
  chapterTitle: string;
  storyBeat: string;
  emotionalTone: string;
  narrationScript: string;
}> = {
  'overview': {
    act: 'setup',
    chapterTitle: 'Where We Are',
    storyBeat: 'Establish the macro opportunity in East Africa',
    emotionalTone: 'curious',
    narrationScript: "Tanga Graphite is located in Tanzania, East Africa—one of the world's most prospective graphite regions."
  },
  'licenses': {
    act: 'setup',
    chapterTitle: 'What We Control',
    storyBeat: 'Show the strategic land position and permit security',
    emotionalTone: 'confident',
    narrationScript: "We control a contiguous, 100% owned tenement package with full exploration rights."
  },
  'accessibility': {
    act: 'journey',
    chapterTitle: 'How We Get Here',
    storyBeat: 'Demonstrate operational feasibility and low logistics costs',
    emotionalTone: 'reassuring',
    narrationScript: "The project benefits from excellent accessibility. Road networks connect to nearby towns."
  },
  'geology_map': {
    act: 'journey',
    chapterTitle: 'What We See',
    storyBeat: 'Establish the geological setting and graphite potential',
    emotionalTone: 'curious',
    narrationScript: "The regional geology is part of the Mozambique Belt—a greenstone terrane with proven graphite deposits."
  },
  'topography': {
    act: 'journey',
    chapterTitle: 'What We See',
    storyBeat: 'Show manageable topography that supports infrastructure development',
    emotionalTone: 'reassuring',
    narrationScript: "The terrain is moderately rugged but workable. Drainage patterns are well-defined."
  },
  'drillholes': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Demonstrate comprehensive data coverage and validation',
    emotionalTone: 'confident',
    narrationScript: "One hundred diamond drillholes provide exceptional coverage across the tenement package."
  },
  'drillholes_lithology': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Validate lithological framework and host rock characteristics',
    emotionalTone: 'analytical',
    narrationScript: "Lithology logging reveals consistent graphite schist units as the primary host."
  },
  'drillholes_assay': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Highlight grade continuity and high-quality assay data',
    emotionalTone: 'confident',
    narrationScript: "Assay results confirm consistent graphitic carbon intervals throughout the drillhole network."
  },
  'lithology': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Reveal 3D geological framework and host rock characteristics',
    emotionalTone: 'analytical',
    narrationScript: "The lithology model confirms graphite schist as the primary host unit in 3D."
  },
  'assay': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Demonstrate grade continuity and resource potential in 3D',
    emotionalTone: 'confident',
    narrationScript: "The 3D assay model shows consistent grade continuity throughout the mineralized system."
  },
  'carbon_model': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Present the quantitative resource model and grade probability',
    emotionalTone: 'confident',
    narrationScript: "Our block model shows a clear probability distribution for graphitic carbon >5%."
  },
  'classification': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Show JORC-compliant classification and next steps',
    emotionalTone: 'confident',
    narrationScript: "Our resource is classified according to JORC standards with measured, indicated, and inferred categories."
  },
  'metallurgy': {
    act: 'resolution',
    chapterTitle: 'How The Product Performs',
    storyBeat: 'Turn resource confidence into metallurgical confidence',
    emotionalTone: 'confident',
    narrationScript: "Flotation work demonstrates premium concentrate quality and strong recoveries across oxide and fresh material."
  },
  'product_quality': {
    act: 'resolution',
    chapterTitle: 'How The Product Performs',
    storyBeat: 'Link purity and flake distribution to product value',
    emotionalTone: 'inspiring',
    narrationScript: "Purity above ninety-seven percent total carbon and strong large-flake distribution strengthen the commercial product case."
  },
  'investment_thesis': {
    act: 'resolution',
    chapterTitle: 'Why Invest',
    storyBeat: 'Summarize the investment case and opportunity',
    emotionalTone: 'inspiring',
    narrationScript: "Tanga Graphite represents a compelling investment opportunity in East Africa's graphite province."
  }
};

const toneColors: Record<string, string> = {
  curious: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  confident: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  reassuring: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  analytical: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  inspiring: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
};

export function ChapterMenu({
  viewSequence,
  viewTitles,
  currentViewIndex,
  setCurrentViewIndex,
  currentSlideId,
  className,
}: ChapterMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Define chapter descriptions for storytelling with act markers
  const chapterDescriptions: { [key: string]: { title: string; description: string; facts: string[]; act?: string } } = {
    'overview': {
      title: 'Regional Setting',
      description: 'Overview of the Tanga graphite project location and regional geology.',
      facts: ['Tanzania East Africa', 'Graphite-rich province', 'Historic mining region'],
      act: 'setup'
    },
    'licenses': {
      title: 'Mining Licenses',
      description: 'Current mining license boundaries and permit areas.',
      facts: ['Active exploration licenses', '100 DD holes completed', 'Resource definition drilling'],
      act: 'setup'
    },
    'accessibility': {
      title: 'Tanaga Accessibility',
      description: 'Roads, villages, access routes.',
      facts: ['Road access', 'Nearby towns', 'Logistics footprint'],
      act: 'journey'
    },
    'geology_map': {
      title: 'Geological Map',
      description: 'Regional geological mapping and structural controls.',
      facts: ['Graphite-bearing formations', 'Regional shear zones', 'Structural complexity'],
      act: 'journey'
    },
    'topography': {
      title: 'Topography & Terrain',
      description: 'Understanding the landscape and elevation of the project area.',
      facts: ['Elevated terrain', 'Drainage patterns', 'Access considerations'],
      act: 'journey'
    },
    'drillholes': {
      title: 'Drilling Program',
      description: 'Location and distribution of drill collars across the project.',
      facts: ['100 diamond drill holes', 'Average depth 120m', 'High-grade intercepts'],
      act: 'journey'
    },
    'drillholes_lithology': {
      title: 'Lithology Model',
      description: '3D visualization of rock types and geological units.',
      facts: ['Graphite schist units', 'Host rock characterization', 'Alteration patterns'],
      act: 'journey'
    },
    'drillholes_assay': {
      title: 'Assay Results',
      description: 'Graphitic carbon grades and mineralization distribution.',
      facts: ['Top 10% Avg: 8.41% Cg', 'Peak grade 14.48% Cg', 'Resource potential'],
      act: 'journey'
    },
    'lithology': {
      title: '3D Lithology Model',
      description: '3D visualization of rock types and geological units.',
      facts: ['Graphite schist units', 'Host rock characterization', 'Alteration patterns'],
      act: 'journey'
    },
    'assay': {
      title: '3D Assay Model',
      description: 'Graphitic carbon grades and mineralization distribution.',
      facts: ['Top 10% Avg: 8.41% Cg', 'Peak grade 14.48% Cg', 'Resource potential'],
      act: 'journey'
    },
    'carbon_model': {
      title: 'Carbon Block Model',
      description: '3D block model showing graphitic carbon distribution.',
      facts: ['Resource classification', 'Grade continuity', 'Mining considerations'],
      act: 'journey'
    },
    'classification': {
      title: 'Resource Classification',
      description: 'JORC-compliant resource classification and categories.',
      facts: ['Measured & Indicated', 'Inferred resources', 'Grade-tonnage curves'],
      act: 'journey'
    },
    'metallurgy': {
      title: 'Metallurgical Performance',
      description: 'Flotation results showing concentrate purity and recovery performance.',
      facts: ['>97% TC concentrate', 'Strong oxide and fresh recoveries', 'Single carbonate-rich outlier explained'],
      act: 'resolution'
    },
    'product_quality': {
      title: 'Product Quality',
      description: 'Flake size and purity evidence supporting a premium graphite product case.',
      facts: ['>60% large and jumbo flake', '>73% best fresh flake outcome', '183 Mt resource base'],
      act: 'resolution'
    },
    'investment_thesis': {
      title: 'Investment Opportunity',
      description: 'A world-class graphite project in East Africa.',
      facts: [
        'Strategic land position in Mozambique Belt',
        '100 DD holes — comprehensive data package',
        'JORC-compliant resource classification',
        'Low-risk jurisdiction with strong exploration support'
      ],
      act: 'resolution'
    }
  };

  return (
    <div className={`h-full pointer-events-auto ${className ?? ""}`}>
      {/* Burger Icon */}
      <button
        data-ui-chapter-trigger
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(10,16,25,0.92),rgba(7,11,18,0.76))] p-2 text-white shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-colors hover:bg-white/10"
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
        <div className="flex h-full w-80 flex-col overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(9,15,24,0.94),rgba(7,11,18,0.78))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl" data-ui-chapter-sidebar>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/68">Deck Navigator</p>
              <h2 className="mt-1 text-lg font-semibold font-headline tracking-[-0.02em] text-white">Project Chapters</h2>
            </div>
            <div className="mt-1 h-10 w-px bg-gradient-to-b from-white/30 via-white/10 to-transparent" />
          </div>
          {/* Current Slide Narrative */}
          {currentSlideId && narrativeData[currentSlideId] && (
            <div className="mb-4 rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                  narrativeData[currentSlideId].act === 'setup' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  narrativeData[currentSlideId].act === 'journey' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  narrativeData[currentSlideId].act === 'resolution' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {narrativeData[currentSlideId].act}
                </span>
                <span className="text-xs font-medium text-white/92">{narrativeData[currentSlideId].chapterTitle}</span>
              </div>
              <p className="mb-2 text-xs italic text-white/72">"{narrativeData[currentSlideId].storyBeat}"</p>
              <p className="text-xs leading-relaxed text-white/50">{narrativeData[currentSlideId].narrationScript}</p>
            </div>
          )}
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
                    className={`cursor-pointer rounded-[22px] border p-3 transition-all duration-200 ${
                      isActive
                        ? 'border-amber-300/30 bg-[linear-gradient(180deg,rgba(245,158,11,0.18),rgba(255,255,255,0.06))] shadow-[0_18px_40px_rgba(245,158,11,0.12)]'
                        : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        {/* Act marker */}
                        {chapter.act && (
                          <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                            chapter.act === 'setup' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            chapter.act === 'journey' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            chapter.act === 'resolution' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {chapter.act}
                          </span>
                        )}
                        <h3 className={`font-medium text-sm tracking-[0.01em] ${isActive ? 'text-amber-100' : 'text-gray-200'}`}>
                          {chapter.title}
                        </h3>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isActive ? 'bg-amber-200 text-black' : 'bg-white/10 text-gray-400'
                      }`}>
                        {index + 1}
                      </span>
                    </div>

                    {chapter.description && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="mb-2 text-xs leading-relaxed text-white/52"
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
                          <li key={factIndex} className="flex items-center text-xs text-white/42">
                            <span className="mr-2 h-1 w-1 flex-shrink-0 rounded-full bg-amber-300"></span>
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
