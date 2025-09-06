"use client";

import GeoVision from "@/components/geo-vision";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <header className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-2xl font-bold">GeoVision</h1>
        <p className="text-sm md:text-base text-muted-foreground">Interactive Geological Data Visualization</p>
      </header>
      <GeoVision />
    </main>
  );
}
