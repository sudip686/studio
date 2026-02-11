
"use client";

import { useEffect, useState } from 'react';
import { BarChart, Bar, CartesianGrid, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AssayData {
    hole_id: string;
    depth_from: number;
    depth_to: number;
    graphitic_carbon?: number;
    [key: string]: any;
    unique_id?: string;
}

interface LithologyData {
    hole_id: string;
    depth_from: number;
    depth_to: number;
    lithology: string;
}

interface MergedData extends AssayData {
    lithology?: string;
}

const StatisticalAnalysis = () => {
    const [assayData, setAssayData] = useState<AssayData[]>([]);
    const [lithologyData, setLithologyData] = useState<LithologyData[]>([]);
    const [mergedData, setMergedData] = useState<MergedData[]>([]);
    const [selectedGrades, setSelectedGrades] = useState<string[]>(['graphitic_carbon']);
    const [summaryStats, setSummaryStats] = useState<any[]>([]);
    const [selectedBoxplotGrade, setSelectedBoxplotGrade] = useState<string>('graphitic_carbon');
    const [boxplotData, setBoxplotData] = useState<any[]>([]);
    const [outliers, setOutliers] = useState<any[]>([]);
    const [selectedOutliers, setSelectedOutliers] = useState<any[]>([]);
    const [originalStats, setOriginalStats] = useState<any>(null);
    const [cleanedStats, setCleanedStats] = useState<any>(null);
    const [topCutValue, setTopCutValue] = useState<string>("");
    const [topCutStats, setTopCutStats] = useState<any>(null);
    const [originalTopCutStats, setOriginalTopCutStats] = useState<any>(null);


    useEffect(() => {
        const fetchData = async () => {
            const assayResponse = await fetch('/assay_data.geojson');
            const assayGeoJson = await assayResponse.json();
            let assayData = assayGeoJson.features.map((f: any) => f.properties);
            assayData = assayData.map((d: any, i: number) => ({ ...d, unique_id: `${d.hole_id}-${d.depth_from}-${d.depth_to}-${i}` }));
            setAssayData(assayData);

            const lithologyResponse = await fetch('/lithology_data.geojson');
            const lithologyGeoJson = await lithologyResponse.json();
            const lithologyData = lithologyGeoJson.features.map((f: any) => f.properties);
            setLithologyData(lithologyData);
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (assayData.length > 0 && lithologyData.length > 0) {
            const lithoMap = new Map(lithologyData.map(l => [`${l.hole_id}-${l.depth_from}-${l.depth_to}`, l.lithology]));
            const data = assayData.map(a => ({
                ...a,
                lithology: lithoMap.get(`${a.hole_id}-${a.depth_from}-${a.depth_to}`) || 'Unknown'
            }));
            setMergedData(data);
        }
    }, [assayData, lithologyData]);

    const calculateStats = (data: any[], grade: string) => {
        const values = data.map(d => d[grade]).filter(v => v !== null && v !== undefined) as number[];
        if (values.length === 0) return { Mean: 0, Min: 0, Max: 0, 'Std Dev': 0, Count: 0 };
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const stdDev = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / values.length);
        return {
            Mean: mean.toFixed(3),
            Min: min.toFixed(3),
            Max: max.toFixed(3),
            'Std Dev': stdDev.toFixed(3),
            Count: values.length
        };
    };

    useEffect(() => {
        if (mergedData.length > 0) {
            const stats = selectedGrades.map(grade => ({
                Grade: grade,
                ...calculateStats(mergedData, grade)
            }));
            setSummaryStats(stats);
        }
    }, [mergedData, selectedGrades]);

    useEffect(() => {
        if (mergedData.length > 0 && selectedBoxplotGrade) {
            const valuesByLithology = mergedData.reduce((acc, d) => {
                const lithology = d.lithology || 'Unknown';
                if (!acc[lithology]) {
                    acc[lithology] = [];
                }
                if (d[selectedBoxplotGrade] !== null && d[selectedBoxplotGrade] !== undefined) {
                    acc[lithology].push(d[selectedBoxplotGrade]);
                }
                return acc;
            }, {} as { [key: string]: number[] });

            const boxData = Object.entries(valuesByLithology).map(([lithology, values]) => {
                values.sort((a, b) => a - b);
                const q1 = values[Math.floor(values.length / 4)];
                const median = values[Math.floor(values.length / 2)];
                const q3 = values[Math.floor(values.length * 3 / 4)];
                const iqr = q3 - q1;
                const lowerBound = q1 - 1.5 * iqr;
                const upperBound = q3 + 1.5 * iqr;
                const min = Math.min(...values);
                const max = Math.max(...values);

                return { lithology, min: min.toFixed(3), q1: q1.toFixed(3), median: median.toFixed(3), q3: q3.toFixed(3), max: max.toFixed(3) };
            });
            setBoxplotData(boxData);

            const allValues = mergedData.map(d => d[selectedBoxplotGrade]).filter(v => v !== null && v !== undefined) as number[];
            allValues.sort((a, b) => a - b);
            const q1 = allValues[Math.floor(allValues.length / 4)];
            const q3 = allValues[Math.floor(allValues.length * 3 / 4)];
            const iqr = q3 - q1;
            const lowerBound = q1 - 1.5 * iqr;
            const upperBound = q3 + 1.5 * iqr;

            const outlierData = mergedData.filter(d => {
                const value = d[selectedBoxplotGrade];
                return value !== null && value !== undefined && (value < lowerBound || value > upperBound);
            });
            setOutliers(outlierData);
        }
    }, [mergedData, selectedBoxplotGrade]);

    const handleRemoveOutliers = () => {
        const outlierIds = new Set(selectedOutliers.map(o => o.unique_id));
        const data = mergedData.filter(d => !outlierIds.has(d.unique_id));
        
        setOriginalStats(calculateStats(mergedData, selectedBoxplotGrade));
        setCleanedStats(calculateStats(data, selectedBoxplotGrade));
    };

    const handleApplyTopCut = () => {
        const cutValue = parseFloat(topCutValue);
        if (isNaN(cutValue)) return;

        const topCutData = mergedData.map(d => ({
            ...d,
            [selectedBoxplotGrade]: d[selectedBoxplotGrade] > cutValue ? cutValue : d[selectedBoxplotGrade]
        }));
        
        setOriginalTopCutStats(calculateStats(mergedData, selectedBoxplotGrade));
        setTopCutStats(calculateStats(topCutData, selectedBoxplotGrade));
    };

    return (
        <div className="h-screen w-screen bg-gray-100 p-4 flex overflow-auto">
            <div className="w-1/4 p-4 bg-white rounded-lg shadow-md space-y-4">
                <h2 className="text-lg font-bold">Statistical Analysis</h2>
                <div>
                    <label className="font-bold">Select Grades:</label>
                    <Select onValueChange={(value) => setSelectedGrades([value])} defaultValue={selectedGrades[0]}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="graphitic_carbon">Graphitic Carbon</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="font-bold">Select Grade for Analysis:</label>
                    <Select onValueChange={setSelectedBoxplotGrade} defaultValue={selectedBoxplotGrade}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="graphitic_carbon">Graphitic Carbon</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="w-3/4 p-4 space-y-4">
                <Card>
                    <CardHeader><CardTitle>Summary Statistics</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Mean</TableHead>
                                    <TableHead>Min</TableHead>
                                    <TableHead>Max</TableHead>
                                    <TableHead>Std Dev</TableHead>
                                    <TableHead>Count</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summaryStats.map(stat => (
                                    <TableRow key={stat.Grade}>
                                        <TableCell>{stat.Grade}</TableCell>
                                        <TableCell>{stat.Mean}</TableCell>
                                        <TableCell>{stat.Min}</TableCell>
                                        <TableCell>{stat.Max}</TableCell>
                                        <TableCell>{stat['Std Dev']}</TableCell>
                                        <TableCell>{stat.Count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader><CardTitle>Box Plot Statistics by Lithology</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Lithology</TableHead>
                                    <TableHead>Min</TableHead>
                                    <TableHead>Q1</TableHead>
                                    <TableHead>Median</TableHead>
                                    <TableHead>Q3</TableHead>
                                    <TableHead>Max</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {boxplotData.map(d => (
                                    <TableRow key={d.lithology}>
                                        <TableCell>{d.lithology}</TableCell>
                                        <TableCell>{d.min}</TableCell>
                                        <TableCell>{d.q1}</TableCell>
                                        <TableCell>{d.median}</TableCell>
                                        <TableCell>{d.q3}</TableCell>
                                        <TableCell>{d.max}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Outlier Analysis</CardTitle></CardHeader>
                    <CardContent>
                        <p>{outliers.length} outliers found for {selectedBoxplotGrade}. Select rows to remove.</p>
                        <div className="max-h-60 overflow-auto my-4 border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Hole ID</TableHead>
                                        <TableHead>From</TableHead>
                                        <TableHead>To</TableHead>
                                        <TableHead>{selectedBoxplotGrade}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {outliers.map((o) => (
                                        <TableRow 
                                            key={o.unique_id} 
                                            onClick={() => {
                                                const newSelection = selectedOutliers.some(so => so.unique_id === o.unique_id)
                                                    ? selectedOutliers.filter(so => so.unique_id !== o.unique_id)
                                                    : [...selectedOutliers, o];
                                                setSelectedOutliers(newSelection);
                                            }}
                                            className={selectedOutliers.some(so => so.unique_id === o.unique_id) ? 'bg-blue-200' : 'cursor-pointer'}
                                        >
                                            <TableCell>{o.hole_id}</TableCell>
                                            <TableCell>{o.depth_from}</TableCell>
                                            <TableCell>{o.depth_to}</TableCell>
                                            <TableCell>{o[selectedBoxplotGrade]}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <Button onClick={handleRemoveOutliers} disabled={selectedOutliers.length === 0}>Remove Selected Outliers</Button>
                        {originalStats && cleanedStats && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <h4 className="font-bold mb-2">Original Data</h4>
                                    <StatsTable stats={originalStats} />
                                </div>
                                <div>
                                    <h4 className="font-bold mb-2">After Removal</h4>
                                    <StatsTable stats={cleanedStats} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Top Cut Analysis</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex space-x-2">
                            <Input type="number" value={topCutValue} onChange={(e) => setTopCutValue(e.target.value)} placeholder="Enter top cut value" />
                            <Button onClick={handleApplyTopCut}>Apply Top Cut</Button>
                        </div>
                        {originalTopCutStats && topCutStats && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <h4 className="font-bold mb-2">Original Data</h4>
                                    <StatsTable stats={originalTopCutStats} />
                                </div>
                                <div>
                                    <h4 className="font-bold mb-2">After Top Cut</h4>
                                    <StatsTable stats={topCutStats} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Grade Distribution Histogram</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={assayData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="graphitic_carbon" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="graphitic_carbon" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const StatsTable = ({ stats }: { stats: any }) => (
    <Table>
        <TableBody>
            {Object.entries(stats).map(([key, value]) => (
                <TableRow key={key}>
                    <TableHead>{key}</TableHead>
                    <TableCell>{String(value)}</TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);


export default StatisticalAnalysis;
