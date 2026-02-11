import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ClippingControls from '../viewers/ClippingControls';
import { useSubsurface } from '@/contexts/subsurface-context';

// Mock context
jest.mock('@/contexts/subsurface-context', () => ({
  useSubsurface: jest.fn(),
}));

describe('ClippingControls', () => {
  const mockSetClippingMode = jest.fn();
  const mockSetTransparency = jest.fn();
  const mockSetSelectedProperty = jest.fn();
  const mockSetShowBoreholes = jest.fn();
  const mockSetShowBlockModel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSubsurface as jest.Mock).mockReturnValue({
      clippingMode: 'none',
      setClippingMode: mockSetClippingMode,
      transparency: 1.0,
      setTransparency: mockSetTransparency,
      selectedProperty: 'default',
      setSelectedProperty: mockSetSelectedProperty,
      showBoreholes: true,
      setShowBoreholes: mockSetShowBoreholes,
      showBlockModel: true,
      setShowBlockModel: mockSetShowBlockModel,
    });
  });

  it('renders controls', () => {
    const { getByText, getByLabelText } = render(<ClippingControls />);
    expect(getByText('Subsurface Controls')).toBeDefined();
    expect(getByLabelText('Transparency')).toBeDefined();
  });

  it('updates transparency', () => {
    const { getByLabelText } = render(<ClippingControls />);
    const slider = getByLabelText('Transparency');
    fireEvent.change(slider, { target: { value: '0.5' } });
    expect(mockSetTransparency).toHaveBeenCalledWith(0.5);
  });

  it('toggles visibility checkboxes', () => {
    const { getByLabelText } = render(<ClippingControls />);
    
    const boreholes = getByLabelText('Show Boreholes');
    fireEvent.click(boreholes);
    expect(mockSetShowBoreholes).toHaveBeenCalledWith(false);

    const blockModel = getByLabelText('Show Block Model');
    fireEvent.click(blockModel);
    expect(mockSetShowBlockModel).toHaveBeenCalledWith(false);
  });
});
