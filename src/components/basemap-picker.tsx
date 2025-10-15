import { useCesium } from '@/contexts/cesium-context';

const BasemapPicker = () => {
    const { setBasemap } = useCesium();

    return (
        <div className="absolute top-4 left-40 bg-white p-2 rounded shadow-md pointer-events-auto">
            <select onChange={(e) => setBasemap(e.target.value)} defaultValue="satellite">
                <option value="streets-v2">Streets</option>
                <option value="satellite">Satellite</option>
                <option value="hybrid">Hybrid (Satellite + Labels)</option>
                <option value="topo-v2">Topographic</option>
            </select>
        </div>
    );
};

export default BasemapPicker;
