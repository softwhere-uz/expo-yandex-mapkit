import {
  AndroidConfig,
  ConfigPlugin,
  createRunOncePlugin,
  withGradleProperties,
  withPodfileProperties,
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
  return config;
};

export default createRunOncePlugin(withExpoYandexMapKit, 'expo-yandex-mapkit');
