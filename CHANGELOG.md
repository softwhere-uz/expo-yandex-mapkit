# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

[Unreleased]: https://github.com/softwhere-uz/expo-yandex-mapkit/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.3
[0.0.2]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.2
[0.0.1]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.1
