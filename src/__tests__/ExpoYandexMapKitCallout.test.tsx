import * as React from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import { Callout } from '../ExpoYandexMapKitCallout';
import { MapOverlayContext, MapOverlayContextValue } from '../ExpoYandexMapKitMapContext';

// <Callout> (issue #2, Section B) — a React balloon anchored to a world coordinate. MapKit has no
// native callout, so it is a pure-JS overlay: it projects `point` to a screen pixel via the map
// context's getScreenPoints and repositions on camera changes. These tests drive it through a fake
// context so positioning + subscription are verified without a native map.
function makeContext(overrides: Partial<MapOverlayContextValue> = {}): MapOverlayContextValue {
  return {
    getScreenPoints: async () => [{ x: 200, y: 100 }],
    subscribeCameraChange: () => () => {},
    ...overrides,
  };
}

function renderWithContext(context: MapOverlayContextValue, node: React.ReactElement) {
  let renderer!: TestRenderer.ReactTestRenderer;
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  act(() => {
    renderer = TestRenderer.create(
      <MapOverlayContext.Provider value={context}>{node}</MapOverlayContext.Provider>
    );
  });
  return renderer;
}

describe('Callout', () => {
  it('renders nothing when used outside a YandexMapView (no context)', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <Callout point={{ latitude: 0, longitude: 0 }}>
          <View />
        </Callout>
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
          <Callout point={{ latitude: 1, longitude: 2 }}>
            <View />
          </Callout>
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
          <Callout point={{ latitude: 1, longitude: 2 }}>
            <View />
          </Callout>
        </MapOverlayContext.Provider>
      );
    });
    const json = renderer.toJSON() as TestRenderer.ReactTestRendererJSON;
    const style = StyleSheet.flatten(json.props.style);
    // Default anchor is bottom-center; the test renderer fires no onLayout, so size is 0 and the
    // anchor offset drops out — left/top are exactly the pixel coordinate divided by the pixel ratio.
    const ratio = PixelRatio.get();
    expect(style.position).toBe('absolute');
    expect(style.left).toBeCloseTo(200 / ratio);
    expect(style.top).toBeCloseTo(100 / ratio);
  });

  it('applies the offset (in points) after anchoring', async () => {
    const context = makeContext({ getScreenPoints: async () => [{ x: 200, y: 100 }] });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <MapOverlayContext.Provider value={context}>
          <Callout point={{ latitude: 1, longitude: 2 }} offset={{ x: 10, y: -20 }}>
            <View />
          </Callout>
        </MapOverlayContext.Provider>
      );
    });
    const json = renderer.toJSON() as TestRenderer.ReactTestRendererJSON;
    const style = StyleSheet.flatten(json.props.style);
    const ratio = PixelRatio.get();
    expect(style.left).toBeCloseTo(200 / ratio + 10);
    expect(style.top).toBeCloseTo(100 / ratio - 20);
  });

  it('subscribes to camera changes and unsubscribes on unmount', async () => {
    const unsubscribe = jest.fn();
    const subscribeCameraChange = jest.fn(() => unsubscribe);
    const context = makeContext({ subscribeCameraChange });
    const renderer = renderWithContext(
      context,
      <Callout point={{ latitude: 1, longitude: 2 }}>
        <View />
      </Callout>
    );
    // Let the initial projection effect settle.
    await act(async () => {});
    expect(subscribeCameraChange).toHaveBeenCalledTimes(1);
    act(() => {
      renderer.unmount();
    });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
