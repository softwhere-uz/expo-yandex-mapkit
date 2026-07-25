import YandexMapsMobile

// Implemented by every child view of the map (<Marker>, <Polyline>, <Polygon>, <Circle>). The map
// view manages them uniformly: it creates each child's MapKit map object from its collection once
// the map exists, and removes it when the child unmounts. Attaching is idempotent.
internal protocol MapObjectChild: AnyObject {
  // Create and attach this child's map object to the collection. No-op if already attached.
  func attachToMap(_ collection: YMKMapObjectCollection)

  // Remove this child's map object from the collection.
  func detachFromMap(_ collection: YMKMapObjectCollection)

  var isAttachedToMap: Bool { get }
}
