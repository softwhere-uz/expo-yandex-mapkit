package expo.modules.yandexmapkit

import android.content.Context
import android.util.Log
import com.yandex.mapkit.Animation
import com.yandex.mapkit.geometry.Point
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
  // Base map layer defaults to Yandex's own default (MAP); mapStyle is null until set,
  // so an unset style never touches the map.
  private var mapType: YandexMapType = YandexMapType.MAP
  private var mapStyle: String? = null
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
    mapView?.mapWindow?.map?.isScrollGesturesEnabled = value
  }

  internal fun setZoomGesturesEnabled(value: Boolean) {
    zoomGesturesEnabled = value
    mapView?.mapWindow?.map?.isZoomGesturesEnabled = value
  }

  internal fun setTiltGesturesEnabled(value: Boolean) {
    tiltGesturesEnabled = value
    mapView?.mapWindow?.map?.isTiltGesturesEnabled = value
  }

  internal fun setRotateGesturesEnabled(value: Boolean) {
    rotateGesturesEnabled = value
    mapView?.mapWindow?.map?.isRotateGesturesEnabled = value
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

  // Empty string clears a previously applied style; a non-empty string is a Yandex
  // JSON style. setMapStyle returns false when the JSON is invalid.
  private fun applyMapStyle(map: YandexMap?) {
    val target = map ?: return
    val style = mapStyle ?: return
    if (style.isEmpty()) {
      target.setMapStyle("")
    } else if (!target.setMapStyle(style)) {
      Log.w(TAG, "mapStyle was rejected as invalid Yandex style JSON; it was not applied")
    }
  }

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
    map.isScrollGesturesEnabled = scrollGesturesEnabled
    map.isZoomGesturesEnabled = zoomGesturesEnabled
    map.isTiltGesturesEnabled = tiltGesturesEnabled
    map.isRotateGesturesEnabled = rotateGesturesEnabled
    map.isFastTapEnabled = fastTapEnabled
    map.mapType = mapType
    applyMapStyle(map)
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
