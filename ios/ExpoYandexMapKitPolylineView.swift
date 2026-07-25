import ExpoModulesCore
import YandexMapsMobile

// One `<Polyline>`. An (invisible) ExpoView React mounts as a child of the map view; it drives a
// MapKit YMKPolylineMapObject. A polyline can only be created with its geometry, so the object is
// created lazily once both the map collection and at least two points are available.
class ExpoYandexMapKitPolylineView: ExpoView, MapObjectChild {
  let onShapePress = EventDispatcher()

  private var collection: YMKMapObjectCollection?
  private var mapObject: YMKPolylineMapObject?
  private var tapListener: PolylineTapListener?
  private var points: [YMKPoint] = []
  private var strokeColor: UIColor?
  private var strokeWidth: Float?
  private var outlineColor: UIColor?
  private var outlineWidth: Float?
  private var dashLength: Float?
  private var dashOffset: Float?
  private var gapLength: Float?
  private var zIndexValue: Float = 0
  private var handled = false

  func setPoints(_ value: [PointRecord]) {
    points = value.map { YMKPoint(latitude: $0.latitude, longitude: $0.longitude) }
    if let obj = mapObject, obj.isValid, points.count >= 2 {
      obj.geometry = YMKPolyline(points: points)
    } else {
      createIfReady()
    }
  }

  func setStrokeColor(_ value: UIColor?) {
    strokeColor = value
    updateStyle()
  }

  func setStrokeWidth(_ value: Double) {
    strokeWidth = Float(value)
    updateStyle()
  }

  func setOutlineColor(_ value: UIColor?) {
    outlineColor = value
    updateStyle()
  }

  func setOutlineWidth(_ value: Double) {
    outlineWidth = Float(value)
    updateStyle()
  }

  func setDashLength(_ value: Double) {
    dashLength = Float(value)
    updateStyle()
  }

  func setDashOffset(_ value: Double) {
    dashOffset = Float(value)
    updateStyle()
  }

  func setGapLength(_ value: Double) {
    gapLength = Float(value)
    updateStyle()
  }

  func setZIndexValue(_ value: Double) {
    zIndexValue = Float(value)
    updateStyle()
  }

  func setHandled(_ value: Bool) {
    handled = value
  }

  func attachToMap(_ collection: YMKMapObjectCollection) {
    self.collection = collection
    createIfReady()
  }

  func detachFromMap(_ collection: YMKMapObjectCollection) {
    if let obj = mapObject {
      collection.remove(with: obj)
    }
    mapObject = nil
    tapListener = nil
    self.collection = nil
  }

  var isAttachedToMap: Bool { collection != nil }

  private func createIfReady() {
    guard mapObject == nil, let collection = collection, points.count >= 2 else {
      return
    }
    let obj = collection.addPolyline(with: YMKPolyline(points: points))
    mapObject = obj
    let listener = PolylineTapListener(view: self)
    tapListener = listener
    obj.addTapListener(with: listener)
    updateStyle()
  }

  private func updateStyle() {
    guard let obj = mapObject, obj.isValid else {
      return
    }
    obj.zIndex = zIndexValue
    // On iOS width / dash / outline are direct properties of the polyline object (there is no
    // setStyle method); colors go through setStrokeColorWith / the outlineColor property.
    if let strokeColor = strokeColor {
      obj.setStrokeColorWith(strokeColor)
    }
    if let strokeWidth = strokeWidth {
      obj.strokeWidth = strokeWidth
    }
    if let dashLength = dashLength {
      obj.dashLength = dashLength
    }
    if let gapLength = gapLength {
      obj.gapLength = gapLength
    }
    if let dashOffset = dashOffset {
      obj.dashOffset = dashOffset
    }
    if let outlineWidth = outlineWidth {
      obj.outlineWidth = outlineWidth
    }
    if let outlineColor = outlineColor {
      obj.outlineColor = outlineColor
    }
  }

  fileprivate func handleTap(_ point: YMKPoint) -> Bool {
    onShapePress(["point": ["latitude": point.latitude, "longitude": point.longitude]])
    return handled
  }
}

private final class PolylineTapListener: NSObject, YMKMapObjectTapListener {
  private weak var view: ExpoYandexMapKitPolylineView?

  init(view: ExpoYandexMapKitPolylineView) {
    self.view = view
  }

  func onMapObjectTap(with mapObject: YMKMapObject, point: YMKPoint) -> Bool {
    return view?.handleTap(point) ?? false
  }
}
