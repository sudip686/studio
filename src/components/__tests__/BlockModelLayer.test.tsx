import React from 'react';
import { render, waitFor } from '@testing-library/react';
import BlockModelLayer from '../viewers/BlockModelLayer';
import { useSubsurface } from '@/contexts/subsurface-context';
import * as THREE from 'three';

// Mock context
jest.mock('@/contexts/subsurface-context', () => ({
  useSubsurface: jest.fn(),
}));

// Mock Three.js
jest.mock('three', () => {
  const actualThree = jest.requireActual('three');
  return {
    ...actualThree,
    InstancedMesh: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
      scale: { set: jest.fn() },
      setMatrixAt: jest.fn(),
      instanceMatrix: { needsUpdate: false },
      dispose: jest.fn(),
      geometry: { dispose: jest.fn() },
      material: { dispose: jest.fn() },
    })),
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn(),
    })),
  };
});

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      features: [
        {
          geometry: { coordinates: [0, 0, 0] },
          properties: {
            dX: 1, dY: 1, dZ: 1,
            'Kr, GRAPHITIC_CARBON in GM_Litho: GRSC': 5.0
          }
        }
      ]
    }),
  })
) as jest.Mock;

describe('BlockModelLayer', () => {
  const mockScene = { add: jest.fn(), remove: jest.fn() };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useSubsurface as jest.Mock).mockReturnValue({
      three: { scene: mockScene },
      showBlockModel: true,
      selectedProperty: 'Kr, GRAPHITIC_CARBON in GM_Litho: GRSC',
      transparency: 1.0,
      threeClippingPlanes: [],
    });
  });

  it('fetches data and adds mesh to scene', async () => {
    render(<BlockModelLayer />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(mockScene.add).toHaveBeenCalled();
      expect(THREE.InstancedMesh).toHaveBeenCalled();
    });
  });

  it('removes mesh when showBlockModel is false', async () => {
    (useSubsurface as jest.Mock).mockReturnValue({
      three: { scene: mockScene },
      showBlockModel: false,
      selectedProperty: 'Kr, GRAPHITIC_CARBON in GM_Litho: GRSC',
      transparency: 1.0,
      threeClippingPlanes: [],
    });

    render(<BlockModelLayer />);

    await waitFor(() => {
        expect(mockScene.add).not.toHaveBeenCalled(); 
        // Note: It might have been added and then removed if we were switching props, 
        // but initial render false should prevent add.
    });
  });
});
