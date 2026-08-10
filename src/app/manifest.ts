import type {MetadataRoute} from 'next';

// Web app manifest — makes the deck installable (Add to Home Screen) with
// proper branding, standalone display and theme. Next auto-links this at
// /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tanga Graphite · Investor Presentation',
    short_name: 'Tanga Graphite',
    description:
      'An interactive 3D story of the Tanga Graphite Project, Tanzania — a top-5 global graphite deposit by Sakariya Mines & Minerals.',
    start_url: '/',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#070d15',
    theme_color: '#0a1018',
    icons: [
      {src: '/A_Logo.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
      {src: '/A_Logo.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
      {src: '/A_Logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
    ],
  };
}
