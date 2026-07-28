import * as React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { Polyline } from '../ExpoYandexMapKitPolylineView';
import { Route } from '../ExpoYandexMapKitRoute';

jest.mock('expo', () => ({
  requireNativeView: () => () => null,
}));

const p = (lat: number, lng: number) => ({ latitude: lat, longitude: lng });

// <Route> (issue #2, Section B) — draws a Route from findRoutes as colored per-section polylines.
// Both Yandex-maps RN wrappers return route data and leave drawing to the app; this renders it.
describe('Route', () => {
  function render(element: React.ReactElement): TestRenderer.ReactTestRenderer {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(element);
    });
    return renderer!;
  }

  it('renders one Polyline per section, colored by leg type (walk dashed)', () => {
    const route = {
      points: [],
      sections: [
        { type: 'car', points: [p(0, 0), p(1, 1)] },
        { type: 'walk', points: [p(1, 1), p(1, 2)] },
        { type: 'bus', points: [p(1, 2), p(2, 2)] },
      ],
    } as any;
    const lines = render(
      <Route route={route} drivingColor="#111" walkColor="#222" transitColor="#333" />
    ).root.findAllByType(Polyline);
    expect(lines).toHaveLength(3);
    expect(lines[0].props.strokeColor).toBe('#111'); // car
    expect(lines[1].props.strokeColor).toBe('#222'); // walk
    expect(lines[1].props.dashLength).toBeGreaterThan(0); // walk is dashed
    expect(lines[2].props.strokeColor).toBe('#333'); // transit
  });

  it('falls back to the whole route geometry when there are no sections', () => {
    const route = { points: [p(0, 0), p(1, 1), p(2, 2)], sections: [] } as any;
    const lines = render(<Route route={route} />).root.findAllByType(Polyline);
    expect(lines).toHaveLength(1);
    expect(lines[0].props.points).toHaveLength(3);
  });

  it('skips a degenerate section with fewer than 2 points', () => {
    const route = {
      points: [],
      sections: [
        { type: 'car', points: [p(0, 0)] },
        { type: 'car', points: [p(0, 0), p(1, 1)] },
      ],
    } as any;
    expect(render(<Route route={route} />).root.findAllByType(Polyline)).toHaveLength(1);
  });
});
