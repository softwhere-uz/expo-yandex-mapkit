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

// The selection token for selectGeoObject(). Mirrors the JS `GeoObjectSelection` (the `selection`
// carried by an onPoiTap event); reconstructs a YMKGeoObjectSelectionMetadata to select the object.
internal struct GeoObjectSelectionRecord: Record {
  @Field var objectId: String = ""
  @Field var dataSourceName: String = ""
  @Field var layerId: String = ""
  @Field var groupId: Double?
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
// Edge insets (React Native points) used by fitMarkers / fitAllMarkers to keep content clear of the
// map edges; converted to pixels for the focus rect.
internal struct EdgePaddingRecord: Record {
  @Field var top: Double = 0
  @Field var right: Double = 0
  @Field var bottom: Double = 0
  @Field var left: Double = 0
}

internal struct CameraMoveOptionsRecord: Record {
  @Field var durationSeconds: Double = 0.3
  @Field var animation: CameraAnimationOption = .smooth
  // Only consulted by fitMarkers / fitAllMarkers; setCenter / setZoom ignore it.
  @Field var edgePadding: EdgePaddingRecord?
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
  let onMapLoaded = EventDispatcher()
  let onUserLocationChange = EventDispatcher()
  let onPoiTap = EventDispatcher()

  var animated = true

  private var mapView: YMKMapView?
  // MapKit holds weak references to its listeners — they MUST stay strongly
  // retained here, or callbacks silently stop.
  private var cameraListener: CameraListener?
  private var inputListener: InputListener?
  private var mapLoadedListener: MapLoadedListener?
  private var geoObjectTapListener: GeoObjectTapListener?
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
  // Camera zoom-bound hints, nil until set. Applied through the map's cameraBounds; a nil value
  // clears that bound back to MapKit's default.
  private var minZoom: Float?
  private var maxZoom: Float?
  // Persistent map-padding inset, applied as the map window's focus rectangle. nil = full viewport.
  // Kept so it can be re-applied when the view is (re)laid out, since the focus rect is in pixels.
  private var mapPadding: EdgePaddingRecord?
  private var mapReadyEmitted = false
  private var didWarnAboutMissingInit = false

  // Child <Marker> views in mount order. Managed through Fabric's mount/unmount child hooks rather
  // than the view hierarchy — markers own no UI, they drive placemarks. A marker mounted before the
  // map exists stays here un-attached and is wired up in createMapViewIfReady.
  private var childViews: [UIView] = []

  // User-location and traffic layers, created lazily on first use (they need the map window).
  private var userLocationLayer: YMKUserLocationLayer?
  private var trafficLayer: YMKTrafficLayer?
  private var showUserPosition = false
  private var followUser = false
  private var trafficVisible = false

  // Custom user-location dot styling. The YMKUserLocationView (pin/arrow/accuracy-circle) is handed
  // over by the object listener once the dot appears; it is kept so a later prop change can re-style
  // it. The listener is retained strongly here — MapKit holds it weakly (matches the map listeners).
  private var userLocationObjectListener: UserLocationObjectListener?
  private var userLocationView: YMKUserLocationView?
  private var userLocationIconSource: String?
  private var appliedUserLocationIconSource: String?
  private var userLocationIconImage: UIImage?
  private var userLocationIconScale: NSNumber = 1
  private var userLocationAccuracyFillColor: UIColor?
  private var userLocationAccuracyStrokeColor: UIColor?
  private var userLocationAccuracyStrokeWidth: Float?

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
    // The focus rect is in pixels and depends on the map size, so re-apply the map padding whenever
    // the view is (re)laid out — the first real size, a rotation, or a resized container.
    applyMapPadding()
  }

  // MARK: - Marker children

  // Fabric mounts <Marker> children here. They are not added to the view hierarchy — each drives a
  // MapKit placemark. Non-marker children (none expected) fall through to the default behaviour.
  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard childComponentView is MapObjectChild else {
      super.mountChildComponentView(childComponentView, index: index)
      return
    }
    let safeIndex = min(max(index, 0), childViews.count)
    childViews.insert(childComponentView, at: safeIndex)
    attachChild(childComponentView)
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard childComponentView is MapObjectChild else {
      super.unmountChildComponentView(childComponentView, index: index)
      return
    }
    if let idx = childViews.firstIndex(where: { $0 === childComponentView }) {
      childViews.remove(at: idx)
    }
    detachChild(childComponentView)
  }

  // Attach a child's map object to the collection. No-op if the map is not ready yet (the child
  // stays in the list and is attached later by attachPendingChildren) or already attached.
  private func attachChild(_ child: UIView) {
    guard let mapChild = child as? MapObjectChild, let collection = mapView?.mapWindow.map.mapObjects
    else {
      return
    }
    // A clusterer needs this map view to fit the camera on a cluster tap.
    (child as? ExpoYandexMapKitClustererView)?.ownerMapView = self
    guard !mapChild.isAttachedToMap else {
      return
    }
    mapChild.attachToMap(collection)
  }

  private func detachChild(_ child: UIView) {
    guard let mapChild = child as? MapObjectChild, let collection = mapView?.mapWindow.map.mapObjects
    else {
      return
    }
    mapChild.detachFromMap(collection)
    (child as? ExpoYandexMapKitClustererView)?.ownerMapView = nil
  }

  private func attachPendingChildren() {
    childViews.forEach { attachChild($0) }
  }

  // MARK: - User location & traffic

  func setShowUserPosition(_ value: Bool) {
    showUserPosition = value
    applyUserLocation()
  }

  func setFollowUser(_ value: Bool) {
    followUser = value
    applyUserLocation()
  }

  func setUserLocationIcon(_ uri: String?) {
    if uri != userLocationIconSource {
      userLocationIconSource = uri
      // The icon changed — drop the cached image so it (re)loads on the next style pass.
      appliedUserLocationIconSource = nil
      userLocationIconImage = nil
    }
    applyUserLocationStyle()
  }

  func setUserLocationIconScale(_ value: Double) {
    userLocationIconScale = NSNumber(value: value)
    applyUserLocationStyle()
  }

  func setUserLocationAccuracyFillColor(_ value: UIColor?) {
    userLocationAccuracyFillColor = value
    applyUserLocationStyle()
  }

  func setUserLocationAccuracyStrokeColor(_ value: UIColor?) {
    userLocationAccuracyStrokeColor = value
    applyUserLocationStyle()
  }

  func setUserLocationAccuracyStrokeWidth(_ value: Double) {
    userLocationAccuracyStrokeWidth = Float(value)
    applyUserLocationStyle()
  }

  func setTrafficVisible(_ value: Bool) {
    trafficVisible = value
    applyTraffic()
  }

  private func applyUserLocation() {
    guard let mapWindow = mapView?.mapWindow else {
      return
    }
    let layer: YMKUserLocationLayer
    if let existing = userLocationLayer {
      layer = existing
    } else {
      layer = YMKMapKit.sharedInstance().createUserLocationLayer(with: mapWindow)
      userLocationLayer = layer
      // MapKit holds the object listener weakly (matches the map listeners); the strong field keeps it.
      let listener = UserLocationObjectListener(view: self)
      userLocationObjectListener = listener
      layer.setObjectListenerWith(listener)
    }
    layer.setVisibleWithOn(showUserPosition)
    if showUserPosition, followUser, let mapView = mapView, mapView.bounds.width > 0 {
      // Anchoring the layer keeps the user dot centered — the map follows the user. The anchor is a
      // CGPoint in physical pixels (points × screen scale), not a YMKScreenPoint.
      let scale = UIScreen.main.scale
      let center = CGPoint(
        x: mapView.bounds.width * scale / 2, y: mapView.bounds.height * scale / 2)
      layer.setAnchorWithAnchorNormal(center, anchorCourse: center)
    } else {
      layer.resetAnchor()
    }
  }

  // Called by the object listener when the location dot appears or updates. Keeps the view so a later
  // prop change can re-style it, then applies the current icon + accuracy-circle styling.
  func onUserLocationObjectAvailable(_ view: YMKUserLocationView) {
    userLocationView = view
    applyUserLocationStyle()
    dispatchUserLocationChange(view)
  }

  // Emit onUserLocationChange with the dot's current coordinate + accuracy. Called when the location
  // dot first appears and on every position/heading update (from the object listener) — so it never
  // fires from a prop-driven style pass, only on a real location change. The pin's geometry is the
  // device coordinate; the accuracy circle's radius is the horizontal accuracy in metres.
  private func dispatchUserLocationChange(_ view: YMKUserLocationView) {
    let point = view.pin.geometry
    onUserLocationChange([
      "point": ["latitude": point.latitude, "longitude": point.longitude],
      "accuracy": Double(view.accuracyCircle.geometry.radius),
    ])
  }

  func onUserLocationObjectRemoved(_ view: YMKUserLocationView) {
    if userLocationView === view {
      userLocationView = nil
    }
  }

  // Apply the custom icon + accuracy-circle styling to the current location dot. No-op until the dot
  // exists (the object listener hands over its YMKUserLocationView). Unset values leave MapKit's
  // defaults.
  private func applyUserLocationStyle() {
    guard let view = userLocationView else {
      return
    }
    let circle = view.accuracyCircle
    if let fill = userLocationAccuracyFillColor {
      circle.fillColor = fill
    }
    if let stroke = userLocationAccuracyStrokeColor {
      circle.strokeColor = stroke
    }
    if let width = userLocationAccuracyStrokeWidth {
      circle.strokeWidth = width
    }

    guard let source = userLocationIconSource, !source.isEmpty else {
      return
    }
    if let image = userLocationIconImage, source == appliedUserLocationIconSource {
      applyUserLocationIcon(view, image: image)
      return
    }
    if source == appliedUserLocationIconSource {
      // Same icon already loading — the load callback will apply it. Avoid a duplicate load.
      return
    }
    appliedUserLocationIconSource = source
    MarkerImageLoader.load(source) { [weak self] image in
      // Ignore a late load if the icon changed again meanwhile; re-read the view in case it changed.
      guard let self = self, let image = image, source == self.appliedUserLocationIconSource else {
        return
      }
      self.userLocationIconImage = image
      if let view = self.userLocationView {
        self.applyUserLocationIcon(view, image: image)
      }
    }
  }

  // Set the loaded image as the dot's icon on both the resting pin and the heading arrow, at the
  // configured scale, so the custom icon shows regardless of whether a heading is available.
  private func applyUserLocationIcon(_ view: YMKUserLocationView, image: UIImage) {
    let style = YMKIconStyle()
    style.scale = userLocationIconScale
    view.pin.setIconWith(image)
    view.pin.setIconStyleWith(style)
    view.arrow.setIconWith(image)
    view.arrow.setIconStyleWith(style)
  }

  private func applyTraffic() {
    guard let mapWindow = mapView?.mapWindow else {
      return
    }
    let layer: YMKTrafficLayer
    if let existing = trafficLayer {
      layer = existing
    } else {
      layer = YMKMapKit.sharedInstance().createTrafficLayer(with: mapWindow)
      trafficLayer = layer
    }
    layer.setTrafficVisibleWithOn(trafficVisible)
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

  func setMinZoom(_ zoom: Double?) {
    minZoom = zoom.map { Float($0) }
    applyZoomBounds()
  }

  func setMaxZoom(_ zoom: Double?) {
    maxZoom = zoom.map { Float($0) }
    applyZoomBounds()
  }

  // MapKit's cameraBounds exposes only a combined reset, so re-establish the full state each time:
  // reset both preferences, then re-apply whichever bound is set. This makes clearing one bound (its
  // prop set to undefined) restore MapKit's default for that bound while keeping the other.
  private func applyZoomBounds() {
    guard let bounds = mapView?.mapWindow.map.cameraBounds else {
      return
    }
    bounds.resetMinMaxZoomPreference()
    if let minZoom = minZoom {
      bounds.setMinZoomPreferenceWithZoom(minZoom)
    }
    if let maxZoom = maxZoom {
      bounds.setMaxZoomPreferenceWithZoom(maxZoom)
    }
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

  func setMapPadding(_ padding: EdgePaddingRecord?) {
    mapPadding = padding
    applyMapPadding()
  }

  // Apply the persistent map-padding inset as the map window's focus rectangle. Only touches the
  // focus rect when a padding is set — when nil, the focus rect is left alone (a fitMarkers call may
  // own it). The rect is in pixels, so this is re-run from layoutSubviews when the view is resized.
  private func applyMapPadding() {
    guard let mapWindow = mapView?.mapWindow, mapPadding != nil else {
      return
    }
    mapWindow.focusRect = focusRect(mapPadding)
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
    moveCamera(to: target, options: options, on: map)
  }

  func setZoom(_ zoom: Double, options: CameraMoveOptionsRecord) {
    guard let map = mapView?.mapWindow.map else {
      return
    }
    let current = map.cameraPosition
    let target = YMKCameraPosition(
      target: current.target,
      zoom: Float(zoom),
      azimuth: current.azimuth,
      tilt: current.tilt
    )
    moveCamera(to: target, options: options, on: map)
  }

  // Fit the camera so every point is visible. A single point just recenters at the
  // current zoom (a degenerate bounding box would otherwise snap to max zoom).
  func fitMarkers(_ points: [PointRecord], options: CameraMoveOptionsRecord) {
    guard let map = mapView?.mapWindow.map else {
      return
    }
    fitToPoints(
      points.map { YMKPoint(latitude: $0.latitude, longitude: $0.longitude) }, options: options,
      on: map)
  }

  // Fit every mounted <Marker> into view — direct children AND those inside a <Clusterer>. Reads the
  // markers' current geometry from the registry.
  func fitAllMarkers(_ options: CameraMoveOptionsRecord) {
    guard let map = mapView?.mapWindow.map else {
      return
    }
    let direct = childViews.compactMap { ($0 as? ExpoYandexMapKitMarkerView)?.geoPoint }
    let clustered = childViews.compactMap { $0 as? ExpoYandexMapKitClustererView }.flatMap { $0.markerGeoPoints }
    fitToPoints(direct + clustered, options: options, on: map)
  }

  // Fit the camera to a tapped cluster's placemarks. Reuses the fit-to-points path with default move
  // options (no edge padding). Called by a child <Clusterer> on a cluster tap.
  func fitToClusterPoints(_ points: [YMKPoint]) {
    guard let map = mapView?.mapWindow.map else {
      return
    }
    fitToPoints(points, options: CameraMoveOptionsRecord(), on: map)
  }

  // Move the camera so every point is visible, optionally inset by options.edgePadding. A single
  // point just recenters at the current zoom.
  private func fitToPoints(_ points: [YMKPoint], options: CameraMoveOptionsRecord, on map: YMKMap) {
    guard !points.isEmpty else {
      return
    }
    // iOS has no cameraPosition(geometry, focusRect, …) overload (unlike Android), so edge padding
    // is applied through the map window's focus rectangle instead: cameraPosition(with:) frames the
    // bounding box into the focusRect, and the focusRect also anchors where the camera target sits
    // on screen (so asymmetric padding — e.g. a bottom sheet — is honoured, not just centred). It is
    // set when padding is given and reset to the full window otherwise. It persists after the fit so
    // follow-up camera moves keep the same inset (content stays clear of the sheet) until the next
    // fit changes it. mapWindow may be nil before the map is ready — then there is nothing to fit.
    guard let mapWindow = mapView?.mapWindow else {
      return
    }
    // A fit with no edgePadding of its own falls back to the persistent mapPadding, so a fit never
    // silently discards the map's configured inset. An explicit edgePadding overrides it for this fit.
    mapWindow.focusRect = focusRect(options.edgePadding ?? mapPadding)
    let current = map.cameraPosition
    let target: YMKCameraPosition
    if points.count == 1 {
      target = YMKCameraPosition(
        target: points[0], zoom: current.zoom, azimuth: current.azimuth, tilt: current.tilt)
    } else {
      let latitudes = points.map { $0.latitude }
      let longitudes = points.map { $0.longitude }
      let boundingBox = YMKBoundingBox(
        southWest: YMKPoint(latitude: latitudes.min() ?? 0, longitude: longitudes.min() ?? 0),
        northEast: YMKPoint(latitude: latitudes.max() ?? 0, longitude: longitudes.max() ?? 0)
      )
      let geometry = YMKGeometry(boundingBox: boundingBox)
      target = map.cameraPosition(with: geometry)
    }
    moveCamera(to: target, options: options, on: map)
  }

  // The focus rectangle = the map's bounds inset by the edge padding, in physical pixels (the map's
  // screen coordinates are pixels, so the point-based padding and bounds are scaled by the screen
  // scale). Returns nil when there is no padding or the map has no size yet — nil resets the map
  // window to its full-viewport focus.
  private func focusRect(_ padding: EdgePaddingRecord?) -> YMKScreenRect? {
    guard let padding = padding, let mapView = mapView, let mapWindow = mapView.mapWindow else {
      return nil
    }
    // The focus rect lives in the map window's own physical-pixel space — use the window's reported
    // size, NOT UIScreen.scale × bounds, which can drift from it by several pixels (MapKit then rejects
    // the rect as "out of screen"). Convert the point-based padding with the window's true pixels/point.
    let width = Float(mapWindow.width())
    let height = Float(mapWindow.height())
    guard width > 0, height > 0 else {
      return nil
    }
    let viewWidth = Float(mapView.bounds.width)
    let scale = viewWidth > 0 ? width / viewWidth : Float(UIScreen.main.scale)
    // MapKit rejects a focusRect whose bottomRight corner sits on the window edge ("out of screen"),
    // so the right/bottom edge must stay strictly inside — clamp to width-1 / height-1 (as left/top
    // already are), and cap left/top at width-2 / height-2 so the rect never collapses (right > left).
    let left = min(max(Float(padding.left) * scale, 0), width - 2)
    let top = min(max(Float(padding.top) * scale, 0), height - 2)
    let right = min(max(width - Float(padding.right) * scale, left + 1), width - 1)
    let bottom = min(max(height - Float(padding.bottom) * scale, top + 1), height - 1)
    return YMKScreenRect(
      topLeft: YMKScreenPoint(x: left, y: top),
      bottomRight: YMKScreenPoint(x: right, y: bottom))
  }

  private func moveCamera(to target: YMKCameraPosition, options: CameraMoveOptionsRecord, on map: YMKMap) {
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

  // Capture the currently-rendered map as a base64 PNG data URI (usable directly in <Image>). MapKit
  // has no snapshot API on iOS, so this snapshots the on-screen compositor output via drawHierarchy
  // (afterScreenUpdates: true) — best-effort: it captures what is presented, so call it after
  // onMapLoaded. Returns nil if the map has no size yet. Must run on the main thread.
  func takeSnapshot() -> String? {
    guard let mapView = mapView, mapView.bounds.width > 0, mapView.bounds.height > 0 else {
      return nil
    }
    let renderer = UIGraphicsImageRenderer(bounds: mapView.bounds)
    let image = renderer.image { _ in
      mapView.drawHierarchy(in: mapView.bounds, afterScreenUpdates: true)
    }
    guard let data = image.pngData() else {
      return nil
    }
    return "data:image/png;base64," + data.base64EncodedString()
  }

  // Draw MapKit's selection highlight around the POI/geo-object identified by `selection` (from an
  // onPoiTap event). Reconstructs the selection metadata from the opaque ids. No-op until the map is
  // ready.
  func selectGeoObject(_ selection: GeoObjectSelectionRecord) {
    guard let map = mapView?.mapWindow.map else {
      return
    }
    let metadata = YMKGeoObjectSelectionMetadata(
      objectId: selection.objectId,
      dataSourceName: selection.dataSourceName,
      layerId: selection.layerId,
      groupId: selection.groupId.map { NSNumber(value: $0) }
    )
    map.selectGeoObject(withSelectionMetaData: metadata)
  }

  func deselectGeoObject() {
    mapView?.mapWindow.map.deselectGeoObject()
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
          "expo-yandex-mapkit: MapKit is not initialized yet — set a build-time apiKey via the " +
          "config plugin, or call initialize(apiKey). The map stays empty until MapKit " +
          "initializes, then recovers automatically."
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
    let mapLoadedListener = MapLoadedListener(view: self)
    let geoObjectTapListener = GeoObjectTapListener(view: self)
    self.cameraListener = cameraListener
    self.inputListener = inputListener
    self.mapLoadedListener = mapLoadedListener
    self.geoObjectTapListener = geoObjectTapListener
    map.addCameraListener(with: cameraListener)
    map.addInputListener(with: inputListener)
    map.setMapLoadedListenerWith(mapLoadedListener)
    map.addTapListener(with: geoObjectTapListener)

    map.isNightModeEnabled = nightMode
    applyGestureState()
    map.isFastTapEnabled = fastTapEnabled
    if minZoom != nil || maxZoom != nil {
      applyZoomBounds()
    }
    if let mapType = mapType {
      map.mapType = mapType
    }
    applyMapStyle(to: map)
    applyLogo(to: map)
    applyMapPadding()
    // The initial camera position is applied instantly — the map has not been shown yet.
    applyPendingCameraPosition(allowAnimation: false)
    // Wire up any <Marker> children that mounted before the map existed.
    attachPendingChildren()
    // Apply user-location / traffic props set before the map was created.
    if showUserPosition || followUser {
      applyUserLocation()
    }
    if trafficVisible {
      applyTraffic()
    }
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

  // Emit onPoiTap for a tapped built-in geo-object that carries selection metadata (a selectable
  // POI/toponym). The `selection` lets JS call selectGeoObject() to highlight it later.
  fileprivate func dispatchPoiTap(
    _ geoObject: YMKGeoObject, selection: YMKGeoObjectSelectionMetadata
  ) {
    var selectionPayload: [String: Any] = [
      "objectId": selection.objectId,
      "dataSourceName": selection.dataSourceName,
      "layerId": selection.layerId,
    ]
    if let groupId = selection.groupId {
      selectionPayload["groupId"] = groupId
    }
    var payload: [String: Any] = ["selection": selectionPayload]
    if let name = geoObject.name {
      payload["name"] = name
    }
    if let point = geoObject.geometry.compactMap({ $0.point }).first {
      payload["point"] = ["latitude": point.latitude, "longitude": point.longitude]
    }
    onPoiTap(payload)
  }

  fileprivate func dispatchMapLoaded(_ statistics: YMKMapLoadStatistics) {
    onMapLoaded([
      "renderObjectCount": statistics.renderObjectCount,
      "tileMemoryUsage": statistics.tileMemoryUsage,
      "curZoomModelsLoaded": statistics.curZoomModelsLoaded,
      "curZoomPlacemarksLoaded": statistics.curZoomPlacemarksLoaded,
      "curZoomLabelsLoaded": statistics.curZoomLabelsLoaded,
      "curZoomGeometryLoaded": statistics.curZoomGeometryLoaded,
      "delayedGeometryLoaded": statistics.delayedGeometryLoaded,
      "fullyLoaded": statistics.fullyLoaded,
      "fullyAppeared": statistics.fullyAppeared,
    ])
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

private final class MapLoadedListener: NSObject, YMKMapLoadedListener {
  private weak var view: ExpoYandexMapKitView?

  init(view: ExpoYandexMapKitView) {
    self.view = view
  }

  func onMapLoaded(with statistics: YMKMapLoadStatistics) {
    view?.dispatchMapLoaded(statistics)
  }
}

// Fires for taps on the map's own labelled objects (POIs, toponyms). Only objects that carry
// selection metadata are surfaced as onPoiTap; returning true then consumes the tap so it does not
// also reach the input listener as an onMapPress. Non-selectable geo-objects return false and fall
// through to onMapPress unchanged.
private final class GeoObjectTapListener: NSObject, YMKLayersGeoObjectTapListener {
  private weak var view: ExpoYandexMapKitView?

  init(view: ExpoYandexMapKitView) {
    self.view = view
  }

  func onObjectTap(with event: YMKGeoObjectTapEvent) -> Bool {
    guard let selection = event.geoObject.metadataContainer.getItemOf(
      YMKGeoObjectSelectionMetadata.self) as? YMKGeoObjectSelectionMetadata
    else {
      return false
    }
    view?.dispatchPoiTap(event.geoObject, selection: selection)
    return true
  }
}

private final class UserLocationObjectListener: NSObject, YMKUserLocationObjectListener {
  private weak var view: ExpoYandexMapKitView?

  init(view: ExpoYandexMapKitView) {
    self.view = view
  }

  func onObjectAdded(with userLocationView: YMKUserLocationView) {
    view?.onUserLocationObjectAvailable(userLocationView)
  }

  func onObjectRemoved(with userLocationView: YMKUserLocationView) {
    view?.onUserLocationObjectRemoved(userLocationView)
  }

  func onObjectUpdated(with userLocationView: YMKUserLocationView, event: YMKObjectEvent) {
    view?.onUserLocationObjectAvailable(userLocationView)
  }
}
