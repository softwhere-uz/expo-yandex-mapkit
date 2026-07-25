package expo.modules.yandexmapkit

import com.yandex.mapkit.map.MapObjectCollection

// Implemented by every child view of the map (<Marker>, <Polyline>, <Polygon>, <Circle>). The map
// view manages them uniformly: it creates each child's MapKit map object from its collection once
// the map exists, and removes it when the child unmounts. Attaching is idempotent.
internal interface MapObjectChild {
  // Create and attach this child's map object to the collection. No-op if already attached.
  fun attachToMap(collection: MapObjectCollection)

  // Remove this child's map object from the collection.
  fun detachFromMap(collection: MapObjectCollection)

  val isAttachedToMap: Boolean
}
