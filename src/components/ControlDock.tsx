import { Panel } from './ui/panel';
import { CompassOverlay } from './ui/CompassOverlay';
import { MetricScaleOverlay } from './ui/MetricScaleOverlay';

export function ControlDock() {
  return (
    <div className="absolute bottom-4 right-4 z-20">
      <Panel className="flex items-center gap-4">
        <CompassOverlay />
        <MetricScaleOverlay />
      </Panel>
    </div>
  );
}