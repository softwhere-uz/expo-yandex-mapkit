package expo.modules.yandexmapkit

import android.content.Context
import android.util.Log
import com.yandex.mapkit.Animation
import com.yandex.mapkit.ScreenPoint
import com.yandex.mapkit.geometry.BoundingBox
import com.yandex.mapkit.geometry.Geometry
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.logo.Alignment as LogoAlignment
import com.yandex.mapkit.logo.HorizontalAlignment
import com.yandex.mapkit.logo.Padding as LogoPaddingNative
import com.yandex.mapkit.logo.VerticalAlignment
import com.yandex.mapkit.map.CameraListener
import com.yandex.mapkit.map.CameraPosition
import com.yandex.mapkit.map.CameraUpdateReason
import com.yandex.mapkit.map.InputListener
import com.yandex.mapkit.map.Map as YandexMap
import com.yandex.mapkit.map.MapType as YandexMapType
import com.yandex.mapkit.mapview.MapView
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

enum class CameraAnimationOption(val value: String) : Enumerable {
  smooth("smooth"),
  linear("linear");

  fun toYandex(): Animation.Type = when (this) {
    smooth -> Animation.Type.SMOOTH
    linear -> Animation.Type.LINEAR
  }
}

// Options for the imperative setCenter() move.
class CameraMoveOptionsRecord : Record {
  @Field
  var durationSeconds: Double = 0.3

  @Field
  var animation: CameraAnimationOption = CameraAnimationOption.smooth
}

class ExpoYandexMapKitView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onMapReady by EventDispatcher<Map<String, Any>>()
  private val onCameraPositionChanged by EventDispatcher<Map<String, Any>>()
  private val onMapPress by EventDispatcher<Map<String, Any>>()
  private val onMapLongPress by EventDispatcher<Map<String, Any>>()

  internal var animated = true

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
  private var pendingCameraPosition: CameraPositionRecord? = null
  private var cameraPositionDirty = false

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
    if (points.isEmpty()) {
      return
    }
    val current = map.cameraPosition
    val target = if (points.size == 1) {
      CameraPosition(
        Point(points[0].latitude, points[0].longitude),
        current.zoom,
        current.azimuth,
        current.tilt
      )
    } else {
      val boundingBox = BoundingBox(
        Point(points.minOf { it.latitude }, points.minOf { it.longitude }),
        Point(points.maxOf { it.latitude }, points.maxOf { it.longitude })
      )
      map.cameraPosition(Geometry.fromBoundingBox(boundingBox))
    }
    moveCameraTo(target, options, map)
  }

  private fun moveCameraTo(target: CameraPosition, options: CameraMoveOptionsRecord, map: YandexMap) {
    val duration = options.durationSeconds.toFloat().coerceAtLeast(0f)
    if (duration > 0f) {
      map.move(target, Animation(options.animation.toYandex(), duration), null)
    } else {
      map.move(target)
    }
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

  private fun coordinatePayload(point: Point): Map<String, Any> =
    mapOf("latitude" to point.latitude, "longitude" to point.longitude)

  private fun cameraPositionPayload(cameraPosition: CameraPosition): Map<String, Any> = mapOf(
    "latitude" to cameraPosition.target.latitude,
    "longitude" to cameraPosition.target.longitude,
    "zoom" to cameraPosition.zoom.toDouble(),
    "azimuth" to cameraPosition.azimuth.toDouble(),
    "tilt" to cameraPosition.tilt.toDouble()
  )

  private fun maybeCreateMapView() {
    if (mapView != null) {
      return
    }
    if (!ExpoYandexMapKitModule.isInitialized) {
      if (!warnedNotInitialized) {
        warnedNotInitialized = true
        Log.w(TAG, "MapKit is not initialized — call initialize(apiKey) before rendering YandexMapView. The view stays empty.")
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
    map.isNightModeEnabled = nightMode
    applyGestureState()
    map.isFastTapEnabled = fastTapEnabled
    mapType?.let { map.mapType = it }
    applyMapStyle(map)
    applyLogo(map)
    // The initial camera position is applied instantly — the map has not been shown yet.
    applyPendingCameraPosition(allowAnimation = false)
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

  private fun pointPayload(point: Point): Map<String, Any> {
    return mapOf(
      "point" to mapOf(
        "latitude" to point.latitude,
        "longitude" to point.longitude
      )
    )
  }
}
