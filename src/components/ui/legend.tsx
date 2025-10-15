'use client';

interface LegendItem {
    color: string;
    label: string;
}

interface LegendProps {
    title: string;
    show?: boolean;
    type: 'categorical' | 'gradient';
    items?: LegendItem[];
    gradient?: string;
    minLabel?: string | number;
    maxLabel?: string | number;
}

const Legend = ({ title, show = true, type, items, gradient, minLabel, maxLabel }: LegendProps) => {
    if (!show) return null;

    const renderCategorical = () => (
        <ul className="space-y-1">
            {items?.map((item) => (
                <li key={item.label} className="flex items-center">
                    <span className="w-4 h-4 mr-2 border border-gray-300" style={{ backgroundColor: item.color }}></span>
                    <span>{item.label}</span>
                </li>
            ))}
        </ul>
    );

    const renderGradient = () => (
        <div className="flex flex-col items-center">
            <div className="w-full h-6 rounded" style={{ background: gradient }}></div>
            <div className="flex justify-between w-full text-xs mt-1">
                <span>{minLabel}</span>
                <span>{maxLabel}</span>
            </div>
        </div>
    );

    return (
        <div className={`absolute bottom-4 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0'}`}>
            <h3 className="font-bold text-lg mb-2">{title}</h3>
            {type === 'categorical' ? renderCategorical() : renderGradient()}
        </div>
    );
};

export default Legend;
