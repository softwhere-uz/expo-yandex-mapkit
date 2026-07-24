import { initialize, Marker, YandexMapView } from 'expo-yandex-mapkit';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const API_KEY = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY ?? 'YOUR_MAPKIT_API_KEY';

const TASHKENT = { latitude: 41.311081, longitude: 69.240562, zoom: 12 };

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [nightMode, setNightMode] = useState(false);

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
        </YandexMapView>
      ) : (
        <View style={styles.placeholder}>
          <Text>Initializing Yandex MapKit…</Text>
        </View>
      )}
      <Pressable style={styles.button} onPress={() => setNightMode((value) => !value)}>
        <Text style={styles.buttonText}>{nightMode ? 'Day mode' : 'Night mode'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  button: {
    position: 'absolute',
    top: 60,
    right: 16,
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
});
