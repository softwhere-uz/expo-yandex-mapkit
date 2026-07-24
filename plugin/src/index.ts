import {
  AndroidConfig,
  ConfigPlugin,
  createRunOncePlugin,
  withAndroidManifest,
  withGradleProperties,
  withInfoPlist,
  withPodfileProperties,
  withXcodeProject,
} from 'expo/config-plugins';

type PropertiesItem = AndroidConfig.Properties.PropertiesItem;

type PlatformOptions = {
  version?: string;
  flavor?: 'lite' | 'full';
  apiKey?: string;
  locale?: string;
};

export type ExpoYandexMapKitPluginProps = PlatformOptions & {
  android?: PlatformOptions;
  ios?: PlatformOptions;
};

// `version`/`flavor` always resolve to a concrete value; `apiKey`/`locale` stay optional.
// When they are absent the plugin injects nothing — the API key is then supplied at runtime
// via `initialize(apiKey)` exactly as before.
type ResolvedPlatformOptions = {
  version: string;
  flavor: 'lite' | 'full';
  apiKey?: string;
  locale?: string;
};

// Default MapKit pin — keep in sync with android/build.gradle and ios/ExpoYandexMapKit.podspec.
const DEFAULT_VERSION = '4.42.0';
const DEFAULT_FLAVOR = 'lite';
// MapKit requires Android API 26+.
const MIN_SDK_VERSION = 26;
// MapKit requires iOS 16.4+ — keep in sync with ios/ExpoYandexMapKit.podspec's platform.
const MIN_IOS_DEPLOYMENT_TARGET = '16.4';

// Where the optional build-time API key / locale are written so the native modules can read
// them at startup and initialize MapKit automatically. Keep in sync with the reader constants:
//   Android — android/src/main/java/expo/modules/yandexmapkit/ExpoYandexMapKitModule.kt
//   iOS     — ios/ExpoYandexMapKitModule.swift
// (scripts/check-plugin.mjs asserts the native files reference these exact strings.)
const ANDROID_API_KEY_METADATA = 'expo.modules.yandexmapkit.API_KEY';
const ANDROID_LOCALE_METADATA = 'expo.modules.yandexmapkit.LOCALE';
const IOS_API_KEY_INFO_PLIST_KEY = 'ExpoYandexMapKitApiKey';
const IOS_LOCALE_INFO_PLIST_KEY = 'ExpoYandexMapKitLocale';

const VALID_FLAVORS = ['lite', 'full'];
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
// MapKit locales are an ISO 639-1 language, optionally with an ISO 3166-1 region:
// "en", "ru", "en_US", "ru_RU", "uz_UZ", "tr_TR".
const LOCALE_PATTERN = /^[a-z]{2}(_[A-Z]{2})?$/;

function validatePlatformOptions(options: PlatformOptions, scope: string): void {
  if (options.version !== undefined && !VERSION_PATTERN.test(options.version)) {
    throw new Error(
      `expo-yandex-mapkit config plugin: invalid ${scope}version "${options.version}" — expected a MapKit version like "4.42.0" (major.minor.patch).`
    );
  }
  if (options.flavor !== undefined && !VALID_FLAVORS.includes(options.flavor)) {
    throw new Error(
      `expo-yandex-mapkit config plugin: invalid ${scope}flavor "${options.flavor}" — must be "lite" or "full".`
    );
  }
  // A build-time apiKey is optional: the key can instead be supplied at runtime via
  // initialize(apiKey). Config plugin props arrive as untyped JSON (app.config.js is plain JS),
  // so a present, non-string value (number, array, object) is a genuine misconfiguration and
  // still throws. But an empty/whitespace-only string — the common footgun when a key comes from
  // an unset env var (`process.env.X ?? ''`) — must NOT abort prebuild: treat it as "not provided"
  // and warn, so keyless CI/local builds still generate native projects. See #15.
  // Read as unknown: config-plugin props are untyped JSON, so a caller can pass a number/array/null
  // despite the declared `string | undefined`. `!= null` folds null and undefined into "not provided".
  const apiKey: unknown = options.apiKey;
  if (apiKey != null && typeof apiKey !== 'string') {
    throw new Error(
      `expo-yandex-mapkit config plugin: invalid ${scope}apiKey — must be a string MapKit API key (or omit it to initialize at runtime).`
    );
  }
  if (typeof apiKey === 'string' && apiKey.trim() === '') {
    console.warn(
      `expo-yandex-mapkit config plugin: ${scope}apiKey is empty — ignoring it (no build-time key injected). Supply a non-empty key or call initialize(apiKey) at runtime.`
    );
  }
  // Guard the type as well (see apiKey above): RegExp.test coerces its argument, so an array like
  // ["en_US"] would otherwise slip through via toString() and be injected as a non-string value.
  if (
    options.locale !== undefined &&
    (typeof options.locale !== 'string' || !LOCALE_PATTERN.test(options.locale))
  ) {
    throw new Error(
      `expo-yandex-mapkit config plugin: invalid ${scope}locale "${options.locale}" — expected a MapKit locale like "en_US" or "ru_RU" (language, optionally language_REGION).`
    );
  }
}

function validateProps(props: ExpoYandexMapKitPluginProps): void {
  validatePlatformOptions(props, '');
  validatePlatformOptions(props.android ?? {}, 'android.');
  validatePlatformOptions(props.ios ?? {}, 'ios.');
}

// Trim the key so a whitespace-padded value (e.g. a dashboard copy-paste with a trailing newline)
// is stored canonically in the manifest/plist — otherwise the native SDK receives the padded string
// and a later runtime initialize() with the clean key would compare as different. An empty or
// whitespace-only key normalizes to `undefined` so the plugin injects nothing and the app falls back
// to the runtime initialize() path (validatePlatformOptions warns about the blank value separately).
function normalizeApiKey(apiKey: string | null | undefined): string | undefined {
  const trimmed = apiKey?.trim();
  return trimmed ? trimmed : undefined;
}

function resolvePlatformOptions(
  props: ExpoYandexMapKitPluginProps,
  platform: 'android' | 'ios'
): ResolvedPlatformOptions {
  const override = props[platform] ?? {};
  return {
    version: override.version ?? props.version ?? DEFAULT_VERSION,
    flavor: override.flavor ?? props.flavor ?? DEFAULT_FLAVOR,
    apiKey: normalizeApiKey(override.apiKey ?? props.apiKey),
    locale: override.locale ?? props.locale,
  };
}

// True when `current` is absent/unparseable or a lower iOS version than `min`.
// Compares major.minor numerically so "16.10" > "16.4" (a plain float compare would not).
// `current` may arrive as null/undefined (unset key) — both count as "below". A value
// with an unparseable major OR minor (e.g. "16.x") also counts as below, matching the
// "absent/unparseable => true" contract rather than silently passing it through.
function isBelowIosTarget(current: string | null | undefined, min: string): boolean {
  if (current == null) return true;
  const [curMajor, curMinor = 0] = current.split('.').map(Number);
  const [minMajor, minMinor = 0] = min.split('.').map(Number);
  if (Number.isNaN(curMajor) || Number.isNaN(curMinor)) return true;
  return curMajor < minMajor || (curMajor === minMajor && curMinor < minMinor);
}

function findGradleProperty(
  items: PropertiesItem[],
  key: string
): Extract<PropertiesItem, { type: 'property' }> | undefined {
  return items.find(
    (item): item is Extract<PropertiesItem, { type: 'property' }> =>
      item.type === 'property' && item.key === key
  );
}

function upsertGradleProperty(items: PropertiesItem[], key: string, value: string): void {
  const existing = findGradleProperty(items, key);
  if (existing) {
    existing.value = value;
  } else {
    items.push({ type: 'property', key, value });
  }
}

const withAndroidProps: ConfigPlugin<ResolvedPlatformOptions> = (config, { version, flavor }) => {
  return withGradleProperties(config, (config) => {
    upsertGradleProperty(config.modResults, 'expoYandexMapKit.version', version);
    upsertGradleProperty(config.modResults, 'expoYandexMapKit.flavor', flavor);

    // MapKit requires API 26 — raise the app's minSdkVersion if it is missing or lower,
    // but never lower an existing higher value.
    const minSdk = findGradleProperty(config.modResults, 'android.minSdkVersion');
    const currentMinSdk = minSdk ? parseInt(minSdk.value, 10) : NaN;
    if (Number.isNaN(currentMinSdk) || currentMinSdk < MIN_SDK_VERSION) {
      upsertGradleProperty(config.modResults, 'android.minSdkVersion', String(MIN_SDK_VERSION));
    }

    return config;
  });
};

// Optional build-time API key / locale → AndroidManifest <meta-data>. The native module reads
// them in OnCreate and initializes MapKit automatically, so an app that sets `apiKey` here never
// has to call initialize(apiKey) from JS. Injects nothing when both are absent, leaving the
// runtime path untouched. addMetaDataItemToMainApplication upserts by name, so re-runs (prebuild
// is not clean by default) do not duplicate the entries.
const withAndroidApiKey: ConfigPlugin<ResolvedPlatformOptions> = (config, { apiKey, locale }) => {
  if (apiKey === undefined && locale === undefined) {
    return config;
  }
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    if (apiKey !== undefined) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApplication,
        ANDROID_API_KEY_METADATA,
        apiKey
      );
    }
    if (locale !== undefined) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApplication,
        ANDROID_LOCALE_METADATA,
        locale
      );
    }
    return config;
  });
};

const withIosProps: ConfigPlugin<ResolvedPlatformOptions> = (config, { version, flavor }) => {
  return withPodfileProperties(config, (config) => {
    // The ExpoYandexMapKit.podspec reads these keys from Podfile.properties.json.
    config.modResults['expoYandexMapKit.version'] = version;
    config.modResults['expoYandexMapKit.flavor'] = flavor;

    // MapKit requires iOS 16.4 (see the podspec's platform). Raise the app's iOS
    // deployment target if it is missing or lower — Expo's Podfile and prebuild
    // both read this key — but never lower an existing higher value. Without this,
    // `pod install` fails on SDKs whose default target is below 16.4 (e.g. SDK 55/56).
    if (isBelowIosTarget(config.modResults['ios.deploymentTarget'], MIN_IOS_DEPLOYMENT_TARGET)) {
      config.modResults['ios.deploymentTarget'] = MIN_IOS_DEPLOYMENT_TARGET;
    }
    return config;
  });
};

// Optional build-time API key / locale → iOS Info.plist. The native module reads them in
// OnCreate and initializes MapKit automatically. Injects nothing when both are absent.
const withIosApiKey: ConfigPlugin<ResolvedPlatformOptions> = (config, { apiKey, locale }) => {
  if (apiKey === undefined && locale === undefined) {
    return config;
  }
  return withInfoPlist(config, (config) => {
    if (apiKey !== undefined) {
      config.modResults[IOS_API_KEY_INFO_PLIST_KEY] = apiKey;
    }
    if (locale !== undefined) {
      config.modResults[IOS_LOCALE_INFO_PLIST_KEY] = locale;
    }
    return config;
  });
};

// A concrete numeric iOS version like "16.4" or "26" — used to tell a real deployment
// target apart from an xcconfig macro such as "$(inherited)" or a blank/omitted value.
const IOS_VERSION_PATTERN = /^\d+(\.\d+)*$/;

// Xcode build settings resolve hierarchically: a target's build configuration inherits
// from the project-level configuration of the same name (Debug/Release/…) when it does not
// set the value itself. This collects the project-level iOS deployment targets by name so
// an omitting target config can be floored without lowering a higher inherited value.
function collectProjectDeploymentTargets(
  project: {
    getFirstProject(): { firstProject?: { buildConfigurationList?: string } };
    pbxXCConfigurationList(): Record<
      string,
      { buildConfigurations?: { value: string }[] } | undefined
    >;
  },
  buildConfigs: Record<string, unknown>
): Map<string, string> {
  const byName = new Map<string, string>();
  const listUuid = project.getFirstProject().firstProject?.buildConfigurationList;
  const list = listUuid ? project.pbxXCConfigurationList()[listUuid] : undefined;
  for (const ref of list?.buildConfigurations ?? []) {
    const cfg = buildConfigs[ref.value] as
      { name?: string; buildSettings?: Record<string, string> } | undefined;
    const raw = cfg?.buildSettings?.IPHONEOS_DEPLOYMENT_TARGET;
    if (cfg?.name === undefined || raw === undefined) continue;
    const value = String(raw).replace(/"/g, '').trim();
    if (IOS_VERSION_PATTERN.test(value)) byName.set(cfg.name, value);
  }
  return byName;
}

// Setting `ios.deploymentTarget` in Podfile.properties.json only drives the Podfile's
// `platform :ios`. Expo's prebuild does not sync it into the Xcode project, so the app
// target keeps the SDK template default (15.1 on SDK 55/56) — which then fails to build
// against the iOS 16.4 MapKit static framework. Floor the Xcode build configurations,
// raise-only:
//   - a concrete numeric target below 16.4 is raised to 16.4;
//   - an at-or-above value, or an xcconfig macro / "$(inherited)", is left untouched;
//   - a config that omits the key is floored only when the value it would inherit from its
//     project-level counterpart is itself missing or below 16.4, so an omitting config that
//     inherits a higher target is never lowered.
const withIosDeploymentTarget: ConfigPlugin = (config) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const buildConfigs = project.pbxXCBuildConfigurationSection();
    const projectTargets = collectProjectDeploymentTargets(project, buildConfigs);

    for (const entry of Object.values(buildConfigs)) {
      const buildSettings = (entry as { buildSettings?: Record<string, string> }).buildSettings;
      if (!buildSettings) continue;
      const raw = buildSettings.IPHONEOS_DEPLOYMENT_TARGET;

      if (raw === undefined) {
        const name = (entry as { name?: string }).name;
        const inherited = name === undefined ? undefined : projectTargets.get(name);
        if (isBelowIosTarget(inherited, MIN_IOS_DEPLOYMENT_TARGET)) {
          buildSettings.IPHONEOS_DEPLOYMENT_TARGET = MIN_IOS_DEPLOYMENT_TARGET;
        }
        continue;
      }

      const value = String(raw).replace(/"/g, '').trim();
      if (!IOS_VERSION_PATTERN.test(value)) continue; // macro / "$(inherited)" — leave inheritance intact
      if (isBelowIosTarget(value, MIN_IOS_DEPLOYMENT_TARGET)) {
        buildSettings.IPHONEOS_DEPLOYMENT_TARGET = MIN_IOS_DEPLOYMENT_TARGET;
      }
    }
    return config;
  });
};

const withExpoYandexMapKit: ConfigPlugin<ExpoYandexMapKitPluginProps | undefined> = (
  config,
  props = {}
) => {
  validateProps(props);
  const android = resolvePlatformOptions(props, 'android');
  const ios = resolvePlatformOptions(props, 'ios');
  config = withAndroidProps(config, android);
  config = withAndroidApiKey(config, android);
  config = withIosProps(config, ios);
  config = withIosApiKey(config, ios);
  config = withIosDeploymentTarget(config);
  return config;
};

export default createRunOncePlugin(withExpoYandexMapKit, 'expo-yandex-mapkit');
