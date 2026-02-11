"use client";

import { useEffect } from "react";

function setVar(name: string, valuePx: number) {
  try {
    document.documentElement.style.setProperty(
      name,
      `${Math.max(0, Math.round(valuePx))}px`
    );
  } catch {}
}

export default function UiChromeMeasure() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const header = document.querySelector<HTMLElement>(
      "header, [data-ui-header]"
    );
    const chapterTrigger = document.querySelector<HTMLElement>(
      "[data-ui-chapter-trigger], .chapter-hamburger, .hamburger, .menu-button"
    );
    const chapterSidebar = document.querySelector<HTMLElement>(
      "[data-ui-chapter-sidebar], .chapter-sidebar, .chapters-panel"
    );

    const update = () => {
      try {
        const headerHeight = header ? header.getBoundingClientRect().height : 0;
        setVar("--header-height", headerHeight);

        const triggerWidth = chapterTrigger
          ? chapterTrigger.getBoundingClientRect().width
          : 0;
        setVar("--chapter-trigger-width", triggerWidth);

        const sidebarWidth = chapterSidebar
          ? chapterSidebar.getBoundingClientRect().width
          : 0;
        const visible =
          !!chapterSidebar &&
          sidebarWidth > 0 &&
          // offsetParent null implies display:none or fixed positioning edge-cases
          chapterSidebar.offsetParent !== null;
        setVar("--chapter-sidebar-width", visible ? sidebarWidth : 0);

        if (headerHeight > 0) {
          document.body.dataset.hasHeader = "true";
        } else {
          delete (document.body.dataset as any).hasHeader;
        }
        if (visible) {
          document.body.dataset.chapterOpen = "true";
        } else {
          delete (document.body.dataset as any).chapterOpen;
        }
      } catch {}
    };

    update();

    const RO = (window as any).ResizeObserver
      ? new (window as any).ResizeObserver(update)
      : null;
    if (RO) {
      try {
        if (header) RO.observe(header);
        if (chapterTrigger) RO.observe(chapterTrigger);
        if (chapterSidebar) RO.observe(chapterSidebar);
        RO.observe(document.body);
      } catch {}
    }

    window.addEventListener("resize", update, { passive: true } as any);
    const interval = window.setInterval(update, 1000);

    return () => {
      window.removeEventListener("resize", update as any);
      if (RO) {
        try {
          if (header) RO.unobserve(header);
          if (chapterTrigger) RO.unobserve(chapterTrigger);
          if (chapterSidebar) RO.unobserve(chapterSidebar);
          RO.disconnect();
        } catch {}
      }
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
