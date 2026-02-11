# **App Name**: GeoVision3D

## Core Features:

- 3D Canvas: Display a full-screen Three.js canvas.
- Interactive Navigation: Allow users to navigate the 3D terrain model using OrbitControls (rotate, pan, zoom).
- Terrain Generation: Generate the terrain from a PlaneGeometry, deforming it with a Digital Elevation Model (DEM) image file.
- Terrain Texturing: Overlay a high-resolution satellite or geological map image onto the terrain as its primary texture.
- Dynamic Lighting: Implement lighting to create a realistic sense of depth and dimension.
- 3D Drillhole Rendering: Render geological data such as assay and lithology data as color-coded 3D cylinders, rendered at their real-world coordinates, to visualize mineral correlations.

## Style Guidelines:

- Primary color: A desaturated teal (#99CED3) to represent the earth and sky, evoking a sense of calm and vastness.
- Background color: A very light desaturated teal (#F0F4F5), to ensure sufficient contrast and separation of layers in the UI.
- Accent color: A muted blue (#77A1AB) for interactive elements and highlights, complementing the natural tones.
- Body and headline font: 'Inter', a grotesque-style sans-serif for a modern, objective feel.
- Use minimalist, geometric icons to represent geological features and data types.
- Maintain a clean and spacious layout to ensure data clarity and ease of navigation within the 3D environment.
- Implement subtle animations for interactive elements such as drillhole selection, and smooth transitions when zooming and rotating the 3D environment.