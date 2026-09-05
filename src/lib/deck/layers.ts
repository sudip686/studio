/**
 * Presenter-facing layer controls.
 *
 * Borrowed from the GIS reference, where every layer carries its own visibility
 * and opacity. In a Q&A the ask is usually "turn the blocks off and show me
 * just the holes", and switching scenes is too blunt an answer.
 *
 * Lives in its own module rather than beside the 3D scene on purpose: the deck
 * chrome needs `DEFAULT_LAYER_SETTINGS` as a *value*, and importing that from
 * the Three.js component would pull the whole 3D bundle into the main chunk and
 * defeat its dynamic import.
 */

export type DeckLayerId = 'terrain' | 'drilling' | 'blocks' | 'context';

export interface DeckLayerState {
  visible: boolean;
  opacity: number;
}

export type DeckLayerSettings = Record<DeckLayerId, DeckLayerState>;

export const DEFAULT_LAYER_SETTINGS: DeckLayerSettings = {
  terrain: {visible: true, opacity: 1},
  drilling: {visible: true, opacity: 1},
  blocks: {visible: true, opacity: 1},
  context: {visible: true, opacity: 1},
};

/** Row order and copy for the layers panel. */
export const DECK_LAYERS: ReadonlyArray<{id: DeckLayerId; label: string; detail: string}> = [
  {id: 'blocks', label: 'Resource model', detail: 'Grade blocks and pit shell'},
  {id: 'drilling', label: 'Drilling', detail: 'Traces, assays and collars'},
  {id: 'terrain', label: 'Terrain', detail: 'Ground surface'},
  {id: 'context', label: 'Infrastructure', detail: 'Licence, roads, plant and haulage'},
];
