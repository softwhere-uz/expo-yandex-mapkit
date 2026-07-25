# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **User location & traffic** (`YandexMapView` props, #1 → User location & traffic):
  `showUserPosition` (the device-location dot — needs the app to hold location permission),
  `followUser` (keep the camera centered on the user), and `trafficVisible` (the live
  traffic-jams layer). The `UserLocationLayer` / `TrafficLayer` are created lazily and applied
  on map creation. (Custom user-location icon, accuracy-circle styling, and config-plugin
  location permission strings are follow-ups.)

- **React-children marker icons** (#1 → Markers): a `<Marker>` can now render arbitrary React
  children as its icon (a custom pin — e.g. a rating bubble), taking precedence over `source`.
  Rendered natively through MapKit's view provider on both platforms (not a hand-rolled bitmap
  snapshot), so it avoids the layout drift that made the lineage's version unreliable. New
  `tracksViewChanges` prop (default `true`) controls re-rendering: set it `false` once the content
  has settled to snapshot the icon once — the react-native-maps convention, for a large perf win.
- **`fitAllMarkers()` + `fitMarkers` edge padding** (#1 → Imperative ref methods): `fitAllMarkers(options?)`
  moves the camera so every mounted `<Marker>` is visible (read from the marker registry). Both
  `fitMarkers` and `fitAllMarkers` now accept `options.edgePadding` (`{ top, right, bottom, left }`
  in points) — a focus rectangle that keeps the fitted content clear of overlays like a bottom
  sheet or header. Completes the v0 imperative-ref surface.
- **`<Polyline>` component** (#1 → Shapes): render a polyline as a child of `YandexMapView` —
  `points`, `strokeColor`/`strokeWidth`, `outlineColor`/`outlineWidth`, a dash pattern
  (`dashLength`/`gapLength`/`dashOffset`), `zIndex`, `onPress`, and `handled`. The map-object child
  handling (shared with `<Marker>`) is now generalized behind a `MapObjectChild` interface, so the
  upcoming `<Polygon>` and `<Circle>` plug into the same attach/detach machinery.
- **`<Polygon>` and `<Circle>` components** (#1 → Shapes): `<Polygon>` (an outer ring of `points`,
  optional `innerRings` holes, `fillColor`/`strokeColor`/`strokeWidth`) and `<Circle>` (`center`,
  `radius` in metres, `fillColor`/`strokeColor`/`strokeWidth`). Both support `zIndex`, `onPress` and
  `handled`, on the shared `MapObjectChild` architecture — completing the v1 Shapes group.

## [0.0.5] - 2026-07-25

### Added

- **`<Marker>` component** (#1 → Markers): image placemarks rendered as children of
  `YandexMapView`. Props: `point`, `source` (`require(...)` or `{ uri }`, http/data/file/bundled),
  `scale`, `anchor`, `visible`, `zIndex`, `rotated` (icon follows the map azimuth), `handled`
  (consume the tap so it does not also fire the map's `onMapPress`), and `identifier` — echoed back
  in `onPress` so a shared handler can tell markers apart (the identifying payload the lineage's
  marker taps never carried). Imperative `animatedMoveTo(point, durationMs)` /
  `animatedRotateTo(angle, durationMs)` via a marker ref. Markers mounted before `initialize()`
  resolves attach automatically once the map is created. (React-children marker icons,
  `fitAllMarkers`, and `fitMarkers` edge padding are follow-ups.)

### Fixed

- **Config plugin no longer aborts `expo prebuild` on an empty `apiKey`** (#15). A blank or
  whitespace-only `apiKey` — the common result of `process.env.YANDEX_MAPKIT_API_KEY ?? ''` when
  the env var is unset — previously threw `invalid apiKey — must be a non-empty MapKit API key
string` and failed prebuild entirely, blocking keyless CI and local builds. It is now treated as
  "not provided": the plugin warns, injects no build-time key (the app can still supply it at
  runtime via `initialize(apiKey)`), and generates the native projects normally. A present but
  non-string `apiKey` (number/array/object) still throws.

## [0.0.4] - 2026-07-25

### Added

- **Build-time API key and map locale in the config plugin.** New `apiKey` and `locale`
  options (top-level and per-platform) are written to `AndroidManifest.xml` `<meta-data>` and
  iOS `Info.plist`; the native modules read them on startup and initialize MapKit
  automatically. An app that sets `apiKey` never has to call `initialize(apiKey)` from JS and
  can render `<YandexMapView />` with no ready-gating — removing the lineage's init-order crash
  class. The runtime `initialize(apiKey)` path is unchanged and still the default when the key
  is only known at runtime; a build-time `locale` is applied on that path too. Both keys are
  optional, so existing setups are unaffected.
- **`onMapLoaded` event** (`YandexMapView`, #1 → Events): fires once the map finishes loading, with a
  `MapLoadStatistics` payload (`renderObjectCount`, `tileMemoryUsage`, and per-zoom load timings).
- **Imperative ref methods** (`YandexMapViewRef`, #1 → Imperative ref methods): `setCenter(position, options)`, `setZoom(zoom, options)`,
  `fitMarkers(points, options)`, `getCameraPosition()`, `getVisibleRegion()`, and world↔screen projection `getScreenPoints(points)` /
  `getWorldPoints(points)`. Called through a ref (`useRef<YandexMapViewRef>`), each returns a Promise. `YandexMapView` is now a
  `forwardRef` component. (`fitMarkers` edge-padding and `fitAllMarkers` are follow-ups.)
- **Map gesture controls** (`YandexMapView` props, first slice of #1 → Map view props): `scrollGesturesEnabled`,
  `zoomGesturesEnabled`, `tiltGesturesEnabled`, `rotateGesturesEnabled`, `fastTapEnabled` — all default `true`
  (MapKit's own defaults) and are applied on map creation, so a value set before `initialize()` resolves is
  honoured once the map appears. Plus `interactiveDisabled` — a shorthand that forces all four movement
  gestures off (overriding the individual toggles) for a non-interactive map.
- **Map appearance** (`YandexMapView` props, #1 → Map view props): `mapType`
  (`'none' | 'map' | 'satellite' | 'hybrid' | 'vector'`) and `mapStyle` (a Yandex JSON style string that
  only affects the vector and hybrid layers; pass `''` to clear, invalid JSON is ignored with a warning). Each is
  applied only when explicitly set, so an unset value keeps MapKit's own default. Both are applied on map
  creation so a value set before `initialize()` resolves is honoured once the map appears.
- **Yandex logo placement** (`YandexMapView` props, #1 → Map view props): `logoPosition`
  (`{ horizontal: 'left' | 'center' | 'right', vertical: 'top' | 'bottom' }`) and `logoPadding`
  (`{ horizontal, vertical }` in px, negatives clamped to 0) — applied only when set, so an unset
  value keeps MapKit's default logo position.

## [0.0.3] - 2026-07-25

### Added

- **Expo SDK 55+ (RN 0.83+) support.** The config plugin now raises the iOS deployment
  target to 16.4 (the MapKit minimum) in both `Podfile.properties.json` and the Xcode
  project, so managed apps on SDK 55/56 — whose template default is 15.1 — build against
  the YandexMapsMobile static framework with no manual edits. The Xcode floor is
  inheritance-aware and raise-only: it never lowers a higher inherited target and preserves
  `$(inherited)` / xcconfig macros. iOS parity with the existing Android `minSdkVersion` 26
  auto-raise.

### Changed

- `peerDependencies` now declare honest floors (`expo >=55`, `react >=19.2`,
  `react-native >=0.83`) instead of the previous `*` wildcards.
- devDependencies aligned to the head SDK (React Native 0.86, `jest-expo` 57,
  `babel-preset-expo` 57, `@types/react` 19.2).
- Documentation: compatibility table and React Native pairing list updated for SDK 55+.

## [0.0.2] - 2026-07-24

### Fixed

- **iOS did not compile in 0.0.1** — `YMKMapView`'s initializer is failable in the real
  MapKit 4.42 headers; now guarded. The iOS build is CI-verified (Xcode 26.5, iOS Simulator)
  as of this release.
- Podspec handles the object form of `package.json`'s `repository` field (0.0.1's manual
  publish predated the metadata normalization that broke `pod install`).

### Added

- **Bare React Native support**: documented setup (EN + RU) including the RN 0.86
  `install-expo-modules` gap and the bare-specific `minSdkVersion` edit; a manually wired
  reference app in `bare-example/`; CI jobs building it from the packed tarball on both
  platforms.
- CI: lint/build/plugin checks, prebuild smoke test, Android + iOS builds against the real
  MapKit artifact, weekly MapKit version watch, npm trusted publishing with provenance.

## [0.0.1] - 2026-07-24

Initial scaffold.

### Added

- `YandexMapView` (Android + iOS): declarative camera (`cameraPosition`, `animated`),
  `nightMode`, and the events `onMapReady`, `onCameraPositionChanged`, `onMapPress`,
  `onMapLongPress`.
- `initialize(apiKey)` — runtime MapKit initialization from JS; no `AndroidManifest.xml`
  or `AppDelegate` edits required.
- Expo config plugin: MapKit `version` / `flavor` selection with per-platform overrides,
  and Android `minSdkVersion` 26 enforcement.
- Web stubs that warn once and render nothing instead of crashing.
- Official scoped alias package `@softwhere-uz/expo-yandex-mapkit`.

[Unreleased]: https://github.com/softwhere-uz/expo-yandex-mapkit/compare/v0.0.5...HEAD
[0.0.5]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.5
[0.0.4]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.4
[0.0.3]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.3
[0.0.2]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.2
[0.0.1]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.1
