'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const enabled = process.env.NEXT_PUBLIC_ENABLE_SERVICE_WORKER === 'true';

    if (!enabled) {
      navigator.serviceWorker.getRegistrations?.()?.then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => undefined);
        });
      });

      if ('caches' in window) {
        window.caches.keys().then((keys) => {
          keys
            .filter((key) => /workbox|precache|tiles-|geo-data|assets-swr|img-swr|default-nf/i.test(key))
            .forEach((key) => {
              window.caches.delete(key).catch(() => undefined);
            });
        });
      }

      return;
    }

    const register = () => {
      navigator.serviceWorker.register('/service-worker.js').then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }, err => {
        console.log('ServiceWorker registration failed: ', err);
      });
    };

    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
