import ExpoModulesCore
import YandexMapsMobile

// Clusterer defaults (file-scope so they can seed the stored properties below and back the `?? default`
// fallbacks in the setters). #3478F6 fill, white bold count.
private let clustererDefaultColor = UIColor(red: 52.0 / 255.0, green: 120.0 / 255.0, blue: 246.0 / 255.0, alpha: 1.0)
private let clustererDefaultTextColor = UIColor.white
private let clustererDefaultRadius = 60.0
private let clustererDefaultMinZoom: UInt = 12
private let clustererDefaultTextSize: CGFloat = 13
private let clustererDefaultSize: CGFloat = 36

// Offset (in points) for the count text within the cluster badge — positive x → right, y → down.
internal struct ClusterOffsetRecord: Record {
  @Field var x: Double = 0
  @Field var y: Double = 0
}

// A `<Clusterer>`. An (invisible) ExpoView that groups its `<Marker>` children into a MapKit
// YMKClusterizedPlacemarkCollection. It is itself a MapObjectChild — attaching to the map creates its
// cluster collection off the map's root collection, and its own `<Marker>` children then attach to
// *that* collection (attachToCluster) instead of the root, so they participate in clustering. Marker
// changes (add / remove / move) coalesce into one clusterPlacemarks() pass per run-loop turn.
class ExpoYandexMapKitClustererView: ExpoView, MapObjectChild {
  let onClusterPress = EventDispatcher()

  private var clusterCollection: YMKClusterizedPlacemarkCollection?
  // The map's root collection (passed to attachToMap). Kept so a marker with `excludeFromCluster`
  // can be attached here — as a standalone placemark — instead of the cluster collection.
  private var rootCollection: YMKMapObjectCollection?
  // Markers currently attached to the root collection (excluded from clustering), by identity. Lets
  // detach remove each marker from the collection it actually lives in, even across an exclusion flip.
  private var excludedMarkers = Set<ObjectIdentifier>()
  // MapKit holds listeners weakly — keep them strongly retained here. This view is itself kept alive
  // by the map view's child list while mounted, and each listener holds only a weak back-reference,
  // so there is no retain cycle.
  private var clusterListener: ClusterListener?
  private var clusterTapListener: ClusterTapListener?
  // The map view that owns this clusterer, for the tap-to-fit camera move. Weak: the map view owns
  // this view (via its child list), so a strong ref would be a retain cycle.
  weak var ownerMapView: ExpoYandexMapKitView?

  // Clustering config. Setters re-cluster so a change takes effect — clusterPlacemarks() re-runs
  // onClusterAdded, which re-renders every badge with the current style.
  private var clusterRadius = clustererDefaultRadius
  private var minZoom = clustererDefaultMinZoom
  private var clusterColor = clustererDefaultColor
  private var clusterTextColor = clustererDefaultTextColor
  private var clusterTextSize = clustererDefaultTextSize
  private var clusterSize = clustererDefaultSize
  private var fitOnPress = true

  // Custom badge icon (replaces the drawn disc). Loaded async by URI (the marker convention); once
  // loaded, a recluster re-runs onClusterAdded so every badge redraws with the image. The count text
  // is still composited on top at `clusterTextOffset` (points from center).
  private var clusterIconSource: String?
  private var appliedClusterIconSource: String?
  private var clusterIconImage: UIImage?
  private var clusterTextOffset = CGPoint.zero

  // Child <Marker> views in mount order. Managed through Fabric's child hooks (like the map view's
  // own children) — they are not added to the view hierarchy; each drives a clustered placemark. A
  // marker mounted before this clusterer attaches stays here un-attached, wired up in attachToMap.
  private var childMarkers: [UIView] = []
  private var reclusterScheduled = false

  // MARK: - MapObjectChild

  func attachToMap(_ collection: YMKMapObjectCollection) {
    guard clusterCollection == nil else {
      return
    }
    // Keep the root collection first — attachMarker routes excluded markers into it.
    rootCollection = collection
    let listener = ClusterListener(view: self)
    clusterListener = listener
    let created = collection.addClusterizedPlacemarkCollection(with: listener)
    clusterCollection = created
    childMarkers.forEach { attachMarker($0) }
    scheduleRecluster()
  }

  func detachFromMap(_ collection: YMKMapObjectCollection) {
    guard let created = clusterCollection else {
      return
    }
    childMarkers.forEach { detachMarker($0) }
    collection.remove(with: created)
    clusterCollection = nil
    rootCollection = nil
    excludedMarkers.removeAll()
    clusterListener = nil
    clusterTapListener = nil
  }

  var isAttachedToMap: Bool { clusterCollection != nil }

  // The geographic positions of every clustered marker, for the map's fitAllMarkers().
  var markerGeoPoints: [YMKPoint] {
    childMarkers.compactMap { ($0 as? ExpoYandexMapKitMarkerView)?.geoPoint }
  }

  // MARK: - Marker children (Fabric child hooks)

  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard childComponentView is MapObjectChild else {
      super.mountChildComponentView(childComponentView, index: index)
      return
    }
    let safeIndex = min(max(index, 0), childMarkers.count)
    childMarkers.insert(childComponentView, at: safeIndex)
    attachMarker(childComponentView)
    scheduleRecluster()
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard childComponentView is MapObjectChild else {
      super.unmountChildComponentView(childComponentView, index: index)
      return
    }
    if let idx = childMarkers.firstIndex(where: { $0 === childComponentView }) {
      childMarkers.remove(at: idx)
    }
    detachMarker(childComponentView)
    scheduleRecluster()
  }

  private func attachMarker(_ child: UIView) {
    guard let marker = child as? ExpoYandexMapKitMarkerView else {
      return
    }
    // A marker move must re-cluster; route the marker's geometry change back to this clusterer.
    marker.onGeometryChanged = { [weak self] in self?.scheduleRecluster() }
    // A flip of excludeFromCluster after attach re-routes this marker between the two collections.
    marker.onExclusionChanged = { [weak self, weak marker] in
      guard let self = self, let marker = marker else {
        return
      }
      self.detachMarker(marker)
      self.attachMarker(marker)
      self.scheduleRecluster()
    }
    if marker.excludeFromCluster, let root = rootCollection {
      // Excluded: a standalone placemark on the map's root collection — never clustered.
      marker.attachToMap(root)
      excludedMarkers.insert(ObjectIdentifier(marker))
    } else if let collection = clusterCollection {
      marker.attachToCluster(collection)
    }
  }

  private func detachMarker(_ child: UIView) {
    guard let marker = child as? ExpoYandexMapKitMarkerView else {
      return
    }
    marker.onGeometryChanged = nil
    marker.onExclusionChanged = nil
    let id = ObjectIdentifier(marker)
    if excludedMarkers.contains(id) {
      if let root = rootCollection {
        marker.detachFromMap(root)
      }
      excludedMarkers.remove(id)
    } else if let collection = clusterCollection {
      marker.detachFromCluster(collection)
    }
  }

  // Coalesce re-clustering to once per run-loop turn — adding N markers in one commit triggers a
  // single clusterPlacemarks() rather than N. No-op until the cluster collection exists.
  private func scheduleRecluster() {
    guard !reclusterScheduled else {
      return
    }
    reclusterScheduled = true
    DispatchQueue.main.async { [weak self] in
      guard let self = self else {
        return
      }
      self.reclusterScheduled = false
      self.clusterCollection?.clusterPlacemarks(withClusterRadius: self.clusterRadius, minZoom: self.minZoom)
    }
  }

  // MARK: - Props

  func setClusterRadius(_ value: Double) {
    clusterRadius = value > 0 ? value : clustererDefaultRadius
    scheduleRecluster()
  }

  func setMinZoom(_ value: Double) {
    minZoom = value.isFinite && value >= 0 ? UInt(value) : clustererDefaultMinZoom
    scheduleRecluster()
  }

  func setClusterColor(_ value: UIColor?) {
    clusterColor = value ?? clustererDefaultColor
    scheduleRecluster()
  }

  func setClusterTextColor(_ value: UIColor?) {
    clusterTextColor = value ?? clustererDefaultTextColor
    scheduleRecluster()
  }

  func setClusterTextSize(_ value: Double) {
    clusterTextSize = value > 0 ? CGFloat(value) : clustererDefaultTextSize
    scheduleRecluster()
  }

  func setClusterSize(_ value: Double) {
    clusterSize = value > 0 ? CGFloat(value) : clustererDefaultSize
    scheduleRecluster()
  }

  func setFitOnPress(_ value: Bool) {
    fitOnPress = value
  }

  func setClusterIcon(_ uri: String?) {
    if uri != clusterIconSource {
      clusterIconSource = uri
      // The icon changed — drop the cached image so it (re)loads (or clears) on the next pass.
      appliedClusterIconSource = nil
      clusterIconImage = nil
      loadClusterIconIfNeeded()
    }
  }

  func setClusterTextOffset(_ offset: ClusterOffsetRecord?) {
    clusterTextOffset = CGPoint(x: offset?.x ?? 0, y: offset?.y ?? 0)
    scheduleRecluster()
  }

  // Load the badge icon by URI (async, off the main thread) and, once decoded, recluster so every
  // badge redraws with it. Clearing the icon reclusters immediately to restore the drawn disc.
  private func loadClusterIconIfNeeded() {
    guard let source = clusterIconSource, !source.isEmpty else {
      scheduleRecluster()
      return
    }
    if source == appliedClusterIconSource {
      return
    }
    appliedClusterIconSource = source
    MarkerImageLoader.load(source) { [weak self] image in
      guard let self = self, let image = image, source == self.appliedClusterIconSource else {
        return
      }
      self.clusterIconImage = image
      self.scheduleRecluster()
    }
  }

  // MARK: - Cluster callbacks (invoked by the listener objects below)

  fileprivate func handleClusterAdded(_ cluster: YMKCluster) {
    cluster.appearance.setIconWith(renderClusterBadge(count: Int(cluster.size)))
    let listener: ClusterTapListener
    if let existing = clusterTapListener {
      listener = existing
    } else {
      listener = ClusterTapListener(view: self)
      clusterTapListener = listener
    }
    cluster.addClusterTapListener(with: listener)
  }

  fileprivate func handleClusterTap(_ cluster: YMKCluster) -> Bool {
    let center = cluster.appearance.geometry
    onClusterPress([
      "size": Int(cluster.size),
      "point": ["latitude": center.latitude, "longitude": center.longitude],
    ])
    if fitOnPress {
      ownerMapView?.fitToClusterPoints(cluster.placemarks.map { $0.geometry })
    }
    // Consume so a cluster tap never also falls through to the map's onMapPress.
    return true
  }

  // A cluster badge with the count drawn on top. When a `clusterIcon` image is set it is used as the
  // badge (at its own size); otherwise a filled disc of clusterColor with a thin white border is
  // drawn (growing for 3+ digit counts so long numbers still fit). The renderer works in points and
  // rasterizes at the screen scale automatically.
  private func renderClusterBadge(count: Int) -> UIImage {
    let label = String(count)
    if let icon = clusterIconImage {
      let renderer = UIGraphicsImageRenderer(size: icon.size)
      return renderer.image { _ in
        icon.draw(in: CGRect(origin: .zero, size: icon.size))
        drawCount(label, in: icon.size)
      }
    }
    let extraDigits = max(0, label.count - 2)
    let diameter = clusterSize + CGFloat(extraDigits) * 8
    let size = CGSize(width: diameter, height: diameter)
    let renderer = UIGraphicsImageRenderer(size: size)
    return renderer.image { context in
      let cg = context.cgContext
      let rect = CGRect(origin: .zero, size: size)
      UIColor.white.setFill()
      cg.fillEllipse(in: rect)
      clusterColor.setFill()
      cg.fillEllipse(in: rect.insetBy(dx: 2, dy: 2))
      drawCount(label, in: size)
    }
  }

  // Draw the count centered in bold within `size`, shifted by clusterTextOffset (points). Shared by
  // the disc and icon badges.
  private func drawCount(_ label: String, in size: CGSize) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    let attributes: [NSAttributedString.Key: Any] = [
      .font: UIFont.boldSystemFont(ofSize: clusterTextSize),
      .foregroundColor: clusterTextColor,
      .paragraphStyle: paragraph,
    ]
    let text = label as NSString
    let textSize = text.size(withAttributes: attributes)
    let textRect = CGRect(
      x: clusterTextOffset.x,
      y: (size.height - textSize.height) / 2 + clusterTextOffset.y,
      width: size.width,
      height: textSize.height)
    text.draw(in: textRect, withAttributes: attributes)
  }
}

// MARK: - Listeners

// MapKit's cluster protocols are Objective-C, so the conforming classes inherit from NSObject. They
// hold only a weak view reference, mirroring the map view's CameraListener/InputListener pattern.

private final class ClusterListener: NSObject, YMKClusterListener {
  private weak var view: ExpoYandexMapKitClustererView?

  init(view: ExpoYandexMapKitClustererView) {
    self.view = view
  }

  func onClusterAdded(with cluster: YMKCluster) {
    view?.handleClusterAdded(cluster)
  }
}

private final class ClusterTapListener: NSObject, YMKClusterTapListener {
  private weak var view: ExpoYandexMapKitClustererView?

  init(view: ExpoYandexMapKitClustererView) {
    self.view = view
  }

  func onClusterTap(with cluster: YMKCluster) -> Bool {
    return view?.handleClusterTap(cluster) ?? false
  }
}
