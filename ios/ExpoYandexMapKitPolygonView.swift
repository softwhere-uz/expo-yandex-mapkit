import ExpoModulesCore
import YandexMapsMobile

// One `<Polygon>`. Drives a MapKit YMKPolygonMapObject; created lazily once the collection and an
// outer ring of at least three points are available.
class ExpoYandexMapKitPolygonView: ExpoView, MapObjectChild {
  let onShapePress = EventDispatcher()

  private var collection: YMKMapObjectCollection?
  private var mapObject: YMKPolygonMapObject?
  private var tapListener: PolygonTapListener?
  private var points: [YMKPoint] = []
  private var innerRings: [[YMKPoint]] = []
  private var fillColor: UIColor?
  private var strokeColor: UIColor?
  private var strokeWidth: Float?
  private var zIndexValue: Float = 0
  private var handled = false

  func setPoints(_ value: [PointRecord]) {
    points = value.map { YMKPoint(latitude: $0.latitude, longitude: $0.longitude) }
    updateGeometry()
  }

  func setInnerRings(_ value: [[PointRecord]]) {
    innerRings = value.map { ring in ring.map { YMKPoint(latitude: $0.latitude, longitude: $0.longitude) } }
    updateGeometry()
  }

  func setFillColor(_ value: UIColor?) {
    fillColor = value
    updateStyle()
  }

  func setStrokeColor(_ value: UIColor?) {
    strokeColor = value
    updateStyle()
  }

  func setStrokeWidth(_ value: Double) {
    strokeWidth = Float(value)
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

  private func buildPolygon() -> YMKPolygon {
    YMKPolygon(
      outerRing: YMKLinearRing(points: points),
      innerRings: innerRings.map { YMKLinearRing(points: $0) })
  }

  private func createIfReady() {
    guard mapObject == nil, let collection = collection, points.count >= 3 else {
      return
    }
    let obj = collection.addPolygon(with: buildPolygon())
    mapObject = obj
    let listener = PolygonTapListener(view: self)
    tapListener = listener
    obj.addTapListener(with: listener)
    updateStyle()
  }

  private func updateGeometry() {
    if let obj = mapObject, obj.isValid, points.count >= 3 {
      obj.geometry = buildPolygon()
    } else {
      createIfReady()
    }
  }

  private func updateStyle() {
    guard let obj = mapObject, obj.isValid else {
      return
    }
    obj.zIndex = zIndexValue
    if let strokeWidth = strokeWidth {
      obj.strokeWidth = strokeWidth
    }
    if let strokeColor = strokeColor {
      obj.strokeColor = strokeColor
    }
    if let fillColor = fillColor {
      obj.fillColor = fillColor
    }
  }

  fileprivate func handleTap(_ point: YMKPoint) -> Bool {
    onShapePress(["point": ["latitude": point.latitude, "longitude": point.longitude]])
    return handled
  }
}

private final class PolygonTapListener: NSObject, YMKMapObjectTapListener {
  private weak var view: ExpoYandexMapKitPolygonView?

  init(view: ExpoYandexMapKitPolygonView) {
    self.view = view
  }

  func onMapObjectTap(with mapObject: YMKMapObject, point: YMKPoint) -> Bool {
    return view?.handleTap(point) ?? false
  }
}
