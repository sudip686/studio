'use client';

import { useState } from 'react';
import CinematicDrillholeViewer from '../cinematic-drillhole-viewer';
import { Legend } from '@/components/ui/legend';
import { drillholeLocationMapLithologyLegendData, ASSAY_GRAPHITIC_CARBON } from '@/lib/constants';

interface CinematicDrillholeViewProps {
    type: 'lithology' | 'assay';
}

const CinematicDrillholeView = ({ type }: CinematicDrillholeViewProps) => {
    const [selectedHoleId, setSelectedHoleId] = useState<string | undefined>(undefined);

    return (
        <>
            <CinematicDrillholeViewer type={type} />
            {type === 'lithology' &&
                <Legend
                    title={drillholeLocationMapLithologyLegendData.title}
                    type="categorical"
                    items={drillholeLocationMapLithologyLegendData.items}
                    show={true}
                />
            }
            {type === 'assay' &&
                <Legend
                    title="Assay (Graphitic Carbon)"
                    type="categorical"
                    items={ASSAY_GRAPHITIC_CARBON.bins}
                    show={true}
                />
            }

            {/* Hole selection controls */}
            <div className="absolute top-4 right-4 bg-white bg-opacity-80 p-4 rounded-lg shadow-md w-72 text-sm pointer-events-auto">
                <h3 className="font-bold text-lg mb-3">Drillhole Selection</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Drillhole:
                        </label>
                        <select
                            value={selectedHoleId || ''}
                            onChange={(e) => setSelectedHoleId(e.target.value || undefined)}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="">Auto-select first hole</option>
                            {/* Add hole options dynamically if needed */}
                        </select>
                    </div>
                    <div className="text-xs text-gray-600">
                        <p>• Camera starts at drillhole collar</p>
                        <p>• Descends below surface</p>
                        <p>• Reveals 3D boreholes horizontally</p>
                        <p>• VR-style navigation enabled</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CinematicDrillholeView;