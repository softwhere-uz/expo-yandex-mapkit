package expo.modules.yandexmapkit

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// Suggest option records. They live in src/main (no MapKit types) so both the full implementation
// and the lite stub of ExpoYandexSuggestModule share the same JS argument shape.

class SuggestBoundingBoxRecord : Record {
  @Field
  var southWest: PointRecord? = null

  @Field
  var northEast: PointRecord? = null
}

class SuggestOptionsRecord : Record {
  @Field
  var userPosition: PointRecord? = null

  @Field
  var boundingBox: SuggestBoundingBoxRecord? = null

  @Field
  var suggestWords: Boolean = true

  // Any of "geo" | "biz" | "transit"; null means all three.
  @Field
  var types: List<String>? = null
}
