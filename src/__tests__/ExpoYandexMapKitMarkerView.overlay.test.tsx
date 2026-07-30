import * as React from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import { MapOverlayContext, MapOverlayContextValue } from '../ExpoYandexMapKitMapContext';
import { MarkerView } from '../ExpoYandexMapKitMarkerViewOverlay';

// <MarkerView> (issue #2, Section B) — a live, interactive React view positioned at a world
// coordinate (the @rnmapbox MarkerView convention). Like <Callout> it is a pure-JS overlay driven
// by world→screen + camera changes, but anchored at its center by default.
function makeContext(overrides: Partial<MapOverlayContextValue> = {}): MapOverlayContextValue {
  return {
    getScreenPoints: async () => [{ x: 200, y: 100 }],
    subscribeCameraChange: () => () => {},
    ...overrides,
  };
}

describe('MarkerView', () => {
  it('renders nothing outside a YandexMapView (no context)', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <MarkerView point={{ latitude: 0, longitude: 0 }}>
          <View />
        </MarkerView>
      );
    });
    expect(renderer.toJSON()).toBeNull();
  });

  it('renders nothing until the point projects to a screen coordinate', async () => {
    const context = makeContext({ getScreenPoints: async () => [null] });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <MapOverlayContext.Provider value={context}>
          <MarkerView point={{ latitude: 1, longitude: 2 }}>
            <View />
          </MarkerView>
        </MapOverlayContext.Provider>
      );
    });
    expect(renderer.toJSON()).toBeNull();
  });

  it('absolutely positions itself at the projected pixel converted to points', async () => {
    const context = makeContext({ getScreenPoints: async () => [{ x: 200, y: 100 }] });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <MapOverlayContext.Provider value={context}>
          <MarkerView point={{ latitude: 1, longitude: 2 }}>
            <View />
          </MarkerView>
        </MapOverlayContext.Provider>
      );
    });
    const json = renderer.toJSON() as TestRenderer.ReactTestRendererJSON;
    const style = StyleSheet.flatten(json.props.style);
    // Center anchor with zero measured size (no onLayout in the test renderer) → left/top are the
    // projected pixel divided by the pixel ratio.
    const ratio = PixelRatio.get();
    expect(style.position).toBe('absolute');
    expect(style.left).toBeCloseTo(200 / ratio);
    expect(style.top).toBeCloseTo(100 / ratio);
  });

  it('subscribes to camera changes and unsubscribes on unmount', async () => {
    const unsubscribe = jest.fn();
    const subscribeCameraChange = jest.fn(() => unsubscribe);
    const context = makeContext({ subscribeCameraChange });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <MapOverlayContext.Provider value={context}>
          <MarkerView point={{ latitude: 1, longitude: 2 }}>
            <View />
          </MarkerView>
        </MapOverlayContext.Provider>
      );
    });
    expect(subscribeCameraChange).toHaveBeenCalledTimes(1);
    act(() => {
      renderer.unmount();
    });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
