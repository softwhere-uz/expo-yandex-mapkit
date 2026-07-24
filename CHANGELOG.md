# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
