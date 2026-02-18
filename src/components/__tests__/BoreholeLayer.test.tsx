import React from 'react';
import { render, waitFor } from '@testing-library/react';
import BoreholeLayer from '../viewers/BoreholeLayer';
import { useSubsurface } from '@/contexts/subsurface-context';
import { useDataCache } from '@/lib/data-cache';
import * as THREE from 'three';

// Mock contexts
jest.mock('@/contexts/subsurface-context', () => ({
  useSubsurface: jest.fn(),
}));

jest.mock('@/lib/data-cache', () => ({
  useDataCache: jest.fn(),
}));

// Mock Three.js
jest.mock('three', () => {
  const actualThree = jest.requireActual('three');
  return {
    ...actualThree,
    InstancedMesh: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
      scale: { set: jest.fn() },
      rotation: { set: jest.fn() },
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
    Object3D: jest.fn().mockImplementation(() => ({
      position: { 
        set: jest.fn(),
        copy: jest.fn()
      },
      scale: { set: jest.fn() },
      rotation: { set: jest.fn() },
      updateMatrix: jest.fn(),
      lookAt: jest.fn(),
      rotateX: jest.fn(),
    })),
  };
});

describe('BoreholeLayer', () => {
  const mockScene = { add: jest.fn(), remove: jest.fn() };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useSubsurface as jest.Mock).mockReturnValue({
      three: { scene: mockScene },
      showBoreholes: true,
      transparency: 1.0,
      threeClippingPlanes: [],
    });

    (useDataCache as jest.Mock).mockReturnValue({
      drillholeData: {
        lithology: [
          {
            hole_id: 'DH001',
            feature: {
                geometry: {
                    type: 'LineString',
                    coordinates: [[0, 0, 0], [0, 0, 10]] // Vertical segment
                }
            },
            lithology: 'GRSC'
          }
        ]
      }
    });
  });

  it('renders boreholes when data is available', async () => {
    render(<BoreholeLayer />);
    
    await waitFor(() => {
      expect(mockScene.add).toHaveBeenCalled();
      expect(THREE.InstancedMesh).toHaveBeenCalled();
    });
  });

  it('removes boreholes when showBoreholes is false', async () => {
    (useSubsurface as jest.Mock).mockReturnValue({
      three: { scene: mockScene },
      showBoreholes: false,
      transparency: 1.0,
      threeClippingPlanes: [],
    });

    render(<BoreholeLayer />);

    await waitFor(() => {
        expect(mockScene.add).not.toHaveBeenCalled(); 
    });
  });
});
