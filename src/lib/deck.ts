export type DeckCamera = {
  type: "flyTo";
  lon: number;
  lat: number;
  height: number;
  heading?: number;
  pitch?: number;
  duration?: number;
  distance?: number;
};

export type DeckLayers = {
  terrain?: boolean;
  imagery?: boolean;
  kml?: boolean;
  drillholes?: "assay" | "lithology" | false;
  blockModel?: "carbon" | "resc" | false;
};

export type DeckStyle = {
  cutoff?: number;
  opacity?: number;
  colormap?: string;
};

export type DeckAnnotation = {
  id?: string;
  type: "label" | "callout";
  lon: number;
  lat: number;
  height?: number;
  text: string;
  title?: string;
  anchor?: "center" | "left" | "right";
  slot?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
};

export type NarrativeAct = 'setup' | 'journey' | 'resolution';
export type EmotionalTone = 'curious' | 'confident' | 'exciting' | 'dramatic' | 'reassuring' | 'analytical' | 'inspiring';

export type NarrativeMetadata = {
  act: NarrativeAct;
  chapterTitle: string;
  storyBeat: string;  // The one-line narrative purpose
  emotionalTone: EmotionalTone;
  narrationScript?: string;  // Full narration text for presenter
};

export type PresentationPanelVariant = "cover" | "focus" | "evidence" | "closing";
export type PresentationThemeTone = "sky" | "emerald" | "amber" | "violet";
export type PresentationStageMode = "hero" | "narrative" | "technical" | "closing";
export type PresentationMediaLayout = "full-bleed" | "split-right" | "split-left";

export type DeckEvidenceItem = {
  label: string;
  value: string;
};

export type RevealAnimation = 'fade-in' | 'slide-up' | 'draw-line' | 'pulse' | 'scale-in' | 'color-shift';

export type RevealElement = {
  id: string;
  delayMs: number;
  animation: RevealAnimation;
};

export type RevealSequence = {
  elements: RevealElement[];
};

export type DeckSlide = {
  id: string;
  title: string;
  subtitle?: string;
  chapter?: string;
  railTitle?: string;
  panelVariant?: PresentationPanelVariant;
  themeTone?: PresentationThemeTone;
  stageMode?: PresentationStageMode;
  mediaLayout?: PresentationMediaLayout;
  hideSceneUtilities?: boolean;
  evidenceItems?: DeckEvidenceItem[];
  facts?: string[];
  view: string;
  camera?: DeckCamera;
  cameraMode?: "deck" | "view";
  layers?: DeckLayers;
  style?: DeckStyle;
  annotations?: DeckAnnotation[];
  speakerNotes?: string;
  durationMs?: number;
  narrative?: NarrativeMetadata;
  revealSequence?: RevealSequence;
};
