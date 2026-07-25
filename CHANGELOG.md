# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-07-26

**Milestone release — full feature parity, device-validated.** `1.0` marked v1 (lite-flavor) parity;
`2.0` marks the whole surface complete: every item on the parity checklist ([#1](https://github.com/softwhere-uz/expo-yandex-mapkit/issues/1))
is shipped, and the full library — including the `full`-flavor Search / Suggest / Routing — has now
been **runtime-verified on iOS** (a 25/25 programmatic suite plus screenshot-verified rendering across
every v0/v1 path) in addition to compiling against the real MapKit SDK on both platforms in CI.

> **No breaking changes** — the public API is identical to `1.4.0`; no migration is needed. The major
> bump is a deliberate "validated, feature-complete, production-ready" signal, not an API break.

### Changed

- **README refreshed** for the feature-complete state (Features / Status / Alternatives / lite-vs-full
  had all drifted, still describing "early development"). Sharpened the `mapType` note: `'satellite'` /
  `'hybrid'` need a key with satellite-imagery access — a free-tier key renders the empty tile grid (the
  prop takes effect, imagery just doesn't load), which is a key entitlement, not a library issue.

## [1.4.0] - 2026-07-25

Completes the react-native-yamap-plus feature-parity checklist (#1): every tracked item is now shipped.
This release adds the remaining Search options. (Note: the `full`-flavor v2 modules are verified to
compile against real MapKit but have not yet been exercised on a device.)

### Added

- **Search options: spelling correction + snippets** (#1 → v2 Search, `full` flavor). `SearchOptions` gains
  `disableSpellingCorrection` (turn off the "did you mean" fixups) and `snippets` (`'rating'` / `'photos'` /
  `'panoramas'`). Requesting the `'rating'` snippet populates `SearchResult.rating` (0–5) + `ratingsCount`
  for organizations. This closes the last remaining Search-options item of the v2 parity checklist.

## [1.3.0] - 2026-07-25

Rounds out the v2 (`full`-flavor) modules: per-section route breakdowns, structured search-address
components, and `resolveURI`. Additive and `full`-flavor only.

### Added

- **`resolveURI()` — resolve a MapKit object URI** (#1 → v2 Search, `full` flavor). `resolveURI(uri, options?)`
  resolves a `ymapsbm1://…` object URI (e.g. a `SuggestItem.uri`) to full `SearchResult`s — the documented
  way to get coordinates/details for a suggestion that arrived without a `center`.
- **Per-section route breakdown** (#1 → v2 Routing, `full` flavor). Each `Route` now includes
  `sections: RouteSection[]` — the route split into legs, each `{ type, time?, points, transports? }`.
  `type` is `'car'` (driving), `'walk'` / `'waiting'`, or a transit vehicle type (`'bus'`,
  `'underground'`, …); `transports` maps each vehicle type to the line names serving that leg; `points`
  is the leg's own polyline fragment (resolved via `SubpolylineHelper`). This makes masstransit routes
  actionable ("walk → bus 42 → transfer → metro") rather than just a total.
- **Structured address components for search** (#1 → v2 Search, `full` flavor). A toponym `SearchResult`
  now includes `addressComponents: { name, kinds }[]` — the structured address breakdown, with
  snake_case `kinds` (`country`, `province`, `locality`, `district`, `street`, `house`, `metro_station`,
  …) consistent across platforms (iOS maps MapKit's boxed `YMKSearchComponentKind` to the same strings
  Android's `Address.Component.Kind` produces). `formattedAddress` is still there for the simple case.

## [1.2.0] - 2026-07-25

Adds **Routing** — the last v2 (`full`-flavor) module group. Additive and `full`-flavor only.

### Added

- **v2: Routing** (#1 → v2 Routing, `full` flavor). `findRoutes(points, mode)` builds driving /
  masstransit / pedestrian routes, with `findDrivingRoutes` / `findMasstransitRoutes` /
  `findPedestrianRoutes` convenience wrappers. Each `Route` carries a summary — `time`,
  `timeWithTraffic` (driving), `distance` (driving), `walkingDistance` + `transfersCount`
  (masstransit) — and its `points` geometry (draw with `<Polyline>`). A new `ExpoYandexTransport`
  module reusing the v2 flavor-conditional-compilation split (rejects on `lite`). The per-section
  transit breakdown (which line, stops, per-leg mode) is a follow-up.

## [1.1.0] - 2026-07-25

Starts v2 (the MapKit `full`-flavor modules) with **Suggest** and **Search & geocoding**, plus the
flavor-conditional-compilation infrastructure they run on. All additive and `full`-flavor only —
`lite` apps are unaffected (these APIs reject with a clear message on `lite`).

### Added

- **v2: Search & geocoding** (#1 → v2 Search, `full` flavor). `searchText(query, options)` (full-text
  search) and `searchPoint(point, options)` (reverse geocoding), plus `geocodeAddress` / `geocodePoint`
  convenience aliases. Results are `{ name?, description?, point?, formattedAddress? }[]`. Options:
  `userPosition`, `boundingBox` (search window), `searchTypes` (`geo` / `biz`), `resultPageSize`, `zoom`.
  Reuses the v2 flavor-conditional-compilation infrastructure (a new `ExpoYandexSearch` module, real in
  `src/mapkit/full` / iOS `#if YANDEX_MAPS_FULL`, rejecting stub on `lite`). The structured `Address`
  component breakdown (the 20 address kinds) is a follow-up; `formattedAddress` covers the common case.
- **v2 begins: `suggest()` (search-as-you-type)** (#1 → v2 Suggest, `full` flavor). New `suggest(query, options)`
  → `{ title, subtitle?, searchText, uri?, center?, distance? }[]` plus `resetSuggest()`. Each item's
  `center` coordinate is read **natively** (MapKit ≥ 4.3.0) so results carry coordinates directly —
  fixing the recurring bug in this lineage ([yamap-plus#27](https://github.com/Qudaeo/react-native-yamap-plus/issues/27))
  where coordinates were re-parsed from the `uri` in JS and lost for org/opaque URIs.
  - This also lands the **flavor-conditional-compilation infrastructure** every v2 feature needs: full-only
    native code (which references classes the `lite` artifact omits) is kept out of the `lite` compile —
    iOS behind `#if YANDEX_MAPS_FULL` (the podspec defines it only for `flavor: full`), Android via a
    `src/mapkit/{full,lite}` source-set split selected by the existing `expoYandexMapKit.flavor`. On `lite`,
    `suggest()` rejects with a clear "requires the full flavor" message. A new **full-flavor CI compile
    job** verifies the full-only code on both platforms (the existing jobs only compile `lite`).

## [1.0.0] - 2026-07-25

First stable release — the v1 feature set (parity with react-native-yamap-plus's lite-flavor
surface) is complete: markers, shapes, clustering, user location, traffic, locale, and the config
plugin. See the [tracking issue](https://github.com/softwhere-uz/expo-yandex-mapkit/issues/1).

### Added

- **Clustering group completed** (#1 → Clustering): two follow-ups to the `<Clusterer>` shipped in
  #32. `<Marker excludeFromCluster>` keeps a marker out of clustering — it stays a standalone
  placemark at every zoom (e.g. a "you are here" pin among clustered data points), routed to the
  map's root collection instead of the cluster collection (with re-routing if the flag flips after
  mount). `<Clusterer clusterIcon>` replaces the drawn count disc with a custom badge image
  (`require()`/`{ uri }`); the count is still composited on top, positioned by the new
  `clusterTextOffset` (which also nudges the disc's count). This closes the v1 Clustering group. The
  remaining yamap-plus parity items are covered by the declarative design rather than added as new
  API: a clustered marker's own `onPress` already fires when shown un-clustered (no separate
  `onClusterPlacemarkPress`), and rendering `<Marker>` children from state replaces the imperative
  `appendClusterMarkers` / `clearClusterMarkers`.
- **Custom user-location dot** (#1 → User location): `userLocationIcon` (+ `userLocationIconScale`)
  replaces MapKit's default location dot with your own image — `require('./me.png')` or `{ uri }`,
  the same source shape as `<Marker>`. The icon is applied to both the resting pin and the heading
  arrow and re-applied on every location update, so it survives MapKit swapping the two internally
  (the failure mode behind yamap-plus's [reportedly broken `userLocationIcon`](https://github.com/Qudaeo/react-native-yamap-plus/issues/31)).
  The accuracy circle around the dot is stylable via `userLocationAccuracyFillColor` /
  `userLocationAccuracyStrokeColor` / `userLocationAccuracyStrokeWidth`. All require `showUserPosition`;
  each unset value leaves MapKit's default untouched. A JS regression test pins the prop transform
  (asset → URI string, colours → `processColor`) so the JS side can't silently hand the native layer
  a value it can't load. `showUserPosition` / `followUser` / `trafficVisible` are now documented in
  the `<YandexMapView>` prop table.
- **Marker clustering** (#1 → Clustering): a new `<Clusterer>` component groups its `<Marker>`
  children into clusters, backed by MapKit's `ClusterizedPlacemarkCollection` on both platforms.
  Rather than yamap-plus's separate `clusteredMarkers` array + `renderMarker` render-prop, this
  reuses the existing declarative `<Marker>` (image / React-children icons, `onPress`, `identifier`
  all still work) — the marker _is_ the render-prop. `clusterRadius` and `minZoom` are configurable
  (yamap-plus hardcodes 50 / 12). A default round count badge is drawn natively with configurable
  `clusterColor` / `clusterTextColor` / `clusterTextSize` / `clusterSize`. Tapping a cluster fits the
  camera to its markers (`fitClusterOnPress`, default on) and fires `onClusterPress` with
  `{ size, point }`. `fitAllMarkers()` includes clustered markers. Marker add/remove/move within a
  clusterer coalesces into a single re-cluster per frame. Still to come in this group:
  `excludeFromCluster`, imperative batch add/clear, and custom cluster-badge icons.
- **iOS edge padding for `fitMarkers` / `fitAllMarkers`** (#1 → Imperative ref, #7): `options.edgePadding`
  now applies on iOS too (previously Android-only, iOS framed to the full viewport). It is applied via
  the map window's focus rectangle, so an asymmetric inset — e.g. a bottom sheet overlapping the lower
  part of the map — keeps the fitted content clear of the overlay rather than centering it. The focus
  rect persists after the fit, so follow-up camera moves keep the same inset until the next `fit*` call
  changes it (pass no `edgePadding` to reset to the full viewport).

### Fixed

- **React-children markers no longer crash on the new architecture** (Android, #1 → Markers, #7).
  Found by on-device testing: mounting a `<Marker>` with React children fatal-crashed with
  `IllegalStateException: A catalyst view must have an explicit width and height`. MapKit's
  `ViewProvider.snapshot()` re-measures the view with `UNSPECIFIED` measure specs, which a Fabric
  (new-architecture) `ReactViewGroup` rejects — so `ViewProvider` cannot snapshot a new-arch React
  view at all. The child is now snapshotted to a bitmap directly (`ImageProvider.fromBitmap`), which
  also removes the layout-drift the lineage's `ViewProvider` approach suffered. iOS was unaffected.
- **Custom React-children pins now size to their content** (#7). The native marker view is laid out at
  the map's full width, so a child with the default `alignItems: stretch` was snapshotted full-width
  (a small rating bubble stretched edge-to-edge). Children are wrapped so they hug their own content.

## [0.0.7] - 2026-07-25

### Added

- **Runtime locale** (#1 → Locale): `setLocale(locale)`, `getLocale()`, and `resetLocale()` module
  functions to change the map display language at runtime (`"en_US"`, `"ru_RU"`, …). Routed through
  the SDK's i18n manager on both platforms. Note the SDK's own caveats (surfaced in the JSDoc): on
  iOS the locale must be set once **before the first map is created**, and on Android a change fully
  applies only after an app restart. For a build-time language, the config plugin's `locale` option
  remains the trap-free path.
- **Config-plugin location permission** (#1 → User location & traffic): a new
  `locationWhenInUsePermission` plugin option. Set it to a usage-description string and the plugin
  writes iOS `NSLocationWhenInUseUsageDescription` and adds `ACCESS_FINE_LOCATION` /
  `ACCESS_COARSE_LOCATION` to the Android manifest — the permission the `showUserPosition` /
  `followUser` layer needs. Omit it (or pass a blank string) and the plugin declares nothing, so
  apps that request location themselves (e.g. via expo-location) are untouched.

## [0.0.6] - 2026-07-25

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
  `fitMarkers` and `fitAllMarkers` accept `options.edgePadding` (`{ top, right, bottom, left }` in
  points) — a focus rectangle that keeps the fitted content clear of overlays like a bottom sheet or
  header. Edge padding currently applies on **Android**; on iOS the fit frames to the full viewport
  (iOS edge padding via the map window's focus rect is a follow-up). Completes the v0 imperative-ref surface.
- **`<Polyline>` component** (#1 → Shapes): render a polyline as a child of `YandexMapView` —
  `points`, `strokeColor`/`strokeWidth`, `outlineColor`/`outlineWidth`, a dash pattern
  (`dashLength`/`gapLength`/`dashOffset`), `zIndex`, `onPress`, and `handled`. The map-object child
  handling (shared with `<Marker>`) is now generalized behind a `MapObjectChild` interface, so the
  upcoming `<Polygon>` and `<Circle>` plug into the same attach/detach machinery.
- **`<Polygon>` and `<Circle>` components** (#1 → Shapes): `<Polygon>` (an outer ring of `points`,
  optional `innerRings` holes, `fillColor`/`strokeColor`/`strokeWidth`) and `<Circle>` (`center`,
  `radius` in metres, `fillColor`/`strokeColor`/`strokeWidth`). Both support `zIndex`, `onPress` and
  `handled`, on the shared `MapObjectChild` architecture — completing the v1 Shapes group.

### Fixed

- **Markers no longer crash on mount** (#19). Rendering any `<Marker>` from 0.0.5 red-screened or
  crashed on the first mount, from two independent bugs:
  - _Event name collision_ — the marker's native press event was `onPress`, which React Native
    normalizes to the reserved **bubbling** `topPress` and collides with Expo's **direct** view
    events (`Event cannot be both direct and bubbling: topPress`). The native events are now
    `onMarkerPress` / `onShapePress`; the public `onPress` prop is unchanged (the JS wrappers forward
    it). This also pre-empts the identical crash in the new `<Polyline>`/`<Polygon>`/`<Circle>`.
  - _Styling an icon-less placemark_ — `updateMarker()` applied the icon style before any icon was
    set, tripping a native assertion (`Supported for single, animated icon and view only`). The style
    is now applied only after an icon or view is present, on both platforms.

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

[Unreleased]: https://github.com/softwhere-uz/expo-yandex-mapkit/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v2.0.0
[1.4.0]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v1.4.0
[1.3.0]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v1.3.0
[1.2.0]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v1.2.0
[1.1.0]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v1.1.0
[1.0.0]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v1.0.0
[0.0.5]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.5
[0.0.4]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.4
[0.0.3]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.3
[0.0.2]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.2
[0.0.1]: https://github.com/softwhere-uz/expo-yandex-mapkit/releases/tag/v0.0.1
