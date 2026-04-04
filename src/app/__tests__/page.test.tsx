import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Home from '../page';

jest.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <section {...props}>{children}</section>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock components that might cause issues with heavy dependencies
jest.mock('@/components/CesiumViewSwitch', () => () => <div data-testid="cesium-view" />);
jest.mock('@/components/ThreeJsViewSwitch', () => () => <div data-testid="three-view" />);
jest.mock('@/components/ThreeJsDataOverlay', () => ({ slideId }: { slideId: string }) => (
  <div data-testid="three-data-panel">{slideId}</div>
));
jest.mock('@/components/shared/GlobalOverlays', () => () => <div data-testid="global-overlays" />);
jest.mock('@/components/deck/AnnotationsOverlay', () => ({
  AnnotationsOverlay: () => <div data-testid="annotations-overlay" />,
}));
jest.mock('@/components/deck/DeckCameraController', () => ({
  DeckCameraController: () => <div data-testid="deck-camera-controller" />,
}));
jest.mock('@/components/SharedThreeTerrain', () => () => <div data-testid="shared-three-terrain" />);
jest.mock('@/ui/overlays/OverlayRoot', () => ({
  OverlayRoot: ({
    baseSlots,
    children,
  }: {
    baseSlots?: Record<string, React.ReactNode>;
    children: React.ReactNode;
  }) => (
    <div>
      {Object.values(baseSlots ?? {}).map((node, index) => (
        <div key={index}>{node}</div>
      ))}
      {children}
    </div>
  ),
}));

// Mock contexts
jest.mock('@/contexts/cesium-context', () => ({
  CesiumProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/contexts/three-scene-context', () => ({
  ThreeSceneProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Home Page Navigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const advanceTransition = () => {
    act(() => {
      jest.advanceTimersByTime(2000);
    });
  };

  it('mounts the Cesium switcher on the first deck view', () => {
    render(<Home />);
    expect(screen.getByTestId('cesium-view')).toBeInTheDocument();
    expect(screen.queryByTestId('three-view')).toBeNull();
    expect(screen.getByLabelText(/presentation chapters/i)).toBeInTheDocument();
  });

  it('disables the previous button on the first slide', () => {
    render(<Home />);
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
  });

  it('shows the next button on the first slide', () => {
    render(<Home />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(screen.getByTestId('story-panel')).toBeInTheDocument();
  });

  it('switches to the Three.js renderer on the lithology slide', async () => {
    render(<Home />);

    for (let i = 0; i < 8; i += 1) {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
      });
      advanceTransition();
    }

    expect(screen.getByTestId('three-view')).toBeInTheDocument();
    expect(screen.queryByTestId('cesium-view')).toBeNull();
    expect(screen.getByTestId('global-nav-dock')).toBeInTheDocument();
  });

  it('keeps drillholes lithology in the Cesium renderer with the story shell intact', async () => {
    render(<Home />);

    for (let i = 0; i < 6; i += 1) {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
      });
      advanceTransition();
    }

    expect(screen.getByTestId('cesium-view')).toBeInTheDocument();
    expect(screen.queryByTestId('three-view')).toBeNull();
    expect(screen.getByTestId('story-panel')).toBeInTheDocument();
    expect(screen.getByTestId('global-nav-dock')).toBeInTheDocument();
  });

  it('disables the next button on the last slide', async () => {
    render(<Home />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    for (let i = 0; i < 14; i += 1) {
      await act(async () => {
        fireEvent.click(nextButton);
      });
      advanceTransition();
    }

    expect(nextButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument();
  });

  it('shows the data evidence panel on supported slides', async () => {
    render(<Home />);

    for (let i = 0; i < 10; i += 1) {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
      });
      advanceTransition();
    }

    expect(screen.getByTestId('three-data-panel')).toHaveTextContent('classification');
  });
});
