import * as React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// The shipped Jest mock preset (root `mock.js`), consumed by apps as
// `jest.mock('expo-yandex-mapkit', () => require('expo-yandex-mapkit/mock'))`.
const mock = require('../../mock');

describe('jest mock preset (expo-yandex-mapkit/mock)', () => {
  it('exports the components + functions the real package does', () => {
    const names = [
      'YandexMapView',
      'Marker',
      'Clusterer',
      'Polyline',
      'Polygon',
      'Circle',
      'Geojson',
      'Route',
      'Callout',
      'MarkerView',
      'UrlTile',
      'distanceBetween',
      'pathLength',
      'boundingBox',
      'findBicycleRoutes',
      'findScooterRoutes',
      'offlineMaps',
      'initialize',
      'setLocale',
      'getLocale',
      'resetLocale',
      'suggest',
      'searchText',
      'searchPoint',
      'findRoutes',
      'findDrivingRoutes',
      'ExpoYandexMapKitModule',
    ];
    names.forEach((name) => expect(mock[name]).toBeDefined());
  });

  it('renders the mocked components (and their children) without a native runtime', () => {
    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        React.createElement(
          mock.YandexMapView,
          {},
          React.createElement(mock.Marker, { point: { latitude: 0, longitude: 0 } })
        )
      );
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('resolves the mocked async functions with sensible defaults', async () => {
    await expect(mock.findRoutes([], 'driving')).resolves.toEqual([]);
    await expect(mock.suggest('x')).resolves.toEqual([]);
    await expect(mock.getLocale()).resolves.toBeNull();
    await expect(mock.initialize('key')).resolves.toBeUndefined();
  });
});
