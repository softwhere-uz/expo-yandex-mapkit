import { Clusterer, initialize, Marker, YandexMapView } from 'expo-yandex-mapkit';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const API_KEY = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY ?? 'YOUR_MAPKIT_API_KEY';

const TASHKENT = { latitude: 41.311081, longitude: 69.240562, zoom: 12 };

// A deterministic golden-angle scatter of points around Tashkent to demonstrate clustering — dense
// enough that several merge into clusters at the initial zoom, and split apart as you zoom in.
const CLUSTER_POINTS = Array.from({ length: 40 }, (_, i) => {
  const angle = i * 2.399963; // golden angle (radians) — spreads points without clumping
  const radius = 0.004 + (i % 8) * 0.013;
  return {
    latitude: TASHKENT.latitude + Math.sin(angle) * radius,
    longitude: TASHKENT.longitude + Math.cos(angle) * radius * 1.4,
  };
});

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [showClusters, setShowClusters] = useState(true);

  useEffect(() => {
    initialize(API_KEY)
      .then(() => setIsInitialized(true))
      .catch((error) => console.log('Failed to initialize Yandex MapKit:', error));
  }, []);

  return (
    <View style={styles.container}>
      {isInitialized ? (
        <YandexMapView
          style={styles.map}
          cameraPosition={TASHKENT}
          nightMode={nightMode}
          onMapReady={(event) => console.log('onMapReady', event.nativeEvent)}
          onCameraPositionChanged={(event) => console.log('onCameraPositionChanged', event.nativeEvent)}
          onMapPress={(event) => console.log('onMapPress', event.nativeEvent)}
          onMapLongPress={(event) => console.log('onMapLongPress', event.nativeEvent)}>
          <Marker
            point={{ latitude: TASHKENT.latitude, longitude: TASHKENT.longitude }}
            source={require('./assets/favicon.png')}
            anchor={{ x: 0.5, y: 0.5 }}
            identifier="tashkent-center"
            onPress={(event) => console.log('onMarkerPress', event.nativeEvent)}
          />
          {/* A custom React-children marker (rendered as the icon). tracksViewChanges={false}
              because the bubble is static — it is snapshotted once. */}
          <Marker
            point={{ latitude: TASHKENT.latitude + 0.03, longitude: TASHKENT.longitude }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
            identifier="rating-bubble"
            onPress={(event) => console.log('onMarkerPress', event.nativeEvent)}>
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>4.8★</Text>
            </View>
          </Marker>
          {/* A cluster of generated markers. Tap a badge to fit its markers; zoom in to split them. */}
          {showClusters && (
            <Clusterer
              clusterColor="#2E7D32"
              onClusterPress={(event) => console.log('onClusterPress', event.nativeEvent)}>
              {CLUSTER_POINTS.map((point, index) => (
                <Marker
                  key={index}
                  point={point}
                  source={require('./assets/favicon.png')}
                  anchor={{ x: 0.5, y: 0.5 }}
                  identifier={`cluster-point-${index}`}
                  onPress={(event) => console.log('onMarkerPress', event.nativeEvent)}
                />
              ))}
            </Clusterer>
          )}
        </YandexMapView>
      ) : (
        <View style={styles.placeholder}>
          <Text>Initializing Yandex MapKit…</Text>
        </View>
      )}
      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={() => setNightMode((value) => !value)}>
          <Text style={styles.buttonText}>{nightMode ? 'Day mode' : 'Night mode'}</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => setShowClusters((value) => !value)}>
          <Text style={styles.buttonText}>{showClusters ? 'Hide clusters' : 'Show clusters'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  buttons: { position: 'absolute', top: 60, right: 16, gap: 8 },
  button: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonText: { fontSize: 14, fontWeight: '600' },
  bubble: {
    backgroundColor: '#1e88e5',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  bubbleText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
