import type {Metadata} from 'next';
import './globals.css';
import { DataCacheProvider } from '@/lib/data-cache';
import ServiceWorkerRegistrar from './ServiceWorkerRegistrar';

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
        <link href="https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Widgets/widgets.css" rel="stylesheet" />
        <script src="https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Cesium.js"></script>
      </head>
      <body className="font-body antialiased">
        <DataCacheProvider>{children}</DataCacheProvider>
        <ServiceWorkerRegistrar />
        </body>
    </html>
  );
}