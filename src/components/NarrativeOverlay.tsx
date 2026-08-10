'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OverlaySlot } from '@/ui/overlays';

interface NarrativeOverlayProps {
  slideId: string;
}

// Map slide IDs to narrative data
const narrativeData: Record<string, {
  act: string;
  chapterTitle: string;
  storyBeat: string;
  emotionalTone: string;
  narrationScript: string;
}> = {
  // Setup Act
  'overview': {
    act: 'setup',
    chapterTitle: 'Where We Are',
    storyBeat: 'Establish the macro opportunity in East Africa',
    emotionalTone: 'curious',
    narrationScript: "Tanga Graphite is located in Tanzania, East Africa—one of the world's most prospective graphite regions. Our 10.56 square kilometer land position sits within the Mozambique Belt, a geological province known for hosting world-class graphite deposits."
  },
  'licenses': {
    act: 'setup',
    chapterTitle: 'What We Control',
    storyBeat: 'Show the strategic land position and permit security',
    emotionalTone: 'confident',
    narrationScript: "We control a contiguous, 100% owned tenement package with full exploration rights. The permit is secure, with low royalty obligations and strong jurisdictional support."
  },
  // Journey Act
  'accessibility': {
    act: 'journey',
    chapterTitle: 'How We Get Here',
    storyBeat: 'Demonstrate operational feasibility and low logistics costs',
    emotionalTone: 'reassuring',
    narrationScript: "The project benefits from excellent accessibility. Road networks connect to nearby towns, keeping logistics costs competitive. This accessibility is a key advantage for future mining operations."
  },
  'geology_map': {
    act: 'journey',
    chapterTitle: 'What We See',
    storyBeat: 'Establish the geological setting and graphite potential',
    emotionalTone: 'curious',
    narrationScript: "The regional geology is part of the Mozambique Belt—a greenstone terrane with a proven track record for hosting world-class graphite deposits. Our tenement package sits directly within these graphite-bearing units."
  },
  'topography': {
    act: 'journey',
    chapterTitle: 'What We See',
    storyBeat: 'Show manageable topography that supports infrastructure development',
    emotionalTone: 'reassuring',
    narrationScript: "The terrain is moderately rugged but workable. Drainage patterns are well-defined, and the topography supports straightforward infrastructure planning for future mining operations."
  },
  'drillholes': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Demonstrate comprehensive data coverage and validation',
    emotionalTone: 'confident',
    narrationScript: "One hundred diamond drillholes provide exceptional coverage across the tenement package. This density allows us to confidently identify high-grade corridors and understand the three-dimensional geometry of mineralization."
  },
  'drillholes_lithology': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Validate lithological framework and host rock characteristics',
    emotionalTone: 'analytical',
    narrationScript: "Lithology logging reveals consistent graphite schist units as the primary host. The stratigraphic succession is well-defined, with clear contacts between mineralized and wall-rock units."
  },
  'drillholes_assay': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Highlight grade continuity and high-quality assay data',
    emotionalTone: 'confident',
    narrationScript: "Assay results confirm consistent graphitic carbon intervals throughout the drillhole network. The grade distribution shows strong continuity, supporting a coherent mineralized system."
  },
  'lithology': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Reveal 3D geological framework and host rock characteristics',
    emotionalTone: 'analytical',
    narrationScript: "Moving into three dimensions, the lithology model confirms graphite schist as the primary host unit. Structural controls are clearly defined, with mineralized envelopes following predictable stratigraphic trends."
  },
  'assay': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Demonstrate grade continuity and resource potential in 3D',
    emotionalTone: 'confident',
    narrationScript: "The three-dimensional assay model shows consistent grade continuity throughout the mineralized system. High-grade shoots are well-defined, supporting a coherent resource trend that can be confidently estimated."
  },
  'carbon_model': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Present the quantitative resource model and grade probability',
    emotionalTone: 'confident',
    narrationScript: "Our block model, derived from rigorous geostatistical methods, shows a clear probability distribution for graphitic carbon greater than five percent. The cutoff grade is well-defined, supporting a robust resource estimate."
  },
  'classification': {
    act: 'journey',
    chapterTitle: 'What We Know',
    storyBeat: 'Show JORC-compliant classification and next steps',
    emotionalTone: 'confident',
    narrationScript: "Our resource is classified according to JORC standards, with measured, indicated, and inferred categories clearly defined. This framework supports a transparent, defensible resource estimate ready for investor review."
  },
  // Resolution Act
  'investment_thesis': {
    act: 'resolution',
    chapterTitle: 'Why Invest',
    storyBeat: 'Summarize the investment case and opportunity',
    emotionalTone: 'inspiring',
    narrationScript: "Tanga Graphite represents a compelling investment opportunity. We have established a strategic land position within one of the world's most prospective graphite provinces. With 100 diamond drillholes providing comprehensive data, a JORC-compliant resource classification, and strong jurisdictional support, we are positioned to deliver value to investors."
  }
};

const toneColors: Record<string, string> = {
  curious: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  confident: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  reassuring: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  analytical: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  inspiring: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
};

export default function NarrativeOverlay({ slideId }: NarrativeOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const narrative = narrativeData[slideId];

  useEffect(() => {
    // Trigger fade-in animation when slide changes
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [slideId]);

  if (!narrative) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <OverlaySlot slot="top-left" wrapperClassName="mt-16 max-w-[26rem]">
          <motion.aside
            initial={{ opacity: 0, x: -24, y: 12 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -16, y: 16 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="pointer-events-none relative overflow-hidden rounded-[26px] border border-white/18 bg-[linear-gradient(180deg,rgba(12,16,23,0.98),rgba(6,8,12,0.94))] px-5 py-5 text-white shadow-[0_18px_46px_rgba(0,0,0,0.34)] backdrop-blur-sm"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_38%)]" />
            <div className="relative space-y-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.28 }}
                className="flex items-center gap-3"
              >
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${toneColors[narrative.emotionalTone] || 'bg-gray-500/20 text-gray-400'}`}>
                  {narrative.act}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-white/35 to-transparent" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/68">Story Beat</p>
                <h3 className="mt-2 text-[1.55rem] font-semibold leading-tight tracking-tight text-white">
                  {narrative.chapterTitle}
                </h3>
                <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-white/88">
                  {narrative.storyBeat}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="rounded-[22px] border border-white/14 bg-black/36 px-4 py-4"
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/62">Narration</p>
                <p className="mt-3 text-[0.98rem] leading-7 text-white/88">
                  {narrative.narrationScript}
                </p>
              </motion.div>
            </div>
          </motion.aside>
        </OverlaySlot>
      )}
    </AnimatePresence>
  );
}
