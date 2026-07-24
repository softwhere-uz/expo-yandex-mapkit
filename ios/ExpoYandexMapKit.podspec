require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

# Yandex MapKit version/flavor resolution order:
#   1. ENV `EXPO_YANDEX_MAPKIT_VERSION` / `EXPO_YANDEX_MAPKIT_FLAVOR` (bare React Native escape hatch),
#   2. the app's `Podfile.properties.json` keys `expoYandexMapKit.version` / `expoYandexMapKit.flavor`
#      (written by the config plugin),
#   3. defaults `4.42.0` / `lite`.
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
  s.source         = { git: package['repository'] }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'YandexMapsMobile', "#{mapkit_version}-#{mapkit_flavor}"

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
