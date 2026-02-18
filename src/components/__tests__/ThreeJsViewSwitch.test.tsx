import React from 'react';
import { render } from '@testing-library/react';
import ThreeJsViewSwitch from '../ThreeJsViewSwitch';

// Mock viewers
jest.mock('../viewers/LithologyView', () => () => <div data-testid="lithology-view" />);
jest.mock('../viewers/AssayView', () => () => <div data-testid="assay-view" />);
jest.mock('../viewers/BlockModelCarbonView', () => () => <div data-testid="carbon-view" />);
jest.mock('../viewers/BlockModelRescView', () => () => <div data-testid="resc-view" />);

describe('ThreeJsViewSwitch', () => {
  it('renders LithologyViewer for lithology_view', () => {
    const { getByTestId } = render(<ThreeJsViewSwitch view="lithology_view" />);
    expect(getByTestId('lithology-view')).toBeDefined();
  });

  it('renders AssayViewer for assay_view', () => {
    const { getByTestId } = render(<ThreeJsViewSwitch view="assay_view" />);
    expect(getByTestId('assay-view')).toBeDefined();
  });

  it('should not render ImmersivePresentationViewer (it should be removed)', () => {
    const { queryByTestId } = render(<ThreeJsViewSwitch view="immersive_presentation" />);
    expect(queryByTestId('immersive-view')).toBeNull();
  });
});
