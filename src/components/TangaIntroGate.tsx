'use client';

import {useEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';

// Large media lives on Cloudflare R2 (NEXT_PUBLIC_ASSET_BASE_URL) in
// production and /public locally. Videos are gitignored — never in the bundle.
const ASSET_BASE_URL = (process.env.NEXT_PUBLIC_ASSET_BASE_URL || '').replace(/\/$/, '');
const asset = (path: string) => (ASSET_BASE_URL ? `${ASSET_BASE_URL}${path}` : path);
const VIDEO_KEY = '/media/tanga-google-earth-intro-corrected-preview.mp4';
const POSTER_KEY = '/media/tanga-first-slide-story-poster.jpg';
const INTRO_VIDEO_SRC = asset(VIDEO_KEY) + '?v=intro-gate-20260627a';
const INTRO_VIDEO_SRC_LOCAL = VIDEO_KEY + '?v=intro-gate-20260627a';
const INTRO_POSTER_SRC = asset(POSTER_KEY) + '?v=full-bleed-bright-20260625';
const ERROR_FALLBACK_MS = 2000;

type IntroState = 'checking' | 'playing' | 'blocked' | 'finishing' | 'done';

type TangaIntroGateProps = {
  children: ReactNode;
};

export default function TangaIntroGate({children}: TangaIntroGateProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const [introState, setIntroState] = useState<IntroState>('checking');
  const [videoSrc, setVideoSrc] = useState(INTRO_VIDEO_SRC);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [introDuration, setIntroDuration] = useState(50);

  const completeIntro = () => {
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setIntroState('finishing');
    window.setTimeout(() => setIntroState('done'), 620);
  };

  useEffect(() => {
    setIntroState('playing');
  }, []);

  useEffect(() => {
    if (introState !== 'playing') return;

    const video = videoRef.current;
    if (!video) return;

    // Accessibility: never autoplay the cinematic for users who ask for reduced
    // motion. Hold the static poster briefly (no motion), then enter the deck —
    // the "Skip intro" button is always available too. Matches the CountUp
    // reduced-motion handling.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      const holdTimer = window.setTimeout(completeIntro, 3500);
      return () => window.clearTimeout(holdTimer);
    }

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => setIntroState('blocked'));
    }
  }, [introState]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  const handleVideoError = () => {
    // If the R2 copy failed, retry the local /public copy once before giving up.
    if (videoSrc !== INTRO_VIDEO_SRC_LOCAL) {
      setVideoSrc(INTRO_VIDEO_SRC_LOCAL);
      return;
    }
    setVideoUnavailable(true);
    if (fallbackTimerRef.current) return;
    fallbackTimerRef.current = window.setTimeout(completeIntro, ERROR_FALLBACK_MS);
  };

  const handleVideoMetadata = () => {
    const duration = videoRef.current?.duration;
    if (duration && Number.isFinite(duration)) {
      setIntroDuration(duration);
    }
  };

  const showIntro = introState !== 'done';
  const isFinishing = introState === 'finishing';
  const isBlocked = introState === 'blocked';
  const showFallback = videoUnavailable;
  const showOverlayCopy = true;

  return (
    <>
      <div className={showIntro ? 'tanga-intro-app is-preloading' : 'tanga-intro-app'}>
        {children}
      </div>

      {showIntro ? (
        <section
          className={`tanga-intro${isFinishing ? ' is-finishing' : ''}`}
          style={{'--tanga-intro-duration': `${introDuration}s`} as CSSProperties}
          aria-label="Tanga cinematic intro"
        >
          <div className="tanga-intro__media">
            {!showFallback ? (
              <video
                ref={videoRef}
                className="tanga-intro__video"
                src={videoSrc}
                poster={INTRO_POSTER_SRC}
                muted
                playsInline
                autoPlay
                preload="auto"
                onLoadedMetadata={handleVideoMetadata}
                onEnded={completeIntro}
                onError={handleVideoError}
              />
            ) : (
              <div className="tanga-intro__fallback" role="img" aria-label="Cinematic Tanga project flyover placeholder" />
            )}
          </div>

          <div className="tanga-intro__shade" />

          <div className="tanga-intro__brand" aria-label="Sakariya Mines and Minerals">
            <img src="/A_Logo.png" alt="" className="tanga-intro__brand-mark" />
            <img src="/sakariya-wordmark.png" alt="Sakariya Mines and Minerals" className="tanga-intro__brand-wordmark" />
          </div>

          {showOverlayCopy ? (
            <>
              <div className="tanga-intro__copy">
                <span>[TANGA GRAPHITE]</span>
                <h1>From coast to resource</h1>
                <p>Global context gives way to Tanzania, Tanga Port, and the project area.</p>
              </div>
            </>
          ) : null}

          <div className="tanga-intro__timeline" aria-hidden="true">
            <span />
          </div>

          {isBlocked ? (
            <div className="tanga-intro__blocked">
              <strong>Intro ready</strong>
              <span>Autoplay was blocked by the browser.</span>
              <button type="button" onClick={() => setIntroState('playing')}>Play intro</button>
            </div>
          ) : null}

          {videoUnavailable ? (
            <div className="tanga-intro__notice">
              Draft intro video not found yet. Opening the presentation...
            </div>
          ) : null}

          <button type="button" className="tanga-intro__skip" onClick={completeIntro}>
            Skip intro
          </button>
        </section>
      ) : null}
    </>
  );
}



