'use client';

import dynamic from 'next/dynamic';
import TangaIntroGate from '@/components/TangaIntroGate';

const TangaDeckWorkbench = dynamic(() => import('@/components/TangaDeckWorkbench'), {
  ssr: false,
  loading: () => (
    <main className="tanga-boot">
      <div>
        <span>Sakariya Mines & Minerals</span>
        <strong>Loading the Tanga project story…</strong>
      </div>
    </main>
  ),
});

export default function Home() {
  return (
    <TangaIntroGate>
      <TangaDeckWorkbench />
    </TangaIntroGate>
  );
}
