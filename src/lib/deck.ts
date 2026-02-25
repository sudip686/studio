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
};

export type DeckSlide = {
  id: string;
  title: string;
  subtitle?: string;
  facts?: string[];
  view: string;
  camera?: DeckCamera;
  layers?: DeckLayers;
  style?: DeckStyle;
  annotations?: DeckAnnotation[];
  speakerNotes?: string;
  durationMs?: number;
};