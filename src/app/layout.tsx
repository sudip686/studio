import './globals.css';
import type {Metadata} from 'next';
import ServiceWorkerRegistrar from './ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'Tanga Graphite · Investor Presentation',
  description: 'An interactive 3D story of the Tanga Graphite Project in Tanzania — resource, drilling, metallurgy and infrastructure, presented by Sakariya Mines & Minerals.',
  applicationName: 'Tanga Graphite',
  themeColor: '#0a1018',
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
