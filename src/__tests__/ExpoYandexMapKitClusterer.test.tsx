import * as React from 'react';
import { processColor } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

// Capture the props each wrapper forwards to its native view. requireNativeView is replaced with a
// component that records its props, so the tests can assert on what actually reaches the native side.
const mockNative: { props: any } = { props: null };
jest.mock('expo', () => ({
  requireNativeView: () => (props: any) => {
    mockNative.props = props;
    return null;
  },
}));

// eslint-disable-next-line import/first
import { Clusterer } from '../ExpoYandexMapKitClustererView';
// eslint-disable-next-line import/first
import { Marker } from '../ExpoYandexMapKitMarkerView';

function render(element: React.ReactElement): any {
  act(() => {
    TestRenderer.create(element);
  });
  return mockNative.props;
}

// Regression coverage for the v1 Clustering tail (issue #1): the custom cluster-badge icon and the
// `excludeFromCluster` marker prop. These pin the JS transforms so the native side always receives a
// loadable URI string / processColor int, never a raw asset object or color string.
describe('Clusterer badge styling props', () => {
  afterEach(() => {
    mockNative.props = null;
  });

  it('resolves clusterIcon to a plain URI string for the native side', () => {
    const props = render(<Clusterer clusterIcon={{ uri: 'https://example.com/cluster.png' }} />);
    expect(props.clusterIcon).toBe('https://example.com/cluster.png');
  });

  it('leaves clusterIcon undefined when unset, so the drawn disc badge is used', () => {
    const props = render(<Clusterer />);
    expect(props.clusterIcon).toBeUndefined();
  });

  it('processColor-encodes clusterColor and clusterTextColor (native expects a color int)', () => {
    const props = render(<Clusterer clusterColor="red" clusterTextColor="#000000" />);
    expect(props.clusterColor).toBe(processColor('red'));
    expect(props.clusterTextColor).toBe(processColor('#000000'));
    expect(props.clusterColor).not.toBe('red');
  });

  it('forwards clusterTextOffset and scalar props through unchanged', () => {
    const props = render(
      <Clusterer clusterTextOffset={{ x: 2, y: -1 }} clusterRadius={80} minZoom={10} />
    );
    expect(props.clusterTextOffset).toEqual({ x: 2, y: -1 });
    expect(props.clusterRadius).toBe(80);
    expect(props.minZoom).toBe(10);
  });
});

describe('Marker excludeFromCluster prop', () => {
  afterEach(() => {
    mockNative.props = null;
  });

  it('forwards excludeFromCluster through to the native marker', () => {
    const props = render(<Marker point={{ latitude: 41.3, longitude: 69.2 }} excludeFromCluster />);
    expect(props.excludeFromCluster).toBe(true);
  });

  it('omits excludeFromCluster when unset (native defaults it to false)', () => {
    const props = render(<Marker point={{ latitude: 41.3, longitude: 69.2 }} />);
    expect(props.excludeFromCluster).toBeUndefined();
  });
});

// Draggable markers (issue #2, Section A) — baseline in react-native-maps, requested in yamap#217,
// shipped by no Yandex-maps RN wrapper. The drag events are renamed to the onMarker* native names
// (like onPress→onMarkerPress) to dodge React Native's reserved bubbling event names.
describe('Marker draggable + drag events', () => {
  afterEach(() => {
    mockNative.props = null;
  });

  it('forwards draggable through to the native marker', () => {
    const props = render(<Marker point={{ latitude: 41.3, longitude: 69.2 }} draggable />);
    expect(props.draggable).toBe(true);
  });

  it('maps onDragStart / onDrag / onDragEnd to the native onMarkerDrag* events', () => {
    const onDragStart = jest.fn();
    const onDrag = jest.fn();
    const onDragEnd = jest.fn();
    const props = render(
      <Marker
        point={{ latitude: 41.3, longitude: 69.2 }}
        draggable
        onDragStart={onDragStart}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
      />
    );
    expect(props.onMarkerDragStart).toBe(onDragStart);
    expect(props.onMarkerDrag).toBe(onDrag);
    expect(props.onMarkerDragEnd).toBe(onDragEnd);
    // The public prop names must not leak through to the native view (they aren't native events).
    expect(props.onDragStart).toBeUndefined();
    expect(props.onDrag).toBeUndefined();
    expect(props.onDragEnd).toBeUndefined();
  });
});
