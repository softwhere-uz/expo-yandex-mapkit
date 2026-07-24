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
    let mapView = YMKMapView(frame: bounds)
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
