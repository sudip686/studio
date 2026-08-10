'use client';

import {useCallback, useEffect, useRef, useState} from 'react';

type PlaybackState = 'loading' | 'playing' | 'blocked' | 'error';

type TangaStoryVideoHeroProps = {
  visible: boolean;
  videoSrc: string;
  posterSrc: string;
  onComplete: () => void;
  onShowRanking: () => void;
  onSkip: () => void;
  onError?: () => void;
};

export default function TangaStoryVideoHero({
  visible,
  videoSrc,
  posterSrc,
  onComplete,
  onShowRanking,
  onSkip,
  onError,
}: TangaStoryVideoHeroProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('loading');

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setPlaybackState('loading');
    video.muted = true;
    try {
      video.currentTime = 0;
    } catch {
      // Some browsers reject seeking until metadata is ready; playback can still start.
    }

    const playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => setPlaybackState('blocked'));
    }
  }, []);

  const handleVideoError = useCallback(() => {
    clearFallbackTimer();
    setPlaybackState('error');
    onError?.();
    fallbackTimerRef.current = window.setTimeout(() => {
      fallbackTimerRef.current = null;
      onComplete();
    }, 2000);
  }, [clearFallbackTimer, onComplete, onError]);

  useEffect(() => {
    if (!visible) {
      clearFallbackTimer();
      videoRef.current?.pause();
      return;
    }

    playVideo();

    return () => {
      clearFallbackTimer();
      videoRef.current?.pause();
    };
  }, [clearFallbackTimer, playVideo, visible]);

  if (!visible) return null;

  const isBlocked = playbackState === 'blocked';
  const isError = playbackState === 'error';

  return (
    <section className="tanga-story-hero" aria-label="Tanga cinematic project story" data-playback={playbackState}>
      <video
        ref={videoRef}
        className="tanga-story-hero__video"
        src={videoSrc}
        poster={posterSrc}
        muted
        playsInline
        autoPlay
        preload="auto"
        onCanPlay={() => setPlaybackState((current) => current === 'loading' ? 'playing' : current)}
        onPlaying={() => setPlaybackState('playing')}
        onEnded={onComplete}
        onError={handleVideoError}
      />

      <div className="tanga-story-hero__scrim" aria-hidden="true" />

      <div className="tanga-story-hero__brand">
        <span>
          <img src="/A_Logo.png" alt="" />
        </span>
        <img src="/sakariya-wordmark.png" alt="Sakariya Mines & Minerals" />
      </div>

      <div className="tanga-story-hero__status" aria-live="polite">
        <span>Story pass</span>
        <strong>{isError ? 'Poster fallback' : isBlocked ? 'Ready to play' : 'Cinematic walkthrough'}</strong>
      </div>

      <div className="tanga-story-hero__copy">
        <span>Tanga, Tanzania</span>
        <h1>Tanga Graphite Project</h1>
        <p>Peer context, access, topography, drillholes, resource blocks, and metallurgy in one guided pass.</p>
      </div>

      <div className="tanga-story-hero__actions">
        {isBlocked && (
          <button type="button" className="is-primary" onClick={playVideo}>
            Play story
          </button>
        )}
        <button type="button" className="is-primary" onClick={onShowRanking}>
          Show peer field
        </button>
        <button type="button" onClick={onSkip}>
          Skip story
        </button>
      </div>
    </section>
  );
}
