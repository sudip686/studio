import GeoVision from '@/components/geo-vision';

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <header className="absolute top-0 left-0 z-10 p-4 md:p-8">
        <h1 className="text-2xl md:text-4xl font-bold text-foreground/80 font-headline">GeoVision3D</h1>
        <p className="text-sm md:text-base text-muted-foreground">Interactive Geological Data Visualization</p>
      </header>
      <GeoVision />
    </main>
  );
}
