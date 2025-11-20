
"use client";

import { useEffect, useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { useDataCache, DrillholeSegment as DataCacheDrillholeSegment } from '@/lib/data-cache';

interface DrillholeSegment extends DataCacheDrillholeSegment {
    // Additional properties if any, otherwise just extends
}

const LITHOLOGY_COLOR_MAP: { [key: string]: string } = {
    "Quartz-Feldspathic": "#FAD7A0",
    "GRSC": "#839192",
    "Felsic Dyke": "#F1948A",
    "Mafic Dyke": "#5B2C6F",
    "Pegmatite": "#76D7C4",
    "Breccia": "#AF601A",
    "Granulite": "#B3B6B7",
    "Khondalite": "#E6B0AA",
    "Marble": "#D4E6F1",
    "Not Recovearble": "#515A5A",
    "SOIL": "#A9DFBF",
    "Schist": "#AED6F1",
    "nan": "#FFFFFF",
    "UNKNOWN": "#cccccc",
};

const DownholePlot = () => {
    const { drillholeData } = useDataCache();
    const [holeIds, setHoleIds] = useState<string[]>([]);
    const [selectedHoleId, setSelectedHoleId] = useState<string>('');
    const [plotData, setPlotData] = useState<DrillholeSegment[]>([]);

    const combinedData = useMemo(() => {
        if (!drillholeData) return {};
        const data: { [key: string]: DrillholeSegment[] } = {};

        drillholeData.lithology.forEach(segment => {
            if (!data[segment.hole_id]) {
                data[segment.hole_id] = [];
            }
            data[segment.hole_id].push({...segment});
        });

        drillholeData.assay.forEach(segment => {
            if (!data[segment.hole_id]) {
                data[segment.hole_id] = [];
            }
            const existingSegment = data[segment.hole_id].find(s => s.depth_from === segment.depth_from && s.depth_to === segment.depth_to);
            if (existingSegment) {
                existingSegment.graphitic_carbon = segment.graphitic_carbon;
            } else {
                data[segment.hole_id].push({...segment});
            }
        });
        return data;
    }, [drillholeData]);

    useEffect(() => {
        const allHoleIds = Object.keys(combinedData);
        setHoleIds(allHoleIds);
        if (allHoleIds.length > 0 && (!selectedHoleId || !allHoleIds.includes(selectedHoleId))) {
            setSelectedHoleId(allHoleIds[0]);
        }
    }, [combinedData, selectedHoleId]);

    useEffect(() => {
        if (selectedHoleId && combinedData[selectedHoleId]) {
            setPlotData(combinedData[selectedHoleId].sort((a, b) => a.depth_from - b.depth_from));
        }
    }, [selectedHoleId, combinedData]);

    return (
        <div className="h-screen w-screen bg-gray-100 p-4 flex flex-col">
            <div className="flex items-center mb-4">
                <label htmlFor="holeIdSelect" className="mr-2 font-bold">Select Hole ID:</label>
                <select 
                    id="holeIdSelect"
                    value={selectedHoleId}
                    onChange={(e) => setSelectedHoleId(e.target.value)}
                    className="p-2 rounded border border-gray-300"
                >
                    {holeIds.map(id => <option key={id} value={id}>{id}</option>)}
                </select>
            </div>
            <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    layout="vertical"
                    data={plotData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barCategoryGap={0}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 'dataMax + 2']} />
                    <YAxis 
                        type="category" 
                        dataKey="depth_from" 
                        width={150} 
                        label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft' }} 
                        interval={0}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="graphitic_carbon" name="Graphitic Carbon">
                        {plotData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={LITHOLOGY_COLOR_MAP[entry.lithology || 'UNKNOWN']} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DownholePlot;
