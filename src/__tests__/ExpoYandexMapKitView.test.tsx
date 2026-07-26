import * as React from 'react';
import { processColor } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

// Capture the props the wrapper forwards to the native view. requireNativeView is replaced with a
// component that records its props, so the tests can assert on what actually reaches the native side.
const mockNative: { props: any } = { props: null };
jest.mock('expo', () => ({
  requireNativeView: () => (props: any) => {
    mockNative.props = props;
    return null;
  },
}));

// eslint-disable-next-line import/first
import type { YandexMapViewRef } from '../ExpoYandexMapKit.types';
// eslint-disable-next-line import/first
import { YandexMapView } from '../ExpoYandexMapKitView';

function renderMap(props: Record<string, unknown>): any {
  act(() => {
    TestRenderer.create(<YandexMapView {...(props as any)} />);
  });
  return mockNative.props;
}

// Regression coverage for the user-location dot styling (issue #1). yamap-plus's `userLocationIcon`
// is reportedly broken (Qudaeo/react-native-yamap-plus#31); the failure mode is the JS layer handing
// the native side a value it can't load (an asset object/number instead of a URI string, or a raw
// color string instead of a processColor int). These tests pin the transform so that can't regress.
describe('YandexMapView user-location styling', () => {
  afterEach(() => {
    mockNative.props = null;
  });

  it('resolves userLocationIcon to a plain URI string for the native side', () => {
    const props = renderMap({
      showUserPosition: true,
      userLocationIcon: { uri: 'https://example.com/me.png' },
    });
    expect(props.userLocationIcon).toBe('https://example.com/me.png');
  });

  it('leaves userLocationIcon undefined when unset, so MapKit keeps its default dot', () => {
    const props = renderMap({ showUserPosition: true });
    expect(props.userLocationIcon).toBeUndefined();
  });

  it('processColor-encodes the accuracy-circle colors (native expects a color int, not a string)', () => {
    const props = renderMap({
      showUserPosition: true,
      userLocationAccuracyFillColor: 'red',
      userLocationAccuracyStrokeColor: '#0000ff',
    });
    expect(props.userLocationAccuracyFillColor).toBe(processColor('red'));
    expect(props.userLocationAccuracyStrokeColor).toBe(processColor('#0000ff'));
    // The raw string must not leak through — that is the yamap-plus failure mode.
    expect(props.userLocationAccuracyFillColor).not.toBe('red');
  });

  it('leaves accuracy colors undefined when unset (keeps MapKit defaults)', () => {
    const props = renderMap({ showUserPosition: true });
    expect(props.userLocationAccuracyFillColor).toBeUndefined();
    expect(props.userLocationAccuracyStrokeColor).toBeUndefined();
  });

  it('forwards the scalar user-location props through unchanged', () => {
    const props = renderMap({
      showUserPosition: true,
      followUser: true,
      userLocationIconScale: 2,
      userLocationAccuracyStrokeWidth: 3,
    });
    expect(props.showUserPosition).toBe(true);
    expect(props.followUser).toBe(true);
    expect(props.userLocationIconScale).toBe(2);
    expect(props.userLocationAccuracyStrokeWidth).toBe(3);
  });
});

// react-native-maps migration aliases (issue #2, Section D) — ease the move from
// react-native-maps / react-native-yamap.
describe('YandexMapView react-native-maps aliases', () => {
  afterEach(() => {
    mockNative.props = null;
  });

  it('exposes fitToCoordinates on the ref, resolving before the native view is ready', async () => {
    const ref = React.createRef<YandexMapViewRef>();
    act(() => {
      TestRenderer.create(<YandexMapView ref={ref} />);
    });
    expect(typeof ref.current?.fitToCoordinates).toBe('function');
    await expect(
      ref.current!.fitToCoordinates([{ latitude: 41.3, longitude: 69.2 }], { animated: false })
    ).resolves.toBeUndefined();
  });

  it('does not register a native camera handler when neither camera event is set', () => {
    const props = renderMap({});
    expect(props.onCameraPositionChanged).toBeUndefined();
  });

  it('wraps onCameraPositionChanged and forwards the event unchanged', () => {
    const onCameraPositionChanged = jest.fn();
    const props = renderMap({ onCameraPositionChanged });
    expect(typeof props.onCameraPositionChanged).toBe('function');
    const event = {
      nativeEvent: {
        cameraPosition: { latitude: 41.3, longitude: 69.2, zoom: 12, azimuth: 0, tilt: 0 },
        reason: 'gestures',
        finished: true,
      },
    };
    props.onCameraPositionChanged(event);
    expect(onCameraPositionChanged).toHaveBeenCalledWith(event);
  });

  it('registers a native camera handler when only onRegionChangeComplete is set', () => {
    const props = renderMap({ onRegionChangeComplete: jest.fn() });
    expect(typeof props.onCameraPositionChanged).toBe('function');
    // The public alias must not leak to the native view (it is not a native event).
    expect(props.onRegionChangeComplete).toBeUndefined();
  });
});
