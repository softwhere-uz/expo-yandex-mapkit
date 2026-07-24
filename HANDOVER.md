# HANDOVER — project brief

> Internal context for maintainers, contributors, and AI agents.
> User-facing docs live in [README.md](./README.md); development and release
> instructions in [CONTRIBUTING.md](./CONTRIBUTING.md); implementation history in `git log`
> (commit bodies record what was verified and what was not).

## Mission

Build the library the Expo ecosystem doesn't have: a **maintained, open-source,
English-documented Yandex MapKit binding built on the Expo Modules API, with a real config
plugin and New Architecture support**. Yandex officially does not support React Native (their
FAQ says so explicitly, while Flutter gets a first-party plugin), Expo's own `expo-maps`
supports only Apple/Google with no third-party-provider mechanism, and the community's answers
are fragmented across ~20 forks of a dead upstream.

## Market context (deep research, 2026-07)

- Family-wide downloads across all Yandex-map wrappers: ~8.5–9k/month, with the abandoned
  original (`react-native-yamap`) still at ~2k — the abandoned-upstream + real-production-demand
  signature. This is a niche (~0.16% of react-native-maps volume): win on trust/DX/docs, not raw
  capability.
- Demand is concentrated in RU/CIS/Turkey markets and Russian-language channels;
  English-language visibility is an unowned niche.
- ~1/5 of `react-native-yamap`'s issue traffic is Expo-specific and mostly unresolved, including
  an explicit request for a config plugin. [expo/expo discussion #18508](https://github.com/expo/expo/discussions/18508)
  ("Please add yandex map in expo", 20 upvotes) has had zero response since 2022.
- Two differentiators no incumbent has, reserved for v3: **Mappable dual-brand support**
  (mappable.world — the international white-label of the same SDK; same native APIs, different
  artifact coordinates/prefixes) and an **Expo Go / web fallback** as a DOM-component
  sub-package rendering the Yandex JS API v3 (`ymaps3`) — the only possible way to show a
  Yandex map in Expo Go (native MapKit there is structurally impossible, same as `@rnmapbox/maps`).
- The user-facing competitor comparison lives in [README.md → Alternatives](./README.md#alternatives).

## Naming (decided 2026-07-25, evidence-based)

- **Primary: unscoped `expo-yandex-mapkit`** (repo root). **Official alias:
  `@softwhere-uz/expo-yandex-mapkit`** (thin re-export in `alias/`, no native code, `"*"` range —
  never needs republishing).
- Why: npm search rank is literal name/keyword match + downloads (quality/popularity/maintenance
  scores are degenerate at 1.0); no package in the niche contains "yandex-mapkit"; unscoped is
  the community-wrapper convention. The name clears npm's moniker rule vs the dead
  `expo-yandex-maps` (whole-word difference). Keywords in `package.json` are the ranking lever —
  don't prune them.
- Rejected: `@softwhere-uz/expo-yandex-maps` (scope-less installs would silently get the broken
  2023 squatter), `expo-yamap` (reads as a fork of the dead lineage; YAMAP is a live trademark of
  a Japanese GPS-app company).
- Trademark posture: Yandex's published brand rules restrict the **logo** only; decade-long
  precedent of yandex-named community packages with zero takedowns. README must keep the
  disclaimer and never use the Yandex logo. Worst-case rename lifeboat: the scoped alias survives
  any dispute; a suffix swap (`@softwhere-uz/expo-mapkit`) is pre-planned.

## Native SDK facts a maintainer must respect

- **Track MapKit releases** (~monthly, [versions](https://yandex.com/maps-api/docs/mapkit/versions.html)).
  Default pinned in three places that must stay in sync: `plugin/src/index.ts`,
  `android/build.gradle`, `ios/ExpoYandexMapKit.podspec` (each carries a cross-reference comment).
- **MapKit holds weak references to listeners** — the wrapper retains listener objects itself.
  Since 4.41 the Android API takes an explicit `java.lang.ref.WeakReference` in `add*Listener`,
  so this is now a compile-time contract on Android; on iOS it remains an invisible runtime trap.
- **iOS is CocoaPods-only** (no SPM). Fine for Expo since prebuild/CNG uses CocoaPods.
- **Licensing numbers are contradictory across Yandex's own pages** (25,000 MAU free vs 1,000
  users/day free). Never assert limits in docs — link Yandex's terms.
- No satellite layer in MapKit (road map + custom layers only); no SVG marker icons; no built-in
  zoom/compass controls (the lib or app must provide UI). Offline maps are paid-license-only.
- Reference implementations: `yandex/mapkit-android-demo`, `yandex/mapkit-ios-demo`, and the
  official Flutter plugin `yandex_maps_mapkit` (pub.dev) — the binding surface Yandex itself
  considers complete.

## Open items (as of 2026-07-24)

1. **Reserve the npm names** — first publish of root + alias, then configure trusted publishing.
   Steps in [CONTRIBUTING.md → Releasing](./CONTRIBUTING.md#releasing).
2. **iOS verification** — the Swift has never been compiled (no macOS in the dev environment):
   `cd example && npx expo prebuild --platform ios && npx expo run:ios` on a Mac.
3. **On-device rendering test** on both platforms (Android compiles against the real
   `4.42.0-lite` artifact, but nobody has seen a map pixel yet).
4. **v0 completion: markers** (incl. React-children icons) — the last unshipped v0 item.
5. **CI**: per-PR prebuild smoke test + example build; MapKit-version bump watch.
6. **Migration guide from `react-native-yamap`** once markers/shapes land — its stranded ~2k
   dl/month are the fastest path to the download signal that compounds npm search rank.
