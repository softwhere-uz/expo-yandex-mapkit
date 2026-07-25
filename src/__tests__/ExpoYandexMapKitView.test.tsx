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
