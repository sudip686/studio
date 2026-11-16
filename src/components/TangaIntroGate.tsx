'use client';

import {useEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {assetUrl} from '@/lib/asset-url';

// Large media lives on Cloudflare R2 (NEXT_PUBLIC_ASSET_BASE_URL) in
// production and /public locally. Videos are gitignored — never in the bundle.
const VIDEO_KEY = '/media/tanga-google-earth-intro-corrected-preview.mp4';
const POSTER_KEY = '/media/tanga-first-slide-story-poster.jpg';
const INTRO_VIDEO_SRC = assetUrl(VIDEO_KEY) + '?v=intro-opt-1080-20260819';
const INTRO_VIDEO_SRC_LOCAL = VIDEO_KEY + '?v=intro-opt-1080-20260819';
const INTRO_POSTER_SRC = assetUrl(POSTER_KEY) + '?v=full-bleed-bright-20260625';
const ERROR_FALLBACK_MS = 2000;

type IntroState = 'checking' | 'playing' | 'blocked' | 'finishing' | 'done';

type TangaIntroGateProps = {
  children: ReactNode;
};

export default function TangaIntroGate({children}: TangaIntroGateProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const [introState, setIntroState] = useState<IntroState>('checking');
  const [videoSrc, setVideoSrc] = useState(INTRO_VIDEO_SRC);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [introDuration, setIntroDuration] = useState(50);
  const [soundOn, setSoundOn] = useState(false);
  const [activeRoute, setActiveRoute] = useState('');
  const [deepLinked, setDeepLinked] = useState(false);

  const completeIntro = () => {
    if (finishTimerRef.current !== null) return;
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setIntroState('finishing');
    // The intro is already the welcome: reveal the first actual chapter,
    // rather than requiring a second "Begin" click on the cover behind it.
    window.dispatchEvent(new Event('tanga:intro-complete'));
    finishTimerRef.current = window.setTimeout(() => setIntroState('done'), 620);
  };

  useEffect(() => {
    // Read browser-only URL state after hydration so server and client markup
    // agree on the active waypoint for direct chapter links.
    const initialRoute = window.location.hash.replace(/^#/, '');
    setActiveRoute(initialRoute);
    if (initialRoute) {
      setDeepLinked(true);
      setIntroState('done');
      return;
    }
    setIntroState('playing');
  }, []);

  useEffect(() => {
    const revealLinkedChapter = () => {
      const route = window.location.hash.replace(/^#/, '');
      setActiveRoute(route);
      if (!route) return;
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
      setIntroState('done');
    };
    window.addEventListener('hashchange', revealLinkedChapter);
    return () => window.removeEventListener('hashchange', revealLinkedChapter);
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
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
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
      <div className={showIntro ? 'tanga-intro-app is-preloading' : 'tanga-intro-app'} data-intro-complete={!deepLinked&&(introState==='finishing'||introState==='done')?'true':undefined}>
        {children}
      </div>

      {showIntro ? (
        <section
          className={`tanga-intro${introState === 'checking' ? ' is-checking' : ''}${isFinishing ? ' is-finishing' : ''}`}
          aria-hidden={introState === 'checking'}
          style={{'--tanga-intro-duration': `${introDuration}s`} as CSSProperties}
          aria-label="Tanga cinematic intro"
        >
          <div className="tanga-intro__media">
            {!showFallback ? (
              <video
                ref={videoRef}
                className="tanga-intro__video"
                src={introState==='checking'?undefined:videoSrc}
                poster={INTRO_POSTER_SRC}
                muted={!soundOn}
                playsInline
                autoPlay={introState==='playing'}
                preload={introState==='checking'?'none':'auto'}
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
                <span>TANZANIA · AN INTERACTIVE PROJECT STORY</span>
                <h1>Tanga Graphite</h1>
                <p>Explore the landscape, the drilling and the work behind the estimate.</p>
                <p className="tanga-intro__credibility">Reported estimate · <a href="/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf" target="_blank" rel="noreferrer">AMC Mineral Resource Estimate · 19 December 2025</a></p>
                <button className="tanga-intro__enter" type="button" onClick={completeIntro}>Enter the project <span aria-hidden="true">→</span></button>
                <nav className="tanga-intro__story-route" aria-label="Presentation chapters">
                  {[
                    {href: '#tanzania', label: '01 · Place & scale'},
                    {href: '#resource', label: '02 · The evidence'},
                    {href: '#mine_planning', label: '03 · The next stage'},
                  ].map(({href, label}) => {
                    const route = href.slice(1);
                    return <a key={route} href={href} aria-current={activeRoute === route ? 'page' : undefined}>{label}</a>;
                  })}
                </nav>
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
              Opening the interactive project…
            </div>
          ) : null}

          <button type="button" className="tanga-intro__sound" aria-pressed={soundOn} onClick={() => setSoundOn(value => !value)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              {soundOn ? <path d="M15 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /> : <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />}
            </svg>
            Sound {soundOn ? 'on' : 'off'}
          </button>

          <button type="button" className="tanga-intro__skip" onClick={completeIntro}>
            Skip intro
          </button>
        </section>
      ) : null}
    </>
  );
}



