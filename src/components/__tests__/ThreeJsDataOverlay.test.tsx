import React from 'react';
import { render, screen } from '@testing-library/react';
import ThreeJsDataOverlay from '../ThreeJsDataOverlay';

jest.mock('framer-motion', () => ({
  motion: {
    aside: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <aside {...props}>{children}</aside>
    ),
  },
}));

jest.mock('@/lib/data-cache', () => ({
  useDataCache: () => ({
    drillholeData: {
      lithology: [
        { hole_id: 'DH-001', depth_from: 0, depth_to: 60, lithology: 'graphitic schist' },
        { hole_id: 'DH-001', depth_from: 60, depth_to: 120, lithology: 'graphitic schist' },
        { hole_id: 'DH-002', depth_from: 0, depth_to: 40, lithology: 'graphitic schist' },
        { hole_id: 'DH-002', depth_from: 40, depth_to: 80, lithology: 'marble' },
      ],
      assay: [
        { hole_id: 'DH-001', depth_from: 0, depth_to: 30, graphitic_carbon: 2.5 },
        { hole_id: 'DH-001', depth_from: 30, depth_to: 120, graphitic_carbon: 5.4 },
        { hole_id: 'DH-002', depth_from: 0, depth_to: 50, graphitic_carbon: 7.1 },
        { hole_id: 'DH-002', depth_from: 50, depth_to: 80, graphitic_carbon: 4.0 },
      ],
    },
    blockModelData: new Array(144).fill({}),
  }),
}));

describe('ThreeJsDataOverlay', () => {
  it('renders live lithology metrics from cached drillhole data', () => {
    render(<ThreeJsDataOverlay slideId="lithology" />);

    expect(screen.getByText('3D lithology briefing')).toBeInTheDocument();
    expect(screen.getByTestId('metric-drillholes')).toHaveTextContent('2');
    expect(screen.getByTestId('metric-metres-drilled')).toHaveTextContent('200.0 m');
    expect(screen.getByText('Graphitic Schist')).toBeInTheDocument();
  });

  it('renders assay statistics from the cached dataset', () => {
    render(<ThreeJsDataOverlay slideId="assay" />);

    expect(screen.getByText('Assay summary table')).toBeInTheDocument();
    expect(screen.getByTestId('metric-assay-records')).toHaveTextContent('4');
    expect(screen.getByText('2.500% TGC')).toBeInTheDocument();
    expect(screen.getByText('7.10% TGC')).toBeInTheDocument();
  });

  it('renders carbon model validation figures', () => {
    render(<ThreeJsDataOverlay slideId="carbon_model" />);

    expect(screen.getByText('Carbon block model')).toBeInTheDocument();
    expect(screen.getByTestId('metric-model-cells')).toHaveTextContent('144');
    expect(screen.getByText('183 Mt @ 4.86% TGC')).toBeInTheDocument();
    expect(screen.getByText('1.95 / 2.33 / 2.65 t/m^3')).toBeInTheDocument();
  });

  it('renders classification and metallurgy tables', () => {
    const { rerender } = render(<ThreeJsDataOverlay slideId="classification" />);

    expect(screen.getByText('Classification summary')).toBeInTheDocument();
    expect(screen.getByText('22 / 58 / 69 Mt')).toBeInTheDocument();
    expect(screen.getByText('5 / 15 / 16 Mt')).toBeInTheDocument();

    rerender(<ThreeJsDataOverlay slideId="metallurgy" />);
    expect(screen.getByText('Flotation testwork summary')).toBeInTheDocument();
    expect(screen.getByText('75.8% recovery')).toBeInTheDocument();

    rerender(<ThreeJsDataOverlay slideId="product_quality" />);
    expect(screen.getByText('Premium graphite product case')).toBeInTheDocument();
    expect(screen.getByText('>73% at +150 um')).toBeInTheDocument();
  });

  it('returns null for unsupported slides', () => {
    const { container } = render(<ThreeJsDataOverlay slideId="overview" />);
    expect(container).toBeEmptyDOMElement();
  });
});
