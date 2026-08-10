import './globals.css';
import type {Metadata, Viewport} from 'next';
import ServiceWorkerRegistrar from './ServiceWorkerRegistrar';

const OG_IMAGE = (process.env.NEXT_PUBLIC_ASSET_BASE_URL
  ? `${process.env.NEXT_PUBLIC_ASSET_BASE_URL.replace(/\/$/, '')}/media/tanga-google-earth-intro-poster.jpg`
  : '/media/tanga-google-earth-intro-poster.jpg');

const TITLE = 'Tanga Graphite · Investor Presentation';
const DESCRIPTION =
  'An interactive 3D story of the Tanga Graphite Project, Tanzania — a top-5 global graphite deposit: 183 Mt @ 4.86% TGC, >97% TC concentrate, and coastal port/power/rail access. By Sakariya Mines & Minerals.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'Tanga Graphite',
  authors: [{name: 'Sakariya Mines & Minerals'}],
  keywords: ['Tanga Graphite', 'graphite', 'Tanzania', 'mineral resource', 'JORC', 'flake graphite', 'investor presentation'],
  openGraph: {
    type: 'website',
    siteName: 'Tanga Graphite',
    title: TITLE,
    description: DESCRIPTION,
    images: [{url: OG_IMAGE, width: 1200, height: 630, alt: 'Tanga Graphite Project — 3D flyover'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {index: false, follow: false},
};

export const viewport: Viewport = {
  themeColor: '#0a1018',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/A_Logo.png" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="tanga-body">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
