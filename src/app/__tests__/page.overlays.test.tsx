import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Home from '../page';

jest.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <section {...props}>{children}</section>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/CesiumViewSwitch', () => () => <div data-testid="cesium-view" />);
jest.mock('@/components/ThreeJsDataOverlay', () => () => null);
jest.mock('@/components/shared/GlobalOverlays', () => () => null);
jest.mock('@/components/deck/AnnotationsOverlay', () => ({
  AnnotationsOverlay: () => null,
}));
jest.mock('@/components/deck/DeckCameraController', () => ({
  DeckCameraController: () => <div data-testid="deck-camera-controller" />,
}));
jest.mock('@/components/SharedThreeTerrain', () => () => <div data-testid="shared-three-terrain" />);

jest.mock('@/components/ThreeJsViewSwitch', () => () => <div data-testid="three-view" />);

jest.mock('@/contexts/cesium-context', () => ({
  CesiumProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/contexts/three-scene-context', () => ({
  ThreeSceneProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/ui/overlays/OverlayRoot', () => ({
  OverlayRoot: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Home page stage composition', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('keeps the Three.js scene, story panel, and nav dock visible together', async () => {
    render(<Home />);

    for (let i = 0; i < 8; i += 1) {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
      });
      act(() => {
        jest.advanceTimersByTime(2000);
      });
    }

    expect(screen.queryByTestId('three-view')).not.toBeNull();
    expect(screen.queryByTestId('story-panel')).not.toBeNull();
    expect(screen.queryByTestId('global-nav-dock')).not.toBeNull();
    expect(screen.queryByText('3D Lithology Model')).not.toBeNull();
  });

  it('does not mount the deck camera controller on view-managed Cesium slides', async () => {
    render(<Home />);

    expect(screen.queryByTestId('deck-camera-controller')).not.toBeNull();

    for (let i = 0; i < 2; i += 1) {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
      });
      act(() => {
        jest.advanceTimersByTime(2000);
      });
    }

    expect(screen.queryByTestId('deck-camera-controller')).toBeNull();
    expect(screen.queryByText('Infrastructure Access')).not.toBeNull();
  });
});
