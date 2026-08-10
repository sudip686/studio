export type WorkbenchMode =
  | 'ranking'
  | 'tanzania'
  | 'project'
  | 'topography'
  | 'accessibility'
  | 'drillholes'
  | 'subsurface'
  | 'resource'
  | 'mine_planning'
  | 'metallurgy'
  | 'comparison';

export type RouteTarget = 'port' | 'power' | 'rail';
export type ResourceFocus = 'Indicated' | 'Inferred' | 'All' | 'HighTGC' | 'LowTGC' | 'LowUncertainty' | 'HighFlake';
export type CameraAction =
  | 'zoomIn'
  | 'zoomOut'
  | 'tiltUp'
  | 'tiltDown'
  | 'rotateLeft'
  | 'rotateRight'
  | 'resetGlobe'
  | 'projectAngle'
  | 'bottomView'
  | 'rotateDegrees'
  | 'orbit360'
  | 'orbitVertical360';

export type PresentationNavigation = 'next' | 'previous' | 'slide';

export type CommandIntent = {
  mode: WorkbenchMode | null;
  routeTarget?: RouteTarget;
  resourceFocus?: ResourceFocus;
  rotate90?: boolean;
  cameraAction?: CameraAction | null;
  degrees?: 90 | 180 | 360;
  navigation?: PresentationNavigation;
  slideNumber?: number;
  confidence?: number;
  source?: 'local-llm' | 'rules' | string;
  reason?: string;
};

export const STORY_SLIDE_MODES: WorkbenchMode[] = [
  'ranking',
  'tanzania',
  'project',
  'topography',
  'accessibility',
  'drillholes',
  'resource',
  'metallurgy',
  'comparison',
];

export type CanonicalVoiceCommand = {
  id: string;
  label: string;
  example: string;
  aliases: string[];
};

export const TANGA_CANONICAL_COMMANDS: CanonicalVoiceCommand[] = [
  {id: 'next-slide', label: 'Next slide', example: 'next slide', aliases: ['next', 'next slide', 'go next']},
  {id: 'previous-slide', label: 'Previous slide', example: 'previous slide', aliases: ['previous', 'previous slide', 'back slide']},
  {id: 'slide-1', label: 'Slide 1 peer ranking', example: 'slide 1', aliases: ['slide 1', 'slide one', 'act one']},
  {id: 'slide-2', label: 'Slide 2 Tanzania', example: 'slide 2', aliases: ['slide 2', 'slide two', 'act two']},
  {id: 'slide-3', label: 'Slide 3 project area', example: 'slide 3', aliases: ['slide 3', 'slide three', 'act three']},
  {id: 'slide-4', label: 'Slide 4 topography', example: 'slide 4', aliases: ['slide 4', 'slide four', 'act four']},
  {id: 'slide-5', label: 'Slide 5 access routes', example: 'slide 5', aliases: ['slide 5', 'slide five', 'act five']},
  {id: 'slide-6', label: 'Slide 6 drillholes', example: 'slide 6', aliases: ['slide 6', 'slide six', 'act six']},
  {id: 'slide-7', label: 'Slide 7 resource model', example: 'slide 7', aliases: ['slide 7', 'slide seven', 'act seven']},
  {id: 'slide-8', label: 'Slide 8 metallurgy', example: 'slide 8', aliases: ['slide 8', 'slide eight', 'act eight']},
  {id: 'slide-9', label: 'Slide 9 peer comparison', example: 'slide 9', aliases: ['slide 9', 'slide nine', 'act nine']},
  {id: 'top-projects', label: 'Top 10 projects', example: 'show top 10 graphite projects', aliases: ['top 10 resource', 'top ten projects']},
  {id: 'peer-comparison', label: 'Peer comparison', example: 'show peer comparison', aliases: ['compare Tanga with peers', 'metallurgy comparison']},
  {id: 'tanzania', label: 'Tanzania overview', example: 'show Tanzania overview', aliases: ['country overview', 'regional overview']},
  {id: 'project-area', label: 'Project area', example: 'show project area', aliases: ['project area', 'license area']},
  {id: 'topography', label: 'Topography', example: 'show topography', aliases: ['terrain', 'surface']},
  {id: 'route-port', label: 'Route to port', example: 'show route to port', aliases: ['road to port', 'Tanga port']},
  {id: 'route-power', label: 'Route to power', example: 'show route to power station', aliases: ['power grid', 'Hale power']},
  {id: 'route-rail', label: 'Route to rail', example: 'show route to train station', aliases: ['railway station', 'train station']},
  {id: 'drillholes', label: 'Drillholes', example: 'show drillholes', aliases: ['boreholes', 'collars']},
  {id: 'lithology', label: 'Lithology and assay', example: 'show lithology and assay', aliases: ['assay', 'rock type']},
  {id: 'resource', label: 'Resource model', example: 'show resource model', aliases: ['block model', 'orebody']},
  {id: 'high-tgc', label: 'High TGC', example: 'show high TGC area', aliases: ['high grade', 'rich graphite']},
  {id: 'inside-high-tgc', label: 'Inside high TGC', example: 'take me inside high TGC zone', aliases: ['inside high grade', 'under high TGC']},
  {id: 'low-tgc', label: 'Low TGC', example: 'show low TGC zones', aliases: ['low grade', 'weak graphite']},
  {id: 'low-uncertainty', label: 'Low uncertainty', example: 'show low uncertainty areas', aliases: ['high confidence blocks', 'low risk']},
  {id: 'high-flake', label: 'High flake', example: 'show high flake region', aliases: ['coarse flake', 'flake zones']},
  {id: 'indicated', label: 'Indicated blocks', example: 'show indicated resource', aliases: ['high confidence resource']},
  {id: 'inferred', label: 'Inferred blocks', example: 'show inferred resource', aliases: ['inferred blocks']},
  {id: 'metallurgy', label: 'Metallurgy', example: 'show metallurgy', aliases: ['recovery', 'purity']},
  {id: 'zoom-in', label: 'Zoom in', example: 'zoom in', aliases: ['move closer', 'closer']},
  {id: 'zoom-out', label: 'Zoom out', example: 'zoom out', aliases: ['pull back', 'move back']},
  {id: 'top-view', label: 'Top view', example: 'top view', aliases: ['show from above', 'camera at top']},
  {id: 'bottom-view', label: 'Bottom view', example: 'bottom view', aliases: ['show from below', 'camera down']},
  {id: 'rotate-90', label: 'Rotate 90', example: 'rotate 90 degree', aliases: ['quarter turn', 'turn ninety']},
  {id: 'rotate-180', label: 'Rotate 180', example: 'rotate 180 degree', aliases: ['half turn', 'turn around']},
  {id: 'rotate-horizontal-360', label: 'Horizontal 360', example: 'rotate horizontally 360', aliases: ['spin 360', 'orbit 360']},
  {id: 'rotate-vertical-360', label: 'Vertical 360', example: 'rotate vertically 360', aliases: ['vertical 360', 'pitch 360']},
  {id: 'reset-globe', label: 'Reset globe', example: 'reset globe', aliases: ['initial view', 'earth view']},
];

export const WAKE_PHRASE = 'Hey Tanga';
export const WAKE_PROMPT_EXAMPLE = 'Hey Tanga, show resource model';
export const WAKE_ARM_MS = 8000;

export const WAKE_PHRASE_VARIANTS = [
  'hey tanga',
  'hi tanga',
  'okay tanga',
  'ok tanga',
  'hey tango',
  'hi tango',
  'okay tango',
  'ok tango',
  'hey tanga graphite',
  'tanga',
];

export function normalizeVoiceCommand(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function commandLooksLike(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function editDistanceWithin(a: string, b: string, limit: number) {
  if (Math.abs(a.length - b.length) > limit) return false;

  let previous = Array.from({length: b.length + 1}, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    let rowMin = current[0];

    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      const value = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + cost
      );
      current[column] = value;
      rowMin = Math.min(rowMin, value);
    }

    if (rowMin > limit) return false;
    previous = current;
  }

  return previous[b.length] <= limit;
}

export function stripWakePhrase(raw: string) {
  const normalized = normalizeVoiceCommand(raw);
  if (!normalized) return {matched: false, command: ''};

  for (const phrase of WAKE_PHRASE_VARIANTS) {
    const index = normalized.indexOf(phrase);
    if (index < 0) continue;

    const command = normalized
      .slice(index + phrase.length)
      .replace(/^(please|can you|could you|now)\s+/, '')
      .trim();
    return {matched: true, command};
  }

  const [first = '', second = '', ...rest] = normalized.split(' ');
  const maybeWakePrefix = ['hey', 'hi', 'ok', 'okay'].includes(first);
  const candidateName = maybeWakePrefix ? second : first;
  if (
    candidateName &&
    (editDistanceWithin(candidateName, 'tanga', 1) || editDistanceWithin(candidateName, 'tango', 1))
  ) {
    return {
      matched: true,
      command: (maybeWakePrefix ? rest : [second, ...rest]).join(' ').trim(),
    };
  }

  return {matched: false, command: ''};
}

export function commandWantsTangaRanking(text: string) {
  return commandLooksLike(text, ['tanga']) && commandLooksLike(text, [
    'top 10',
    'top ten',
    'top t0',
    'top to',
    'top 1o',
    'top l0',
    'top projects',
    'top resource',
    'top resources',
    'top graphite',
    'resource projects',
    'ranking',
    'rank',
    'leaderboard',
    'peer',
  ]);
}

function commandWantsPeerRanking(text: string) {
  return commandWantsTangaRanking(text) || commandLooksLike(text, [
    'top 10',
    'top ten',
    'top t0',
    'top to',
    'top 1o',
    'top l0',
    'top resource',
    'top resources',
    'top graphite',
    'top projects',
    'top graphite projects',
    'top graphite resource',
    'resource projects',
    'graphite projects',
    'ranking',
    'rank',
    'peer',
    'peers',
    'leaderboard',
    'compare projects',
  ]);
}

function commandWantsPeerComparison(text: string) {
  return commandLooksLike(text, [
    'peer comparison',
    'show peer comparison',
    'show comparison',
    'compare tanga',
    'compare tanga with peers',
    'compare with peers',
    'compare peers',
    'comparison slide',
    'tanga position',
    'position in peers',
    'metallurgy comparison',
    'recovery comparison',
    'purity comparison',
    'resource comparison',
    'compare metallurgy',
    'compare resource',
  ]);
}

function slideNumberTokenToNumber(token: string) {
  const normalized = token.toLowerCase();
  const numeric = Number(normalized);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= STORY_SLIDE_MODES.length) return numeric;

  const words: Record<string, number> = {
    one: 1,
    first: 1,
    won: 1,
    two: 2,
    second: 2,
    to: 2,
    too: 2,
    three: 3,
    third: 3,
    tree: 3,
    four: 4,
    fourth: 4,
    for: 4,
    five: 5,
    fifth: 5,
    six: 6,
    sixth: 6,
    seven: 7,
    seventh: 7,
    eight: 8,
    eighth: 8,
    ate: 8,
    nine: 9,
    ninth: 9,
  };
  return words[normalized] ?? null;
}

function slideNumberFromCommand(text: string) {
  const slidePattern = /\b(?:slide|scene|act|chapter)\s+(?:number\s+|no\s+)?([0-9]+|one|first|won|two|second|to|too|three|third|tree|four|fourth|for|five|fifth|six|sixth|seven|seventh|eight|eighth|ate|nine|ninth)\b/;
  const leadingOrdinalPattern = /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)\s+(?:slide|scene|act|chapter)\b/;
  const match = text.match(slidePattern) ?? text.match(leadingOrdinalPattern);
  if (!match?.[1]) return null;

  return slideNumberTokenToNumber(match[1]);
}

function slideIntent(slideNumber: number): CommandIntent {
  const mode = STORY_SLIDE_MODES[slideNumber - 1] ?? null;
  return {
    mode,
    routeTarget: mode === 'accessibility' ? 'port' : undefined,
    resourceFocus: mode === 'resource' ? 'All' : undefined,
    navigation: 'slide',
    slideNumber,
    confidence: 0.94,
    source: 'rules',
    reason: `Slide ${slideNumber}`,
  };
}

function commandWantsNextSlide(text: string) {
  return text === 'next' || commandLooksLike(text, [
    'next slide',
    'next scene',
    'next act',
    'go next',
    'move next',
    'forward slide',
    'advance slide',
  ]);
}

function commandWantsPreviousSlide(text: string) {
  return text === 'previous' || text === 'back' || commandLooksLike(text, [
    'previous slide',
    'prev slide',
    'back slide',
    'last slide',
    'go back',
    'move back slide',
    'previous scene',
    'previous act',
  ]);
}

export type VoiceCommandRepair = {
  command: string;
  changed: boolean;
  confidence: number;
  reason: string;
};

type ContextCommandAlias = {
  command: string;
  aliases: string[];
  priority: number;
};

const CONTEXT_COMMAND_ALIASES: ContextCommandAlias[] = [
  {
    command: 'show metallurgy from below',
    priority: 148,
    aliases: [
      'show metallurgy from below',
      'show metallurgy from bottom',
      'metallurgy from below',
      'metallurgy from bottom',
      'look below metallurgy',
      'view below metallurgy',
      'move camera down metallurgy',
      'move camera down metterlurgy',
      'show recovery from below',
      'show concentrate from below',
    ],
  },
  {
    command: 'show metallurgy from above',
    priority: 147,
    aliases: [
      'show metallurgy from above',
      'show metallurgy top view',
      'metallurgy from above',
      'top view metallurgy',
      'camera at top metallurgy',
      'show recovery from above',
      'show concentrate from above',
    ],
  },
  {
    command: 'show resource from below',
    priority: 147,
    aliases: [
      'show resource from below',
      'show resource model from below',
      'show block model from below',
      'resource from below',
      'block model from below',
      'move camera down resource',
      'move camera down block model',
    ],
  },
  {
    command: 'show drillholes from below',
    priority: 146,
    aliases: [
      'show drillholes from below',
      'show drill holes from below',
      'show boreholes from below',
      'show bore holes from below',
      'show collars from below',
      'show drillholes from bottom',
      'show drill holes from bottom',
      'drillholes from below',
      'drill holes from below',
      'boreholes from below',
      'bore holes from below',
      'look below drillholes',
      'view below drillholes',
      'move camera down drillholes',
      'move camera down drill holes',
    ],
  },
  {
    command: 'show drillholes from above',
    priority: 145,
    aliases: [
      'show drillholes from above',
      'show drill holes from above',
      'show boreholes from above',
      'show bore holes from above',
      'show collars from above',
      'show drillholes top view',
      'show drill holes top view',
      'drillholes from above',
      'drill holes from above',
      'boreholes from above',
      'bore holes from above',
      'top view drillholes',
      'top view drill holes',
      'camera at top drillholes',
      'camera at top drill holes',
    ],
  },
  {
    command: 'show peer comparison',
    priority: 154,
    aliases: [
      'show peer comparison',
      'show comparison',
      'compare tanga with peers',
      'compare tanga to peers',
      'compare with peers',
      'compare peers',
      'tanga peer comparison',
      'tanga position',
      'position in peers',
      'resource comparison',
      'metallurgy comparison',
      'compare metallurgy',
      'recovery comparison',
      'purity comparison',
      'final comparison',
      'comparison slide',
    ],
  },
  {
    command: 'show top 10 graphite projects',
    priority: 150,
    aliases: [
      'show top 10 graphite projects',
      'show top ten graphite projects',
      'show top 10 resource projects',
      'show top ten resource projects',
      'show top 10 graphite resource',
      'show top ten graphite resource',
      'show graphite ranking',
      'show peer ranking',
      'top 10 resource',
      'top 10 resources',
      'top ten resource',
      'top ten resources',
      'top 10 graphite resource',
      'top ten graphite resource',
      'top resource projects',
      'top graphite projects',
      'resource projects',
      'graphite projects ranking',
      'top 10',
      'top ten',
      'ranking',
      'leaderboard',
    ],
  },
  {
    command: 'take me inside high TGC zone',
    priority: 140,
    aliases: [
      'take me inside high tgc zone',
      'take me inside high grade zone',
      'take me inside high tgc',
      'take me inside high tgxc zone',
      'take me inside high tgx zone',
      'go inside high tgc',
      'go inside high grade',
      'inside high tgc',
      'inside high tgxc',
      'inside high grade',
      'show inside high tgc',
      'show inside high grade',
      'take me under high tgc',
      'take me under high grade',
      'take me into high tgc',
      'take me into high grade',
      'zoom inside high tgc',
      'zoom into high tgc',
    ],
  },
  {
    command: 'rotate vertically 360 degree',
    priority: 132,
    aliases: [
      'rotate vertically 360',
      'rotate vertically 360 degree',
      'rotate vertical 360',
      'vertical 360',
      'vertical 360 degree',
      'spin vertically 360',
      'pitch 360',
    ],
  },
  {
    command: 'rotate horizontally 360 degree',
    priority: 131,
    aliases: [
      'rotate horizontally 360',
      'rotate horizontally 360 degree',
      'rotate horizontal 360',
      'horizontal 360',
      'horizontal 360 degree',
      'spin horizontally 360',
      'orbit horizontally 360',
    ],
  },
  {
    command: 'zoom in high TGC area',
    priority: 124,
    aliases: [
      'zoom in high tgc area',
      'zoom into high tgc area',
      'zoom in high tgx area',
      'zoom in high tgxc area',
      'zoom in high grade area',
      'zoom into high grade area',
      'zoom to high grade area',
      'zoom to high tgc area',
      'focus high tgc area',
      'focus high grade area',
    ],
  },
  {
    command: 'show high grade area',
    priority: 120,
    aliases: [
      'show high grade area',
      'show high tgc area',
      'show high tgxc area',
      'show higher tgc area',
      'show high carbon area',
      'show rich graphite area',
      'focus high grade',
      'zoom to high grade',
      'high tgc',
      'high tgx',
      'high tgxc',
      'high grade',
    ],
  },
  {
    command: 'show low TGC zones',
    priority: 118,
    aliases: [
      'show low tgc zones',
      'show low grade zones',
      'show lower tgc',
      'show weak graphite',
      'low tgc',
      'low grade',
    ],
  },
  {
    command: 'show low uncertainty areas',
    priority: 116,
    aliases: [
      'show low uncertainty areas',
      'show low uncertainities',
      'show low uncertainties',
      'show high confidence blocks',
      'low uncertainty',
      'high confidence',
      'low risk',
    ],
  },
  {
    command: 'show higher flake region based on metallurgy',
    priority: 114,
    aliases: [
      'show higher flake region',
      'show high flake region',
      'show flake zones',
      'show coarse flake',
      'high flake',
      'higher flake',
    ],
  },
  {
    command: 'show resource model',
    priority: 100,
    aliases: [
      'show resource',
      'show resource model',
      'show block model',
      'show orebody',
      'show ore body',
      'show resort',
      'show source',
      'show research',
      'show result',
      'resource model',
      'block model',
    ],
  },
  {
    command: 'show drillholes',
    priority: 94,
    aliases: [
      'show drillholes',
      'show drill holes',
      'show boreholes',
      'show bore holes',
      'show collars',
      'show assay',
      'show lithology',
      'show geology',
      'show rock type',
      'show rock types',
      'show geology logs',
      'drill holes',
      'drill hose',
      'bore holes',
      'collars',
      'lithology',
      'rock type',
      'geology logs',
      'assay',
    ],
  },
  {
    command: 'show metallurgy',
    priority: 92,
    aliases: [
      'show metallurgy',
      'show metallurgical',
      'show metterlurgy',
      'show recovery',
      'show flotation',
      'show purity',
      'show concentrate',
      'metallurgy',
      'recovery',
      'flotation',
      'purity',
    ],
  },
  {
    command: 'show topography',
    priority: 90,
    aliases: [
      'show topography',
      'show topographic',
      'show topography of the area',
      'show terrain',
      'show surface',
      'show relief',
      'topography',
      'terrain',
      'relief',
    ],
  },
  {
    command: 'show route to Tanga port',
    priority: 88,
    aliases: [
      'show route to tanga port',
      'show road to tanga port',
      'show way to port',
      'show nearest port',
      'route to port',
      'road to port',
      'tanga port',
      'port',
    ],
  },
  {
    command: 'show route to power station',
    priority: 86,
    aliases: [
      'show route to power station',
      'show route power station',
      'show road to power station',
      'show road route to power station',
      'show way to power station',
      'route to power station',
      'road to power station',
      'route power station',
      'nearest power station',
      'show power grid',
      'show power plant',
      'show power plane',
      'show hale',
      'show pangani',
      'power station',
      'power grid',
      'power plant',
      'hale',
      'pangani',
    ],
  },
  {
    command: 'show route to railway station',
    priority: 85,
    aliases: [
      'show route to train station',
      'show route train station',
      'show road to train station',
      'show way to train station',
      'route to train station',
      'road to train station',
      'train station',
      'rail station',
      'railway station',
      'show route to railway station',
      'show road to railway station',
      'show route to rail',
      'show route rail',
      'show railway',
      'show rail route',
    ],
  },
  {
    command: 'zoom in',
    priority: 80,
    aliases: ['zoom in', 'move closer', 'go closer', 'focus closer', 'closer'],
  },
  {
    command: 'zoom out',
    priority: 78,
    aliases: ['zoom out', 'pull back', 'move back', 'back out'],
  },
  {
    command: 'show from bottom',
    priority: 76,
    aliases: ['show from bottom', 'show from below', 'look from below', 'view from below', 'bottom view', 'from bottom', 'from below'],
  },
  {
    command: 'show from above',
    priority: 75,
    aliases: ['show from above', 'look from above', 'view from above', 'top view', 'from above', 'show top view', 'look top down', 'top down view'],
  },
  {
    command: 'rotate vertically',
    priority: 75,
    aliases: ['rotate vertically', 'rotate vertical', 'vertical rotate', 'vertical rotation', 'turn vertically', 'vertical view', 'steep angle'],
  },
  {
    command: 'rotate 90 degree',
    priority: 75,
    aliases: ['rotate 90', 'rotate 90 degree', 'rotate ninety', 'rotate ninety degree', 'turn 90', 'turn ninety', 'quarter turn'],
  },
  {
    command: 'rotate 360 degree',
    priority: 74,
    aliases: ['rotate 360', 'rotate 360 degree', 'rotate three sixty', 'spin 360', 'full spin', 'full rotation'],
  },
  {
    command: 'rotate 180 degree',
    priority: 72,
    aliases: ['rotate 180', 'rotate 180 degree', 'rotate one eighty', 'turn around', 'half turn'],
  },
  {
    command: 'show project area',
    priority: 68,
    aliases: ['zoom in project area', 'show project area', 'focus project area', 'project area', 'license area'],
  },
];

function normalizeDomainTerms(text: string) {
  return normalizeVoiceCommand(text)
    .replace(/\b(shoe|shoo|sure|so|shall|shell|showed)\b(?=\s+(me\s+)?(resource|resort|source|research|result|high|low|drill|bore|topo|terrain|road|route|port|power|metallurgy|metal|flake|project|ranking|comparison|graphite|tanga))/g, 'show')
    .replace(/\b(comapre|compair|comparee|compared)\b/g, 'compare')
    .replace(/\b(comparision|comparisson|compersion|comperison)\b/g, 'comparison')
    .replace(/\b(slides|slyde|slyd|slight|slade)\b/g, 'slide')
    .replace(/\b(scenes)\b/g, 'scene')
    .replace(/\b(chapters)\b/g, 'chapter')
    .replace(/\b(next light|next lied|next side)\b/g, 'next slide')
    .replace(/\b(previous|previas|previus|privious)\b/g, 'previous')
    .replace(/\b(topview|top-view)\b/g, 'top view')
    .replace(/\b(bottomview|bottomm|botom|bottm|bottom-view)\b/g, 'bottom view')
    .replace(/\b(zoomin|zoom-in)\b/g, 'zoom in')
    .replace(/\b(zoomout|zoom-out)\b/g, 'zoom out')
    .replace(/\b(resort|resorts|ressource|ressources|resurce|resurces|resourcee|resources|research|result|source)\b/g, 'resource')
    .replace(/\b(ore buddy|or body|all body)\b/g, 'orebody')
    .replace(/\b(t\s*g\s*c|t\s*g\s*x\s*c|t\s*g\s*x|tgx|tgxc|tgcx|gtc|tcg)\b/g, 'tgc')
    .replace(/\b(take me insight|take me in side|go in side|show in side)\b/g, (match) => match.replace('in side', 'inside').replace('insight', 'inside'))
    .replace(/\b(orute|rout|root)\b/g, 'route')
    .replace(/\b(high quality|higher quality|high quarry|higher quarry)\b/g, 'high grade')
    .replace(/\b(low quality|lower quality|low quarry|lower quarry)\b/g, 'low grade')
    .replace(/\b(drill hose|drill holds|drill hold|drill home|drill hole)\b/g, 'drill holes')
    .replace(/\b(bore home|bore hold|bore hole)\b/g, 'bore holes')
    .replace(/\b(litology|litho logy|lithological)\b/g, 'lithology')
    .replace(/\b(metal allergy|metal energy|metterlurgy|metallurgical)\b/g, 'metallurgy')
    .replace(/\b(power plane|power plan|powerplant|powerstation)\b/g, 'power station')
    .replace(/\b(trainstation|railstation|railwaystation)\b/g, 'train station')
    .replace(/\b(rotated|roatate|roatated|rodate|roated|roatte|roate)\b/g, 'rotate')
    .replace(/\b(vertically|verticaly|verticle|verticly|vartically)\b/g, 'vertically')
    .replace(/\b(horizontal|horizontaly|horizontally|horisontal|horisontally|horizantal|horizantally)\b/g, 'horizontally')
    .replace(/\b(pan gany|pang any|new pang any)\b/g, 'pangani')
    .replace(/\b(hell hydro|hail hydro)\b/g, 'hale hydro')
    .replace(/\b(tango)\b/g, 'tanga')
    .replace(/\b(tree sixty|three 60)\b/g, 'three sixty')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSimilarity(textToken: string, aliasToken: string) {
  if (textToken === aliasToken) return 1;
  if (textToken.length > 4 && aliasToken.length > 4 && (textToken.includes(aliasToken) || aliasToken.includes(textToken))) {
    return 0.88;
  }
  const limit = Math.max(1, Math.floor(Math.max(textToken.length, aliasToken.length) * 0.22));
  return editDistanceWithin(textToken, aliasToken, limit) ? 0.72 : 0;
}

function aliasMatchScore(text: string, alias: string) {
  const normalizedAlias = normalizeDomainTerms(alias);
  if (!text || !normalizedAlias) return 0;
  if (text === normalizedAlias) return 1;
  if (text.includes(normalizedAlias)) return normalizedAlias.length <= 5 ? 0.82 : 0.96;

  const textTokens = text.split(' ').filter(Boolean);
  const aliasTokens = normalizedAlias.split(' ').filter(Boolean);
  if (aliasTokens.length === 0 || textTokens.length === 0) return 0;

  const matchedAliasTokens = aliasTokens.filter((aliasToken) => (
    textTokens.some((textToken) => tokenSimilarity(textToken, aliasToken) > 0)
  ));
  const coverage = matchedAliasTokens.length / aliasTokens.length;
  const hasDomainToken = matchedAliasTokens.some((token) => !['show', 'me', 'the', 'to', 'area', 'zone', 'zones'].includes(token));
  if (!hasDomainToken) return 0;

  const lengthPenalty = aliasTokens.length === 1 && textTokens.length > 4 ? 0.14 : 0;
  return Math.max(0, coverage - lengthPenalty);
}

export function repairVoiceCommand(raw: string): VoiceCommandRepair {
  const original = raw.trim();
  const normalized = normalizeVoiceCommand(original);
  if (!normalized) {
    return {command: '', changed: false, confidence: 0, reason: 'Empty command'};
  }

  const domainRepaired = normalizeDomainTerms(normalized);
  let best = {
    command: domainRepaired,
    confidence: domainRepaired !== normalized ? 0.64 : 0,
    reason: domainRepaired !== normalized ? 'Domain vocabulary repair' : 'No contextual repair',
    priority: 0,
  };
  const wantsRanking = commandWantsPeerRanking(domainRepaired);

  for (const candidate of CONTEXT_COMMAND_ALIASES) {
    if (wantsRanking && candidate.command === 'show resource model') continue;

    for (const alias of candidate.aliases) {
      const score = aliasMatchScore(domainRepaired, alias);
      const weightedScore = Math.min(1, score + candidate.priority / 1000);
      if (
        weightedScore > best.confidence ||
        (weightedScore === best.confidence && candidate.priority > best.priority)
      ) {
        best = {
          command: candidate.command,
          confidence: weightedScore,
          reason: `Matched "${alias}"`,
          priority: candidate.priority,
        };
      }
    }
  }

  const minimumConfidence = domainRepaired.split(' ').length <= 2 ? 0.76 : 0.68;
  const command = best.confidence >= minimumConfidence ? best.command : domainRepaired;

  return {
    command,
    changed: command !== normalized,
    confidence: best.confidence,
    reason: best.reason,
  };
}

function commandWantsCameraDown(text: string) {
  return commandLooksLike(text, [
    'move camera down',
    'move the camera down',
    'move camera diown',
    'camera down',
    'camera below',
    'camera underneath',
    'camera diown',
    'move down',
    'move diown',
    'tilt down',
    'lower angle',
    'lower the camera',
    'drop camera',
    'go lower',
    'more oblique',
  ]);
}

function commandWantsBottomView(text: string) {
  return commandLooksLike(text, [
    'show from bottom',
    'show me from bottom',
    'from bottom',
    'bottom view',
    'look from below',
    'view from below',
    'from below',
    'underneath',
    'under side',
    'underside',
    'from under',
  ]);
}

function commandWantsInsideView(text: string) {
  return commandLooksLike(text, [
    'take me inside',
    'go inside',
    'show inside',
    'inside',
    'take me into',
    'go into',
    'under high',
    'under the high',
    'beneath',
    'below high',
  ]);
}

function commandWantsTopView(text: string) {
  return commandLooksLike(text, [
    'camera at top',
    'camera on top',
    'camera top',
    'camera up',
    'move camera up',
    'move the camera up',
    'move camera to top',
    'move the camera to top',
    'camera above',
    'show from above',
    'look from above',
    'view from above',
    'from above',
    'top view',
    'top down',
    'top-down',
    'show top view',
  ]);
}

function commandWantsVerticalRotate(text: string) {
  return commandLooksLike(text, [
    'rotate vertically',
    'rotate vertical',
    'rotate vertically 360',
    'vertical 360',
    'vertical spin',
    'vertical rotate',
    'vertical rotation',
    'turn vertically',
    'vertical view',
    'steep angle',
  ]);
}

function commandWantsHorizontalRotate(text: string) {
  return commandLooksLike(text, [
    'rotate horizontally',
    'horizontal rotate',
    'horizontal rotation',
    'horizontally 360',
    'horizontal 360',
    'orbit horizontally',
    'spin horizontally',
  ]);
}

function commandWantsHighTgc(text: string) {
  return commandLooksLike(text, [
    'high grade',
    'high tgc',
    'higher tgc',
    'high tgx',
    'high tgxc',
    'higher tgx',
    'higher tgxc',
    'best tgc',
    'best tgxc',
    'rich graphite',
    'rich carbon',
  ]) || (
    commandLooksLike(text, ['zoom to', 'focus on', 'show me', 'show']) &&
    commandLooksLike(text, ['tgc', 'tgx', 'tgxc', 'grade']) &&
    !commandLooksLike(text, ['low', 'lower', 'weak', 'poor'])
  );
}

function rotationDegrees(text: string): 90 | 180 | 360 | null {
  if (commandLooksLike(text, ['360', 'three sixty', 'full spin', 'full rotation', 'orbit 360'])) return 360;
  if (commandLooksLike(text, ['180', 'one eighty', 'half turn'])) return 180;
  if (commandLooksLike(text, ['90', 'ninety', 'quarter turn'])) return 90;
  return null;
}

export function ruleIntent(raw: string): CommandIntent {
  const text = normalizeDomainTerms(raw);
  if (!text) return {mode: null, confidence: 0, source: 'rules', reason: 'Empty command'};

  const slideNumber = slideNumberFromCommand(text);
  if (slideNumber) return slideIntent(slideNumber);

  if (commandWantsNextSlide(text)) {
    return {mode: null, navigation: 'next', confidence: 0.93, source: 'rules', reason: 'Next slide command'};
  }

  if (commandWantsPreviousSlide(text)) {
    return {mode: null, navigation: 'previous', confidence: 0.93, source: 'rules', reason: 'Previous slide command'};
  }

  const wantsCameraDown = commandWantsCameraDown(text);
  const wantsBottomView = commandWantsBottomView(text);
  const wantsInsideView = commandWantsInsideView(text);
  const wantsTopView = commandWantsTopView(text);
  const wantsVerticalRotate = commandWantsVerticalRotate(text);
  const wantsHorizontalRotate = commandWantsHorizontalRotate(text);
  const wantsHighTgc = commandWantsHighTgc(text);
  const wantsResourceModel = commandLooksLike(text, ['resource', 'resurce', 'ressource', 'block model', 'block', 'orebody', 'ore body']);
  const degrees = rotationDegrees(text);

  if (degrees === 360 && wantsVerticalRotate) {
    return {
      mode: null,
      cameraAction: 'orbitVertical360',
      degrees: 360,
      confidence: 0.92,
      source: 'rules',
      reason: 'Vertical 360 degree geology spin',
    };
  }

  if (degrees === 360 && wantsHorizontalRotate) {
    return {
      mode: null,
      cameraAction: 'orbit360',
      degrees: 360,
      confidence: 0.92,
      source: 'rules',
      reason: 'Horizontal 360 degree geology spin',
    };
  }

  if (degrees && commandLooksLike(text, ['rotate', 'turn', 'spin', 'orbit'])) {
    return {
      mode: null,
      cameraAction: degrees === 360 ? 'orbit360' : 'rotateDegrees',
      degrees,
      rotate90: degrees === 90,
      confidence: 0.9,
      source: 'rules',
      reason: `Rotate ${degrees} degrees`,
    };
  }

  if ((wantsBottomView || wantsInsideView) && wantsHighTgc) {
    return {
      mode: 'resource',
      resourceFocus: 'HighTGC',
      cameraAction: 'bottomView',
      confidence: 0.92,
      source: 'rules',
      reason: 'Inside view and high TGC blocks',
    };
  }

  if (wantsTopView && wantsHighTgc) {
    return {
      mode: 'resource',
      resourceFocus: 'HighTGC',
      cameraAction: 'tiltUp',
      confidence: 0.92,
      source: 'rules',
      reason: 'Top view and high TGC blocks',
    };
  }

  if (wantsCameraDown && wantsHighTgc) {
    return {mode: 'resource', resourceFocus: 'HighTGC', cameraAction: 'bottomView', confidence: 0.92, source: 'rules'};
  }

  if ((wantsBottomView || wantsCameraDown) && wantsResourceModel) {
    return {
      mode: 'resource',
      cameraAction: 'bottomView',
      confidence: 0.9,
      source: 'rules',
      reason: 'Resource model from below',
    };
  }

  if (
    (wantsBottomView || wantsCameraDown) &&
    commandLooksLike(text, ['metallurgy', 'metterlurgy', 'metallurgical', 'flotation', 'recovery', 'purity', 'concentrate', 'tdm004'])
  ) {
    return {
      mode: 'metallurgy',
      cameraAction: 'bottomView',
      confidence: 0.9,
      source: 'rules',
      reason: 'Metallurgy from below',
    };
  }

  if (
    (wantsBottomView || wantsCameraDown) &&
    commandLooksLike(text, ['drill', 'drillholes', 'drill holes', 'borehole', 'boreholes', 'collar', 'collars', 'assay', 'lithology'])
  ) {
    return {
      mode: 'drillholes',
      cameraAction: 'bottomView',
      confidence: 0.9,
      source: 'rules',
      reason: 'Drillholes from below',
    };
  }

  if (wantsTopView && wantsResourceModel) {
    return {
      mode: 'resource',
      cameraAction: 'tiltUp',
      confidence: 0.9,
      source: 'rules',
      reason: 'Resource model from top',
    };
  }

  if (
    wantsTopView &&
    commandLooksLike(text, ['metallurgy', 'metterlurgy', 'metallurgical', 'flotation', 'recovery', 'purity', 'concentrate', 'tdm004'])
  ) {
    return {
      mode: 'metallurgy',
      cameraAction: 'tiltUp',
      confidence: 0.9,
      source: 'rules',
      reason: 'Metallurgy from top',
    };
  }

  if (
    wantsTopView &&
    commandLooksLike(text, ['drill', 'drillholes', 'drill holes', 'borehole', 'boreholes', 'collar', 'collars', 'assay', 'lithology'])
  ) {
    return {
      mode: 'drillholes',
      cameraAction: 'tiltUp',
      confidence: 0.9,
      source: 'rules',
      reason: 'Drillholes from top',
    };
  }

  if (commandLooksLike(text, ['zoom in', 'closer', 'focus closer', 'move closer']) && wantsHighTgc) {
    return {
      mode: 'resource',
      resourceFocus: 'HighTGC',
      cameraAction: 'zoomIn',
      confidence: 0.94,
      source: 'rules',
      reason: 'Zoom into high TGC resource blocks',
    };
  }

  if (wantsBottomView) {
    return {mode: null, cameraAction: 'bottomView', confidence: 0.82, source: 'rules', reason: 'Bottom view command'};
  }
  if (wantsTopView) {
    return {mode: null, cameraAction: 'tiltUp', confidence: 0.82, source: 'rules', reason: 'Top view command'};
  }
  if (wantsVerticalRotate) {
    return {mode: null, cameraAction: 'projectAngle', confidence: 0.82, source: 'rules', reason: 'Vertical camera angle command'};
  }

  if (
    commandLooksLike(text, ['project area', 'project focus', 'license area', 'licence area', 'project aoi', 'show project', 'focus project']) ||
    (
      commandLooksLike(text, ['zoom in', 'closer', 'focus closer', 'move closer']) &&
      commandLooksLike(text, ['project', 'area', 'license', 'licence', 'aoi'])
    )
  ) {
    return {
      mode: 'project',
      confidence: 0.86,
      source: 'rules',
      reason: 'Project area command',
    };
  }

  if (commandLooksLike(text, ['zoom in', 'closer', 'focus closer', 'move closer'])) {
    return {
      mode: null,
      cameraAction: 'zoomIn',
      confidence: 0.82,
      source: 'rules',
      reason: 'Zoom in command',
    };
  }
  if (commandLooksLike(text, ['zoom out', 'pull back', 'move back', 'back out'])) {
    return {mode: null, cameraAction: 'zoomOut', confidence: 0.82, source: 'rules', reason: 'Zoom out command'};
  }
  if (commandLooksLike(text, ['tilt up', 'higher angle', 'more top down', 'above view'])) {
    return {mode: null, cameraAction: 'tiltUp', confidence: 0.78, source: 'rules', reason: 'Tilt up command'};
  }
  if (wantsCameraDown) {
    return {mode: null, cameraAction: 'bottomView', confidence: 0.82, source: 'rules', reason: 'Below camera command'};
  }
  if (commandLooksLike(text, ['change camera angle', 'camera angle', 'change angle'])) {
    return {mode: null, cameraAction: 'projectAngle', confidence: 0.76, source: 'rules', reason: 'Camera angle command'};
  }
  if (commandLooksLike(text, ['rotate left', 'turn left'])) {
    return {mode: null, cameraAction: 'rotateLeft', confidence: 0.76, source: 'rules', reason: 'Rotate left command'};
  }
  if (commandLooksLike(text, ['rotate right', 'turn right'])) {
    return {mode: null, cameraAction: 'rotateRight', confidence: 0.76, source: 'rules', reason: 'Rotate right command'};
  }
  if (commandLooksLike(text, ['rotate', 'turn model', 'turn the model', 'spin'])) {
    return {mode: null, cameraAction: 'rotateDegrees', degrees: 90, rotate90: true, confidence: 0.86, source: 'rules', reason: 'Rotate command'};
  }
  if (commandLooksLike(text, ['globe', 'earth view', 'initial view', 'reset view'])) {
    return {mode: 'tanzania', cameraAction: 'resetGlobe', confidence: 0.82, source: 'rules', reason: 'Globe reset command'};
  }
  if (commandWantsPeerComparison(text)) {
    return {mode: 'comparison', confidence: 0.88, source: 'rules', reason: 'Peer comparison command'};
  }
  if (commandWantsPeerRanking(text)) {
    return {mode: 'ranking', confidence: 0.86, source: 'rules', reason: 'Graphite peer ranking command'};
  }
  if (commandLooksLike(text, ['low tgc', 'lower tgc', 'low grade', 'waste', 'weak graphite', 'poor tgc'])) {
    return {mode: 'resource', resourceFocus: 'LowTGC', confidence: 0.86, source: 'rules', reason: 'Low TGC resource command'};
  }
  if (wantsHighTgc) {
    return {mode: 'resource', resourceFocus: 'HighTGC', confidence: 0.88, source: 'rules', reason: 'High TGC resource command'};
  }
  if (commandLooksLike(text, ['low uncertainty', 'low uncertainties', 'low uncertainities', 'lowest uncertainty', 'less uncertainty', 'low risk', 'high confidence', 'confident blocks', 'more certain'])) {
    return {mode: 'resource', resourceFocus: 'LowUncertainty', confidence: 0.86, source: 'rules', reason: 'Low uncertainty resource command'};
  }
  if (
    commandLooksLike(text, ['high flake', 'higher flake', 'large flake', 'coarse flake', 'flake region', 'flake zones']) ||
    (commandLooksLike(text, ['flake']) && commandLooksLike(text, ['region', 'zone', 'area', 'target']))
  ) {
    return {mode: 'resource', resourceFocus: 'HighFlake', confidence: 0.84, source: 'rules', reason: 'High flake proxy resource command'};
  }
  if (commandLooksLike(text, ['metallurgy', 'metterlurgy', 'metallurgical', 'flotation', 'recovery', 'purity', 'concentrate', 'flake', 'testwork', 'test work', 'tdm004'])) {
    return {mode: 'metallurgy', confidence: 0.86, source: 'rules', reason: 'Metallurgy reveal command'};
  }
  if (commandLooksLike(text, ['rail', 'railway', 'train'])) {
    return {mode: 'accessibility', routeTarget: 'rail', confidence: 0.84, source: 'rules', reason: 'Rail route command'};
  }
  if (commandLooksLike(text, ['power', 'powerstation', 'power station', 'grid', 'substation'])) {
    return {mode: 'accessibility', routeTarget: 'power', confidence: 0.82, source: 'rules', reason: 'Power route command'};
  }
  if (commandLooksLike(text, ['port', 'harbour', 'harbor', 'accessibility', 'access', 'route', 'road'])) {
    return {mode: 'accessibility', routeTarget: 'port', confidence: 0.82, source: 'rules', reason: 'Port or road access command'};
  }
  if (commandLooksLike(text, ['topo', 'topography', 'terrain', 'relief', 'surface'])) {
    return {mode: 'topography', confidence: 0.82, source: 'rules', reason: 'Topography command'};
  }
  if (commandLooksLike(text, ['inside', 'subsurface', 'underground', 'break', 'earth', 'cutaway', 'below', 'under'])) {
    return {mode: 'subsurface', confidence: 0.82, source: 'rules', reason: 'Subsurface command'};
  }
  if (commandLooksLike(text, ['drill', 'borehole', 'hole', 'lithology', 'litho', 'assay', 'collar', 'collars', 'rock type', 'geology log'])) {
    return {mode: 'drillholes', confidence: 0.82, source: 'rules', reason: 'Drillhole command'};
  }
  if (commandLooksLike(text, ['indicated'])) {
    return {mode: 'resource', resourceFocus: 'Indicated', confidence: 0.84, source: 'rules', reason: 'Indicated resource command'};
  }
  if (commandLooksLike(text, ['inferred'])) {
    return {mode: 'resource', resourceFocus: 'Inferred', confidence: 0.84, source: 'rules', reason: 'Inferred resource command'};
  }
  if (commandLooksLike(text, ['resource', 'resurce', 'ressource', 'block', 'model', 'orebody', 'ore body'])) {
    return {mode: 'resource', confidence: 0.8, source: 'rules', reason: 'Resource model command'};
  }
  if (commandLooksLike(text, ['project', 'focus', 'aoi', 'license', 'licence'])) {
    return {mode: 'project', confidence: 0.8, source: 'rules', reason: 'Project focus command'};
  }
  if (commandLooksLike(text, ['tanzania', 'country', 'regional', 'overview'])) {
    return {mode: 'tanzania', confidence: 0.8, source: 'rules', reason: 'Regional context command'};
  }
  if (commandLooksLike(text, ['comparison', 'compare', 'peers'])) {
    return {mode: 'comparison', confidence: 0.78, source: 'rules', reason: 'Comparison fallback command'};
  }

  return {mode: null, confidence: 0.18, source: 'rules', reason: 'No deterministic match'};
}
