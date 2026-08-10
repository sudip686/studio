'use client';

import { useEffect, useMemo, useState } from 'react';

export type RuntimeQualityProfile = 'performance' | 'balanced' | 'quality';
export type RuntimeQualityMode = 'auto' | RuntimeQualityProfile;
export type RuntimeSceneMode = 'cesium' | 'three' | 'none';

type AdaptiveQualityInput = {
  fps: number | null;
  memoryMb: number | null;
  sceneMode: RuntimeSceneMode;
};

type AdaptiveQualityResult = {
  qualityMode: RuntimeQualityMode;
  resolvedProfile: RuntimeQualityProfile;
  reason: string;
  setQualityMode: (mode: RuntimeQualityMode) => void;
};

const STORAGE_KEY = 'vrify.runtime.quality-mode';

const loadStoredMode = (): RuntimeQualityMode => {
  if (typeof window === 'undefined') return 'auto';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'auto' || stored === 'performance' || stored === 'balanced' || stored === 'quality') {
    return stored;
  }
  return 'auto';
};

const resolveAutoProfile = (
  fps: number | null,
  memoryMb: number | null,
  sceneMode: RuntimeSceneMode,
  previous: RuntimeQualityProfile
) => {
  if (sceneMode === 'none') {
    return { profile: 'quality' as RuntimeQualityProfile, reason: 'idle-scene' };
  }

  if (typeof memoryMb === 'number' && memoryMb >= 700) {
    return { profile: 'performance' as RuntimeQualityProfile, reason: 'memory-pressure' };
  }

  if (typeof fps !== 'number') {
    return { profile: previous, reason: 'awaiting-samples' };
  }

  if (previous === 'quality') {
    if (fps < 42) return { profile: 'balanced' as RuntimeQualityProfile, reason: 'fps-soft-drop' };
    return { profile: 'quality' as RuntimeQualityProfile, reason: 'fps-healthy' };
  }

  if (previous === 'balanced') {
    if (fps < 32) return { profile: 'performance' as RuntimeQualityProfile, reason: 'fps-low' };
    if (fps > 52) return { profile: 'quality' as RuntimeQualityProfile, reason: 'fps-recovered' };
    return { profile: 'balanced' as RuntimeQualityProfile, reason: 'fps-steady' };
  }

  if (fps > 40) return { profile: 'balanced' as RuntimeQualityProfile, reason: 'fps-recovering' };
  return { profile: 'performance' as RuntimeQualityProfile, reason: 'fps-critical' };
};

export function useAdaptiveQuality({
  fps,
  memoryMb,
  sceneMode,
}: AdaptiveQualityInput): AdaptiveQualityResult {
  const [qualityMode, setQualityMode] = useState<RuntimeQualityMode>(loadStoredMode);
  const [autoProfile, setAutoProfile] = useState<RuntimeQualityProfile>('quality');
  const [reason, setReason] = useState('awaiting-samples');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, qualityMode);
  }, [qualityMode]);

  useEffect(() => {
    if (qualityMode !== 'auto') {
      setReason('manual-override');
      return;
    }

    const next = resolveAutoProfile(fps, memoryMb, sceneMode, autoProfile);
    setAutoProfile(next.profile);
    setReason(next.reason);
  }, [autoProfile, fps, memoryMb, qualityMode, sceneMode]);

  const resolvedProfile = useMemo<RuntimeQualityProfile>(() => {
    if (qualityMode === 'auto') return autoProfile;
    return qualityMode;
  }, [autoProfile, qualityMode]);

  return {
    qualityMode,
    resolvedProfile,
    reason,
    setQualityMode,
  };
}
