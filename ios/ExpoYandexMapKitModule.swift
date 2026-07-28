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

    // Runtime locale via the SDK's i18n manager (setLocaleWithLocale: / getLocale), matching
    // react-native-yamap-plus; resetLocale passes nil. Locale ops touch global i18n state, so they
    // run on the main queue. SDK caveat: on iOS this only takes effect if set before the first map.
    AsyncFunction("setLocale") { (locale: String) in
      YRTI18nManagerFactory.setLocaleWithLocale(locale)
    }.runOnQueue(.main)

    AsyncFunction("getLocale") { () -> String? in
      YRTI18nManagerFactory.getLocale()
    }.runOnQueue(.main)

    AsyncFunction("resetLocale") {
      YRTI18nManagerFactory.setLocaleWithLocale(nil)
    }.runOnQueue(.main)

    View(ExpoYandexMapKitView.self) {
      Events(
        "onMapReady", "onCameraPositionChanged", "onMapPress", "onMapLongPress", "onMapLoaded",
        "onPoiTap")

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

      Prop("minZoom") { (view: ExpoYandexMapKitView, zoom: Double?) in
        view.setMinZoom(zoom)
      }

      Prop("maxZoom") { (view: ExpoYandexMapKitView, zoom: Double?) in
        view.setMaxZoom(zoom)
      }

      Prop("interactiveDisabled") { (view: ExpoYandexMapKitView, disabled: Bool) in
        view.setInteractiveDisabled(disabled)
      }

      Prop("mapType") { (view: ExpoYandexMapKitView, mapType: MapTypeOption) in
        view.setMapType(mapType.ymkValue)
      }

      Prop("mapStyle") { (view: ExpoYandexMapKitView, mapStyle: String?) in
        view.setMapStyle(mapStyle)
      }

      Prop("logoPosition") { (view: ExpoYandexMapKitView, logoPosition: LogoPositionRecord?) in
        view.setLogoPosition(logoPosition)
      }

      Prop("logoPadding") { (view: ExpoYandexMapKitView, logoPadding: LogoPaddingRecord?) in
        view.setLogoPadding(logoPadding)
      }

      Prop("mapPadding") { (view: ExpoYandexMapKitView, mapPadding: EdgePaddingRecord?) in
        view.setMapPadding(mapPadding)
      }

      Prop("showUserPosition") { (view: ExpoYandexMapKitView, show: Bool) in
        view.setShowUserPosition(show)
      }

      Prop("followUser") { (view: ExpoYandexMapKitView, follow: Bool) in
        view.setFollowUser(follow)
      }

      // Custom user-location dot styling. The icon arrives as the resolved URI string (the marker
      // convention); accuracy-circle colors arrive as processColor()'d values (Expo → UIColor).
      Prop("userLocationIcon") { (view: ExpoYandexMapKitView, uri: String?) in
        view.setUserLocationIcon(uri)
      }

      Prop("userLocationIconScale") { (view: ExpoYandexMapKitView, scale: Double) in
        view.setUserLocationIconScale(scale)
      }

      Prop("userLocationAccuracyFillColor") { (view: ExpoYandexMapKitView, color: UIColor?) in
        view.setUserLocationAccuracyFillColor(color)
      }

      Prop("userLocationAccuracyStrokeColor") { (view: ExpoYandexMapKitView, color: UIColor?) in
        view.setUserLocationAccuracyStrokeColor(color)
      }

      Prop("userLocationAccuracyStrokeWidth") { (view: ExpoYandexMapKitView, width: Double) in
        view.setUserLocationAccuracyStrokeWidth(width)
      }

      Prop("trafficVisible") { (view: ExpoYandexMapKitView, visible: Bool) in
        view.setTrafficVisible(visible)
      }

      OnViewDidUpdateProps { (view: ExpoYandexMapKitView) in
        view.applyPendingCameraPosition()
      }

      AsyncFunction("setCenter") { (view: ExpoYandexMapKitView, position: CameraPositionRecord, options: CameraMoveOptionsRecord) in
        view.moveCamera(position, options: options)
      }

      AsyncFunction("setZoom") { (view: ExpoYandexMapKitView, zoom: Double, options: CameraMoveOptionsRecord) in
        view.setZoom(zoom, options: options)
      }

      AsyncFunction("fitMarkers") { (view: ExpoYandexMapKitView, points: [PointRecord], options: CameraMoveOptionsRecord) in
        view.fitMarkers(points, options: options)
      }

      AsyncFunction("fitAllMarkers") { (view: ExpoYandexMapKitView, options: CameraMoveOptionsRecord) in
        view.fitAllMarkers(options)
      }

      AsyncFunction("getCameraPosition") { (view: ExpoYandexMapKitView) -> [String: Any]? in
        view.currentCameraPosition()
      }

      AsyncFunction("getVisibleRegion") { (view: ExpoYandexMapKitView) -> [String: Any]? in
        view.currentVisibleRegion()
      }

      AsyncFunction("getScreenPoints") { (view: ExpoYandexMapKitView, points: [PointRecord]) -> [Any] in
        view.screenPoints(forWorldPoints: points)
      }

      AsyncFunction("getWorldPoints") { (view: ExpoYandexMapKitView, points: [ScreenPointRecord]) -> [Any] in
        view.worldPoints(forScreenPoints: points)
      }

      // Selection mutates the map layer state, so run on the main queue (Expo runs AsyncFunctions
      // off-main by default).
      AsyncFunction("selectGeoObject") { (view: ExpoYandexMapKitView, selection: GeoObjectSelectionRecord) in
        view.selectGeoObject(selection)
      }.runOnQueue(.main)

      AsyncFunction("deselectGeoObject") { (view: ExpoYandexMapKitView) in
        view.deselectGeoObject()
      }.runOnQueue(.main)
    }

    // The <Marker> child view. Named via ViewName (the iOS view-builder element — the top-level
    // Name() factory is not valid inside a View {} block), so it is required as
    // requireNativeView('ExpoYandexMapKit', 'ExpoYandexMapKitMarkerView'); the unnamed map view
    // above stays the module's default view.
    View(ExpoYandexMapKitMarkerView.self) {
      ViewName("ExpoYandexMapKitMarkerView")
      Events("onMarkerPress", "onMarkerDragStart", "onMarkerDrag", "onMarkerDragEnd")

      Prop("point") { (view: ExpoYandexMapKitMarkerView, point: PointRecord) in
        view.setPoint(point)
      }

      Prop("source") { (view: ExpoYandexMapKitMarkerView, source: String?) in
        view.setIconSource(source)
      }

      Prop("scale") { (view: ExpoYandexMapKitMarkerView, scale: Double) in
        view.setScale(scale)
      }

      Prop("anchor") { (view: ExpoYandexMapKitMarkerView, anchor: MarkerAnchorRecord?) in
        view.setAnchor(anchor)
      }

      Prop("visible") { (view: ExpoYandexMapKitMarkerView, visible: Bool) in
        view.setVisible(visible)
      }

      Prop("zI") { (view: ExpoYandexMapKitMarkerView, zIndex: Double) in
        view.setZIndexValue(zIndex)
      }

      Prop("rotated") { (view: ExpoYandexMapKitMarkerView, rotated: Bool) in
        view.setRotated(rotated)
      }

      Prop("handled") { (view: ExpoYandexMapKitMarkerView, handled: Bool) in
        view.setHandled(handled)
      }

      Prop("identifier") { (view: ExpoYandexMapKitMarkerView, identifier: String?) in
        view.setIdentifier(identifier)
      }

      Prop("draggable") { (view: ExpoYandexMapKitMarkerView, draggable: Bool) in
        view.setDraggable(draggable)
      }

      Prop("tracksViewChanges") { (view: ExpoYandexMapKitMarkerView, tracks: Bool) in
        view.setTracksViewChanges(tracks)
      }

      Prop("excludeFromCluster") { (view: ExpoYandexMapKitMarkerView, exclude: Bool) in
        view.setExcludeFromCluster(exclude)
      }

      // Run on the main queue so the placemark is only ever touched on main (Expo runs
      // AsyncFunctions off-main by default; the animation's first frame is applied synchronously).
      AsyncFunction("animatedMoveTo") { (view: ExpoYandexMapKitMarkerView, point: PointRecord, durationMs: Double) in
        view.animatedMoveTo(
          YMKPoint(latitude: point.latitude, longitude: point.longitude), durationMs: durationMs)
      }.runOnQueue(.main)

      AsyncFunction("animatedRotateTo") { (view: ExpoYandexMapKitMarkerView, angle: Double, durationMs: Double) in
        view.animatedRotateTo(angle, durationMs: durationMs)
      }.runOnQueue(.main)
    }

    // The <Clusterer> child view: groups its <Marker> children into a YMKClusterizedPlacemarkCollection.
    // Its markers arrive through the view's own Fabric child hooks (into the cluster collection), so no
    // extra child wiring is needed here. Colors arrive as processColor()'d values (Expo → UIColor).
    View(ExpoYandexMapKitClustererView.self) {
      ViewName("ExpoYandexMapKitClustererView")
      Events("onClusterPress")

      Prop("clusterRadius") { (view: ExpoYandexMapKitClustererView, radius: Double) in
        view.setClusterRadius(radius)
      }
      Prop("minZoom") { (view: ExpoYandexMapKitClustererView, zoom: Double) in
        view.setMinZoom(zoom)
      }
      Prop("clusterColor") { (view: ExpoYandexMapKitClustererView, color: UIColor?) in
        view.setClusterColor(color)
      }
      Prop("clusterTextColor") { (view: ExpoYandexMapKitClustererView, color: UIColor?) in
        view.setClusterTextColor(color)
      }
      Prop("clusterTextSize") { (view: ExpoYandexMapKitClustererView, size: Double) in
        view.setClusterTextSize(size)
      }
      Prop("clusterSize") { (view: ExpoYandexMapKitClustererView, size: Double) in
        view.setClusterSize(size)
      }
      Prop("clusterIcon") { (view: ExpoYandexMapKitClustererView, uri: String?) in
        view.setClusterIcon(uri)
      }
      Prop("clusterTextOffset") { (view: ExpoYandexMapKitClustererView, offset: ClusterOffsetRecord?) in
        view.setClusterTextOffset(offset)
      }
      Prop("fitClusterOnPress") { (view: ExpoYandexMapKitClustererView, fit: Bool) in
        view.setFitOnPress(fit)
      }
    }

    // The <Polyline> child view. Colors arrive as processColor()'d values (Expo → UIColor).
    View(ExpoYandexMapKitPolylineView.self) {
      ViewName("ExpoYandexMapKitPolylineView")
      Events("onShapePress")

      Prop("points") { (view: ExpoYandexMapKitPolylineView, points: [PointRecord]) in
        view.setPoints(points)
      }
      Prop("strokeColor") { (view: ExpoYandexMapKitPolylineView, color: UIColor?) in
        view.setStrokeColor(color)
      }
      Prop("strokeWidth") { (view: ExpoYandexMapKitPolylineView, width: Double) in
        view.setStrokeWidth(width)
      }
      Prop("outlineColor") { (view: ExpoYandexMapKitPolylineView, color: UIColor?) in
        view.setOutlineColor(color)
      }
      Prop("outlineWidth") { (view: ExpoYandexMapKitPolylineView, width: Double) in
        view.setOutlineWidth(width)
      }
      Prop("dashLength") { (view: ExpoYandexMapKitPolylineView, v: Double) in
        view.setDashLength(v)
      }
      Prop("dashOffset") { (view: ExpoYandexMapKitPolylineView, v: Double) in
        view.setDashOffset(v)
      }
      Prop("gapLength") { (view: ExpoYandexMapKitPolylineView, v: Double) in
        view.setGapLength(v)
      }
      Prop("zI") { (view: ExpoYandexMapKitPolylineView, z: Double) in
        view.setZIndexValue(z)
      }
      Prop("handled") { (view: ExpoYandexMapKitPolylineView, h: Bool) in
        view.setHandled(h)
      }
    }

    // The <Polygon> child view.
    View(ExpoYandexMapKitPolygonView.self) {
      ViewName("ExpoYandexMapKitPolygonView")
      Events("onShapePress")

      Prop("points") { (view: ExpoYandexMapKitPolygonView, points: [PointRecord]) in
        view.setPoints(points)
      }
      Prop("innerRings") { (view: ExpoYandexMapKitPolygonView, rings: [[PointRecord]]) in
        view.setInnerRings(rings)
      }
      Prop("fillColor") { (view: ExpoYandexMapKitPolygonView, color: UIColor?) in
        view.setFillColor(color)
      }
      Prop("strokeColor") { (view: ExpoYandexMapKitPolygonView, color: UIColor?) in
        view.setStrokeColor(color)
      }
      Prop("strokeWidth") { (view: ExpoYandexMapKitPolygonView, w: Double) in
        view.setStrokeWidth(w)
      }
      Prop("zI") { (view: ExpoYandexMapKitPolygonView, z: Double) in view.setZIndexValue(z) }
      Prop("handled") { (view: ExpoYandexMapKitPolygonView, h: Bool) in view.setHandled(h) }
    }

    // The <Circle> child view.
    View(ExpoYandexMapKitCircleView.self) {
      ViewName("ExpoYandexMapKitCircleView")
      Events("onShapePress")

      Prop("center") { (view: ExpoYandexMapKitCircleView, c: PointRecord) in
        view.setCenter(c)
      }
      Prop("radius") { (view: ExpoYandexMapKitCircleView, r: Double) in view.setRadius(r) }
      Prop("fillColor") { (view: ExpoYandexMapKitCircleView, color: UIColor?) in
        view.setFillColor(color)
      }
      Prop("strokeColor") { (view: ExpoYandexMapKitCircleView, color: UIColor?) in
        view.setStrokeColor(color)
      }
      Prop("strokeWidth") { (view: ExpoYandexMapKitCircleView, w: Double) in
        view.setStrokeWidth(w)
      }
      Prop("zI") { (view: ExpoYandexMapKitCircleView, z: Double) in view.setZIndexValue(z) }
      Prop("handled") { (view: ExpoYandexMapKitCircleView, h: Bool) in view.setHandled(h) }
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
