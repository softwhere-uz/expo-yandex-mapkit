import ExpoModulesCore
import YandexMapsMobile

// Info.plist keys the config plugin writes the optional build-time API key / locale into. Keep in
// sync with plugin/src/index.ts (IOS_API_KEY_INFO_PLIST_KEY / IOS_LOCALE_INFO_PLIST_KEY);
// scripts/check-plugin.mjs asserts the two match.
private let infoPlistApiKey = "ExpoYandexMapKitApiKey"
private let infoPlistLocale = "ExpoYandexMapKitLocale"

// Shared MapKit initialization state. Views consult it to decide whether
// the underlying `YMKMapView` can be created yet. Only mutated on the main
// queue (`initialize` runs on `.main`).
internal enum YandexMapKitState {
  static var apiKey: String?

  static var isInitialized: Bool {
    apiKey != nil
  }
}

internal final class YandexMapKitReinitException: Exception {
  override var code: String {
    "ERR_YANDEX_MAPKIT_REINIT"
  }

  override var reason: String {
    "Yandex MapKit has already been initialized with a different API key — restart the app to use a new key"
  }
}

public class ExpoYandexMapKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoYandexMapKit")

    // If the config plugin wrote a build-time API key into Info.plist, initialize MapKit at
    // startup so the app never has to call initialize(apiKey) from JS (and cannot get the init
    // order wrong). Absent key → no-op and the runtime path is used instead. MapKit init and the
    // view-recovery broadcast must run on the main queue, matching the initialize() AsyncFunction.
    OnCreate {
      guard let apiKey = Self.infoPlistString(infoPlistApiKey) else {
        return
      }
      DispatchQueue.main.async {
        // First initializer, so a reinit conflict is only possible on a dev reload with a changed
        // key — log rather than crash the app.
        do {
          try Self.initializeMapKit(apiKey: apiKey)
        } catch {
          log.warn("expo-yandex-mapkit: failed to auto-initialize MapKit from Info.plist: \(error)")
        }
      }
    }

    AsyncFunction("initialize") { (apiKey: String) in
      try Self.initializeMapKit(apiKey: apiKey)
    }.runOnQueue(.main)

    View(ExpoYandexMapKitView.self) {
      Events("onMapReady", "onCameraPositionChanged", "onMapPress", "onMapLongPress")

      Prop("cameraPosition") { (view: ExpoYandexMapKitView, cameraPosition: CameraPositionRecord) in
        view.setCameraPosition(cameraPosition)
      }

      Prop("animated") { (view: ExpoYandexMapKitView, animated: Bool) in
        view.animated = animated
      }

      Prop("nightMode") { (view: ExpoYandexMapKitView, nightMode: Bool) in
        view.setNightMode(nightMode)
      }

      OnViewDidUpdateProps { (view: ExpoYandexMapKitView) in
        view.applyPendingCameraPosition()
      }
    }
  }

  // Shared initialization for both the JS initialize() call and the build-time auto-init. Must be
  // called on the main queue. Idempotent for the same key; a different key throws
  // YandexMapKitReinitException — the native SDK takes its key once. The idempotent/reinit check
  // runs before the Info.plist locale is read, so a repeat same-key call stays a cheap no-op.
  fileprivate static func initializeMapKit(apiKey: String) throws {
    if let currentApiKey = YandexMapKitState.apiKey {
      if currentApiKey != apiKey {
        throw YandexMapKitReinitException()
      }
      // Idempotent: initializing again with the same key is a no-op.
      return
    }
    YMKMapKit.setApiKey(apiKey)
    // A build-time locale (Info.plist, written by the config plugin) applies whether the key came
    // from Info.plist or from a runtime initialize(). Read it only here, on the one-time init path,
    // and set it before sharedInstance() so it takes effect. infoPlistString returns nil for blank.
    if let locale = infoPlistString(infoPlistLocale) {
      YMKMapKit.setLocale(locale)
    }
    // MapKit is created outside of `application(_:didFinishLaunchingWithOptions:)`,
    // so `onStart()` must be called explicitly (see yandex/mapkit-ios-demo).
    YMKMapKit.sharedInstance().onStart()
    YandexMapKitState.apiKey = apiKey
    // Let views that were mounted before initialization create their map now.
    ExpoYandexMapKitView.notifyMapKitInitialized()
  }

  // A trimmed, non-empty Info.plist string for `key`, or nil when the key is absent/blank. Trimming
  // the returned value keeps a stray whitespace/newline out of setApiKey/setLocale.
  private static func infoPlistString(_ key: String) -> String? {
    guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else {
      return nil
    }
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }
}
