'use client';

import Link from 'next/link';
import { ThreeSceneProvider } from '@/contexts/three-scene-context';
import { OverlayRoot } from "@/ui/overlays/OverlayRoot";
import GlobalOverlays from "@/components/shared/GlobalOverlays";

export default function ChaptersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-800 text-white p-4">
        <nav>
          <ul>
            <li><Link href="/chapters/lithology">3D Lithology</Link></li>
            <li><Link href="/chapters/assay">3D Assay</Link></li>
            <li><Link href="/chapters/block-model-carbon">3D Block Model</Link></li>
            <li><Link href="/chapters/block-model-resc">3D Block Model - Resource Classification</Link></li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-4">
        <OverlayRoot>
          <ThreeSceneProvider>
            {children}
            {/* Always-on overlays for chapter 3D views */}
            <GlobalOverlays mode="three" hidden={false} />
          </ThreeSceneProvider>
        </OverlayRoot>
      </main>
    </div>
  );
}
