
"use client";

import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

interface DrillholeSegment {
    hole_id: string;
    depth_from: number;
    depth_to: number;
    lithology?: string;
    graphitic_carbon?: number;
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
    const [holeIds, setHoleIds] = useState<string[]>([]);
    const [selectedHoleId, setSelectedHoleId] = useState<string>('');
    const [plotData, setPlotData] = useState<DrillholeSegment[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const lithologyResponse = await fetch('/lithology_data.geojson');
            const lithologyGeoJson = await lithologyResponse.json();
            const lithologyData = lithologyGeoJson.features.map((f: any) => f.properties);

            const assayResponse = await fetch('/assay_data.geojson');
            const assayGeoJson = await assayResponse.json();
            const assayData = assayGeoJson.features.map((f: any) => f.properties);

            const combinedData: { [key: string]: DrillholeSegment[] } = {};

            lithologyData.forEach((segment: any) => {
                if (!combinedData[segment.hole_id]) {
                    combinedData[segment.hole_id] = [];
                }
                combinedData[segment.hole_id].push(segment);
            });

            assayData.forEach((segment: any) => {
                if (combinedData[segment.hole_id]) {
                    const existingSegment = combinedData[segment.hole_id].find(s => s.depth_from === segment.depth_from && s.depth_to === segment.depth_to);
                    if (existingSegment) {
                        existingSegment.graphitic_carbon = segment.graphitic_carbon;
                    } else {
                        combinedData[segment.hole_id].push(segment);
                    }
                }
            });

            const allHoleIds = Object.keys(combinedData);
            setHoleIds(allHoleIds);
            if (allHoleIds.length > 0) {
                setSelectedHoleId(allHoleIds[0]);
                setPlotData(combinedData[allHoleIds[0]].sort((a, b) => a.depth_from - b.depth_from));
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (selectedHoleId) {
            const fetchData = async () => {
                const lithologyResponse = await fetch('/lithology_data.geojson');
                const lithologyGeoJson = await lithologyResponse.json();
                const lithologyData = lithologyGeoJson.features.map((f: any) => f.properties);
    
                const assayResponse = await fetch('/assay_data.geojson');
                const assayGeoJson = await assayResponse.json();
                const assayData = assayGeoJson.features.map((f: any) => f.properties);
    
                const combinedData: { [key: string]: DrillholeSegment[] } = {};

                lithologyData.forEach((segment: any) => {
                    if (!combinedData[segment.hole_id]) {
                        combinedData[segment.hole_id] = [];
                    }
                    combinedData[segment.hole_id].push(segment);
                });
    
                assayData.forEach((segment: any) => {
                    if (combinedData[segment.hole_id]) {
                        const existingSegment = combinedData[segment.hole_id].find(s => s.depth_from === segment.depth_from && s.depth_to === segment.depth_to);
                        if (existingSegment) {
                            existingSegment.graphitic_carbon = segment.graphitic_carbon;
                        } else {
                            combinedData[segment.hole_id].push(segment);
                        }
                    }
                });
                setPlotData(combinedData[selectedHoleId].sort((a, b) => a.depth_from - b.depth_from));
            };
            fetchData();
        }
    }, [selectedHoleId]);

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
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="depth_from" width={150} label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="graphitic_carbon" name="Graphitic Carbon" fill="#8884d8" />
                    <Bar dataKey="lithology" name="Lithology" >
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
