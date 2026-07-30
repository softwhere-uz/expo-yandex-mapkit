import * as React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { MapOverlayContext, MapOverlayContextValue } from '../ExpoYandexMapKitMapContext';
import { UrlTile } from '../ExpoYandexMapKitUrlTile';

// <UrlTile> (issue #2, Section B) — a custom raster tile layer (the react-native-maps convention).
// It adds a native tile layer via the map context on mount and removes it on unmount. These tests
// drive it through a fake context so the add/remove lifecycle is verified without a native map.
function makeContext(overrides: Partial<MapOverlayContextValue> = {}): MapOverlayContextValue {
  return {
    getScreenPoints: async () => [],
    subscribeCameraChange: () => () => {},
    addTileOverlay: async () => 'tile-1',
    removeTileOverlay: async () => {},
    ...overrides,
  };
}

describe('UrlTile', () => {
  it('renders nothing (the layer lives on the native map)', () => {
    const context = makeContext();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <MapOverlayContext.Provider value={context}>
          <UrlTile urlTemplate="https://tiles/{z}/{x}/{y}.png" />
        </MapOverlayContext.Provider>
      );
    });
    expect(renderer.toJSON()).toBeNull();
  });

  it('adds the tile overlay with the mapped options on mount', async () => {
    const addTileOverlay = jest.fn(async () => 'tile-1');
    const context = makeContext({ addTileOverlay });
    await act(async () => {
      TestRenderer.create(
        <MapOverlayContext.Provider value={context}>
          <UrlTile
            id="osm"
            urlTemplate="https://tile.osm.org/{z}/{x}/{y}.png"
            minZoom={3}
            maxZoom={18}
            transparent
          />
        </MapOverlayContext.Provider>
      );
    });
    expect(addTileOverlay).toHaveBeenCalledWith({
      id: 'osm',
      urlTemplate: 'https://tile.osm.org/{z}/{x}/{y}.png',
      minZoom: 3,
      maxZoom: 18,
      transparent: true,
      cacheable: undefined,
    });
  });

  it('removes the overlay (by the resolved id) on unmount', async () => {
    const removeTileOverlay = jest.fn(async () => {});
    const context = makeContext({ addTileOverlay: async () => 'generated-id', removeTileOverlay });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <MapOverlayContext.Provider value={context}>
          <UrlTile urlTemplate="https://tiles/{z}/{x}/{y}.png" />
        </MapOverlayContext.Provider>
      );
    });
    act(() => {
      renderer.unmount();
    });
    expect(removeTileOverlay).toHaveBeenCalledWith('generated-id');
  });

  it('does nothing outside a YandexMapView (no context)', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<UrlTile urlTemplate="https://tiles/{z}/{x}/{y}.png" />);
    });
    expect(renderer.toJSON()).toBeNull();
  });
});
