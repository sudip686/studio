'use client';

import { useEffect, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { Slider } from '@/components/ui/slider';

const IonImageryView = () => {
  const { viewer } = useCesium();
  const [transparency, setTransparency] = useState(0.7);

  useEffect(() => {
    if (viewer) {
      const addImagery = async () => {
        const Cesium = (window as any).Cesium;
        const layer = viewer.imageryLayers.addImageryProvider(
          await Cesium.IonImageryProvider.fromAssetId(3733958),
        );
        // You might want to fly to the layer extent
        // await viewer.flyTo(layer);
      };
      addImagery();
    }
  }, [viewer]);

  useEffect(() => {
    if (viewer) {
      viewer.scene.globe.baseColor.alpha = transparency;
      viewer.scene.requestRender();
    }
  }, [viewer, transparency]);

  return (
    <div className="absolute top-20 left-10 bg-gray-800 bg-opacity-50 p-4 rounded-lg">
      <label className="text-white">Globe Transparency</label>
      <Slider
        min={0}
        max={1}
        step={0.01}
        value={[transparency]}
        onValueChange={(value) => setTransparency(value[0])}
        className="w-48"
      />
    </div>
  );
};

export default IonImageryView;
