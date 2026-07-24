import ExpoModulesCore
import YandexMapsMobile

// The `cameraPosition` prop shape. Mirrors the JS `CameraPosition` type.
internal struct CameraPositionRecord: Record {
  @Field var latitude: Double = 0
  @Field var longitude: Double = 0
  @Field var zoom: Double = 0
  @Field var azimuth: Double = 0
  @Field var tilt: Double = 0
}

// The `mapType` prop options. Mirrors the JS `mapType` union; mapped to `YMKMapType`.
internal enum MapTypeOption: String, Enumerable {
  case none
  case map
  case satellite
  case hybrid
  case vector

  var ymkValue: YMKMapType {
    switch self {
    case .none: return YMKMapType.none
    case .map: return YMKMapType.map
    case .satellite: return YMKMapType.satellite
    case .hybrid: return YMKMapType.hybrid
    case .vector: return YMKMapType.vectorMap
    }
  }
}

// The `logoPosition` prop shape: where the mandatory Yandex logo sits in the map.
internal enum LogoHorizontalOption: String, Enumerable {
  case left
  case center
  case right

  var ymkValue: YMKLogoHorizontalAlignment {
    switch self {
    case .left: return .left
    case .center: return .center
    case .right: return .right
    }
  }
}

internal enum LogoVerticalOption: String, Enumerable {
  case top
  case bottom

  var ymkValue: YMKLogoVerticalAlignment {
    switch self {
    case .top: return .top
    case .bottom: return .bottom
    }
  }
}

internal struct LogoPositionRecord: Record {
  @Field var horizontal: LogoHorizontalOption = .right
  @Field var vertical: LogoVerticalOption = .bottom
}

// Logo padding in points from the aligned edges. Negative values are clamped to 0.
internal struct LogoPaddingRecord: Record {
  @Field var horizontal: Double = 0
  @Field var vertical: Double = 0
}

// A geographic coordinate argument for getScreenPoints().
internal struct PointRecord: Record {
  @Field var latitude: Double = 0
  @Field var longitude: Double = 0
}

// A screen coordinate (in points) argument for getWorldPoints().
internal struct ScreenPointRecord: Record {
  @Field var x: Double = 0
  @Field var y: Double = 0
}

internal enum CameraAnimationOption: String, Enumerable {
  case smooth
  case linear

  var ymkValue: YMKAnimationType {
    switch self {
    case .smooth: return .smooth
    case .linear: return .linear
    }
  }
}

// Options for the imperative setCenter() move.
internal struct CameraMoveOptionsRecord: Record {
  @Field var durationSeconds: Double = 0.3
  @Field var animation: CameraAnimationOption = .smooth
}

// This view will be used as a native component. Make sure to inherit from `ExpoView`
// to apply the proper styling (e.g. border radius and shadows).
class ExpoYandexMapKitView: ExpoView {
  // Declarative camera moves are skipped when the target equals the current
  // camera position within this tolerance, to avoid prop-update feedback loops.
  private static let tolerance = 1e-6

  // Views that made it into a window. Iterated by the module when
  // `initialize(apiKey)` resolves, so views mounted before initialization can
  // recover instead of staying empty. Main-thread only — views register in
  // `didMoveToWindow` and `initialize` runs on the `.main` queue.
  private static let liveViews = NSHashTable<ExpoYandexMapKitView>.weakObjects()

  static func notifyMapKitInitialized() {
    for view in liveViews.allObjects {
      view.onMapKitInitialized()
    }
  }

  let onMapReady = EventDispatcher()
  let onCameraPositionChanged = EventDispatcher()
  let onMapPress = EventDispatcher()
  let onMapLongPress = EventDispatcher()

  var animated = true

  private var mapView: YMKMapView?
  // MapKit holds weak references to its listeners — they MUST stay strongly
  // retained here, or callbacks silently stop.
  private var cameraListener: CameraListener?
  private var inputListener: InputListener?
  private var pendingCameraPosition: CameraPositionRecord?
  private var nightMode = false
  // Gesture toggles default to MapKit's own defaults (all enabled). Stored so a
  // value set before the map exists is applied on map creation, mirroring nightMode.
  private var scrollGesturesEnabled = true
  private var zoomGesturesEnabled = true
  private var tiltGesturesEnabled = true
  private var rotateGesturesEnabled = true
  private var fastTapEnabled = true
  // Master override: when true, all four movement gestures are forced off regardless
  // of the individual toggles above.
  private var interactiveDisabled = false
  // mapType and mapStyle are nil until explicitly set, so an unset value never overrides
  // MapKit's own default (the vector scheme map — the only base layer that honours mapStyle;
  // `.map`/satellite/hybrid are raster and ignore styling).
  private var mapType: YMKMapType?
  private var mapStyle: String?
  // Logo placement is nil until first set; a never-set value keeps MapKit's default. Once set,
  // the value persists — passing undefined later does not revert it (matches mapType/mapStyle).
  private var logoPosition: LogoPositionRecord?
  private var logoPadding: LogoPaddingRecord?
  private var mapReadyEmitted = false
  private var didWarnAboutMissingInit = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    createMapViewIfReady()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil {
      Self.liveViews.add(self)
      createMapViewIfReady()
      emitMapReadyIfNeeded()
    } else {
      Self.liveViews.remove(self)
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    mapView?.frame = bounds
  }

  // MARK: - Props

  func setCameraPosition(_ position: CameraPositionRecord) {
    // Only stash the value here — prop setters run in no particular order, so
    // `animated` may not be up to date yet. The move is applied after the whole
    // prop batch, in `applyPendingCameraPosition()` (`OnViewDidUpdateProps`).
    pendingCameraPosition = position
  }

  func applyPendingCameraPosition(allowAnimation: Bool = true) {
    // If the map does not exist yet, keep the value pending — it is applied on map creation.
    guard let map = mapView?.mapWindow.map, let position = pendingCameraPosition else {
      return
    }
    pendingCameraPosition = nil
    move(map, to: position, animated: allowAnimation && animated)
  }

  func setNightMode(_ enabled: Bool) {
    nightMode = enabled
    mapView?.mapWindow.map.isNightModeEnabled = enabled
  }

  func setScrollGesturesEnabled(_ enabled: Bool) {
    scrollGesturesEnabled = enabled
    applyGestureState()
  }

  func setZoomGesturesEnabled(_ enabled: Bool) {
    zoomGesturesEnabled = enabled
    applyGestureState()
  }

  func setTiltGesturesEnabled(_ enabled: Bool) {
    tiltGesturesEnabled = enabled
    applyGestureState()
  }

  func setRotateGesturesEnabled(_ enabled: Bool) {
    rotateGesturesEnabled = enabled
    applyGestureState()
  }

  func setInteractiveDisabled(_ disabled: Bool) {
    interactiveDisabled = disabled
    applyGestureState()
  }

  // Applies the effective movement-gesture state. Reads every stored value so the
  // result is order-independent within a prop batch: interactiveDisabled forces all
  // four off, otherwise each individual toggle applies.
  private func applyGestureState() {
    guard let map = mapView?.mapWindow.map else {
      return
    }
    let interactive = !interactiveDisabled
    map.isScrollGesturesEnabled = interactive && scrollGesturesEnabled
    map.isZoomGesturesEnabled = interactive && zoomGesturesEnabled
    map.isTiltGesturesEnabled = interactive && tiltGesturesEnabled
    map.isRotateGesturesEnabled = interactive && rotateGesturesEnabled
  }

  func setFastTapEnabled(_ enabled: Bool) {
    fastTapEnabled = enabled
    mapView?.mapWindow.map.isFastTapEnabled = enabled
  }

  func setMapType(_ type: YMKMapType) {
    mapType = type
    mapView?.mapWindow.map.mapType = type
  }

  func setMapStyle(_ style: String?) {
    mapStyle = style
    applyMapStyle(to: mapView?.mapWindow.map)
  }

  // Empty string clears the applied style; a non-empty string is a Yandex JSON style.
  // Both platforms clear via the same empty-string id-0 form (Android: setMapStyle("")).
  // setMapStyleWithStyle returns false only when the JSON is invalid.
  private func applyMapStyle(to map: YMKMap?) {
    guard let map = map, let style = mapStyle else {
      return
    }
    if style.isEmpty {
      _ = map.setMapStyleWithStyle("")
    } else if !map.setMapStyleWithStyle(style) {
      log.warn("expo-yandex-mapkit: mapStyle was rejected as invalid Yandex style JSON; it was not applied")
    }
  }

  func setLogoPosition(_ position: LogoPositionRecord?) {
    logoPosition = position
    applyLogo(to: mapView?.mapWindow.map)
  }

  func setLogoPadding(_ padding: LogoPaddingRecord?) {
    logoPadding = padding
    applyLogo(to: mapView?.mapWindow.map)
  }

  private func applyLogo(to map: YMKMap?) {
    guard let map = map else {
      return
    }
    if let position = logoPosition {
      map.logo.setAlignmentWith(YMKLogoAlignment(
        horizontalAlignment: position.horizontal.ymkValue,
        verticalAlignment: position.vertical.ymkValue
      ))
    }
    if let padding = logoPadding {
      map.logo.setPaddingWith(YMKLogoPadding(
        horizontalPadding: Self.logoPaddingValue(padding.horizontal),
        verticalPadding: Self.logoPaddingValue(padding.vertical)
      ))
    }
  }

  // Converts a JS padding number to MapKit's NSUInteger without crashing on NaN /
  // Infinity / out-of-range input. Matches Android's saturating
  // `Double.toInt().coerceAtLeast(0)`: NaN and negatives -> 0, values above Int32.max saturate.
  private static func logoPaddingValue(_ value: Double) -> UInt {
    if value.isNaN {
      return 0
    }
    return UInt(min(max(value, 0), Double(Int32.max)))
  }

  // MARK: - Imperative functions (called from JS via the view ref)

  func moveCamera(_ position: CameraPositionRecord, options: CameraMoveOptionsRecord) {
    guard let map = mapView?.mapWindow.map else {
      return
    }
    let target = YMKCameraPosition(
      target: YMKPoint(latitude: position.latitude, longitude: position.longitude),
      zoom: Float(position.zoom),
      azimuth: Float(position.azimuth),
      tilt: Float(position.tilt)
    )
    let duration = Float(max(0, options.durationSeconds))
    if duration > 0 {
      map.move(with: target, animation: YMKAnimation(type: options.animation.ymkValue, duration: duration))
    } else {
      map.move(with: target)
    }
  }

  func currentCameraPosition() -> [String: Any]? {
    guard let map = mapView?.mapWindow.map else {
      return nil
    }
    return cameraPositionPayload(map.cameraPosition)
  }

  func currentVisibleRegion() -> [String: Any]? {
    guard let region = mapView?.mapWindow.map.visibleRegion else {
      return nil
    }
    return [
      "topLeft": coordinatePayload(region.topLeft),
      "topRight": coordinatePayload(region.topRight),
      "bottomLeft": coordinatePayload(region.bottomLeft),
      "bottomRight": coordinatePayload(region.bottomRight),
    ]
  }

  // world -> screen. A point that cannot be projected (behind the camera / off the
  // globe) becomes NSNull, surfacing as `null` in the returned JS array.
  func screenPoints(forWorldPoints worldPoints: [PointRecord]) -> [Any] {
    guard let window = mapView?.mapWindow else {
      return worldPoints.map { _ in NSNull() }
    }
    return worldPoints.map { point in
      guard let screen = window.worldToScreen(
        withWorldPoint: YMKPoint(latitude: point.latitude, longitude: point.longitude)
      ) else {
        return NSNull()
      }
      return ["x": Double(screen.x), "y": Double(screen.y)]
    }
  }

  // screen -> world. An unprojectable screen point becomes NSNull (JS `null`).
  func worldPoints(forScreenPoints screenPoints: [ScreenPointRecord]) -> [Any] {
    guard let window = mapView?.mapWindow else {
      return screenPoints.map { _ in NSNull() }
    }
    return screenPoints.map { point in
      guard let world = window.screenToWorld(
        with: YMKScreenPoint(x: Float(point.x), y: Float(point.y))
      ) else {
        return NSNull()
      }
      return coordinatePayload(world)
    }
  }

  private func coordinatePayload(_ point: YMKPoint) -> [String: Any] {
    return ["latitude": point.latitude, "longitude": point.longitude]
  }

  private func cameraPositionPayload(_ cameraPosition: YMKCameraPosition) -> [String: Any] {
    return [
      "latitude": cameraPosition.target.latitude,
      "longitude": cameraPosition.target.longitude,
      "zoom": Double(cameraPosition.zoom),
      "azimuth": Double(cameraPosition.azimuth),
      "tilt": Double(cameraPosition.tilt),
    ]
  }

  // MARK: - Map creation

  private func createMapViewIfReady() {
    guard mapView == nil else {
      return
    }
    guard YandexMapKitState.isInitialized else {
      if !didWarnAboutMissingInit {
        didWarnAboutMissingInit = true
        log.warn(
          "expo-yandex-mapkit: YandexMapView was rendered before initialize(apiKey) resolved — " +
          "the map stays empty. Call initialize() and only render the map after it resolves."
        )
      }
      return
    }
    // YMKMapView's initializer is failable in the MapKit headers.
    guard let mapView = YMKMapView(frame: bounds) else {
      log.warn("expo-yandex-mapkit: YMKMapView could not be created")
      return
    }
    self.mapView = mapView
    addSubview(mapView)

    let map = mapView.mapWindow.map
    let cameraListener = CameraListener(view: self)
    let inputListener = InputListener(view: self)
    self.cameraListener = cameraListener
    self.inputListener = inputListener
    map.addCameraListener(with: cameraListener)
    map.addInputListener(with: inputListener)

    map.isNightModeEnabled = nightMode
    applyGestureState()
    map.isFastTapEnabled = fastTapEnabled
    if let mapType = mapType {
      map.mapType = mapType
    }
    applyMapStyle(to: map)
    applyLogo(to: map)
    // The initial camera position is applied instantly — the map has not been shown yet.
    applyPendingCameraPosition(allowAnimation: false)
  }

  // Called on the main thread by the module once `initialize(apiKey)` resolves,
  // so a view mounted before initialization creates its map and catches up.
  func onMapKitInitialized() {
    createMapViewIfReady()
    emitMapReadyIfNeeded()
  }

  // `onMapReady` must never be dispatched from `init`: expo-modules-core
  // installs the EventDispatcher handlers only after the view is constructed,
  // so an event emitted during `init` is silently dropped. Emit it from
  // `didMoveToWindow` / `onMapKitInitialized` instead, exactly once per view.
  private func emitMapReadyIfNeeded() {
    guard mapView != nil, !mapReadyEmitted else {
      return
    }
    mapReadyEmitted = true
    onMapReady()
  }

  // MARK: - Camera

  private func move(_ map: YMKMap, to position: CameraPositionRecord, animated: Bool) {
    let target = YMKCameraPosition(
      target: YMKPoint(latitude: position.latitude, longitude: position.longitude),
      zoom: Float(position.zoom),
      azimuth: Float(position.azimuth),
      tilt: Float(position.tilt)
    )
    if isCurrentCameraPosition(map, target) {
      return
    }
    let duration: Float = animated ? 0.3 : 0.0
    map.move(with: target, animation: YMKAnimation(type: .smooth, duration: duration))
  }

  private func isCurrentCameraPosition(_ map: YMKMap, _ position: YMKCameraPosition) -> Bool {
    let current = map.cameraPosition
    return abs(current.target.latitude - position.target.latitude) < Self.tolerance
      && abs(current.target.longitude - position.target.longitude) < Self.tolerance
      && abs(Double(current.zoom) - Double(position.zoom)) < Self.tolerance
      && abs(Double(current.azimuth) - Double(position.azimuth)) < Self.tolerance
      && abs(Double(current.tilt) - Double(position.tilt)) < Self.tolerance
  }

  // MARK: - Event dispatching

  fileprivate func dispatchCameraPositionChanged(
    _ cameraPosition: YMKCameraPosition,
    reason: YMKCameraUpdateReason,
    finished: Bool
  ) {
    onCameraPositionChanged([
      "cameraPosition": [
        "latitude": cameraPosition.target.latitude,
        "longitude": cameraPosition.target.longitude,
        "zoom": Double(cameraPosition.zoom),
        "azimuth": Double(cameraPosition.azimuth),
        "tilt": Double(cameraPosition.tilt),
      ],
      "reason": reason == .gestures ? "gestures" : "application",
      "finished": finished,
    ])
  }

  fileprivate func dispatchMapPress(_ point: YMKPoint) {
    onMapPress(pointPayload(point))
  }

  fileprivate func dispatchMapLongPress(_ point: YMKPoint) {
    onMapLongPress(pointPayload(point))
  }

  private func pointPayload(_ point: YMKPoint) -> [String: Any] {
    return [
      "point": [
        "latitude": point.latitude,
        "longitude": point.longitude,
      ],
    ]
  }
}

// MARK: - Listeners

// MapKit's listener protocols are Objective-C protocols, so the conforming
// classes must inherit from `NSObject`.

private final class CameraListener: NSObject, YMKMapCameraListener {
  private weak var view: ExpoYandexMapKitView?

  init(view: ExpoYandexMapKitView) {
    self.view = view
  }

  func onCameraPositionChanged(
    with map: YMKMap,
    cameraPosition: YMKCameraPosition,
    cameraUpdateReason: YMKCameraUpdateReason,
    finished: Bool
  ) {
    view?.dispatchCameraPositionChanged(cameraPosition, reason: cameraUpdateReason, finished: finished)
  }
}

private final class InputListener: NSObject, YMKMapInputListener {
  private weak var view: ExpoYandexMapKitView?

  init(view: ExpoYandexMapKitView) {
    self.view = view
  }

  func onMapTap(with map: YMKMap, point: YMKPoint) {
    view?.dispatchMapPress(point)
  }

  func onMapLongTap(with map: YMKMap, point: YMKPoint) {
    view?.dispatchMapLongPress(point)
  }
}
