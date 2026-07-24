import Foundation
import UIKit

// Loads a marker icon from the URI the JS layer resolved (via Image.resolveAssetSource):
//   - http(s):// — fetched off the main thread (Metro dev-server assets arrive this way),
//   - data:image;base64 — decoded inline,
//   - file:// — read from disk,
//   - otherwise treated as a bundled image name (release builds of require()d assets).
// Decoded images are cached by URI; the completion always runs on the main queue (where MapKit
// objects must be touched).
internal enum MarkerImageLoader {
  private static let cache = NSCache<NSString, UIImage>()

  static func load(_ source: String, completion: @escaping (UIImage?) -> Void) {
    if let cached = cache.object(forKey: source as NSString) {
      completion(cached)
      return
    }
    DispatchQueue.global(qos: .userInitiated).async {
      let image = decode(source)
      DispatchQueue.main.async {
        if let image = image {
          cache.setObject(image, forKey: source as NSString)
        }
        completion(image)
      }
    }
  }

  private static func decode(_ source: String) -> UIImage? {
    if source.hasPrefix("http://") || source.hasPrefix("https://") {
      guard let url = URL(string: source), let data = try? Data(contentsOf: url) else {
        return nil
      }
      return UIImage(data: data)
    }
    if source.hasPrefix("data:image") {
      guard let comma = source.firstIndex(of: ","),
        let data = Data(base64Encoded: String(source[source.index(after: comma)...]))
      else {
        return nil
      }
      return UIImage(data: data)
    }
    if source.hasPrefix("file://") {
      return UIImage(contentsOfFile: String(source.dropFirst("file://".count)))
    }
    return UIImage(named: source)
  }
}
