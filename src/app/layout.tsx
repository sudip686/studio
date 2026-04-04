import type {Metadata} from 'next';
import './globals.css';
import { DataCacheProvider } from '@/lib/data-cache';
import ServiceWorkerRegistrar from './ServiceWorkerRegistrar';
import ErrorBoundary from '@/components/ui/error-boundary';
import UiChromeMeasure from '@/components/shared/UiChromeMeasure';
import ScenePreloader from '@/components/ScenePreloader';

export const metadata: Metadata = {
  title: 'GeoVision3D',
  description: 'Immersive 3D geological data visualization',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.png" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Widgets/widgets.css" rel="stylesheet" />
        <script src="https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Cesium.js"></script>
      </head>
      <body className="bg-canvas text-gray-100 font-body antialiased">
        <UiChromeMeasure />
        <DataCacheProvider>
          <ErrorBoundary>
            {/* Warm heavy assets early so 3D views don't wait for first load */}
            <ScenePreloader />
            {children}
          </ErrorBoundary>
        </DataCacheProvider>
        <ServiceWorkerRegistrar />
        </body>
    </html>
  );
}
