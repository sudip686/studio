'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Temporarily disable service worker registration
      // window.addEventListener('load', () => {
      //   navigator.serviceWorker.register('/service-worker.js').then(registration => {
      //     console.log('ServiceWorker registration successful with scope: ', registration.scope);
      //   }, err => {
      //     console.log('ServiceWorker registration failed: ', err);
      //   });
      // });
      console.warn("Service Worker registration is temporarily disabled for debugging.");
    }
  }, []);

  return null;
}
