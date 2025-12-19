export const graphiticCarbonLegendData = {
    title: 'Graphitic Carbon (%)',
    items: [
        { color: '#0000FF', label: '< 0.1 %' },
        { color: '#00FFFF', label: '0.1 to 0.3 %' },
        { color: '#00FF00', label: '0.3 to 0.5 %' },
        { color: '#FFFF00', label: '0.5 to 2.0 %' },
        { color: '#FFA500', label: '2.0 to 5.0 %' },
        { color: '#FF0000', label: '> 5.0 %' },
    ]
};

export const mineralDomainsLegendData = {
    title: 'Gold Mineralised Domains',
    items: [
        { color: '#ff0000', label: 'High-Grade' },
        { color: '#ffa500', label: 'Medium-Grade' },
        { color: '#00ff00', label: 'Low-Grade' },
        { color: '#0000ff', label: 'Underground' },
        { color: '#ffff00', label: 'Laterite' },
    ]
};

export const cesiumViewerLithologyLegendData = {
    title: 'Lithology',
    items: [
        { color: "#d39127ff", label: "Quartz-Feldspathic" },
        { color: "#19292aff", label: "GRSC" },
        { color: "#a1089aff", label: "Granulite" },
        { color: "#4f1dc4ff", label: "Khondalite" },
        { color: "#D4E6F1", label: "Marble" },
        { color: "#515A5A", label: "Not Recovearble" },
        { color: "#2df27cff", label: "SOIL" },
        { color: "#153224ff", label: "Schist" },
    ]
};

export const drillholeLocationMapLithologyLegendData = {
    title: 'Dominant Lithology',
    items: [
        { color: "#FAD7A0", label: "Quartz-Feldspathic" },
        { color: "#839192", label: "GRSC" },
        { color: "#be028fff", label: "Granulite" },
        { color: "#189ad6ff", label: "Khondalite" },
        { color: "#D4E6F1", label: "Marble" },
        { color: "#515A5A", label: "Not Recovearble" },
        { color: "#17fc73ff", label: "SOIL" },
        { color: "#AED6F1", label: "Schist" },
    ]
};

export const geoVisionLithologyLegendData = {
    title: 'Lithology',
    items: [
        { color: "#FAD7A0", label: "quartz-feldspathic" },
        { color: "#212323", label: "grsc" },
        { color: "#df26c4", label: "granulite" },
        { color: "#1a3523", label: "khondalite" },
        { color: "#fafafa", label: "marble" },
        { color: "#515A5A", label: "not recovearble" },
        { color: "#6efe70", label: "soil" },
        { color: "#46f1b2", label: "schist" },
    ]
};

export const carbonGradeLegendData = {
    title: 'Graphitic Carbon (%)',
    items: [
        { color: '#00ff00', label: '0.3 to 0.5' },
        { color: '#ffa500', label: '0.5 to 2.0' },
        { color: '#ff0000', label: '2.0 to 5.0' },
        { color: '#ff00ff', label: '>5.0' },
        { color: '#cccccc', label: '<0.3 or Unknown' },
    ]
};

export const classificationLegendData = {
    title: 'Classification',
    items: [
        { color: "#0000ff", label: "Measured" },
        { color: "#ff0000", label: "Indicated" },
        { color: "#00ff00", label: "Inferred" },
    ]
};

export const geospatialViewerLithologyLegendData = {
    title: 'Lithology',
    items: [
        { color: "#e1f6f3ff", label: "Quartz-Feldspathic" },
        { color: "#4c54549c", label: "GRSC" },
        { color: "#b90b79ff", label: "Granulite" },
        { color: "#433e43ff", label: "Khondalite" },
        { color: "#D4E6F1", label: "Marble" },
        { color: "#0b1414ff", label: "Not Recovearble" },
        { color: "#70f35fff", label: "SOIL" },
        { color: "#445751ff", label: "Schist" },
    ]
};


// Placeholder for a potential lithology legend
export const lithologyLegendData = {
    title: 'Lithology',
    items: [
        { color: '#FFFF00', label: 'Sandstone' },
        { color: '#A0522D', label: 'Siltstone' },
        { color: '#808080', label: 'Shale' },
    ]
};

export const LITHOLOGY_COLOR_MAP_CSS = Object.fromEntries(
  drillholeLocationMapLithologyLegendData.items.map(item => [item.label, item.color])
);

// New format for colorFromLegend helper
export const ASSAY_GRAPHITIC_CARBON = {
  type: "numeric" as const,
  bins: [
    { max: 0.1, color: '#0000FF', label: '< 0.1 %' },
    { min: 0.1, max: 0.3, color: '#00FFFF', label: '0.1 to 0.3 %' },
    { min: 0.3, max: 0.5, color: '#00FF00', label: '0.3 to 0.5 %' },
    { min: 0.5, max: 2.0, color: '#FFFF00', label: '0.5 to 2.0 %' },
    { min: 2.0, max: 5.0, color: '#FFA500', label: '2.0 to 5.0 %' },
    { min: 5.0, color: '#FF0000', label: '> 5.0 %' },
  ],
  default: "#cccccc",
};

const lithologyMap: Record<string, string> = {};
drillholeLocationMapLithologyLegendData.items.forEach(item => {
    lithologyMap[item.label.toLowerCase().trim().replace(/\s+/g, ' ')] = item.color;
});

export const LITHOLOGY_COLORS = {
  type: "categorical" as const,
  map: lithologyMap,
  default: "#9e9e9e",
};
