package expo.modules.yandexmapkit

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// Search option record. Lives in src/main (no MapKit types) so both the full implementation and the
// lite stub of ExpoYandexSearchModule share the same JS argument shape. Reuses PointRecord and the
// {southWest, northEast} bounding-box record from SuggestRecords.
class SearchOptionsRecord : Record {
  @Field
  var userPosition: PointRecord? = null

  // Search window for searchText (a point / bounding box); ignored by searchPoint.
  @Field
  var boundingBox: SuggestBoundingBoxRecord? = null

  // Any of "geo" (toponyms) | "biz" (organizations); null means "geo".
  @Field
  var searchTypes: List<String>? = null

  @Field
  var resultPageSize: Double? = null

  // Reverse-geocoding detail level (searchPoint only).
  @Field
  var zoom: Double? = null

  @Field
  var disableSpellingCorrection: Boolean = false

  // Any of "rating" | "photos" | "panoramas".
  @Field
  var snippets: List<String>? = null
}
