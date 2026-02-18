import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { SubsurfaceProvider, useSubsurface } from '../subsurface-context';
import * as THREE from 'three';

describe('SubsurfaceContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SubsurfaceProvider>{children}</SubsurfaceProvider>
  );

  it('should provide default values', () => {
    const { result } = renderHook(() => useSubsurface(), { wrapper });
    
    expect(result.current.clippingMode).toBe('none');
    expect(result.current.showBoreholes).toBe(true);
    expect(result.current.showBlockModel).toBe(true);
    expect(result.current.transparency).toBe(1.0);
  });

  it('should update state via setter functions', () => {
    const { result } = renderHook(() => useSubsurface(), { wrapper });

    act(() => {
      result.current.setClippingMode('box');
      result.current.setTransparency(0.5);
    });

    expect(result.current.clippingMode).toBe('box');
    expect(result.current.transparency).toBe(0.5);
  });

  it('should store Three.js state', () => {
    const { result } = renderHook(() => useSubsurface(), { wrapper });
    const mockThree = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      renderer: {} as any,
    };

    act(() => {
      result.current.setThree(mockThree);
    });

    expect(result.current.three).toBe(mockThree);
  });
});
