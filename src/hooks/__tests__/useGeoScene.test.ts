import { renderHook } from '@testing-library/react';
import { useGeoScene } from '../useGeoScene';
import * as THREE from 'three';

// Mock Three.js
jest.mock('three', () => {
  const actualThree = jest.requireActual('three');
  return {
    ...actualThree,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      render: jest.fn(),
      setSize: jest.fn(),
      dispose: jest.fn(),
      state: { reset: jest.fn() },
    })),
  };
});

// Mock Cesium
const mockViewer = {
  scene: {
    canvas: document.createElement('canvas'),
    context: { _gl: {} },
    postRender: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    requestRender: jest.fn(),
  },
  camera: {
    frustum: { fovy: 1, aspectRatio: 1, near: 1, far: 100 },
    viewMatrix: new Float32Array(16),
  },
};

describe('useGeoScene', () => {
  it('should return null if viewer is not ready', () => {
    const { result } = renderHook(() => useGeoScene(undefined));
    expect(result.current).toBeNull();
  });

  it('should initialize Three.js resources when viewer is ready', () => {
    const { result } = renderHook(() => useGeoScene(mockViewer as any));
    
    expect(result.current).not.toBeNull();
    expect(result.current?.scene).toBeInstanceOf(THREE.Scene);
    expect(result.current?.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(result.current?.renderer).toBeDefined();
  });

  it('should register postRender listener on mount', () => {
    renderHook(() => useGeoScene(mockViewer as any));
    expect(mockViewer.scene.postRender.addEventListener).toHaveBeenCalled();
  });

  it('should cleanup resources on unmount', () => {
    const { unmount } = renderHook(() => useGeoScene(mockViewer as any));
    unmount();
    expect(mockViewer.scene.postRender.removeEventListener).toHaveBeenCalled();
  });
});
