require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

# Yandex MapKit version/flavor resolution order:
#   1. ENV `EXPO_YANDEX_MAPKIT_VERSION` / `EXPO_YANDEX_MAPKIT_FLAVOR` (bare React Native escape hatch),
#   2. the app's `Podfile.properties.json` keys `expoYandexMapKit.version` / `expoYandexMapKit.flavor`
#      (written by the config plugin),
#   3. defaults `4.42.0` / `lite` — keep in sync with plugin/src/index.ts and android/build.gradle.
podfile_properties = begin
  JSON.parse(File.read(File.join(Pod::Config.instance.installation_root.to_s, 'Podfile.properties.json')))
rescue
  {}
end

mapkit_version = ENV['EXPO_YANDEX_MAPKIT_VERSION'] || podfile_properties['expoYandexMapKit.version'] || '4.42.0'
mapkit_flavor  = ENV['EXPO_YANDEX_MAPKIT_FLAVOR']  || podfile_properties['expoYandexMapKit.flavor']  || 'lite'

Pod::Spec.new do |s|
  s.name           = 'ExpoYandexMapKit'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = {
    :ios => '16.4'
  }
  # package.json's repository may be a plain URL string or a { type, url } object.
  repository_url = package['repository'].is_a?(Hash) ? package['repository']['url'] : package['repository']
  s.source         = { git: repository_url }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'YandexMapsMobile', "#{mapkit_version}-#{mapkit_flavor}"

  # Swift/Objective-C compatibility. When the full flavor is selected, define the YANDEX_MAPS_FULL
  # Swift compilation condition so the full-only Search/Suggest/Routing code (guarded with
  # `#if YANDEX_MAPS_FULL`) compiles — it references classes the lite pod does not ship, so it must
  # stay out of the lite compile entirely.
  xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }
  if mapkit_flavor == 'full'
    xcconfig['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] = '$(inherited) YANDEX_MAPS_FULL'
  end
  s.pod_target_xcconfig = xcconfig

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
