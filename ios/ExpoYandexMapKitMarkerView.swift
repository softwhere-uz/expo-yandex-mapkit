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
class ExpoYandexMapKitMarkerView: ExpoView {
  // YMKRotationType raw values: 0 = no rotation, 1 = rotate with the map (matches the SDK enum;
  // used as a plain NSNumber to avoid depending on the Swift enum symbol name).
  private static let rotationNone: Int = 0
  private static let rotationRotate: Int = 1
  // Frame rate for the imperative move/rotate animations.
  private static let framesPerSecond = 60.0

  let onPress = EventDispatcher()

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

  // MARK: - Props

  func setPoint(_ value: PointRecord) {
    point = YMKPoint(latitude: value.latitude, longitude: value.longitude)
    updateMarker()
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

  func attach(to placemark: YMKPlacemarkMapObject) {
    self.placemark = placemark
    let listener = MarkerTapListener(view: self)
    tapListener = listener
    placemark.addTapListener(with: listener)
    appliedIconSource = nil
    updateMarker()
  }

  func detach() {
    placemark = nil
    tapListener = nil
    appliedIconSource = nil
  }

  var isAttached: Bool { placemark != nil }

  // The placemark the map view must remove from its collection when this marker unmounts.
  var currentPlacemark: YMKPlacemarkMapObject? { placemark }

  private func updateMarker() {
    guard let placemark = placemark, placemark.isValid, let point = point else {
      return
    }
    placemark.geometry = point
    placemark.zIndex = zIndexValue
    placemark.setIconStyleWith(buildIconStyle())

    guard let source = iconSource, !source.isEmpty, source != appliedIconSource else {
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
      // Re-apply the style so scale/anchor/visibility stick after the icon swap.
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
    onPress([
      "identifier": identifier as Any,
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
