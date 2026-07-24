import ExpoModulesCore
import YandexMapsMobile

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

    AsyncFunction("initialize") { (apiKey: String) in
      if let currentApiKey = YandexMapKitState.apiKey {
        if currentApiKey != apiKey {
          throw YandexMapKitReinitException()
        }
        // Idempotent: initializing again with the same key is a no-op.
        return
      }
      YMKMapKit.setApiKey(apiKey)
      // MapKit is created outside of `application(_:didFinishLaunchingWithOptions:)`,
      // so `onStart()` must be called explicitly (see yandex/mapkit-ios-demo).
      YMKMapKit.sharedInstance().onStart()
      YandexMapKitState.apiKey = apiKey
      // Let views that were mounted before initialization create their map now.
      ExpoYandexMapKitView.notifyMapKitInitialized()
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

      Prop("scrollGesturesEnabled") { (view: ExpoYandexMapKitView, enabled: Bool) in
        view.setScrollGesturesEnabled(enabled)
      }

      Prop("zoomGesturesEnabled") { (view: ExpoYandexMapKitView, enabled: Bool) in
        view.setZoomGesturesEnabled(enabled)
      }

      Prop("tiltGesturesEnabled") { (view: ExpoYandexMapKitView, enabled: Bool) in
        view.setTiltGesturesEnabled(enabled)
      }

      Prop("rotateGesturesEnabled") { (view: ExpoYandexMapKitView, enabled: Bool) in
        view.setRotateGesturesEnabled(enabled)
      }

      Prop("fastTapEnabled") { (view: ExpoYandexMapKitView, enabled: Bool) in
        view.setFastTapEnabled(enabled)
      }

      OnViewDidUpdateProps { (view: ExpoYandexMapKitView) in
        view.applyPendingCameraPosition()
      }
    }
  }
}
