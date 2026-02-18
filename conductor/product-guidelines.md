# Product Guidelines - presentationCreator

## Prose Style & Voice
- **Tone:** A sophisticated blend of **Professional Authority** and **Visionary Storytelling**. The language should be precise and objective when discussing data, yet inspiring when describing the insights and "narrative" of the geological model.
- **Clarity:** Prioritize technical accuracy without sacrificing readability. Use active voice to describe system actions and user workflows.
- **Technical Terminology:** 
    - Use **Industry Standard** terms (e.g., "Borehole," "Lithology," "Easting/Northing") as the primary labels.
    - Provide **Accessible Tooltips** or "Learn More" sections to define complex terms for non-expert stakeholders.
    - Use **Simplified Summaries** in high-level presentation chapters meant for investors or general management.

## Visual Identity & UI Design
- **Core Principle: Data-First:** The 3D geospatial environment is the "hero." UI elements should act as a subtle **Heads-Up Display (HUD)**, using semi-transparent overlays and minimal borders to avoid distracting from the models.
- **Navigation: The Chapter Model:** The UI must guide users through a sequence of views. Navigation should feel like progressing through a story, with clear indicators of the current "Chapter" and smooth transitions between them.
- **Aesthetic: High Contrast Cinematic:**
    - **Theme:** Deep charcoal or black backgrounds to make 3D models and data points "pop."
    - **Palette:** Use a vibrant, high-contrast accent palette for data categorization (e.g., lithology types, grade ranges) and UI highlights.
    - **Typography:** Clean, sans-serif fonts (e.g., Inter, Roboto) for maximum legibility at various scales.

## User Experience (UX)
- **Immersive Focus:** Minimize "click-depth." Critical tools (measurement, clipping, layer toggles) should be accessible via a persistent but unobtrusive control dock.
- **Seamless Transitions:** Every change in view (moving from a site map to a subsurface cutaway) must be handled with a smooth, cinematic camera transition to maintain the viewer's spatial orientation.
- **Responsiveness:** Ensure the UI is performant and responsive, even when rendering complex 3D scenes, maintaining a high frame rate for a "game-like" feel.
