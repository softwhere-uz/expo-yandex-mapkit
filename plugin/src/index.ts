import {
  AndroidConfig,
  ConfigPlugin,
  createRunOncePlugin,
  withGradleProperties,
  withPodfileProperties,
  withXcodeProject,
} from 'expo/config-plugins';

type PropertiesItem = AndroidConfig.Properties.PropertiesItem;

type FlavorOptions = {
  version?: string;
  flavor?: 'lite' | 'full';
};

export type ExpoYandexMapKitPluginProps = FlavorOptions & {
  android?: FlavorOptions;
  ios?: FlavorOptions;
};

// Default MapKit pin — keep in sync with android/build.gradle and ios/ExpoYandexMapKit.podspec.
const DEFAULT_VERSION = '4.42.0';
const DEFAULT_FLAVOR = 'lite';
// MapKit requires Android API 26+.
const MIN_SDK_VERSION = 26;
// MapKit requires iOS 16.4+ — keep in sync with ios/ExpoYandexMapKit.podspec's platform.
const MIN_IOS_DEPLOYMENT_TARGET = '16.4';

const VALID_FLAVORS = ['lite', 'full'];
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function validateFlavorOptions(options: FlavorOptions, scope: string): void {
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
}

function validateProps(props: ExpoYandexMapKitPluginProps): void {
  validateFlavorOptions(props, '');
  validateFlavorOptions(props.android ?? {}, 'android.');
  validateFlavorOptions(props.ios ?? {}, 'ios.');
}

function resolvePlatformOptions(
  props: ExpoYandexMapKitPluginProps,
  platform: 'android' | 'ios'
): Required<FlavorOptions> {
  const override = props[platform] ?? {};
  return {
    version: override.version ?? props.version ?? DEFAULT_VERSION,
    flavor: override.flavor ?? props.flavor ?? DEFAULT_FLAVOR,
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

const withAndroidProps: ConfigPlugin<Required<FlavorOptions>> = (config, { version, flavor }) => {
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

const withIosProps: ConfigPlugin<Required<FlavorOptions>> = (config, { version, flavor }) => {
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
  config = withAndroidProps(config, resolvePlatformOptions(props, 'android'));
  config = withIosProps(config, resolvePlatformOptions(props, 'ios'));
  config = withIosDeploymentTarget(config);
  return config;
};

export default createRunOncePlugin(withExpoYandexMapKit, 'expo-yandex-mapkit');
