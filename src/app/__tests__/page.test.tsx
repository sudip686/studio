import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Home from '../page';

// Mock components that might cause issues with heavy dependencies
jest.mock('@/components/CesiumViewSwitch', () => () => <div data-testid="cesium-view" />);
jest.mock('@/components/ThreeJsViewSwitch', () => () => <div data-testid="three-view" />);
jest.mock('@/components/shared/GlobalOverlays', () => () => <div data-testid="global-overlays" />);
jest.mock('@/components/ui/chapter-menu', () => ({
  ChapterMenu: () => <div data-testid="chapter-menu" />
}));

// Mock contexts
jest.mock('@/contexts/cesium-context', () => ({
  CesiumProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/contexts/three-scene-context', () => ({
  ThreeSceneProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Home Page Navigation', () => {
  it('should not have the Immersive Experience button', () => {
    render(<Home />);
    const immersiveButton = screen.queryByText(/Immersive Experience/i);
    expect(immersiveButton).toBeNull();
  });

  it('should not show the Previous button on the first slide', () => {
    render(<Home />);
    const prevButton = screen.queryByText('<');
    expect(prevButton).toBeNull();
  });

  it('should show the Next button on the first slide', () => {
    render(<Home />);
    const nextButton = screen.queryByText('>');
    expect(nextButton).not.toBeNull();
  });

  it('should not show the Next button on the last slide', async () => {
    render(<Home />);
    
    // Click "Next" until it's gone
    let nextButton = screen.queryByText('>');
    let clicks = 0;
    while (nextButton && clicks < 20) {
      const btn = nextButton;
      await act(async () => {
        fireEvent.click(btn);
      });
      nextButton = screen.queryByText('>');
      clicks++;
    }
    
    console.log(`Reached end in ${clicks} clicks`);
    expect(screen.queryByText('>')).toBeNull();
    expect(screen.queryByText('<')).not.toBeNull();
  });
});