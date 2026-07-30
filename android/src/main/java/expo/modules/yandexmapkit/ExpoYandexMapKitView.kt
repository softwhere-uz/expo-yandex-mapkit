package expo.modules.yandexmapkit

import android.content.Context
import android.graphics.Bitmap
import android.graphics.PointF
import android.util.Base64
import android.util.Log
import java.io.ByteArrayOutputStream
import android.view.View
import com.yandex.mapkit.Animation
import com.yandex.mapkit.GeoObject
import com.yandex.mapkit.MapKitFactory
import com.yandex.mapkit.ScreenPoint
import com.yandex.mapkit.ScreenRect
import com.yandex.mapkit.geometry.BoundingBox
import com.yandex.mapkit.geometry.Geometry
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.indoor.IndoorPlan
import com.yandex.mapkit.indoor.IndoorStateListener
import com.yandex.mapkit.layers.GeoObjectTapEvent
import com.yandex.mapkit.layers.GeoObjectTapListener
import com.yandex.mapkit.logo.Alignment as LogoAlignment
import com.yandex.mapkit.logo.HorizontalAlignment
import com.yandex.mapkit.logo.Padding as LogoPaddingNative
import com.yandex.mapkit.logo.VerticalAlignment
import com.yandex.mapkit.map.CameraListener
import com.yandex.mapkit.map.CameraPosition
import com.yandex.mapkit.map.CameraUpdateReason
import com.yandex.mapkit.map.CircleMapObject
import com.yandex.mapkit.map.GeoObjectSelectionMetadata
import com.yandex.mapkit.map.IconStyle
import com.yandex.mapkit.map.InputListener
import com.yandex.mapkit.TileId
import com.yandex.mapkit.Version
import com.yandex.mapkit.ZoomRange
import com.yandex.mapkit.tiles.UrlProvider
import java.util.UUID
import com.yandex.mapkit.geometry.geo.Projections
import com.yandex.mapkit.layers.Layer
import com.yandex.mapkit.layers.LayerOptions
import com.yandex.mapkit.layers.TileFormat
import com.yandex.mapkit.map.CreateTileDataSource
import com.yandex.mapkit.map.Map as YandexMap
import com.yandex.mapkit.map.MapLoadStatistics
import com.yandex.mapkit.map.MapLoadedListener
import com.yandex.mapkit.map.MapType as YandexMapType
import com.yandex.mapkit.layers.ObjectEvent
import com.yandex.mapkit.mapview.MapView
import com.yandex.mapkit.traffic.TrafficColor
import com.yandex.mapkit.traffic.TrafficLayer
import com.yandex.mapkit.traffic.TrafficLevel
import com.yandex.mapkit.traffic.TrafficListener
import com.yandex.mapkit.user_location.UserLocationLayer
import com.yandex.mapkit.user_location.UserLocationObjectListener
import com.yandex.mapkit.user_location.UserLocationView
import com.yandex.runtime.image.ImageProvider
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.types.Enumerable
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.lang.ref.WeakReference
import kotlin.math.abs

private const val TAG = "ExpoYandexMapKit"
private const val CAMERA_EQUALITY_TOLERANCE = 1e-6
private const val CAMERA_ANIMATION_DURATION = 0.3f

class CameraPositionRecord : Record {
  @Field
  var latitude: Double = 0.0

  @Field
  var longitude: Double = 0.0

  @Field
  var zoom: Double = 0.0

  @Field
  var azimuth: Double = 0.0

  @Field
  var tilt: Double = 0.0
}

// The `mapType` prop options. Mirrors the JS `mapType` union; mapped to Yandex `MapType`.
enum class MapTypeOption(val value: String) : Enumerable {
  none("none"),
  map("map"),
  satellite("satellite"),
  hybrid("hybrid"),
  vector("vector");

  fun toYandex(): YandexMapType = when (this) {
    none -> YandexMapType.NONE
    map -> YandexMapType.MAP
    satellite -> YandexMapType.SATELLITE
    hybrid -> YandexMapType.HYBRID
    vector -> YandexMapType.VECTOR_MAP
  }
}

// The `logoPosition` prop shape: where the mandatory Yandex logo sits in the map.
enum class LogoHorizontalOption(val value: String) : Enumerable {
  left("left"),
  center("center"),
  right("right");

  fun toYandex(): HorizontalAlignment = when (this) {
    left -> HorizontalAlignment.LEFT
    center -> HorizontalAlignment.CENTER
    right -> HorizontalAlignment.RIGHT
  }
}

enum class LogoVerticalOption(val value: String) : Enumerable {
  top("top"),
  bottom("bottom");

  fun toYandex(): VerticalAlignment = when (this) {
    top -> VerticalAlignment.TOP
    bottom -> VerticalAlignment.BOTTOM
  }
}

class LogoPositionRecord : Record {
  @Field
  var horizontal: LogoHorizontalOption = LogoHorizontalOption.right

  @Field
  var vertical: LogoVerticalOption = LogoVerticalOption.bottom
}

// Logo padding in pixels from the aligned edges. Negative values are clamped to 0.
class LogoPaddingRecord : Record {
  @Field
  var horizontal: Double = 0.0

  @Field
  var vertical: Double = 0.0
}

// A geographic coordinate argument for getScreenPoints().
class PointRecord : Record {
  @Field
  var latitude: Double = 0.0

  @Field
  var longitude: Double = 0.0
}

// A screen coordinate (in pixels) argument for getWorldPoints().
class ScreenPointRecord : Record {
  @Field
  var x: Double = 0.0

  @Field
  var y: Double = 0.0
}

// The selection token for selectGeoObject(). Mirrors the JS `GeoObjectSelection` (the `selection`
// carried by an onPoiTap event); reconstructs a GeoObjectSelectionMetadata to select the object.
class GeoObjectSelectionRecord : Record {
  @Field
  var objectId: String = ""

  @Field
  var dataSourceName: String = ""

  @Field
  var layerId: String = ""

  @Field
  var groupId: Double? = null
}

enum class CameraAnimationOption(val value: String) : Enumerable {
  smooth("smooth"),
  linear("linear");

  fun toYandex(): Animation.Type = when (this) {
    smooth -> Animation.Type.SMOOTH
    linear -> Animation.Type.LINEAR
  }
}

// Edge insets (px) used by fitMarkers / fitAllMarkers to keep content clear of the map edges.
class EdgePaddingRecord : Record {
  @Field
  var top: Double = 0.0

  @Field
  var right: Double = 0.0

  @Field
  var bottom: Double = 0.0

  @Field
  var left: Double = 0.0
}

// Options for the imperative setCenter() move (and, with edgePadding, the fit moves).
class CameraMoveOptionsRecord : Record {
  @Field
  var durationSeconds: Double = 0.3

  @Field
  var animation: CameraAnimationOption = CameraAnimationOption.smooth

  // Only consulted by fitMarkers / fitAllMarkers; setCenter / setZoom ignore it.
  @Field
  var edgePadding: EdgePaddingRecord? = null
}

// Options for a custom raster/tile overlay added via addTileOverlay(). `urlTemplate` uses `{x}`,
// `{y}`, `{z}` placeholders (the react-native-maps `<UrlTile>` convention).
class TileOverlayRecord : Record {
  @Field
  var id: String = ""

  @Field
  var urlTemplate: String = ""

  @Field
  var minZoom: Int = 0

  @Field
  var maxZoom: Int = 19

  @Field
  var transparent: Boolean = false

  @Field
  var cacheable: Boolean = true
}

class ExpoYandexMapKitView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onMapReady by EventDispatcher<Map<String, Any>>()
  private val onCameraPositionChanged by EventDispatcher<Map<String, Any>>()
  private val onMapPress by EventDispatcher<Map<String, Any>>()
  private val onMapLongPress by EventDispatcher<Map<String, Any>>()
  private val onMapLoaded by EventDispatcher<Map<String, Any>>()
  private val onTrafficChanged by EventDispatcher<Map<String, Any?>>()
  private val onUserLocationChange by EventDispatcher<Map<String, Any>>()
  private val onPoiTap by EventDispatcher<Map<String, Any?>>()
  private val onIndoorPlanFocused by EventDispatcher<Map<String, Any?>>()
  private val onIndoorPlanLeft by EventDispatcher<Map<String, Any?>>()
  private val onIndoorLevelChanged by EventDispatcher<Map<String, Any?>>()

  internal var animated = true

  // Retained by this view (MapKit holds it weakly) — emits onTrafficChanged with the region's score.
  private val trafficListener = object : TrafficListener {
    override fun onTrafficChanged(trafficLevel: TrafficLevel?) {
      dispatchTrafficChanged(trafficLevel)
    }

    override fun onTrafficLoading() {
      dispatchTrafficChanged(null)
    }

    override fun onTrafficExpired() {
      dispatchTrafficChanged(null)
    }
  }

  private var mapView: MapView? = null
  private var isStarted = false
  private var mapReadyEmitted = false
  private var warnedNotInitialized = false
  private var nightMode = false
  // Gesture toggles default to MapKit's own defaults (all enabled). Stored so a value
  // set before the map exists is applied on map creation, mirroring nightMode.
  private var scrollGesturesEnabled = true
  private var zoomGesturesEnabled = true
  private var tiltGesturesEnabled = true
  private var rotateGesturesEnabled = true
  private var fastTapEnabled = true
  // Master override: when true, all four movement gestures are forced off regardless
  // of the individual toggles above.
  private var interactiveDisabled = false
  // mapType and mapStyle are null until explicitly set, so an unset value never overrides
  // Yandex's own default (the vector map — the only base layer that honours mapStyle;
  // MAP/satellite/hybrid are raster and ignore styling).
  private var mapType: YandexMapType? = null
  private var mapStyle: String? = null
  // Logo placement is null until first set; a never-set value keeps MapKit's default. Once set,
  // the value persists — passing undefined later does not revert it (matches mapType/mapStyle).
  private var logoPosition: LogoPositionRecord? = null
  private var logoPadding: LogoPaddingRecord? = null
  // Camera zoom-bound hints, null until set. Applied through the map's cameraBounds; a null value
  // clears that bound back to MapKit's default.
  private var minZoom: Float? = null
  private var maxZoom: Float? = null
  // Persistent map-padding inset, applied as the map window's focus rectangle. null = full viewport.
  // Kept so it can be re-applied when the view is resized, since the focus rect is in pixels.
  private var mapPadding: EdgePaddingRecord? = null
  private var pendingCameraPosition: CameraPositionRecord? = null
  private var cameraPositionDirty = false
  // Custom tile overlays added via addTileOverlay(), by id. `pending` holds any added before the map
  // existed; they are applied in maybeCreateMapView.
  private val tileLayers = mutableMapOf<String, Layer>()
  private val pendingTileOverlays = mutableMapOf<String, TileOverlayRecord>()

  // User-location and traffic layers, created lazily on first use (they need the map window).
  private var userLocationLayer: UserLocationLayer? = null
  private var trafficLayer: TrafficLayer? = null
  private var showUserPosition = false
  private var followUser = false
  private var trafficVisible = false

  // Custom user-location dot styling. The UserLocationView (pin/arrow/accuracy-circle) is handed over
  // by the object listener once the dot appears; it is kept so a later prop change can re-style it.
  private var userLocationView: UserLocationView? = null
  private var userLocationIconUri: String? = null
  private var appliedUserLocationIconUri: String? = null
  private var userLocationIconBitmap: Bitmap? = null
  private var userLocationIconScale = 1f
  private var userLocationAccuracyFillColor: Int? = null
  private var userLocationAccuracyStrokeColor: Int? = null
  private var userLocationAccuracyStrokeWidth: Float? = null

  // MapKit holds the object listener weakly (like the map-loaded listener); this strong field keeps
  // it alive. It styles the location dot on appearance and on every position/heading update.
  private val userLocationObjectListener = object : UserLocationObjectListener {
    override fun onObjectAdded(view: UserLocationView) {
      userLocationView = view
      applyUserLocationStyle()
      dispatchUserLocationChange(view)
    }

    override fun onObjectRemoved(view: UserLocationView) {
      if (userLocationView === view) {
        userLocationView = null
      }
    }

    override fun onObjectUpdated(view: UserLocationView, event: ObjectEvent) {
      userLocationView = view
      applyUserLocationStyle()
      dispatchUserLocationChange(view)
    }
  }

  // Emit onUserLocationChange with the dot's current coordinate + accuracy. Called when the location
  // dot first appears and on every position/heading update — so it never fires from a prop-driven
  // style pass, only on a real location change. The pin's geometry is the device coordinate; the
  // accuracy circle's radius is the horizontal accuracy in metres.
  private fun dispatchUserLocationChange(view: UserLocationView) {
    val point = view.pin.geometry
    onUserLocationChange(
      mapOf(
        "point" to mapOf("latitude" to point.latitude, "longitude" to point.longitude),
        "accuracy" to view.accuracyCircle.geometry.radius.toDouble()
      )
    )
  }

  // Child <Marker> views, in the order React mounted them. Managed via the module's GroupView
  // actions rather than the Android view hierarchy — markers own no UI, they drive placemarks.
  // A marker added before the map exists stays here un-attached and is wired up in
  // maybeCreateMapView once the MapObjectCollection is available.
  private val childViews = mutableListOf<View>()

  // MapKit holds only weak references to its listeners — these MUST stay strong fields
  // of the view, otherwise they get collected and events silently stop.
  private val cameraListener = object : CameraListener {
    override fun onCameraPositionChanged(
      map: YandexMap,
      cameraPosition: CameraPosition,
      reason: CameraUpdateReason,
      finished: Boolean
    ) {
      this@ExpoYandexMapKitView.onCameraPositionChanged(
        mapOf(
          "cameraPosition" to mapOf(
            "latitude" to cameraPosition.target.latitude,
            "longitude" to cameraPosition.target.longitude,
            "zoom" to cameraPosition.zoom.toDouble(),
            "azimuth" to cameraPosition.azimuth.toDouble(),
            "tilt" to cameraPosition.tilt.toDouble()
          ),
          "reason" to if (reason == CameraUpdateReason.GESTURES) "gestures" else "application",
          "finished" to finished
        )
      )
    }
  }

  private val inputListener = object : InputListener {
    override fun onMapTap(map: YandexMap, point: Point) {
      onMapPress(pointPayload(point))
    }

    override fun onMapLongTap(map: YandexMap, point: Point) {
      onMapLongPress(pointPayload(point))
    }
  }

  // Fires for taps on the map's own labelled objects (POIs, toponyms). Only objects carrying
  // selection metadata are surfaced as onPoiTap; returning true then consumes the tap so it does not
  // also reach the input listener as an onMapPress. Non-selectable geo-objects return false and fall
  // through to onMapPress unchanged.
  private val geoObjectTapListener = GeoObjectTapListener { event: GeoObjectTapEvent ->
    val selection = event.geoObject.metadataContainer.getItem(GeoObjectSelectionMetadata::class.java)
    if (selection == null) {
      false
    } else {
      onPoiTap(poiTapPayload(event.geoObject, selection))
      true
    }
  }

  // Whether indoor plans (floor levels) are shown. Stored so a value set before the map exists is
  // applied on map creation, like nightMode. `activeIndoorPlan` is the focused plan, so
  // setIndoorLevel() can change its floor.
  private var indoorEnabled = false
  private var activeIndoorPlan: IndoorPlan? = null
  private val indoorStateListener = object : IndoorStateListener {
    override fun onActivePlanFocused(activePlan: IndoorPlan) {
      activeIndoorPlan = activePlan
      onIndoorPlanFocused(
        mapOf(
          "activeLevelId" to activePlan.activeLevelId,
          "levels" to activePlan.levels.map {
            mapOf("id" to it.id, "name" to it.name, "isUnderground" to it.isUnderground)
          }
        )
      )
    }

    override fun onActivePlanLeft() {
      activeIndoorPlan = null
      onIndoorPlanLeft(emptyMap())
    }

    override fun onActiveLevelChanged(activeLevelId: String) {
      onIndoorLevelChanged(mapOf("activeLevelId" to activeLevelId))
    }
  }

  private val mapLoadedListener = object : MapLoadedListener {
    override fun onMapLoaded(statistics: MapLoadStatistics) {
      this@ExpoYandexMapKitView.onMapLoaded(
        mapOf(
          "renderObjectCount" to statistics.renderObjectCount,
          "tileMemoryUsage" to statistics.tileMemoryUsage,
          "curZoomModelsLoaded" to statistics.curZoomModelsLoaded.toDouble(),
          "curZoomPlacemarksLoaded" to statistics.curZoomPlacemarksLoaded.toDouble(),
          "curZoomLabelsLoaded" to statistics.curZoomLabelsLoaded.toDouble(),
          "curZoomGeometryLoaded" to statistics.curZoomGeometryLoaded.toDouble(),
          "delayedGeometryLoaded" to statistics.delayedGeometryLoaded.toDouble(),
          "fullyLoaded" to statistics.fullyLoaded.toDouble(),
          "fullyAppeared" to statistics.fullyAppeared.toDouble()
        )
      )
    }
  }

  init {
    maybeCreateMapView()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    ExpoYandexMapKitModule.registerView(this)
    maybeCreateMapView()
    startMap()
    emitMapReadyIfNeeded()
  }

  override fun onDetachedFromWindow() {
    ExpoYandexMapKitModule.unregisterView(this)
    stopMap()
    super.onDetachedFromWindow()
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    // The focus rect is in pixels and depends on the map size, so re-apply the map padding whenever
    // the view is resized — the first real size, a rotation, or a resized container.
    applyMapPadding()
  }

  /**
   * Called by the module (on the main thread) when initialize() resolves while this view is
   * already attached — the registry only contains attached views, so the view has a React tag,
   * the same guarantee onAttachedToWindow gives. Creating the map applies the pending nightMode
   * and cameraPosition values.
   */
  internal fun onMapKitInitialized() {
    maybeCreateMapView()
    startMap()
    emitMapReadyIfNeeded()
  }

  internal fun startMap() {
    if (isStarted || !ExpoYandexMapKitModule.isInitialized) {
      return
    }
    maybeCreateMapView()
    val view = mapView ?: return
    // The factory-level onStart/onStop is refcounted in the module (0→1 / 1→0 transitions);
    // the isStarted guard above keeps this view's +1/-1 contributions balanced on every path
    // (attach, detach, foreground, background, init recovery).
    ExpoYandexMapKitModule.onViewStarted()
    view.onStart()
    isStarted = true
  }

  internal fun stopMap() {
    if (!isStarted) {
      return
    }
    // isStarted implies mapView != null — startMap() only sets the flag after the map exists.
    mapView?.onStop()
    ExpoYandexMapKitModule.onViewStopped()
    isStarted = false
  }

  private fun emitMapReadyIfNeeded() {
    if (mapView != null && !mapReadyEmitted) {
      mapReadyEmitted = true
      onMapReady(emptyMap())
    }
  }

  internal fun setCameraPosition(position: CameraPositionRecord?) {
    pendingCameraPosition = position
    cameraPositionDirty = true
  }

  internal fun applyPendingCameraPosition(allowAnimation: Boolean = true) {
    if (!cameraPositionDirty) {
      return
    }
    // If the map does not exist yet, keep the value pending — it is applied on map creation.
    val map = mapView?.mapWindow?.map ?: return
    cameraPositionDirty = false
    val record = pendingCameraPosition ?: return
    val target = CameraPosition(
      Point(record.latitude, record.longitude),
      record.zoom.toFloat(),
      record.azimuth.toFloat(),
      record.tilt.toFloat()
    )
    if (isSameCameraPosition(map.cameraPosition, target)) {
      return
    }
    if (allowAnimation && animated) {
      map.move(target, Animation(Animation.Type.SMOOTH, CAMERA_ANIMATION_DURATION), null)
    } else {
      map.move(target)
    }
  }

  internal fun setNightMode(value: Boolean) {
    nightMode = value
    mapView?.mapWindow?.map?.isNightModeEnabled = value
  }

  internal fun setScrollGesturesEnabled(value: Boolean) {
    scrollGesturesEnabled = value
    applyGestureState()
  }

  internal fun setZoomGesturesEnabled(value: Boolean) {
    zoomGesturesEnabled = value
    applyGestureState()
  }

  internal fun setTiltGesturesEnabled(value: Boolean) {
    tiltGesturesEnabled = value
    applyGestureState()
  }

  internal fun setRotateGesturesEnabled(value: Boolean) {
    rotateGesturesEnabled = value
    applyGestureState()
  }

  internal fun setInteractiveDisabled(value: Boolean) {
    interactiveDisabled = value
    applyGestureState()
  }

  // Applies the effective movement-gesture state. Reads every stored value so the
  // result is order-independent within a prop batch: interactiveDisabled forces all
  // four off, otherwise each individual toggle applies.
  private fun applyGestureState() {
    val map = mapView?.mapWindow?.map ?: return
    val interactive = !interactiveDisabled
    map.isScrollGesturesEnabled = interactive && scrollGesturesEnabled
    map.isZoomGesturesEnabled = interactive && zoomGesturesEnabled
    map.isTiltGesturesEnabled = interactive && tiltGesturesEnabled
    map.isRotateGesturesEnabled = interactive && rotateGesturesEnabled
  }

  internal fun setFastTapEnabled(value: Boolean) {
    fastTapEnabled = value
    mapView?.mapWindow?.map?.isFastTapEnabled = value
  }

  internal fun setMinZoom(zoom: Double?) {
    minZoom = zoom?.toFloat()
    applyZoomBounds()
  }

  internal fun setMaxZoom(zoom: Double?) {
    maxZoom = zoom?.toFloat()
    applyZoomBounds()
  }

  // MapKit's cameraBounds exposes only a combined reset, so re-establish the full state each time:
  // reset both preferences, then re-apply whichever bound is set. This makes clearing one bound (its
  // prop set to undefined) restore MapKit's default for that bound while keeping the other.
  private fun applyZoomBounds() {
    val bounds = mapView?.mapWindow?.map?.cameraBounds ?: return
    bounds.resetMinMaxZoomPreference()
    minZoom?.let { bounds.setMinZoomPreference(it) }
    maxZoom?.let { bounds.setMaxZoomPreference(it) }
  }

  internal fun setMapType(type: YandexMapType) {
    mapType = type
    mapView?.mapWindow?.map?.mapType = type
  }

  internal fun setMapStyle(style: String?) {
    mapStyle = style
    applyMapStyle(mapView?.mapWindow?.map)
  }

  // Empty string clears the applied style; a non-empty string is a Yandex JSON style.
  // Matches iOS, which clears via the same empty-string id-0 form. setMapStyle returns
  // false only when the JSON is invalid.
  private fun applyMapStyle(map: YandexMap?) {
    val target = map ?: return
    val style = mapStyle ?: return
    if (style.isEmpty()) {
      target.setMapStyle("")
    } else if (!target.setMapStyle(style)) {
      Log.w(TAG, "mapStyle was rejected as invalid Yandex style JSON; it was not applied")
    }
  }

  internal fun setLogoPosition(position: LogoPositionRecord?) {
    logoPosition = position
    applyLogo(mapView?.mapWindow?.map)
  }

  internal fun setLogoPadding(padding: LogoPaddingRecord?) {
    logoPadding = padding
    applyLogo(mapView?.mapWindow?.map)
  }

  internal fun setMapPadding(padding: EdgePaddingRecord?) {
    mapPadding = padding
    applyMapPadding()
  }

  // Apply the persistent map-padding inset as the map window's focus rectangle. Only touches the
  // focus rect when a padding is set — when null, the focus rect is left alone (a fitMarkers call may
  // own it). The rect is in pixels, so this is re-run from onSizeChanged when the view is resized.
  private fun applyMapPadding() {
    val mapWindow = mapView?.mapWindow ?: return
    if (mapPadding == null) {
      return
    }
    mapWindow.focusRect = focusRect(mapPadding)
  }

  private fun applyLogo(map: YandexMap?) {
    val target = map ?: return
    logoPosition?.let {
      target.logo.setAlignment(LogoAlignment(it.horizontal.toYandex(), it.vertical.toYandex()))
    }
    logoPadding?.let {
      target.logo.setPadding(
        LogoPaddingNative(it.horizontal.toInt().coerceAtLeast(0), it.vertical.toInt().coerceAtLeast(0))
      )
    }
  }

  // Imperative functions (called from JS via the view ref).

  internal fun moveCamera(position: CameraPositionRecord, options: CameraMoveOptionsRecord) {
    val map = mapView?.mapWindow?.map ?: return
    val target = CameraPosition(
      Point(position.latitude, position.longitude),
      position.zoom.toFloat(),
      position.azimuth.toFloat(),
      position.tilt.toFloat()
    )
    moveCameraTo(target, options, map)
  }

  internal fun setZoom(zoom: Double, options: CameraMoveOptionsRecord) {
    val map = mapView?.mapWindow?.map ?: return
    val current = map.cameraPosition
    val target = CameraPosition(current.target, zoom.toFloat(), current.azimuth, current.tilt)
    moveCameraTo(target, options, map)
  }

  // Fit the camera so every point is visible. A single point just recenters at the
  // current zoom (a degenerate bounding box would otherwise snap to max zoom).
  internal fun fitMarkers(points: List<PointRecord>, options: CameraMoveOptionsRecord) {
    val map = mapView?.mapWindow?.map ?: return
    fitToPoints(points.map { Point(it.latitude, it.longitude) }, options, map)
  }

  // Fit every mounted <Marker> into view — direct children AND those inside a <Clusterer>. Reads the
  // markers' current geometry from the registry.
  internal fun fitAllMarkers(options: CameraMoveOptionsRecord) {
    val map = mapView?.mapWindow?.map ?: return
    val direct = childViews.filterIsInstance<ExpoYandexMapKitMarkerView>().mapNotNull { it.geoPoint() }
    val clustered = childViews.filterIsInstance<ExpoYandexMapKitClustererView>().flatMap { it.markerGeoPoints() }
    fitToPoints(direct + clustered, options, map)
  }

  // Fit the camera to a tapped cluster's placemarks. Reuses the fit-to-points path with default move
  // options (no edge padding). Called by a child <Clusterer> on a cluster tap.
  internal fun fitToClusterPoints(points: List<Point>) {
    val map = mapView?.mapWindow?.map ?: return
    fitToPoints(points, CameraMoveOptionsRecord(), map)
  }

  // Move the camera so every point is visible, optionally inset by options.edgePadding. A single
  // point just recenters at the current zoom (a degenerate bounding box would snap to max zoom).
  private fun fitToPoints(points: List<Point>, options: CameraMoveOptionsRecord, map: YandexMap) {
    if (points.isEmpty()) {
      return
    }
    val current = map.cameraPosition
    val target = if (points.size == 1) {
      CameraPosition(points[0], current.zoom, current.azimuth, current.tilt)
    } else {
      val boundingBox = BoundingBox(
        Point(points.minOf { it.latitude }, points.minOf { it.longitude }),
        Point(points.maxOf { it.latitude }, points.maxOf { it.longitude })
      )
      val geometry = Geometry.fromBoundingBox(boundingBox)
      // A fit with no edgePadding of its own falls back to the persistent mapPadding, so a fit never
      // silently discards the map's configured inset. An explicit edgePadding overrides it for this fit.
      val focus = focusRect(options.edgePadding ?: mapPadding)
      if (focus != null) {
        map.cameraPosition(geometry, focus, current.azimuth, current.tilt)
      } else {
        map.cameraPosition(geometry)
      }
    }
    moveCameraTo(target, options, map)
  }

  // The focus rectangle = the map viewport inset by the edge padding. The map's screen coordinates
  // are pixels, so the dp/point padding is scaled by the display density. Null when there is no
  // padding or the map has no size yet, so the fit falls back to the whole viewport.
  private fun focusRect(padding: EdgePaddingRecord?): ScreenRect? {
    if (padding == null) {
      return null
    }
    val view = mapView ?: return null
    val width = view.width.toFloat()
    val height = view.height.toFloat()
    if (width <= 0f || height <= 0f) {
      return null
    }
    val density = resources.displayMetrics.density
    // The focusRect's bottomRight corner must stay strictly inside the window (MapKit rejects a corner
    // on the edge as "out of screen"), so clamp right/bottom to width-1 / height-1 — as left/top already
    // are — and cap left/top at width-2 / height-2 so the rect never collapses (right > left).
    val left = (padding.left.toFloat() * density).coerceIn(0f, width - 2f)
    val top = (padding.top.toFloat() * density).coerceIn(0f, height - 2f)
    val right = (width - padding.right.toFloat() * density).coerceIn(left + 1f, width - 1f)
    val bottom = (height - padding.bottom.toFloat() * density).coerceIn(top + 1f, height - 1f)
    return ScreenRect(ScreenPoint(left, top), ScreenPoint(right, bottom))
  }

  private fun moveCameraTo(target: CameraPosition, options: CameraMoveOptionsRecord, map: YandexMap) {
    val duration = options.durationSeconds.toFloat().coerceAtLeast(0f)
    if (duration > 0f) {
      map.move(target, Animation(options.animation.toYandex(), duration), null)
    } else {
      map.move(target)
    }
  }

  // Draw MapKit's selection highlight around the POI/geo-object identified by `selection` (from an
  // onPoiTap event). Reconstructs the selection metadata from the opaque ids. No-op until the map is
  // ready.
  internal fun selectGeoObject(selection: GeoObjectSelectionRecord) {
    val map = mapView?.mapWindow?.map ?: return
    val metadata = GeoObjectSelectionMetadata(
      selection.objectId,
      selection.dataSourceName,
      selection.layerId,
      selection.groupId?.toLong()
    )
    map.selectGeoObject(metadata)
  }

  internal fun deselectGeoObject() {
    mapView?.mapWindow?.map?.deselectGeoObject()
  }

  // Add (or replace) a custom raster tile layer. Returns the overlay id (the caller's `id`, or a
  // generated one). Applied immediately if the map exists, else queued until it does.
  internal fun addTileOverlay(record: TileOverlayRecord): String {
    val id = record.id.ifEmpty { UUID.randomUUID().toString() }
    record.id = id
    removeTileOverlay(id)
    val map = mapView?.mapWindow?.map
    if (map != null) {
      applyTileOverlay(record, map)
    } else {
      pendingTileOverlays[id] = record
    }
    return id
  }

  internal fun removeTileOverlay(id: String) {
    pendingTileOverlays.remove(id)
    tileLayers.remove(id)?.remove()
  }

  private fun applyPendingTileOverlays() {
    val map = mapView?.mapWindow?.map ?: return
    val pending = pendingTileOverlays.toMap()
    pendingTileOverlays.clear()
    pending.values.forEach { applyTileOverlay(it, map) }
  }

  private fun applyTileOverlay(record: TileOverlayRecord, map: YandexMap) {
    val urlProvider = UrlProvider { tileId: TileId, _: Version, _: kotlin.collections.Map<String, String> ->
      record.urlTemplate
        .replace("{x}", tileId.x.toString())
        .replace("{y}", tileId.y.toString())
        .replace("{z}", tileId.z.toString())
    }
    val options = LayerOptions()
      .setActive(true)
      .setCacheable(record.cacheable)
      .setTransparent(record.transparent)
    val zoomRanges = listOf(ZoomRange(record.minZoom.coerceAtLeast(0), record.maxZoom.coerceAtLeast(0)))
    val layer = map.addTileLayer(
      record.id,
      options,
      CreateTileDataSource { builder ->
        builder.setTileUrlProvider(urlProvider)
        builder.setProjection(Projections.getWgs84Mercator())
        builder.setZoomRanges(zoomRanges)
        builder.setTileFormat(TileFormat.PNG)
      }
    )
    tileLayers[record.id] = layer
  }

  internal fun setIndoorEnabled(value: Boolean) {
    indoorEnabled = value
    mapView?.mapWindow?.map?.isIndoorEnabled = value
  }

  // Set the active floor of the focused indoor plan. No-op until a plan is focused
  // (onIndoorPlanFocused) — pass one of the level ids from that event.
  internal fun setIndoorLevel(levelId: String) {
    activeIndoorPlan?.activeLevelId = levelId
  }

  internal fun currentCameraPosition(): Map<String, Any>? {
    val map = mapView?.mapWindow?.map ?: return null
    return cameraPositionPayload(map.cameraPosition)
  }

  internal fun currentVisibleRegion(): Map<String, Any>? {
    val region = mapView?.mapWindow?.map?.visibleRegion ?: return null
    return mapOf(
      "topLeft" to coordinatePayload(region.topLeft),
      "topRight" to coordinatePayload(region.topRight),
      "bottomLeft" to coordinatePayload(region.bottomLeft),
      "bottomRight" to coordinatePayload(region.bottomRight)
    )
  }

  // world -> screen. An unprojectable point (behind the camera / off the globe) becomes
  // null, surfacing as `null` in the returned JS array.
  internal fun screenPoints(worldPoints: List<PointRecord>): List<Any?> {
    val window = mapView?.mapWindow ?: return worldPoints.map { null }
    return worldPoints.map { point ->
      val screen = window.worldToScreen(Point(point.latitude, point.longitude)) ?: return@map null
      mapOf("x" to screen.x.toDouble(), "y" to screen.y.toDouble())
    }
  }

  // screen -> world. An unprojectable screen point becomes null (JS `null`).
  internal fun worldPoints(screenPoints: List<ScreenPointRecord>): List<Any?> {
    val window = mapView?.mapWindow ?: return screenPoints.map { null }
    return screenPoints.map { point ->
      val world = window.screenToWorld(ScreenPoint(point.x.toFloat(), point.y.toFloat())) ?: return@map null
      coordinatePayload(world)
    }
  }

  // Capture the currently-rendered map as a base64 PNG data URI (usable directly in <Image>), via
  // MapKit's own MapView.getScreenshot(). Returns null if the map isn't ready / can't be captured.
  // Must run on the main thread.
  internal fun takeSnapshot(): String? {
    val bitmap = mapView?.screenshot ?: return null
    val stream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
    return "data:image/png;base64," + Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
  }

  private fun coordinatePayload(point: Point): Map<String, Any> =
    mapOf("latitude" to point.latitude, "longitude" to point.longitude)

  private fun cameraPositionPayload(cameraPosition: CameraPosition): Map<String, Any> = mapOf(
    "latitude" to cameraPosition.target.latitude,
    "longitude" to cameraPosition.target.longitude,
    "zoom" to cameraPosition.zoom.toDouble(),
    "azimuth" to cameraPosition.azimuth.toDouble(),
    "tilt" to cameraPosition.tilt.toDouble()
  )

  // Child <Marker> management. Called from the module's GroupView actions. Markers are tracked in
  // [markerViews] (not added to the Android view hierarchy). Each is backed by a PlacemarkMapObject
  // created from the map's collection once the map exists.

  internal fun addChildView(child: View, index: Int) {
    childViews.add(index.coerceIn(0, childViews.size), child)
    attachChild(child)
  }

  internal fun removeChildViewAt(index: Int) {
    val child = childViews.getOrNull(index) ?: return
    childViews.removeAt(index)
    detachChild(child)
  }

  internal fun removeChildView(child: View) {
    if (childViews.remove(child)) {
      detachChild(child)
    }
  }

  internal fun childViewCount(): Int = childViews.size

  internal fun childViewAt(index: Int): View? = childViews.getOrNull(index)

  // Attach a child's map object to the collection. No-op if the map is not ready (the child stays
  // in the list and is attached later by attachPendingChildren) or already attached.
  private fun attachChild(child: View) {
    val collection = mapView?.mapWindow?.map?.mapObjects ?: return
    (child as? MapObjectChild)?.let {
      // A clusterer needs this map view to fit the camera on a cluster tap.
      (child as? ExpoYandexMapKitClustererView)?.bindMapView(this)
      if (!it.isAttachedToMap) {
        it.attachToMap(collection)
      }
    }
  }

  private fun detachChild(child: View) {
    val collection = mapView?.mapWindow?.map?.mapObjects ?: return
    (child as? MapObjectChild)?.detachFromMap(collection)
    (child as? ExpoYandexMapKitClustererView)?.unbindMapView()
  }

  private fun attachPendingChildren() {
    childViews.forEach { attachChild(it) }
  }

  // User location & traffic layers (lazily created; need the map window).

  internal fun setShowUserPosition(value: Boolean) {
    showUserPosition = value
    applyUserLocation()
  }

  internal fun setFollowUser(value: Boolean) {
    followUser = value
    applyUserLocation()
  }

  internal fun setTrafficVisible(value: Boolean) {
    trafficVisible = value
    applyTraffic()
  }

  internal fun setUserLocationIcon(uri: String?) {
    if (uri != userLocationIconUri) {
      userLocationIconUri = uri
      // The icon changed — drop the cached bitmap so it (re)loads on the next style pass.
      appliedUserLocationIconUri = null
      userLocationIconBitmap = null
    }
    applyUserLocationStyle()
  }

  internal fun setUserLocationIconScale(scale: Float) {
    userLocationIconScale = scale
    applyUserLocationStyle()
  }

  internal fun setUserLocationAccuracyFillColor(color: Int?) {
    userLocationAccuracyFillColor = color
    applyUserLocationStyle()
  }

  internal fun setUserLocationAccuracyStrokeColor(color: Int?) {
    userLocationAccuracyStrokeColor = color
    applyUserLocationStyle()
  }

  internal fun setUserLocationAccuracyStrokeWidth(width: Float) {
    userLocationAccuracyStrokeWidth = width
    applyUserLocationStyle()
  }

  private fun applyUserLocation() {
    val mapWindow = mapView?.mapWindow ?: return
    val layer = userLocationLayer
      ?: MapKitFactory.getInstance().createUserLocationLayer(mapWindow).also {
        userLocationLayer = it
        // MapKit holds the listener weakly (matches setMapLoadedListener); the strong field keeps it.
        it.setObjectListener(WeakReference(userLocationObjectListener))
      }
    layer.isVisible = showUserPosition
    val view = mapView
    if (showUserPosition && followUser && view != null && view.width > 0 && view.height > 0) {
      // Anchoring the layer keeps the user dot centered — the map follows the user. setAnchor
      // takes screen offsets as PointF (in pixels), not ScreenPoint.
      val center = PointF(view.width / 2f, view.height / 2f)
      layer.setAnchor(center, center)
    } else {
      layer.resetAnchor()
    }
  }

  // Apply the custom icon + accuracy-circle styling to the current location dot. No-op until the dot
  // exists (the object listener hands over its UserLocationView). Unset values leave MapKit's defaults.
  private fun applyUserLocationStyle() {
    val view = userLocationView ?: return
    val circle: CircleMapObject = view.accuracyCircle
    userLocationAccuracyFillColor?.let { circle.fillColor = it }
    userLocationAccuracyStrokeColor?.let { circle.strokeColor = it }
    userLocationAccuracyStrokeWidth?.let { circle.strokeWidth = it }

    val uri = userLocationIconUri
    if (uri.isNullOrEmpty()) {
      return
    }
    val bitmap = userLocationIconBitmap
    if (bitmap != null && uri == appliedUserLocationIconUri) {
      applyUserLocationIcon(view, bitmap)
      return
    }
    if (uri == appliedUserLocationIconUri) {
      // Same icon already loading — the load callback will apply it. Avoid a duplicate load.
      return
    }
    appliedUserLocationIconUri = uri
    MarkerImageLoader.load(context, uri) { loaded ->
      // Ignore a late load if the icon changed again meanwhile; re-read the view in case it changed.
      if (loaded != null && uri == appliedUserLocationIconUri) {
        userLocationIconBitmap = loaded
        userLocationView?.let { applyUserLocationIcon(it, loaded) }
      }
    }
  }

  // Set the loaded bitmap as the dot's icon on both the resting pin and the heading arrow, at the
  // configured scale, so the custom icon shows regardless of whether a heading is available.
  private fun applyUserLocationIcon(view: UserLocationView, bitmap: Bitmap) {
    val provider = ImageProvider.fromBitmap(bitmap)
    val style = IconStyle().apply { scale = userLocationIconScale }
    // Set icon then style separately (matches the <Marker> view) rather than the 2-arg setIcon.
    view.pin.setIcon(provider)
    view.pin.setIconStyle(style)
    view.arrow.setIcon(provider)
    view.arrow.setIconStyle(style)
  }

  private fun applyTraffic() {
    val mapWindow = mapView?.mapWindow ?: return
    val layer = trafficLayer
      ?: MapKitFactory.getInstance().createTrafficLayer(mapWindow).also {
        trafficLayer = it
        it.addTrafficListener(WeakReference(trafficListener))
      }
    layer.isTrafficVisible = trafficVisible
  }

  private fun maybeCreateMapView() {
    if (mapView != null) {
      return
    }
    if (!ExpoYandexMapKitModule.isInitialized) {
      if (!warnedNotInitialized) {
        warnedNotInitialized = true
        Log.w(TAG, "MapKit is not initialized yet — set a build-time apiKey via the config plugin, or call initialize(apiKey). The view stays empty until MapKit initializes, then recovers automatically.")
      }
      return
    }
    val view = MapView(context)
    mapView = view
    addView(view, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    val map = view.mapWindow.map
    // Since MapKit 4.41 the add*Listener APIs take an explicit WeakReference — the strong
    // cameraListener/inputListener fields on this view keep the listeners alive.
    map.addCameraListener(WeakReference(cameraListener))
    map.addInputListener(WeakReference(inputListener))
    map.addTapListener(WeakReference(geoObjectTapListener))
    map.setMapLoadedListener(WeakReference(mapLoadedListener))
    map.addIndoorStateListener(WeakReference(indoorStateListener))
    map.isIndoorEnabled = indoorEnabled
    map.isNightModeEnabled = nightMode
    applyGestureState()
    map.isFastTapEnabled = fastTapEnabled
    if (minZoom != null || maxZoom != null) {
      applyZoomBounds()
    }
    mapType?.let { map.mapType = it }
    applyMapStyle(map)
    applyLogo(map)
    applyMapPadding()
    // The initial camera position is applied instantly — the map has not been shown yet.
    applyPendingCameraPosition(allowAnimation = false)
    // Wire up any <Marker> children that mounted before the map existed.
    attachPendingChildren()
    // Apply any tile overlays added before the map existed.
    applyPendingTileOverlays()
    // Apply user-location / traffic props set before the map was created.
    if (showUserPosition || followUser) {
      applyUserLocation()
    }
    if (trafficVisible) {
      applyTraffic()
    }
    if (isAttachedToWindow) {
      // React Native has already laid this view out; measure the freshly added child manually.
      post { measureAndLayout() }
    }
  }

  private fun isSameCameraPosition(current: CameraPosition, next: CameraPosition): Boolean {
    return abs(current.target.latitude - next.target.latitude) < CAMERA_EQUALITY_TOLERANCE &&
      abs(current.target.longitude - next.target.longitude) < CAMERA_EQUALITY_TOLERANCE &&
      abs(current.zoom - next.zoom) < CAMERA_EQUALITY_TOLERANCE &&
      abs(current.azimuth - next.azimuth) < CAMERA_EQUALITY_TOLERANCE &&
      abs(current.tilt - next.tilt) < CAMERA_EQUALITY_TOLERANCE
  }

  // Emit onTrafficChanged with the current region's traffic score. A null level (loading / expired /
  // no data) surfaces as { available: false }.
  private fun dispatchTrafficChanged(level: TrafficLevel?) {
    if (level == null) {
      onTrafficChanged(mapOf("available" to false))
      return
    }
    val color = when (level.color) {
      TrafficColor.RED -> "red"
      TrafficColor.YELLOW -> "yellow"
      TrafficColor.GREEN -> "green"
    }
    onTrafficChanged(
      mapOf("available" to true, "level" to level.level, "color" to color)
    )
  }

  private fun pointPayload(point: Point): Map<String, Any> {
    return mapOf(
      "point" to mapOf(
        "latitude" to point.latitude,
        "longitude" to point.longitude
      )
    )
  }

  // Build the onPoiTap payload: the selection token (opaque ids for selectGeoObject) plus the
  // object's name and first point geometry, when present.
  private fun poiTapPayload(
    geoObject: GeoObject,
    selection: GeoObjectSelectionMetadata
  ): Map<String, Any?> {
    val selectionPayload = mutableMapOf<String, Any?>(
      "objectId" to selection.objectId,
      "dataSourceName" to selection.dataSourceName,
      "layerId" to selection.layerId
    )
    selection.groupId?.let { selectionPayload["groupId"] = it.toDouble() }

    val payload = mutableMapOf<String, Any?>("selection" to selectionPayload)
    geoObject.name?.let { payload["name"] = it }
    geoObject.geometry.firstOrNull { it.point != null }?.point?.let { point ->
      payload["point"] = mapOf("latitude" to point.latitude, "longitude" to point.longitude)
    }
    return payload
  }
}
