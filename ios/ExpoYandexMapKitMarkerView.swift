import ExpoModulesCore
import YandexMapsMobile

// The `anchor` prop shape: icon anchor as [0,1] fractions of the icon size.
internal struct MarkerAnchorRecord: Record {
  @Field var x: Double = 0.5
  @Field var y: Double = 1.0
}

// One `<Marker>`. An (invisible) ExpoView React mounts as a child of the map view; it owns no UI
// of its own — it drives a YMKPlacemarkMapObject. The map view creates the placemark (from its
// MapObjectCollection) and hands it over via `attach(to:)`; this view then mirrors its props onto
// the placemark. Props may arrive before or after the placemark exists, so `updateMarker()` no-ops
// until both the placemark and a point are present.
class ExpoYandexMapKitMarkerView: ExpoView, MapObjectChild {
  // YMKRotationType raw values: 0 = no rotation, 1 = rotate with the map (matches the SDK enum;
  // used as a plain NSNumber to avoid depending on the Swift enum symbol name).
  private static let rotationNone: Int = 0
  private static let rotationRotate: Int = 1
  // Frame rate for the imperative move/rotate animations.
  private static let framesPerSecond = 60.0

  // Named onMarkerPress (not onPress): React Native normalizes onPress to the top-level bubbling
  // event topPress, which collides with Expo's direct-event registration ("Event cannot be both
  // direct and bubbling: topPress") and red-screens on the first marker mount. topMarkerPress is
  // free. The public JS prop stays `onPress` — the wrapper forwards it to this native event.
  let onMarkerPress = EventDispatcher()

  private var placemark: YMKPlacemarkMapObject?
  // MapKit holds the tap listener; keep it strongly retained here (this view is itself kept alive
  // by the map view's marker list while mounted).
  private var tapListener: MarkerTapListener?
  private var point: YMKPoint?
  private var scale: NSNumber = 1
  private var anchor: NSValue?
  private var visible = true
  private var zIndexValue: Float = 0
  private var rotated = false
  private var handled = false
  private var identifier: String?
  private var iconSource: String?
  // The icon URI currently applied; guards against reloading the same image on unrelated updates.
  private var appliedIconSource: String?
  // Whether an icon (image or view) has actually been set on the placemark yet. YMKPlacemark's
  // setIconStyle asserts ("Supported for single, animated icon and view only") when no icon is
  // present, so style is only ever applied once this is true.
  private var hasIcon = false

  // React-children icon: the marker's content child (a custom pin) is rendered as the placemark
  // icon via YRTViewProvider (takes precedence over `source`). `tracksViewChanges` drives a display
  // link that re-renders the icon so live content stays in sync; set it false once the content has
  // settled to stop the per-frame work (the react-native-maps convention).
  private var tracksViewChanges = true
  private var childView: UIView?
  private var displayLink: CADisplayLink?

  // Set by a <Clusterer> parent while this marker is clustered, so a geometry change re-triggers
  // clustering. Nil when the marker is a direct child of the map (un-clustered).
  var onGeometryChanged: (() -> Void)?

  // MARK: - Props

  func setPoint(_ value: PointRecord) {
    point = YMKPoint(latitude: value.latitude, longitude: value.longitude)
    updateMarker()
    // A clustered marker moving must re-cluster; no-op when un-clustered.
    onGeometryChanged?()
  }

  func setScale(_ value: Double) {
    scale = NSNumber(value: value)
    updateMarker()
  }

  func setAnchor(_ value: MarkerAnchorRecord?) {
    if let value = value {
      let x = min(max(value.x, 0), 1)
      let y = min(max(value.y, 0), 1)
      anchor = NSValue(cgPoint: CGPoint(x: x, y: y))
    } else {
      anchor = nil
    }
    updateMarker()
  }

  func setVisible(_ value: Bool) {
    visible = value
    updateMarker()
  }

  func setZIndexValue(_ value: Double) {
    zIndexValue = Float(value)
    updateMarker()
  }

  func setRotated(_ value: Bool) {
    rotated = value
    updateMarker()
  }

  func setHandled(_ value: Bool) {
    handled = value
  }

  func setIdentifier(_ value: String?) {
    identifier = value
  }

  func setIconSource(_ value: String?) {
    iconSource = value
    updateMarker()
  }

  // MARK: - Placemark lifecycle (driven by the map view)

  func attachToMap(_ collection: YMKMapObjectCollection) {
    guard placemark == nil else {
      return
    }
    bind(placemark: collection.addPlacemark())
  }

  // Attach into a <Clusterer>'s cluster collection instead of the map's root collection, so this
  // marker participates in clustering. Mirrors attachToMap — a YMKClusterizedPlacemarkCollection is
  // a YMKBaseMapObjectCollection, so addPlacemark() / remove(with:) behave identically.
  func attachToCluster(_ collection: YMKClusterizedPlacemarkCollection) {
    guard placemark == nil else {
      return
    }
    bind(placemark: collection.addPlacemark())
  }

  func detachFromCluster(_ collection: YMKClusterizedPlacemarkCollection) {
    if let placemark = placemark {
      collection.remove(with: placemark)
    }
    clearPlacemark()
  }

  func detachFromMap(_ collection: YMKMapObjectCollection) {
    if let placemark = placemark {
      collection.remove(with: placemark)
    }
    clearPlacemark()
  }

  // Wire a freshly created placemark (from either the root or a cluster collection) up to this view.
  private func bind(placemark created: YMKPlacemarkMapObject) {
    placemark = created
    let listener = MarkerTapListener(view: self)
    tapListener = listener
    created.addTapListener(with: listener)
    appliedIconSource = nil
    hasIcon = false
    updateMarker()
  }

  private func clearPlacemark() {
    placemark = nil
    tapListener = nil
    appliedIconSource = nil
    hasIcon = false
    stopTracking()
  }

  var isAttachedToMap: Bool { placemark != nil }

  // The marker's current geographic position, for fitAllMarkers().
  var geoPoint: YMKPoint? { point }

  // MARK: - React-children icon

  func setTracksViewChanges(_ value: Bool) {
    tracksViewChanges = value
    updateTracking()
  }

  // The marker's content child arrives through Fabric's child hooks. Only one is supported; it is
  // NOT added to the view hierarchy (markers own no on-screen UI) — YRTViewProvider renders it from
  // its Fabric-assigned frame, matching the map view's own child handling.
  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard childView == nil else {
      return
    }
    childView = childComponentView
    childComponentView.isOpaque = false
    updateMarker()
    updateTracking()
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard childComponentView === childView else {
      return
    }
    childView = nil
    stopTracking()
    // Fall back to the image `source` now that the custom view is gone. Clear hasIcon so a
    // subsequent style-only update doesn't run before the source icon has (re)loaded.
    appliedIconSource = nil
    hasIcon = false
    updateMarker()
  }

  // Render the child's current content as the placemark icon. A fresh provider each call forces a
  // re-render of whatever the child now shows. No-op until the child has a real (laid-out) size.
  private func refreshChildIcon() {
    guard let placemark = placemark, placemark.isValid, let child = childView,
      child.bounds.width > 0, child.bounds.height > 0
    else {
      return
    }
    placemark.setViewWithView(YRTViewProvider(uiView: child), style: buildIconStyle())
    hasIcon = true
  }

  private func updateTracking() {
    let shouldTrack = tracksViewChanges && childView != nil && placemark != nil
    if shouldTrack {
      if displayLink == nil {
        let link = CADisplayLink(target: self, selector: #selector(onDisplayLink))
        // Re-render at ~30fps rather than the full refresh rate — enough for live content, far
        // cheaper than every frame. Set tracksViewChanges=false to stop entirely.
        link.preferredFramesPerSecond = 30
        link.add(to: .main, forMode: .common)
        displayLink = link
      }
    } else {
      stopTracking()
      // One final render so a settled child is still shown after tracking stops.
      refreshChildIcon()
    }
  }

  private func stopTracking() {
    displayLink?.invalidate()
    displayLink = nil
  }

  @objc private func onDisplayLink() {
    refreshChildIcon()
  }

  private func updateMarker() {
    guard let placemark = placemark, placemark.isValid, let point = point else {
      return
    }
    placemark.geometry = point
    placemark.zIndex = zIndexValue

    // A React-children icon (custom pin) takes precedence over the image source. refreshChildIcon
    // sets the view AND its style together (a view icon is supported by setIconStyle).
    if childView != nil {
      refreshChildIcon()
      updateTracking()
      return
    }

    guard let source = iconSource, !source.isEmpty else {
      // No icon source: only (re)apply style if an icon is already present — styling an icon-less
      // placemark asserts natively. Nothing to render otherwise.
      if hasIcon {
        placemark.setIconStyleWith(buildIconStyle())
      }
      return
    }

    guard source != appliedIconSource else {
      // Same icon already applied (or still loading). Re-apply style so scale/anchor/visibility
      // changes stick — but only once the icon is actually on the placemark.
      if hasIcon {
        placemark.setIconStyleWith(buildIconStyle())
      }
      return
    }

    appliedIconSource = source
    MarkerImageLoader.load(source) { [weak self] image in
      guard let self = self, let image = image, let current = self.placemark, current.isValid,
        source == self.appliedIconSource
      else {
        return
      }
      current.setIconWith(image)
      self.hasIcon = true
      // Apply the style now that an icon exists (scale/anchor/visibility/rotation).
      current.setIconStyleWith(self.buildIconStyle())
    }
  }

  private func buildIconStyle() -> YMKIconStyle {
    let style = YMKIconStyle()
    style.scale = scale
    style.visible = NSNumber(value: visible)
    style.rotationType = NSNumber(value: rotated ? Self.rotationRotate : Self.rotationNone)
    if let anchor = anchor {
      style.anchor = anchor
    }
    return style
  }

  fileprivate func handleTap(_ point: YMKPoint) -> Bool {
    // NSNull (not `nil as Any`) when unset, so the payload matches Android's null identifier.
    onMarkerPress([
      "identifier": identifier.map { $0 as Any } ?? NSNull(),
      "point": ["latitude": point.latitude, "longitude": point.longitude],
    ])
    // Returning true consumes the tap so it does not also fall through to the map's onMapPress.
    return handled
  }

  // MARK: - Animations (invoked via the marker's view ref)

  func animatedMoveTo(_ target: YMKPoint, durationMs: Double) {
    guard let placemark = placemark, placemark.isValid else {
      return
    }
    let start = placemark.geometry
    let deltaLat = target.latitude - start.latitude
    let deltaLon = target.longitude - start.longitude
    let totalFrames = max(Int((durationMs / 1000.0) * Self.framesPerSecond), 1)
    animateFrame(0, totalFrames: totalFrames) { [weak self] fraction in
      guard let placemark = self?.placemark, placemark.isValid else {
        return
      }
      placemark.geometry = YMKPoint(
        latitude: start.latitude + fraction * deltaLat,
        longitude: start.longitude + fraction * deltaLon
      )
    }
  }

  func animatedRotateTo(_ angle: Double, durationMs: Double) {
    guard let placemark = placemark, placemark.isValid else {
      return
    }
    let start = Double(placemark.direction)
    let delta = angle - start
    let totalFrames = max(Int((durationMs / 1000.0) * Self.framesPerSecond), 1)
    animateFrame(0, totalFrames: totalFrames) { [weak self] fraction in
      guard let placemark = self?.placemark, placemark.isValid else {
        return
      }
      placemark.direction = Float(start + fraction * delta)
    }
  }

  // Linear per-frame tween on the main queue. `apply` receives the eased fraction in [0, 1] and is
  // computed from the animation start each frame, so it never drifts.
  private func animateFrame(_ frame: Int, totalFrames: Int, apply: @escaping (Double) -> Void) {
    apply(Double(frame) / Double(totalFrames))
    guard frame < totalFrames else {
      return
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0 / Self.framesPerSecond) { [weak self] in
      self?.animateFrame(frame + 1, totalFrames: totalFrames, apply: apply)
    }
  }
}

// MapKit's tap-listener protocol is Objective-C, so the conforming class inherits from NSObject.
private final class MarkerTapListener: NSObject, YMKMapObjectTapListener {
  private weak var view: ExpoYandexMapKitMarkerView?

  init(view: ExpoYandexMapKitMarkerView) {
    self.view = view
  }

  func onMapObjectTap(with mapObject: YMKMapObject, point: YMKPoint) -> Bool {
    return view?.handleTap(point) ?? false
  }
}
