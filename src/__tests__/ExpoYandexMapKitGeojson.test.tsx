import * as React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// The generated <Marker>/<Polyline>/<Polygon> require a native view; mock it to a null component.
jest.mock('expo', () => ({
  requireNativeView: () => () => null,
}));

// eslint-disable-next-line import/first
import { Geojson } from '../ExpoYandexMapKitGeojson';
// eslint-disable-next-line import/first
import { Marker } from '../ExpoYandexMapKitMarkerView';
// eslint-disable-next-line import/first
import { Polygon } from '../ExpoYandexMapKitPolygonView';
// eslint-disable-next-line import/first
import { Polyline } from '../ExpoYandexMapKitPolylineView';

// <Geojson> (issue #2, Section A) — pure-JS sugar expanding GeoJSON into native map objects, the
// react-native-maps convention. No Yandex-maps RN wrapper has it. These pin the expansion + the
// [lng, lat] → { latitude, longitude } conversion.
describe('Geojson', () => {
  const featureCollection = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [69.24, 41.31] },
        properties: { id: 'a' },
      },
      {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [69, 41],
            [70, 42],
          ],
        },
        properties: {},
      },
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [69, 41],
              [70, 41],
              [70, 42],
              [69, 41],
            ],
            [
              [69.2, 41.2],
              [69.3, 41.2],
              [69.3, 41.3],
              [69.2, 41.2],
            ],
          ],
        },
        properties: {},
      },
    ],
  };

  function render(element: React.ReactElement): TestRenderer.ReactTestRenderer {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(element);
    });
    return renderer!;
  }

  it('expands a FeatureCollection into Markers / Polylines / Polygons with [lng,lat] → {lat,lng}', () => {
    const root = render(
      <Geojson geojson={featureCollection} strokeColor="#000" fillColor="#0001" />
    ).root;
    const markers = root.findAllByType(Marker);
    const lines = root.findAllByType(Polyline);
    const polys = root.findAllByType(Polygon);

    expect(markers).toHaveLength(1);
    expect(lines).toHaveLength(1);
    expect(polys).toHaveLength(1);

    // GeoJSON is [longitude, latitude]; the map objects must receive { latitude, longitude }.
    expect(markers[0].props.point).toEqual({ latitude: 41.31, longitude: 69.24 });
    expect(lines[0].props.points[0]).toEqual({ latitude: 41, longitude: 69 });
    // First ring is the outer boundary; the rest are holes.
    expect(polys[0].props.points).toHaveLength(4);
    expect(polys[0].props.innerRings).toHaveLength(1);
    expect(polys[0].props.innerRings[0][0]).toEqual({ latitude: 41.2, longitude: 69.2 });
  });

  it('handles a bare Geometry and expands MultiPolygon into several polygons', () => {
    const multi = {
      type: 'MultiPolygon' as const,
      coordinates: [
        [
          [
            [1, 1],
            [2, 1],
            [2, 2],
            [1, 1],
          ],
        ],
        [
          [
            [3, 3],
            [4, 3],
            [4, 4],
            [3, 3],
          ],
        ],
      ],
    };
    const root = render(<Geojson geojson={multi} />).root;
    expect(root.findAllByType(Polygon)).toHaveLength(2);
  });

  it('forwards the source Feature to onPress', () => {
    const onPress = jest.fn();
    const root = render(<Geojson geojson={featureCollection} onPress={onPress} />).root;
    root.findAllByType(Marker)[0].props.onPress();
    expect(onPress).toHaveBeenCalledWith(featureCollection.features[0]);
  });
});
