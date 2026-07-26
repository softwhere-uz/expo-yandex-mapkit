package expo.modules.yandexmapkit

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// Options for a driving route request. A plain Record (no MapKit types), so it lives in src/main and
// is shared by both the full and lite Transport modules. Mirrors the JS `DrivingRouteOptions`.
class DrivingRouteOptionsRecord : Record {
  @Field
  var avoidTolls: Boolean = false

  @Field
  var avoidUnpaved: Boolean = false

  @Field
  var avoidPoorConditions: Boolean = false

  @Field
  var avoidHighways: Boolean = false

  @Field
  var departureTime: Double? = null

  @Field
  var vehicleType: String? = null
}
