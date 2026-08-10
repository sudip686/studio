import React from 'react';
import { render, screen } from '@testing-library/react';
import { AnnotationsOverlay } from '../AnnotationsOverlay';

jest.mock('@/ui/overlays', () => ({
  OverlaySlot: ({ slot, children }: { slot: string; children: React.ReactNode }) => (
    <div data-testid={`overlay-slot-${slot}`}>{children}</div>
  ),
}));

describe('AnnotationsOverlay', () => {
  it('renders annotations into their requested overlay slots', () => {
    render(
      <AnnotationsOverlay
        annotations={[
          {
            type: 'callout',
            lon: 39.06,
            lat: -4.85,
            title: 'Default slot',
            text: 'Bottom-left annotation',
          },
          {
            type: 'callout',
            lon: 39.06,
            lat: -4.85,
            title: 'Moved slot',
            text: 'Top-right annotation',
            slot: 'top-right',
          },
        ]}
      />,
    );

    expect(screen.getByTestId('overlay-slot-bottom-left').textContent).toContain('Bottom-left annotation');
    expect(screen.getByTestId('overlay-slot-top-right').textContent).toContain('Top-right annotation');
  });
});
