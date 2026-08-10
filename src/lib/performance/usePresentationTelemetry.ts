'use client';

import { useCallback, useMemo } from 'react';

type TelemetryPayload = Record<string, string | number | boolean | null | undefined>;
type TelemetryEvent = {
  scope: string;
  name: string;
  payload: TelemetryPayload;
  at: string;
};

const SESSION_STORAGE_KEY = 'vrify.runtime.telemetry';

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

const readSessionEvents = (): TelemetryEvent[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeSessionEvents = (events: TelemetryEvent[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(events.slice(-50)));
  } catch {}
};

const assignVariant = (scope: string, variants: string[]) => {
  if (typeof window === 'undefined' || variants.length === 0) {
    return variants[0] ?? 'control';
  }

  const seed = [
    scope,
    navigator.userAgent,
    navigator.language,
    window.screen.width,
    window.screen.height,
  ].join(':');
  const hash = hashString(seed);
  return variants[hash % variants.length];
};

export function usePresentationTelemetry(scope: string, variants: string[] = ['control', 'enhanced']) {
  const experimentVariant = useMemo(() => assignVariant(scope, variants), [scope, variants]);

  const trackEvent = useCallback(
    (name: string, payload: TelemetryPayload = {}) => {
      const entry: TelemetryEvent = {
        scope,
        name,
        payload: { ...payload, variant: experimentVariant },
        at: new Date().toISOString(),
      };

      const nextEvents = [...readSessionEvents(), entry];
      writeSessionEvents(nextEvents);

      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[telemetry:${scope}] ${name}`, entry.payload);
      }
    },
    [experimentVariant, scope]
  );

  return { experimentVariant, trackEvent };
}
