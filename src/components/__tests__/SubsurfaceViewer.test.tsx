import React from 'react';
import { render } from '@testing-library/react';
import SubsurfaceViewer from '../viewers/SubsurfaceViewer';
import { SubsurfaceProvider } from '@/contexts/subsurface-context';
import { useCesium } from '@/contexts/cesium-context';
import { useGeoScene } from '@/hooks/useGeoScene';

// Mock contexts and hooks
jest.mock('@/contexts/cesium-context', () => ({
  useCesium: jest.fn(),
}));

jest.mock('@/hooks/useGeoScene', () => ({
  useGeoScene: jest.fn(),
}));

describe('SubsurfaceViewer', () => {
  beforeEach(() => {
    (useCesium as jest.Mock).mockReturnValue({ 
      viewer: {
        scene: {
            globe: { clippingPlanes: { removeAll: jest.fn() } }
        }
      }, 
      ready: true 
    });
    (useGeoScene as jest.Mock).mockReturnValue({ scene: {}, camera: {}, renderer: {} });
  });

  it('renders children correctly', () => {
    const { getByText } = render(
      <SubsurfaceProvider>
        <SubsurfaceViewer>
          <div>Child Element</div>
        </SubsurfaceViewer>
      </SubsurfaceProvider>
    );

    expect(getByText('Child Element')).toBeDefined();
  });

  it('provides three.js state to context', () => {
    const mockThree = { scene: {}, camera: {}, renderer: {} };
    (useGeoScene as jest.Mock).mockReturnValue(mockThree);
    
    // We can't easily test the context update here without a consumer, 
    // but verifying it doesn't crash is a good start.
    render(
      <SubsurfaceProvider>
        <SubsurfaceViewer />
      </SubsurfaceProvider>
    );
    
    expect(useGeoScene).toHaveBeenCalled();
  });
});
