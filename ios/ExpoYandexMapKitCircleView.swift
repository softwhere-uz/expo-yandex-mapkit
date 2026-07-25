import ExpoModulesCore
import YandexMapsMobile

// One `<Circle>`. Drives a MapKit YMKCircleMapObject; created lazily once the collection and a
// center are available. Radius is in meters.
class ExpoYandexMapKitCircleView: ExpoView, MapObjectChild {
  let onShapePress = EventDispatcher()

  private var collection: YMKMapObjectCollection?
  private var mapObject: YMKCircleMapObject?
  private var tapListener: CircleTapListener?
  private var circleCenter: YMKPoint?
  private var radius: Float = 0
  private var fillColor: UIColor?
  private var strokeColor: UIColor?
  private var strokeWidth: Float?
  private var zIndexValue: Float = 0
  private var handled = false

  func setCenter(_ value: PointRecord) {
    circleCenter = YMKPoint(latitude: value.latitude, longitude: value.longitude)
    updateGeometry()
  }

  func setRadius(_ value: Double) {
    radius = Float(value)
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

  private func createIfReady() {
    guard mapObject == nil, let collection = collection, let center = circleCenter, radius > 0 else {
      return
    }
    let obj = collection.addCircle(with: YMKCircle(center: center, radius: radius))
    mapObject = obj
    let listener = CircleTapListener(view: self)
    tapListener = listener
    obj.addTapListener(with: listener)
    updateStyle()
  }

  private func updateGeometry() {
    if let obj = mapObject, obj.isValid, let center = circleCenter, radius > 0 {
      obj.geometry = YMKCircle(center: center, radius: radius)
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

private final class CircleTapListener: NSObject, YMKMapObjectTapListener {
  private weak var view: ExpoYandexMapKitCircleView?

  init(view: ExpoYandexMapKitCircleView) {
    self.view = view
  }

  func onMapObjectTap(with mapObject: YMKMapObject, point: YMKPoint) -> Bool {
    return view?.handleTap(point) ?? false
  }
}
