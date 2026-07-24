# HANDOVER — expo-yandex-mapkit

> Yandex Maps (MapKit) for Expo. Open-source, Expo Modules API, config-plugin-first, New Architecture.
>
> This document is the project's founding brief. It captures the market research (2026-07-24),
> the naming decision (2026-07-25), the technical plan, and the npm publishing playbook, so anyone —
> maintainer, contributor, or AI agent — can pick up the work with full context.

---

## 1. Mission

Build the library the Expo ecosystem doesn't have: a **maintained, open-source, English-documented
Yandex MapKit binding built on the Expo Modules API, with a real config plugin and New Architecture
support**. Yandex officially does not support React Native (their FAQ says so explicitly, while
Flutter gets a first-party plugin), Expo's own `expo-maps` supports only Apple/Google with no
third-party-provider mechanism, and the community's answers are fragmented across ~20 forks of a
dead upstream. The demand is real; the supply is broken.

## 2. Market research summary (as of 2026-07-24)

Deep multi-agent research (npm, GitHub, GitLab, Expo docs, Yandex docs, Russian-language sources —
Habr, ru.stackoverflow, tproger; 14 candidate libraries deep-read) concluded: **the space is
narrowly open.** Two packages each hold half of the target; nobody holds the intersection.

### The competitive frontier

| Package | State | Strengths | Fatal gaps |
|---|---|---|---|
| `react-native-yamap-plus` ([Qudaeo](https://github.com/Qudaeo/react-native-yamap-plus)) | Active (v6.9.1, 2026-05-22), ~3.6k dl/mo | Only shipped Expo config plugin; v6 is Fabric/TurboModules-only; JS-side API key init (no AppDelegate edits); MIT | Russian-only docs; 33 stars; plugin only toggles lite/full; unresolved Expo TurboModule issue (#12); iOS simulator Metal fragility |
| `@yoyomobility/expo-yandex-maps` | Active (v1.3.0, 2026-07-22), ~950 dl/mo | Only true Expo Modules API implementation; rich features (clustering, traffic-aware routing, Reanimated camera) | **Source repo is 404** — closed pipeline, no issue tracker; hard `react-native-reanimated ^4` peer dep; no config plugin; broken template docs |
| `react-native-yamap` ([volga-volga](https://github.com/volga-volga/react-native-yamap)) | **Dead** — no npm release since 2024-11-06, ~2k dl/mo | Richest feature set (routing, search, geocoding, clustering); the reference implementation | Legacy arch only; confirmed broken on Expo SDK 54 / RN 0.81 (issues [#337](https://github.com/volga-volga/react-native-yamap/issues/337), [#338](https://github.com/volga-volga/react-native-yamap/issues/338)); README's hand-written ObjC config plugin breaks on SDK 53+ Swift AppDelegates; 115+ open issues, maintainer silent |

Long tail: ~15 more forks/rewrites, all dead, embryonic, or undocumented (`react-native-yamap-lite`,
`-shim`, `-ultraligth`, `react-native-simple-yamap`, `@exterio/react-native-yamap-lite`,
`@javascript_variable/react-native-yandex-mapkit`, `react-native-yandex-map`, the squatted dead
`expo-yandex-maps` from 2023, agency-internal forks). The fork churn itself — two new publishes in
July 2026 alone — is the demand signal.

### Demand evidence

- Family-wide downloads ~8.5–9k/month vs the abandoned original's ~2k — abandoned-upstream +
  real-production-demand signature. (Context: ~0.16% of react-native-maps volume — this is a
  niche; win on trust/DX/docs, not raw capability.)
- ~1/5 of `react-native-yamap`'s issue traffic is Expo-specific (2023–2026, mostly unresolved),
  including an explicit request for "Expo Config Plugin functionality for API key injection".
- [expo/expo discussion #18508](https://github.com/expo/expo/discussions/18508) "Please add yandex
  map in expo" — 20 upvotes, zero response since 2022.
- Demand is concentrated in RU/CIS/Turkey markets and Russian-language channels; English-language
  visibility is an unowned niche.

### The exact gap this project fills

**Open-source + Expo Modules API + shipped config plugin + New Architecture + English-first docs +
current MapKit pin.** Plus two differentiators no incumbent has:

1. **Dual-brand support**: Yandex MapKit and Mappable (mappable.world, the international
   white-label of the same SDK — its RN route died Feb 2025). Same native APIs, different artifact
   coordinates/prefixes.
2. **Expo Go dev-time fallback**: a DOM-component (`'use dom'`, Expo SDK 52+) sub-package rendering
   the Yandex JS API v3 (`ymaps3`) — the only possible way to show a Yandex map in Expo Go, and a
   verified-empty niche. (Native MapKit in Expo Go is structurally impossible — same as
   `@rnmapbox/maps`.)

## 3. Naming decision (2026-07-25)

Evidence-based (live npm search-ranking probes + collision/moniker-rule audit + trademark
precedent + 3-lens judge panel):

- **Primary package: unscoped `expo-yandex-mapkit`** (repo root).
- **Official alias: `@softwhere-uz/expo-yandex-mapkit`** (thin re-export in `alias/`).

Why: npm search rank is currently literal name/keyword match + downloads (the quality/popularity/
maintenance scores are degenerate at 1.0), and no package in the niche contains "yandex-mapkit" — a
clean lane that matches the SDK's official name. Unscoped is the community-wrapper convention
(react-native-maps, react-native-vision-camera; Expo's own `create-expo-module` tutorial scaffolds
unscoped `expo-settings`). The name clears npm's moniker rule vs the dead `expo-yandex-maps`
(whole-word difference).

Rejected alternatives: `@softwhere-uz/expo-yandex-maps` (suffix collides with a dead undeprecated
squatter *and* the active @yoyomobility incumbent — scope-less installs silently get the broken
2023 package); `expo-yamap` (reads as another fork of the dead lineage, and YAMAP is the live
trademark of a Japanese GPS-app company).

**Keywords are the ranking lever** — ship this set in `package.json`:
`yandex`, `mapkit`, `yandex-mapkit`, `expo`, `react-native`, `maps`, `map`, `mapview`,
`expo-yandex-maps`, `yamap`, `react-native-yamap`, `geocoder`, `яндекс`, `карты`.
(Keyword literals carry text-match weight; the moniker rule does not apply to keywords.)

Trademark posture: Yandex's published brand rules restrict the **logo** only; decade-long precedent
of yandex-named community packages with zero takedowns (npm `react-native-yandexmapkit` since 2016;
pub.dev community `yandex_mapkit` coexisting with Yandex's official `yandex_maps_mapkit`). README
must carry a disclaimer — "This project uses Yandex MapKit, which belongs to Yandex. Refer to their
[terms of use](https://yandex.com/maps-api). Not affiliated with or endorsed by Yandex." — and never
use the Yandex logo in branding. Worst-case rename lifeboat: the scoped alias survives any dispute;
a suffix swap (`@softwhere-uz/expo-mapkit`) is pre-planned.

## 4. Native SDK facts a wrapper must respect

- **Current MapKit: 4.42.0** (2026-07-21). Yandex says always use latest; releases are frequent
  ([versions](https://yandex.com/maps-api/docs/mapkit/versions.html)).
- **Android**: Maven Central `com.yandex.android:maps.mobile:<ver>-lite|-full`; min API 26;
  init via `MapKitFactory.setApiKey()` + `initialize()`, lifecycle forwarding of onStart/onStop.
- **iOS**: **CocoaPods only** (no SPM) — `pod 'YandexMapsMobile', '<ver>-lite|-full'`; iOS 13+
  (incumbents target 15+). Fine for Expo since prebuild/CNG uses CocoaPods.
- **MapKit holds *weak* references to listeners** — the wrapper must retain listener objects
  itself, or callbacks silently die. (4.41.0 touched these bridging internals; track changelogs.)
- **Lite vs full flavors**: lite = map, markers, polylines/polygons, clustering, traffic layer,
  user location. Full adds routing, search, suggest, geocoding, panoramas. Offline maps exist in
  lite but are **paid-license-only**. Make lite/full a config-plugin option per platform (the
  yamap-plus pattern).
- **Licensing numbers are contradictory across Yandex's own pages** (25,000 MAU free vs 1,000
  users/day free). Never assert limits in docs — link Yandex's terms.
- No satellite layer in MapKit (road map + custom layers only); no SVG marker icons; no built-in
  zoom/compass controls (the lib or app must provide UI).
- Reference implementations: official demo repos `yandex/mapkit-android-demo`,
  `yandex/mapkit-ios-demo`; official Flutter plugin `yandex_maps_mapkit` (pub.dev) shows the
  binding surface Yandex itself considers complete.

## 5. Technical architecture plan

1. **Scaffold**: `npx create-expo-module@latest expo-yandex-mapkit` (Swift + Kotlin, Expo Modules
   API — Expo's recommended path; JSI-based, works on both architectures, New Arch included).
2. **API key at runtime from JS** (`YandexMap.init(apiKey)` before first map view) — the yamap-plus
   lesson: this removes every AppDelegate/AndroidManifest modification and makes plain
   `npx expo prebuild` sufficient.
3. **Config plugin** (`app.plugin.js`) handles what JS can't: lite/full flavor selection
   (gradle property + Podfile env), MapKit version override (the `@rnmapbox/maps`
   `RNMapboxMapsVersion` pattern), Android minSdk 26 assertion, optional location-permission
   strings. Document `plugins: [["expo-yandex-mapkit", { ... }]]` as the only setup step.
4. **Feature roadmap** (each phase shippable):
   - v0: MapView, camera control + events, markers (incl. React-children icons), press events.
   - v1: polylines/polygons/circles, clustering, user-location layer, traffic toggle, night mode,
     JSON map styling.
   - v2 (full flavor): search + suggest, geocoding, routing.
   - v3: Mappable dual-brand artifacts; `expo-yandex-mapkit-dom` Expo Go fallback sub-package.
5. **Migration guide from `react-native-yamap`** — its ~2k dl/month of stranded users are the
   fastest path to the download signal that compounds npm search rank. Mirror its prop names where
   sane; provide a mapping table where not.
6. **CI**: example app + `expo prebuild` smoke test on both platforms per PR; MapKit-version bump
   dependabot-style watch (Yandex releases ~monthly).

### ⚠️ Unverified assumption to test FIRST

All research verdicts came from static tarball/README inspection — **nobody has empirically run
`npx expo prebuild` with any candidate**. Before writing code: create a throwaway Expo SDK 54 app,
install `react-native-yamap-plus` 6.9.1, run prebuild + dev client on both platforms. That is the
competitive benchmark and the fastest way to learn where the real integration pain lives
(see also [Chipi007/expo-yamap-example](https://github.com/Chipi007/expo-yamap-example) — notes
iOS first-render quirks).

## 6. Repo / package layout (both names, one repo)

```
expo-yandex-mapkit/            ← this repo
├── package.json               ← "name": "expo-yandex-mapkit"   (the real library)
├── app.plugin.js
├── src/  ios/  android/  expo-module.config.json
├── example/                   ← Expo example app (doubles as the CI smoke test)
└── alias/
    ├── package.json           ← "name": "@softwhere-uz/expo-yandex-mapkit"
    ├── index.js               ← module.exports = require('expo-yandex-mapkit')
    ├── app.plugin.js          ← module.exports = require('expo-yandex-mapkit/app.plugin.js')
    └── README.md              ← "Official scoped alias — install expo-yandex-mapkit"
```

The alias contains **no native code** — it only depends on the real package (`"expo-yandex-mapkit": "*"`),
so Expo autolinking discovers the single real module transitively and duplicate-native-module
conflicts are impossible. The `"*"` range means the alias never needs republishing. Do **not**
publish full library content under both names.

## 7. npm publishing playbook

### One-time setup

1. Account on npmjs.com with **2FA enabled** (required for publish).
2. Create the **org `softwhere-uz`** on npm (free for public packages) — the GitHub org existing
   does not reserve the npm scope; they are separate namespaces.
3. `npm login` on the publishing machine.

### Reserve the names NOW (before the library is ready)

The unscoped name has been visible in this niche's search space since 2026-07-24 and is free but
snipeable. Publish an honest placeholder (this README-bearing repo state is enough):

```bash
# from repo root — package.json: name expo-yandex-mapkit, version 0.0.1,
# description + repository fields set, README explaining active development
npm publish                        # unscoped → public by default

cd alias
npm publish --access public        # REQUIRED flag: scoped publishes default to
                                   # restricted and error on a free/org plan without it
```

Optional defensive reservations (free as of 2026-07-25, pointer-stub READMEs):
`expo-yamap`, `react-native-yandex-mapkit`. Note `expo-yandexmaps` is already unpublishable by
anyone (moniker rule vs the dead `expo-yandex-maps`) — not a threat.

### Every release

```bash
npm version patch|minor|major
npm publish                        # root only; the alias tracks via "*" automatically
git push --follow-tags
```

### Once CI exists — provenance (strongest trust signal for an unscoped package)

Publish from GitHub Actions with OIDC trusted publishing:

```yaml
permissions:
  id-token: write                  # provenance attestation
steps:
  - run: npm publish --provenance --access public
```

This stamps every npm page with a verified link back to this repo/workflow. Configure "trusted
publisher" for both package names in npm settings so no long-lived token exists at all.

### Package metadata checklist (rankings + trust)

- `keywords`: the full set from §3 — this is the discoverability lever.
- `description`: "Yandex Maps (MapKit) for Expo — Expo Modules API, config plugin, New Architecture".
- `repository`: `git+https://github.com/softwhere-uz/expo-yandex-mapkit.git`
  (alias adds `"directory": "alias"`).
- `license`: MIT (two incumbents shipped **empty** license fields — an easy trust win).
- README top: install command, plugin config snippet, the Yandex trademark disclaimer, and
  "not affiliated with `expo-yandex-maps` (unmaintained since 2023)".

## 8. Status log

- **2026-07-24** — Market research completed (23-agent sweep). Space confirmed narrowly open.
  GitHub repo created.
- **2026-07-25** — Naming decided (evidence + judge panel): unscoped primary + scoped alias.
  This handover written and pushed as the repo's first commit. npm names still unclaimed —
  **reserving them is the next action.**
