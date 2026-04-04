import type { DeckSlide } from "@/lib/deck";

export const deckSlides: DeckSlide[] = [
  {
    id: "overview",
    title: "Tanga Graphite",
    subtitle: "East Africa's Emerging Graphite Province",
    facts: [
      "350 km NW of Dar es Salaam, Tanzania",
      "100 DD holes (2022-2025 exploration program)",
      "6.4 sq km within Mozambique Belt",
      "80 km from Tanga port - Indian Ocean access"
    ],
    view: "original",
    camera: {
      type: "flyTo",
      lon: 39.05,
      lat: -4.85,
      height: 180000,
      heading: 15,
      pitch: -35,
      duration: 3.0,
    },
    layers: { terrain: true, imagery: true, kml: true, drillholes: false, blockModel: false },
    speakerNotes: "Introduce the project location: 350km NW Dar es Salaam, 80km from Tanga port. Mozambique Belt - world-class graphite terrain. 100 DD holes completed 2022-2025.",
    narrative: {
      act: 'setup',
      chapterTitle: 'Where We Are',
      storyBeat: 'Establish the macro opportunity in East Africa',
      emotionalTone: 'curious',
      narrationScript: "Tanga Graphite is strategically located in Tanzania's Mozambique Belt—one of the world's most prospective graphite regions. Our 6.4 square kilometre land position is backed by a comprehensive 100-hole drilling campaign, providing exceptional data confidence for investors."
    },
    revealSequence: {
      elements: [
        { id: 'title', delayMs: 0, animation: 'fade-in' },
        { id: 'stat-1', delayMs: 500, animation: 'slide-up' },
        { id: 'stat-2', delayMs: 800, animation: 'slide-up' },
        { id: 'stat-3', delayMs: 1100, animation: 'slide-up' },
        { id: 'stat-4', delayMs: 1400, animation: 'slide-up' },
      ]
    }
  },
  {
    id: "licenses",
    title: "Strategic Tenement Package",
    subtitle: "100% Owned Exploration Ground",
    facts: [
      "6.4 sq km 100% owned tenement",
      "Contiguous exploration ground",
      "Permit secure through 2030+",
      "Low royalty jurisdiction - Tanzania"
    ],
    view: "styled_kml",
    camera: {
      type: "flyTo",
      lon: 39.07,
      lat: -4.84,
      height: 42000,
      heading: 10,
      pitch: -55,
      duration: 2.5,
    },
    layers: { kml: true, terrain: true, imagery: true },
    annotations: [
      {
        type: "callout",
        lon: 39.07,
        lat: -4.84,
        text: "6.4 sq km — 100% Owned",
        title: "Strategic Land Position",
      },
    ],
    speakerNotes: "6.4 sq km contiguous 100% owned tenement. Tanzania - mining-friendly, low royalty jurisdiction. Permit secure through 2030+.",
    narrative: {
      act: 'setup',
      chapterTitle: 'What We Control',
      storyBeat: 'Show the strategic land position and permit security',
      emotionalTone: 'confident',
      narrationScript: "We control a contiguous, 100% owned tenement package with full exploration rights. The permit is secure with long tenure and low royalty obligations—a jurisdictional advantage in Tanzania's mining-friendly regulatory environment."
    },
    revealSequence: {
      elements: [
        { id: 'boundary-draw', delayMs: 200, animation: 'draw-line' },
        { id: 'callout', delayMs: 1500, animation: 'fade-in' },
        { id: 'stat-1', delayMs: 1800, animation: 'slide-up' },
        { id: 'stat-2', delayMs: 2100, animation: 'slide-up' },
      ]
    }
  },
  {
    id: "accessibility",
    title: "Infrastructure Access",
    subtitle: "Roads, ports, and logistics",
    facts: [
      "80 km to Tanga port - Indian Ocean",
      "Regional highway access maintained",
      "350 km to Dar es Salaam",
      "Power/water infrastructure accessible"
    ],
    view: "tanaga_accessibility",
    cameraMode: "view",
    camera: {
      type: "flyTo",
      lon: 39.05,
      lat: -4.85,
      height: 48000,
      heading: 20,
      pitch: -50,
      duration: 2.0,
    },
    layers: { imagery: true, kml: false },
    speakerNotes: "80km to Tanga port (Indian Ocean access). Regional highway network maintained. 350km to Dar es Salaam. Power and water accessible for operations - reduces CAPEX.",
    narrative: {
      act: 'journey',
      chapterTitle: 'How We Get Here',
      storyBeat: 'Demonstrate operational feasibility and low logistics costs',
      emotionalTone: 'reassuring',
      narrationScript: "Infrastructure is a key de-risking factor. We're just 80 kilometers from Tanga port with road access via maintained regional highways. Power and water infrastructure are accessible for future mining operations—significantly reducing CAPEX requirements."
    },
    revealSequence: {
      elements: [
        { id: 'road-network', delayMs: 0, animation: 'fade-in' },
        { id: 'access-points', delayMs: 1500, animation: 'pulse' },
        { id: 'stat-1', delayMs: 2000, animation: 'slide-up' },
        { id: 'stat-2', delayMs: 2300, animation: 'slide-up' },
      ]
    }
  },
  {
    id: "geology_map",
    title: "Regional Geology",
    subtitle: "Mozambique Belt graphite province",
    facts: [
      "Mozambique Belt - high-grade metamorphic",
      "Graphitic schist host rocks",
      "NE-SW structural trend",
      "Proven graphite-endowed terrane"
    ],
    view: "tanga_geological_map",
    cameraMode: "view",
    camera: {
      type: "flyTo",
      lon: 39.06,
      lat: -4.86,
      height: 42000,
      heading: 18,
      pitch: -50,
      duration: 2.0,
    },
    layers: { imagery: true, kml: false },
    speakerNotes: "Mozambique Belt - high-grade metamorphic terrain. Graphitic schist (Usagaran Graphite Series) is primary host. NE-SW structural trend controls mineralization.",
    narrative: {
      act: 'journey',
      chapterTitle: 'What We See',
      storyBeat: 'Establish the geological setting and graphite potential',
      emotionalTone: 'curious',
      narrationScript: "The geological setting is exceptional. We're exploring graphitic schists within the Mozambique Belt's high-grade metamorphic terrain—the right rocks, in the right place, at the right scale. This is a proven graphite-endowed province with world-class deposits."
    },
    revealSequence: {
      elements: [
        { id: 'geological-units', delayMs: 0, animation: 'fade-in' },
        { id: 'structural-trends', delayMs: 1500, animation: 'draw-line' },
        { id: 'highlight-area', delayMs: 2500, animation: 'pulse' },
      ]
    }
  },
  {
    id: "topography",
    title: "Topography & Terrain",
    subtitle: "Weathering profile and relief",
    facts: [
      "Workable topography for open pit",
      "Well-defined drainage patterns",
      "3-zone weathering profile",
      "Favorable for infrastructure"
    ],
    view: "exaggerated_kml",
    camera: {
      type: "flyTo",
      lon: 39.05,
      lat: -4.85,
      height: 85000,
      heading: 25,
      pitch: -45,
      duration: 2.1,
    },
    layers: { terrain: true, imagery: true, kml: true },
    speakerNotes: "Moderately rugged, workable for open pit. 3-zone weathering: Oxide (1.95 t/m³), Transition (2.33 t/m³), Fresh (2.65 t/m³). Drainage well-defined.",
    narrative: {
      act: 'journey',
      chapterTitle: 'What We See',
      storyBeat: 'Show manageable topography that supports infrastructure development',
      emotionalTone: 'reassuring',
      narrationScript: "The terrain is moderately rugged but highly workable for open pit mining. Drainage patterns are well-defined, and the three-zone weathering profile—from oxide through transition to fresh rock—supports straightforward mine planning and metallurgical forecasting."
    },
    revealSequence: {
      elements: [
        { id: 'terrain-surface', delayMs: 0, animation: 'fade-in' },
        { id: 'drainage-lines', delayMs: 1500, animation: 'draw-line' },
        { id: 'elevation-heatmap', delayMs: 2500, animation: 'color-shift' },
      ]
    }
  },
  {
    id: "drillholes",
    title: "Drillhole Coverage",
    subtitle: "100 diamond drillholes (2022-2025)",
    facts: [
      "100 DD holes (2022-2025)",
      "RTK GPS collar survey + LiDAR DTM",
      "Core orientation verified (Reflex ACT)",
      "JORC-ready QAQC dataset"
    ],
    view: "drillhole_location_assay",
    cameraMode: "view",
    camera: {
      type: "flyTo",
      lon: 39.06,
      lat: -4.86,
      height: 22000,
      heading: 5,
      pitch: -50,
      duration: 1.8,
    },
    layers: { drillholes: "assay", imagery: true, kml: true },
    annotations: [
      {
        type: "callout",
        lon: 39.065,
        lat: -4.855,
        text: "High-grade corridor defined",
        title: "100 DD Holes",
        slot: "top-right",
      },
    ],
    speakerNotes: "100 diamond drillholes completed 2022-2025. Zinex A5 crawler rig (main) + 4x Shandong portable rigs. RTK GPS collar survey + LiDAR DTM integration. Core orientation verified with Reflex ACT Coretell tool. QAQC acceptable for JORC reporting.",
    narrative: {
      act: 'journey',
      chapterTitle: 'What We Know',
      storyBeat: 'Demonstrate comprehensive data coverage and validation',
      emotionalTone: 'confident',
      narrationScript: "One hundred diamond drillholes provide exceptional coverage across the tenement. Using professional crawler and portable rigs with RTK GPS survey and core orientation verification, this is a drill-defined opportunity with consistent high-grade intercepts and JORC-ready data quality."
    },
    revealSequence: {
      elements: [
        { id: 'drillhole-points', delayMs: 0, animation: 'fade-in' },
        { id: 'coverage-density', delayMs: 1500, animation: 'pulse' },
        { id: 'grade-zones', delayMs: 2500, animation: 'color-shift' },
        { id: 'callout', delayMs: 3000, animation: 'slide-up' },
      ]
    }
  },
  {
    id: "drillholes_lithology",
    title: "Drillholes (Lithology)",
    subtitle: "Graphitic schist host rocks",
    facts: [
      "100% core logging coverage",
      "Graphitic schist = primary host rock",
      "Clear lithology contacts defined",
      "Consistent stratigraphy across tenement"
    ],
    view: "drillhole_location_lithology",
    cameraMode: "view",
    camera: {
      type: "flyTo",
      lon: 39.06,
      lat: -4.85,
      height: 26000,
      heading: 12,
      pitch: -45,
      duration: 1.8,
    },
    layers: { drillholes: "lithology", kml: true, imagery: false },
    annotations: [
      {
        type: "callout",
        lon: 39.06,
        lat: -4.85,
        text: "Graphitic schist - primary host",
        title: "Host Rock",
        slot: "top-right",
      },
    ],
    speakerNotes: "100% core logging coverage. Graphitic schist (Usagaran Graphite Series) is primary mineralized unit. Weathering domains: oxide (strongly oxidized, clay-rich), transition (partially weathered schist), fresh (unweathered graphitic schist). Clear contacts between mineralized and wall-rock. Consistent stratigraphic succession across tenement.",
    narrative: {
      act: 'journey',
      chapterTitle: 'What We Know',
      storyBeat: 'Validate lithological framework and host rock characteristics',
      emotionalTone: 'analytical',
      narrationScript: "Lithology logging reveals graphitic schist as the primary host unit across the tenement. The stratigraphic succession is well-defined with clear contacts between mineralized and wall-rock units. Weathering domains—oxide, transition, and fresh—provide a framework for metallurgical planning."
    },
    revealSequence: {
      elements: [
        { id: 'lithology-intervals', delayMs: 0, animation: 'fade-in' },
        { id: 'unit-colors', delayMs: 1500, animation: 'color-shift' },
        { id: 'contact-lines', delayMs: 2500, animation: 'draw-line' },
        { id: 'callout', delayMs: 3000, animation: 'slide-up' },
      ]
    }
  },
  {
    id: "drillholes_assay",
    title: "Drillholes (Assay)",
    subtitle: "Graphitic carbon intervals",
    facts: [
      "SGS Mwanza certified assay laboratory",
      "3% TGC cut-off (statistically determined)",
      "No top-cut required (COV=0.404)",
      "Lognormal grade distribution"
    ],
    view: "geojson_drillholes_assay",
    cameraMode: "view",
    camera: {
      type: "flyTo",
      lon: 39.06,
      lat: -4.85,
      height: 26000,
      heading: 12,
      pitch: -45,
      duration: 1.8,
    },
    layers: { drillholes: "assay", kml: true, imagery: false },
    annotations: [
      {
        type: "callout",
        lon: 39.06,
        lat: -4.85,
        text: "3% TGC cut-off (statistical)",
        title: "Grade Cut-off",
        slot: "top-right",
      },
    ],
    speakerNotes: "Assay laboratory: SGS Mwanza (certified). Sample prep: crushed <2mm, pulverized 85% -75μm. Cut-off grade: 3% TGC (statistically determined, not arbitrary). No top-cut applied (COV=0.404 indicates low variability). Grade distribution: lognormal with bimodal populations. Composite length: 2m.",
    narrative: {
      act: 'journey',
      chapterTitle: 'What We Know',
      storyBeat: 'Highlight grade continuity and high-quality assay data',
      emotionalTone: 'confident',
      narrationScript: "Assay results from SGS Mwanza confirm consistent graphitic carbon throughout. The 3% TGC cut-off is statistically determined—not arbitrary. With a low coefficient of variation (0.404), no top-cutting was needed, demonstrating the grade consistency that underpins this resource."
    },
    revealSequence: {
      elements: [
        { id: 'assay-intervals', delayMs: 0, animation: 'fade-in' },
        { id: 'grade-heatmap', delayMs: 1500, animation: 'color-shift' },
        { id: 'corridor-highlight', delayMs: 2500, animation: 'pulse' },
        { id: 'callout', delayMs: 3000, animation: 'slide-up' },
      ]
    }
  },
  {
    id: "lithology",
    title: "3D Lithology Model",
    subtitle: "Subsurface geology interpretation",
    facts: [
      "Micromine 2025 3D model (Build 25.0.5164)",
      "24 cross-section interpretation",
      "Wireframed mineralized envelopes",
      "Structural controls defined"
    ],
    view: "lithology_view",
    camera: {
      type: "flyTo",
      lon: 39.06,
      lat: -4.86,
      height: 18000,
      heading: 15,
      pitch: -40,
      duration: 2.0,
    },
    layers: { drillholes: "lithology", imagery: false, kml: false },
    annotations: [
      {
        type: "callout",
        lon: 39.06,
        lat: -4.86,
        text: "Multiple coherent mineralized zones",
        title: "3D Framework",
        slot: "top-right",
      },
    ],
    speakerNotes: "3D modelling software: Micromine 2025 (Build 25.0.5164). Interpretation method: 24 cross-sections with individual wireframed mineralized envelopes. Volume control: wireframes snapped to drillhole contacts. Structural controls: foliation-guided interpretation. Multiple coherent mineralized bodies identified.",
    narrative: {
      act: 'journey',
      chapterTitle: 'What We Know',
      storyBeat: 'Reveal 3D geological framework and host rock characteristics',
      emotionalTone: 'analytical',
      narrationScript: "Moving into three dimensions, the Micromine model confirms graphite schist as the primary host. Twenty-four cross-sections define multiple coherent mineralized envelopes with structural controls clearly understood. This is a geologically coherent system, not a collection of random zones."
    },
    revealSequence: {
      elements: [
        { id: 'lithology-surface', delayMs: 0, animation: 'fade-in' },
        { id: 'unit-colors', delayMs: 1500, animation: 'color-shift' },
        { id: 'structural-surfaces', delayMs: 2500, animation: 'draw-line' },
        { id: 'callout', delayMs: 3000, animation: 'slide-up' },
      ]
    }
  },
  {
    id: "assay",
    title: "3D Assay Model",
    subtitle: "Grade distribution in 3D",
    facts: [
      "Ordinary Kriging estimation",
      "Lithology-domained interpolation",
      "Grade continuity confirmed by variography",
      "High-grade shoots defined"
    ],
    view: "assay_view",
    camera: {
      type: "flyTo",
      lon: 39.06,
      lat: -4.86,
      height: 16000,
      heading: 20,
      pitch: -45,
      duration: 2.0,
    },
    layers: { drillholes: "assay", imagery: false, kml: false },
    annotations: [
      {
        type: "callout",
        lon: 39.06,
        lat: -4.86,
        text: "High-grade zones (>5% TGC) defined",
        title: "Grade Shoots",
        slot: "top-right",
      },
    ],
    speakerNotes: "Grade interpolation: Ordinary Kriging (OK). Domaining: by lithology wireframe. Compositing: 2m length-weighted. Boundary handling: compositing stopped at contacts. Grade continuity: confirmed by variography. High-grade shoots: well-defined within mineralized envelopes.",
    narrative: {
      act: 'journey',
      chapterTitle: 'What We Know',
      storyBeat: 'Demonstrate grade continuity and resource potential in 3D',
      emotionalTone: 'confident',
      narrationScript: "The three-dimensional assay model shows consistent grade continuity throughout. Using Ordinary Kriging with lithology domaining, high-grade shoots are well-defined within the mineralized envelopes. This grade architecture supports a coherent, estimable resource."
    },
    revealSequence: {
      elements: [
        { id: 'grade-cloud', delayMs: 0, animation: 'fade-in' },
        { id: 'high-grade-zones', delayMs: 1500, animation: 'pulse' },
        { id: 'trend-surface', delayMs: 2500, animation: 'draw-line' },
        { id: 'callout', delayMs: 3000, animation: 'slide-up' },
      ]
    }
  },
  {
    id: "carbon_model",
    title: "Carbon Block Model",
    subtitle: ">5% TGC probability distribution",
    facts: [
      "Ordinary Kriging block model derived",
      "3% TGC cut-off (5% shown for visualization)",
      "Density by weathering zone (1.95/2.33/2.65 t/m³)",
      "Spatial continuity confirmed by variography"
    ],
    view: "block_model_carbon_view",
    camera: {
      type: "flyTo",
      lon: 39.06,
      lat: -4.86,
      height: 14000,
      heading: 25,
      pitch: -50,
      duration: 2.0,
    },
    style: { cutoff: 5, opacity: 0.65, colormap: "viridis" },
    annotations: [
      {
        type: "callout",
        lon: 39.06,
        lat: -4.86,
        text: "5% TGC iso-surface highlighted",
        title: "Grade Probability",
        slot: "top-right",
      },
    ],
    speakerNotes: "Block model parameters: Estimation by Ordinary Kriging. Domains by lithology and weathering. Cutoff: 3% TGC (reported), 5% TGC shown for visualization. Density assignment: Oxide (1.95 t/m³), Transition (2.33 t/m³), Fresh (2.65 t/m³). Variography confirms spatial continuity.",
    narrative: {
      act: 'journey',
      chapterTitle: 'What We Know',
      storyBeat: 'Present the quantitative resource model and grade probability',
      emotionalTone: 'confident',
      narrationScript: "Our block model, derived from rigorous Ordinary Kriging, shows clear probability distribution for graphitic carbon. Density is assigned by weathering zone—1.95 for oxide, 2.33 for transition, 2.65 for fresh rock. The cutoff grade is well-defined, supporting a robust resource estimate."
    },
    revealSequence: {
      elements: [
        { id: 'block-cloud', delayMs: 0, animation: 'fade-in' },
        { id: 'cutoff-surface', delayMs: 1500, animation: 'color-shift' },
        { id: 'probability-heatmap', delayMs: 2500, animation: 'pulse' },
        { id: 'callout', delayMs: 3000, animation: 'slide-up' },
      ]
    }
  },
  {
    id: "classification",
    title: "Resource Classification",
    subtitle: "JORC Code compliant resource",
    facts: [
      "JORC Code compliant (2012 Edition)",
      "Indicated + Inferred categories reported",
      "CP: Serikjan Urbisinov (AMC Principal Geologist)",
      "Ready for public reporting"
    ],
    view: "block_model_resc_view",
    camera: {
      type: "flyTo",
      lon: 39.06,
      lat: -4.86,
      height: 14000,
      heading: 25,
      pitch: -50,
      duration: 2.0,
    },
    layers: { drillholes: false, blockModel: "resc", imagery: false, kml: false },
    annotations: [
      {
        type: "callout",
        lon: 39.06,
        lat: -4.86,
        text: "Suitable for JORC public reporting",
        title: "JORC Compliant",
        slot: "top-right",
      },
    ],
    speakerNotes: "JORC Compliance: Full compliance achieved (2012 Edition). Classification basis: drillhole spacing density, grade continuity (variogram ranges), QAQC results (acceptable), geological confidence. Categories: Indicated (closer drill spacing, high confidence) + Inferred (peripheral/sparser drilling). Competent Person: Serikjan Urbisinov (AMC Principal Geologist). Public reporting: suitable for JORC release.",
    narrative: {
      act: 'journey',
      chapterTitle: 'What We Know',
      storyBeat: 'Show JORC-compliant classification and next steps',
      emotionalTone: 'confident',
      narrationScript: "The resource is classified according to JORC Code standards—Indicated where drill spacing and grade continuity support higher confidence, Inferred in peripheral areas. With acceptable QAQC results and a named Competent Person, this is investor-ready and suitable for public reporting."
    },
    revealSequence: {
      elements: [
        { id: 'measured-zones', delayMs: 0, animation: 'fade-in' },
        { id: 'indicated-zones', delayMs: 1500, animation: 'color-shift' },
        { id: 'inferred-zones', delayMs: 2500, animation: 'pulse' },
        { id: 'callout', delayMs: 3000, animation: 'slide-up' },
      ]
    }
  },
  {
    id: "metallurgy",
    title: "Metallurgical Performance",
    subtitle: "Premium concentrate from flotation testwork",
    facts: [
      ">97% TC concentrate achieved across composites",
      "93.0% oxide recovery in optimization testwork",
      "94.4% fresh recovery in optimization testwork",
      "Carbonate-rich TDM004 explains the main recovery outlier"
    ],
    view: "styled_kml",
    camera: {
      type: "flyTo",
      lon: 39.065,
      lat: -4.852,
      height: 17000,
      heading: 18,
      pitch: -50,
      duration: 2.1,
    },
    layers: { terrain: true, imagery: true, kml: true, drillholes: false, blockModel: false },
    annotations: [
      {
        type: "callout",
        lon: 39.065,
        lat: -4.852,
        text: "Premium flotation concentrate quality demonstrated",
        title: "Met testwork",
      },
    ],
    speakerNotes: "IMO flotation work shows all composites achieving better than 97% TC, comfortably above the typical saleable flake product threshold of 94% TC. Oxide optimization delivered 98.4% TC at 93.0% recovery, while fresh optimization delivered 98.6% TC at 94.4% recovery. TDM004 was the key outlier because carbonate content around 1.8% suppressed recovery.",
    narrative: {
      act: 'resolution',
      chapterTitle: 'How The Product Performs',
      storyBeat: 'Turn resource confidence into metallurgical confidence',
      emotionalTone: 'confident',
      narrationScript: "Resource scale matters, but conversion matters more. The flotation program consistently produced premium concentrate grades above ninety-seven percent total carbon, with strong recoveries in both oxide and fresh material. That means the project is not just large on paper, it is also demonstrating a credible path to saleable graphite product."
    },
    revealSequence: {
      elements: [
        { id: 'kml-surface', delayMs: 0, animation: 'fade-in' },
        { id: 'met-callout', delayMs: 1200, animation: 'slide-up' },
        { id: 'met-stat-1', delayMs: 1700, animation: 'slide-up' },
        { id: 'met-stat-2', delayMs: 2200, animation: 'slide-up' },
      ]
    }
  },
  {
    id: "product_quality",
    title: "Product Quality & Flake Value",
    subtitle: "Large flake distribution strengthens market positioning",
    facts: [
      ">60% large and jumbo flake in most ore types",
      ">57% oxide flake content at +150 um",
      ">73% best fresh composite flake content at +150 um",
      "183 Mt resource base supports premium product strategy"
    ],
    view: "exaggerated_kml",
    camera: {
      type: "flyTo",
      lon: 39.058,
      lat: -4.848,
      height: 24000,
      heading: 28,
      pitch: -44,
      duration: 2.2,
    },
    layers: { terrain: true, imagery: true, kml: true, drillholes: false, blockModel: false },
    annotations: [
      {
        type: "callout",
        lon: 39.058,
        lat: -4.848,
        text: "Large-flake product profile supports premium pricing",
        title: "Product value",
      },
    ],
    speakerNotes: "Investor-deck messaging combines the 183 Mt at 4.86% TGC resource with better than 97% TC purity and strong large-flake outcomes. Oxide composites exceed 57% at plus 150 micron, fresh composites TDM003 to TDM005 exceed 61%, and TDM008 exceeds 73%. Only TDM001 and TDM002 were materially lower at 34.8% and 42.5%.",
    narrative: {
      act: 'resolution',
      chapterTitle: 'How The Product Performs',
      storyBeat: 'Link purity and flake distribution to product value',
      emotionalTone: 'inspiring',
      narrationScript: "The product story improves further when flake size is considered. Most ore types deliver a large and jumbo flake distribution above sixty percent, with the best fresh composite exceeding seventy-three percent at plus one hundred and fifty microns. That combination of scale, purity, and flake profile is what makes the project commercially interesting."
    },
    revealSequence: {
      elements: [
        { id: 'terrain-surface', delayMs: 0, animation: 'fade-in' },
        { id: 'product-callout', delayMs: 1200, animation: 'pulse' },
        { id: 'product-stat-1', delayMs: 1700, animation: 'slide-up' },
        { id: 'product-stat-2', delayMs: 2200, animation: 'slide-up' },
      ]
    }
  },
  // Closing slide
  {
    id: "investment_thesis",
    title: "Investment Opportunity",
    subtitle: "Partner with us",
    facts: [
      "JORC-compliant resource ready for reporting",
      "100 DD holes de-risked asset",
      "80 km to Tanga port - Indian Ocean access",
      "Battery materials demand surge (EVs, energy storage)"
    ],
    view: "original",
    camera: {
      type: "flyTo",
      lon: 39.05,
      lat: -4.85,
      height: 180000,
      heading: 15,
      pitch: -35,
      duration: 3.0,
    },
    layers: { terrain: true, imagery: true, kml: true, drillholes: false, blockModel: false },
    annotations: [
      {
        type: "callout",
        lon: 39.05,
        lat: -4.85,
        text: "Graphite demand driven by battery anodes & EVs",
        title: "Market Opportunity",
      },
    ],
    speakerNotes: "Investment highlights: Strategic land position in Mozambique Belt, 100 DD holes comprehensive data package, JORC-compliant resource classification, 80km from Tanga port (Indian Ocean access), low-risk jurisdiction (Tanzania mining-friendly). Graphite demand driven by battery anodes, EVs, energy storage. Next steps: Additional drilling for conversion (Inferred to Indicated), metallurgical testwork (flake size distribution), PFS/scoping study pathway, marketing agreements with off-takers.",
    narrative: {
      act: 'resolution',
      chapterTitle: 'The Investment Case',
      storyBeat: 'Close with compelling investment thesis and call to action',
      emotionalTone: 'inspiring',
      narrationScript: "Tanga Graphite represents a compelling investment opportunity. We have a JORC-compliant resource in Tanzania's Mozambique Belt, de-risked by 100 drillholes, with port access just 80 kilometers away. With global graphite demand driven by battery anodes and EVs, the question isn't whether graphite will be in demand—it's whether you'll have exposure to quality assets like Tanga."
    },
    revealSequence: {
      elements: [
        { id: 'title', delayMs: 0, animation: 'fade-in' },
        { id: 'fact-1', delayMs: 800, animation: 'slide-up' },
        { id: 'fact-2', delayMs: 1500, animation: 'slide-up' },
        { id: 'fact-3', delayMs: 2200, animation: 'slide-up' },
        { id: 'fact-4', delayMs: 2900, animation: 'slide-up' },
        { id: 'callout', delayMs: 3500, animation: 'pulse' },
      ]
    }
  }
];
