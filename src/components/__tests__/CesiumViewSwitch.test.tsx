import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CesiumViewSwitch from '../CesiumViewSwitch';

const disableAoiCutaway = jest.fn();
const enableAoiCutaway = jest.fn();
const mockFlyTo = jest.fn(() => Promise.resolve());
const mockDataSourceAdd = jest.fn(async (dataSource: any) => dataSource);
const mockKmlLoad = jest.fn(async () => ({ show: false, entities: { values: [] } }));

beforeAll(() => {
  (window as any).Cesium = {
    KmlDataSource: {
      load: mockKmlLoad,
    },
    JulianDate: {
      now: jest.fn(() => 0),
    },
    Color: {
      fromCssColorString: jest.fn(() => ({
        withAlpha: jest.fn(() => ({})),
      })),
      WHITE: {
        withAlpha: jest.fn(() => ({})),
      },
    },
    Math: {
      toRadians: (value: number) => value,
    },
    HeadingPitchRange: function HeadingPitchRange(this: any, heading: number, pitch: number, range: number) {
      this.heading = heading;
      this.pitch = pitch;
      this.range = range;
    },
  };
});

jest.mock('@/contexts/cesium-context', () => ({
  useCesium: () => ({
    viewer: {
      isDestroyed: () => false,
      scene: {
        globe: {
          clippingPlanes: undefined,
          translucency: {},
        },
        screenSpaceCameraController: {},
        requestRender: jest.fn(),
      },
      flyTo: mockFlyTo,
      camera: {
        cancelFlight: jest.fn(),
        flyTo: jest.fn(),
      },
      entities: {
        remove: jest.fn(),
      },
      dataSources: {
        add: mockDataSourceAdd,
        remove: jest.fn(),
      },
      imageryLayers: {
        remove: jest.fn(),
      },
    },
    ready: true,
    kmlDataSource: { show: false, entities: { values: [] } },
    kmlLabel: { show: true },
    enableAoiCutaway,
    disableAoiCutaway,
  }),
}));

jest.mock('@/lib/data-cache', () => ({
  useDataCache: () => ({
    drillholeData: { lithology: [], assay: [] },
    processedAssayData: { assayRange: { min: 0, max: 1 } },
  }),
}));

jest.mock('@/lib/utils/cesium-helpers', () => ({
  waitOneFrame: () => Promise.resolve(),
}));

jest.mock('../animated-reveal-viewer', () => () => <div data-testid="animated-reveal" />);
jest.mock('../subsurface-cutaway-viewer', () => () => <div data-testid="subsurface-cutaway" />);
jest.mock('../kml-focused-viewer', () => () => <div data-testid="kml-focused" />);
jest.mock('../grand-canyon-drillhole-viewer', () => () => <div data-testid="grand-canyon" />);
jest.mock('../drillhole-location-map', () => ({
  __esModule: true,
  default: ({ displayMode }: { displayMode: string }) => (
    <div>
      <div data-testid={`drillhole-location-map-${displayMode}`} />
      <div data-testid="legend" />
    </div>
  ),
}));
jest.mock('../terrain-clipping-planes', () => () => <div data-testid="terrain-clipping" />);
jest.mock('../block-model-box-cutter', () => () => <div data-testid="box-cutter" />);
jest.mock('../DrillholeLayer', () => ({
  __esModule: true,
  default: ({ type }: { type: string }) => <div data-testid={`drillhole-layer-${type}`} />,
}));
jest.mock('../cinematic-drillhole-viewer', () => () => <div data-testid="cinematic-drillhole" />);
jest.mock('../viewers/SubsurfaceViewer', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../viewers/BlockModelLayer', () => () => <div data-testid="block-model-layer" />);
jest.mock('../viewers/BoreholeLayer', () => () => <div data-testid="borehole-layer" />);
jest.mock('../viewers/ClippingControls', () => () => <div data-testid="clipping-controls" />);
jest.mock('@/components/ui/legend', () => ({
  Legend: () => <div data-testid="legend" />,
}));
jest.mock('@/ui/overlays', () => ({
  OverlaySlot: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('CesiumViewSwitch drillhole routing', () => {
  beforeEach(() => {
    disableAoiCutaway.mockClear();
    enableAoiCutaway.mockClear();
    mockFlyTo.mockClear();
    mockDataSourceAdd.mockClear();
    mockKmlLoad.mockClear();
  });

  it('keeps drillhole coverage on the collar map view', async () => {
    render(<CesiumViewSwitch view="drillhole_location_assay" />);

    await waitFor(() => {
      expect(screen.queryByTestId('drillhole-location-map-assay')).not.toBeNull();
      expect(screen.queryByTestId('legend')).not.toBeNull();
    });
  });

  it('routes drillhole lithology to the 3D drillhole layer', async () => {
    render(<CesiumViewSwitch view="drillhole_location_lithology" />);

    await waitFor(() => {
      expect(screen.queryByTestId('drillhole-layer-lithology')).not.toBeNull();
      expect(screen.queryByTestId('legend')).not.toBeNull();
    });
  });

  it('keeps assay drillhole detail on the 3D drillhole layer', async () => {
    render(<CesiumViewSwitch view="geojson_drillholes_assay" />);

    await waitFor(() => {
      expect(screen.queryByTestId('drillhole-layer-assay')).not.toBeNull();
      expect(screen.queryByTestId('legend')).not.toBeNull();
    });
  });

  it('keeps the assay drillhole view above ground', async () => {
    render(<CesiumViewSwitch view="geojson_drillholes_assay" />);
    await waitFor(() => {
      expect(screen.queryByTestId('drillhole-layer-assay')).not.toBeNull();
      expect(disableAoiCutaway).toHaveBeenCalled();
    });
  });
});
