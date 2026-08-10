'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ThreeSceneProvider } from '@/contexts/three-scene-context';
import { DataCacheProvider } from '@/lib/data-cache';
import { OverlayRoot } from "@/ui/overlays/OverlayRoot";
import GlobalOverlays from "@/components/shared/GlobalOverlays";

const chapterLinks = [
  {
    href: '/chapters/lithology',
    label: '3D Lithology',
    note: 'Geological framework and host units',
  },
  {
    href: '/chapters/assay',
    label: '3D Assay',
    note: 'Grade continuity and distribution',
  },
  {
    href: '/chapters/block-model-carbon',
    label: '3D Block Model',
    note: 'Carbon distribution and cut-off view',
  },
  {
    href: '/chapters/block-model-resc',
    label: 'Resource Classification',
    note: 'Confidence categories and reporting view',
  },
] as const;

export default function ChaptersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const queueClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setIsDrawerOpen(false);
      closeTimerRef.current = null;
    }, 1200);
  };

  const keepDrawerOpen = () => {
    clearCloseTimer();
    setIsDrawerOpen(true);
  };

  useEffect(() => {
    clearCloseTimer();
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isDrawerOpen) {
      clearCloseTimer();
      return;
    }

    queueClose();
    return () => clearCloseTimer();
  }, [isDrawerOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearCloseTimer();
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <div className="chapters-layout">
      <main className="chapters-main">
        <div className="chapters-nav-shell">
          <button
            type="button"
            data-ui-chapter-trigger
            className={`chapters-sidebar-toggle ${isDrawerOpen ? 'is-open' : ''}`}
            aria-expanded={isDrawerOpen}
            aria-controls="chapters-drawer"
            aria-label={isDrawerOpen ? 'Hide chapter navigation' : 'Show chapter navigation'}
            onClick={() => setIsDrawerOpen((open) => !open)}
            onMouseEnter={keepDrawerOpen}
            onFocus={keepDrawerOpen}
            onMouseLeave={queueClose}
            onBlur={queueClose}
          >
            <span className="chapters-sidebar-toggle__icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="chapters-sidebar-toggle__copy">
              <strong>Chapters</strong>
              <small>Open navigator</small>
            </span>
          </button>

          <AnimatePresence>
            {isDrawerOpen ? (
              <>
                <motion.button
                  type="button"
                  aria-label="Close chapter navigation"
                  className="chapters-sidebar__scrim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  onClick={() => setIsDrawerOpen(false)}
                />
                <motion.aside
                  id="chapters-drawer"
                  data-ui-chapter-sidebar
                  className="chapters-sidebar"
                  initial={{ opacity: 0, x: -28, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -24, scale: 0.985 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  onMouseEnter={keepDrawerOpen}
                  onFocusCapture={keepDrawerOpen}
                  onMouseLeave={queueClose}
                  onBlurCapture={(event) => {
                    const nextFocused = event.relatedTarget as Node | null;
                    if (!event.currentTarget.contains(nextFocused)) {
                      queueClose();
                    }
                  }}
                >
                  <div className="chapters-sidebar__header">
                    <div>
                      <span className="chapters-sidebar__label">3D Chapter Views</span>
                      <h2 className="chapters-sidebar__title">Navigator</h2>
                      <p className="chapters-sidebar__intro">
                        Open any chapter view without leaving the scene-first layout.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="chapters-sidebar__close"
                      aria-label="Close chapter navigation"
                      onClick={() => setIsDrawerOpen(false)}
                    >
                      <span />
                      <span />
                    </button>
                  </div>

                  <div className="chapters-sidebar__body">
                    <nav className="chapters-sidebar__nav" aria-label="Chapter navigation">
                      <ul>
                        {chapterLinks.map((chapter, index) => {
                          const isActive = pathname === chapter.href;
                          return (
                            <li key={chapter.href}>
                              <Link
                                href={chapter.href}
                                className={`chapters-sidebar__link ${isActive ? 'is-active' : ''}`}
                              >
                                <span className="chapters-sidebar__link-index">
                                  {String(index + 1).padStart(2, '0')}
                                </span>
                                <span className="chapters-sidebar__link-copy">
                                  <strong>{chapter.label}</strong>
                                  <small>{chapter.note}</small>
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </nav>
                  </div>
                </motion.aside>
              </>
            ) : null}
          </AnimatePresence>
        </div>

        <OverlayRoot
          leftOffsetPx="calc(var(--chapters-overlay-left, 0px) + var(--chapter-sidebar-width, 0px) + 0.85rem)"
          rightOffsetPx="var(--chapters-overlay-right, 0px)"
          topOffsetPx="var(--chapters-overlay-top, 0px)"
          bottomOffsetPx="var(--chapters-overlay-bottom, 0px)"
        >
          <DataCacheProvider>
            <ThreeSceneProvider>
              {children}
              {/* Always-on overlays for chapter 3D views */}
              <GlobalOverlays mode="three" hidden={false} />
            </ThreeSceneProvider>
          </DataCacheProvider>
        </OverlayRoot>
      </main>
    </div>
  );
}

