# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/softwhere-uz/expo-yandex-mapkit/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.2
[0.0.1]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.1
