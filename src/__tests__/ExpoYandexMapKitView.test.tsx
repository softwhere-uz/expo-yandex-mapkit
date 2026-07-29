import * as React from 'react';
import { processColor } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

// Capture the props the wrapper forwards to the native view. requireNativeView is replaced with a
// component that records its props, so the tests can assert on what actually reaches the native side.
const mockNative: { props: any } = { props: null };
jest.mock('expo', () => ({
  requireNativeView: () => (props: any) => {
    mockNative.props = props;
    // Render children so nested JS overlays (e.g. <Callout>) actually mount, the way the real
    // native view hosts them. Most tests pass no children, so this is a harmless null.
    return props.children ?? null;
  },
}));

// eslint-disable-next-line import/first
import type { YandexMapViewRef } from '../ExpoYandexMapKit.types';
// eslint-disable-next-line import/first
import { YandexMapView } from '../ExpoYandexMapKitView';
// eslint-disable-next-line import/first
import { Callout } from '../ExpoYandexMapKitCallout';

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

  it('forwards onTrafficChanged to the native view unchanged (issue #2)', () => {
    const onTrafficChanged = jest.fn();
    const props = renderMap({ trafficVisible: true, onTrafficChanged });
    expect(props.onTrafficChanged).toBe(onTrafficChanged);
  });

  it('forwards onUserLocationChange to the native view unchanged (issue #2)', () => {
    const onUserLocationChange = jest.fn();
    const props = renderMap({ showUserPosition: true, onUserLocationChange });
    expect(props.onUserLocationChange).toBe(onUserLocationChange);
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

// takeSnapshot (issue #2, Section A) — requested in yamap#48, shipped by no wrapper. Ref method that
// resolves a base64 PNG data URI; resolves null before the native view is ready.
describe('YandexMapView takeSnapshot', () => {
  afterEach(() => {
    mockNative.props = null;
  });

  it('exposes takeSnapshot on the ref, resolving null before the native view is ready', async () => {
    const ref = React.createRef<YandexMapViewRef>();
    act(() => {
      TestRenderer.create(<YandexMapView ref={ref} />);
    });
    expect(typeof ref.current?.takeSnapshot).toBe('function');
    await expect(ref.current!.takeSnapshot()).resolves.toBeNull();
  });
});

// Camera zoom bounds (issue #2, Section A) — min/max zoom clamps, requested in yamap#187 and never
// shipped by any wrapper. Plain passthrough props; the native side applies them via the map's
// cameraBounds.
describe('YandexMapView zoom bounds', () => {
  afterEach(() => {
    mockNative.props = null;
  });

  it('forwards minZoom / maxZoom to the native view unchanged', () => {
    const props = renderMap({ minZoom: 5, maxZoom: 17 });
    expect(props.minZoom).toBe(5);
    expect(props.maxZoom).toBe(17);
  });

  it('leaves minZoom / maxZoom undefined when unset (MapKit defaults)', () => {
    const props = renderMap({});
    expect(props.minZoom).toBeUndefined();
    expect(props.maxZoom).toBeUndefined();
  });
});

// mapPadding (issue #2, Section A) — a persistent focus-rect inset, the react-native-maps convention.
// It is a plain passthrough prop (the native side turns it into the map-window focus rectangle).
describe('YandexMapView mapPadding', () => {
  afterEach(() => {
    mockNative.props = null;
  });

  it('forwards mapPadding to the native view unchanged', () => {
    const mapPadding = { top: 0, right: 0, bottom: 240, left: 0 };
    const props = renderMap({ mapPadding });
    expect(props.mapPadding).toBe(mapPadding);
  });

  it('leaves mapPadding undefined when unset (full viewport)', () => {
    const props = renderMap({});
    expect(props.mapPadding).toBeUndefined();
  });
});

// POI tap + geo-object selection (issue #2, Section A) — beyond-parity: no Yandex-maps RN wrapper
// exposes built-in POI taps or selection. The event is a plain passthrough; the ref methods delegate
// to the native view and must stay callable (resolving) before the native view is ready.
describe('YandexMapView POI tap + geo-object selection', () => {
  afterEach(() => {
    mockNative.props = null;
  });

  it('forwards onPoiTap to the native view unchanged', () => {
    const onPoiTap = jest.fn();
    const props = renderMap({ onPoiTap });
    expect(props.onPoiTap).toBe(onPoiTap);
  });

  it('exposes selectGeoObject / deselectGeoObject on the ref, resolving even before the native view is ready', async () => {
    const ref = React.createRef<YandexMapViewRef>();
    act(() => {
      TestRenderer.create(<YandexMapView ref={ref} />);
    });
    expect(typeof ref.current?.selectGeoObject).toBe('function');
    expect(typeof ref.current?.deselectGeoObject).toBe('function');
    // Native view is mocked to render null (no ref methods attached), so these hit the resolved
    // fallback rather than throwing a synchronous TypeError at the call site.
    await expect(
      ref.current!.selectGeoObject({ objectId: 'a', dataSourceName: 'b', layerId: 'c' })
    ).resolves.toBeUndefined();
    await expect(ref.current!.deselectGeoObject()).resolves.toBeUndefined();
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

// <Callout> overlay integration (issue #2, Section B) — a Callout child subscribes to camera
// movements via the map context, which must force the native camera handler to be wired even when
// the app sets no camera event props (otherwise the balloon could never reposition).
describe('YandexMapView overlay (Callout) camera wiring', () => {
  afterEach(() => {
    mockNative.props = null;
  });

  it('wires the native camera handler while a Callout child is mounted', async () => {
    await act(async () => {
      TestRenderer.create(
        <YandexMapView>
          <Callout point={{ latitude: 41.3, longitude: 69.2 }} />
        </YandexMapView>
      );
    });
    expect(typeof mockNative.props.onCameraPositionChanged).toBe('function');
  });
});
