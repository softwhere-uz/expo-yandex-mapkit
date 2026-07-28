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
