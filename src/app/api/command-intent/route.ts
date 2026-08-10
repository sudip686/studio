import { NextResponse } from 'next/server';
import {
  repairVoiceCommand,
  ruleIntent,
  type CameraAction,
  type CommandIntent,
  type WorkbenchMode,
} from '@/lib/tanga-voice-command';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODES = new Set<WorkbenchMode>([
  'ranking',
  'tanzania',
  'project',
  'topography',
  'accessibility',
  'drillholes',
  'subsurface',
  'resource',
  'metallurgy',
  'comparison',
]);

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function normalizeIntent(payload: any): Omit<CommandIntent, 'source'> | null {
  const mode = payload?.mode === null || payload?.mode === undefined ? null : String(payload.mode);
  const routeTarget = payload?.routeTarget ? String(payload.routeTarget).toLowerCase() : undefined;
  const resourceFocus = payload?.resourceFocus ? String(payload.resourceFocus) : undefined;
  const normalizedFocus = resourceFocus?.replace(/[\s_-]/g, '').toLowerCase();
  const cameraAction = payload?.cameraAction === null || payload?.cameraAction === undefined ? null : String(payload.cameraAction);
  const degrees = Number(payload?.degrees);
  const confidence = Number(payload?.confidence ?? 0.55);
  const normalizedCameraAction: CameraAction | null =
    cameraAction === 'zoomIn' ||
    cameraAction === 'zoomOut' ||
    cameraAction === 'tiltUp' ||
    cameraAction === 'tiltDown' ||
    cameraAction === 'rotateLeft' ||
    cameraAction === 'rotateRight' ||
    cameraAction === 'resetGlobe' ||
    cameraAction === 'projectAngle' ||
    cameraAction === 'bottomView' ||
    cameraAction === 'rotateDegrees' ||
    cameraAction === 'orbit360' ||
    cameraAction === 'orbitVertical360'
      ? cameraAction
      : null;
  const navigation = payload?.navigation ? String(payload.navigation).toLowerCase() : undefined;
  const slideNumber = Number(payload?.slideNumber);

  if (mode !== null && !MODES.has(mode as WorkbenchMode)) {
    return null;
  }

  return {
    mode: mode as WorkbenchMode | null,
    routeTarget: routeTarget === 'power' || routeTarget === 'port' || routeTarget === 'rail' ? routeTarget : undefined,
    resourceFocus: normalizedFocus === 'indicated'
      ? 'Indicated'
      : normalizedFocus === 'inferred'
        ? 'Inferred'
        : normalizedFocus === 'all'
          ? 'All'
          : normalizedFocus === 'hightgc'
            ? 'HighTGC'
            : normalizedFocus === 'lowtgc'
              ? 'LowTGC'
              : normalizedFocus === 'lowuncertainty'
                ? 'LowUncertainty'
                : normalizedFocus === 'highflake'
                  ? 'HighFlake'
                   : undefined,
    rotate90: Boolean(payload?.rotate90),
    cameraAction: normalizedCameraAction,
    degrees: degrees === 90 || degrees === 180 || degrees === 360 ? degrees : undefined,
    navigation: navigation === 'next' || navigation === 'previous' || navigation === 'slide' ? navigation : undefined,
    slideNumber: Number.isInteger(slideNumber) && slideNumber >= 1 && slideNumber <= 9 ? slideNumber : undefined,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.55,
    reason: typeof payload?.reason === 'string' ? payload.reason.slice(0, 140) : undefined,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function chooseOllamaModel(baseUrl: string) {
  if (process.env.LOCAL_LLM_MODEL) return process.env.LOCAL_LLM_MODEL;

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/tags`, { cache: 'no-store' }, 900);
    if (!response.ok) return 'llama3.1';
    const payload = await response.json();
    const first = payload?.models?.[0]?.name;
    return typeof first === 'string' && first ? first : 'llama3.1';
  } catch {
    return 'llama3.1';
  }
}

async function localLlmIntent(command: string): Promise<CommandIntent | null> {
  const baseUrl = (process.env.LOCAL_LLM_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
  const model = await chooseOllamaModel(baseUrl);

  const system = [
    'You classify voice commands for a 3D mining presentation over Tanga, Tanzania.',
    'Return only strict JSON with these keys:',
    '{ "mode": "ranking|tanzania|project|topography|accessibility|drillholes|subsurface|resource|metallurgy|comparison|null",',
    '"routeTarget": "port|power|rail|null", "resourceFocus": "Indicated|Inferred|All|HighTGC|LowTGC|LowUncertainty|HighFlake|null",',
    '"rotate90": boolean, "cameraAction": "zoomIn|zoomOut|tiltUp|tiltDown|rotateLeft|rotateRight|resetGlobe|projectAngle|bottomView|rotateDegrees|orbit360|orbitVertical360|null",',
    '"degrees": 90|180|360|null, "navigation": "next|previous|slide|null", "slideNumber": 1|2|3|4|5|6|7|8|9|null,',
    '"confidence": number, "reason": string }.',
    'Examples:',
    '"show resource" => {"mode":"resource","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.88,"reason":"resource model"}',
    '"show resurce" => {"mode":"resource","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.84,"reason":"resource model typo"}',
    '"take me under the ore body" => {"mode":"subsurface","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.9,"reason":"subsurface dive"}',
    '"show the way to grid power" => {"mode":"accessibility","routeTarget":"power","resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.9,"reason":"route to power"}',
    '"show the road to railway" => {"mode":"accessibility","routeTarget":"rail","resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.88,"reason":"route to rail"}',
    '"project area" => {"mode":"project","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.88,"reason":"show Tanga project area"}',
    '"zoom in project area" => {"mode":"project","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.86,"reason":"show Tanga project area"}',
    '"zoom out" => {"mode":null,"routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"zoomOut","degrees":null,"confidence":0.84,"reason":"pull camera back"}',
    '"only high confidence blocks" => {"mode":"resource","routeTarget":null,"resourceFocus":"Indicated","rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.85,"reason":"indicated blocks"}',
    '"zoom to high grade graphite based on TGC" => {"mode":"resource","routeTarget":null,"resourceFocus":"HighTGC","rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.9,"reason":"high TGC blocks"}',
    '"show high TGXC area" => {"mode":"resource","routeTarget":null,"resourceFocus":"HighTGC","rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.9,"reason":"high TGC typo"}',
    '"move camera down and show me high TGXC area" => {"mode":"resource","routeTarget":null,"resourceFocus":"HighTGC","rotate90":false,"cameraAction":"bottomView","degrees":null,"confidence":0.92,"reason":"below camera high TGC blocks"}',
    '"show resource model from below" => {"mode":"resource","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"bottomView","degrees":null,"confidence":0.9,"reason":"resource model from below"}',
    '"show resource model camera at top" => {"mode":"resource","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"tiltUp","degrees":null,"confidence":0.9,"reason":"resource model from top"}',
    '"show metallurgy from below" => {"mode":"metallurgy","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"bottomView","degrees":null,"confidence":0.9,"reason":"metallurgy from below"}',
    '"show metallurgy from above" => {"mode":"metallurgy","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"tiltUp","degrees":null,"confidence":0.9,"reason":"metallurgy from top"}',
    '"show drillholes from below" => {"mode":"drillholes","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"bottomView","degrees":null,"confidence":0.9,"reason":"drillholes from below"}',
    '"move camera down" => {"mode":null,"routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"bottomView","degrees":null,"confidence":0.86,"reason":"below camera"}',
    '"camera at top" => {"mode":null,"routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"tiltUp","degrees":null,"confidence":0.86,"reason":"top camera"}',
    '"show from bottom" => {"mode":null,"routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"bottomView","degrees":null,"confidence":0.86,"reason":"bottom camera"}',
    '"look from below" => {"mode":null,"routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"bottomView","degrees":null,"confidence":0.86,"reason":"bottom camera"}',
    '"rotate 180 degree" => {"mode":null,"routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"rotateDegrees","degrees":180,"confidence":0.9,"reason":"rotate half turn"}',
    '"rotate 360 degree" => {"mode":null,"routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"orbit360","degrees":360,"confidence":0.9,"reason":"cinematic full spin"}',
    '"rotate vertically 360" => {"mode":null,"routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":"orbitVertical360","degrees":360,"confidence":0.9,"reason":"vertical full spin"}',
    '"next slide" => {"mode":null,"routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"navigation":"next","slideNumber":null,"confidence":0.93,"reason":"next presentation slide"}',
    '"slide no 2" => {"mode":"tanzania","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"navigation":"slide","slideNumber":2,"confidence":0.94,"reason":"slide 2"}',
    '"slide no 9" => {"mode":"comparison","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"navigation":"slide","slideNumber":9,"confidence":0.94,"reason":"slide 9"}',
    '"compare Tanga with peers" => {"mode":"comparison","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.9,"reason":"peer comparison"}',
    '"show low TGC zones" => {"mode":"resource","routeTarget":null,"resourceFocus":"LowTGC","rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.88,"reason":"low TGC blocks"}',
    '"show low uncertainty areas" => {"mode":"resource","routeTarget":null,"resourceFocus":"LowUncertainty","rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.88,"reason":"low uncertainty proxy"}',
    '"show higher flake region based on metallurgy" => {"mode":"resource","routeTarget":null,"resourceFocus":"HighFlake","rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.86,"reason":"flake proxy target"}',
    '"show top ten graphite projects" => {"mode":"ranking","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.88,"reason":"peer ranking"}',
    '"show metallurgy recovery" => {"mode":"metallurgy","routeTarget":null,"resourceFocus":null,"rotate90":false,"cameraAction":null,"degrees":null,"confidence":0.88,"reason":"metallurgy reveal"}',
  ].join(' ');

  const response = await fetchWithTimeout(
    `${baseUrl}/api/chat`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: command },
        ],
        options: {
          temperature: 0,
          num_predict: 140,
        },
      }),
    },
    Number(process.env.LOCAL_LLM_TIMEOUT_MS ?? 2200)
  );

  if (!response.ok) return null;

  const payload = await response.json();
  const content = payload?.message?.content;
  if (typeof content !== 'string') return null;

  try {
    const parsed = JSON.parse(cleanJson(content));
    const normalized = normalizeIntent(parsed);
    if (!normalized) return null;
    return { ...normalized, source: 'local-llm' };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let command = '';

  try {
    const payload = await request.json();
    command = String(payload?.command ?? '').slice(0, 500);
  } catch {
    return NextResponse.json({ intent: ruleIntent(''), llmAvailable: false }, { status: 400 });
  }

  const repair = repairVoiceCommand(command);
  const commandForIntent = repair.command || command;
  const fallback = ruleIntent(commandForIntent);
  const localLlmEnabled = process.env.LOCAL_LLM_ENABLED === 'true';

  if (!localLlmEnabled) {
    return NextResponse.json({
      intent: fallback,
      fallback,
      repair,
      llmAvailable: false,
    });
  }

  const llmIntent = await localLlmIntent(commandForIntent).catch(() => null);
  const intent = llmIntent && (llmIntent.confidence ?? 0) >= 0.45
    ? {
      ...llmIntent,
      mode: llmIntent.mode ?? fallback.mode,
      routeTarget: llmIntent.routeTarget ?? fallback.routeTarget,
      resourceFocus: llmIntent.resourceFocus ?? fallback.resourceFocus,
      cameraAction: llmIntent.cameraAction ?? fallback.cameraAction,
      degrees: llmIntent.degrees ?? fallback.degrees,
      navigation: llmIntent.navigation ?? fallback.navigation,
      slideNumber: llmIntent.slideNumber ?? fallback.slideNumber,
      rotate90: Boolean(llmIntent.rotate90 || fallback.rotate90),
    }
    : fallback;

  return NextResponse.json({
    intent,
    fallback,
    repair,
    llmAvailable: Boolean(llmIntent),
  });
}
