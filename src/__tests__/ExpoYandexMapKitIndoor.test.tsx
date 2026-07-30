import * as React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockNative: { props: any } = { props: null };
jest.mock('expo', () => ({
  requireNativeView: () => (props: any) => {
    mockNative.props = props;
    return props.children ?? null;
  },
}));

// eslint-disable-next-line import/first
import type { YandexMapViewRef } from '../ExpoYandexMapKit.types';
// eslint-disable-next-line import/first
import { YandexMapView } from '../ExpoYandexMapKitView';

// Indoor plans + floor picker (issue #2, Section B) — `indoorEnabled` is a plain passthrough prop;
// the app builds its own floor picker from `onIndoorPlanFocused` and switches floors via the
// `setIndoorLevel` ref method.
describe('YandexMapView indoor', () => {
  afterEach(() => {
    mockNative.props = null;
  });

  it('forwards indoorEnabled to the native view unchanged', () => {
    act(() => {
      TestRenderer.create(<YandexMapView indoorEnabled />);
    });
    expect(mockNative.props.indoorEnabled).toBe(true);
  });

  it('leaves indoorEnabled undefined when unset (indoor off)', () => {
    act(() => {
      TestRenderer.create(<YandexMapView />);
    });
    expect(mockNative.props.indoorEnabled).toBeUndefined();
  });

  it('exposes setIndoorLevel on the ref, resolving before the native view is ready', async () => {
    const ref = React.createRef<YandexMapViewRef>();
    act(() => {
      TestRenderer.create(<YandexMapView ref={ref} />);
    });
    expect(typeof ref.current?.setIndoorLevel).toBe('function');
    await expect(ref.current!.setIndoorLevel('2')).resolves.toBeUndefined();
  });
});
