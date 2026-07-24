import { initialize, YandexMapView } from 'expo-yandex-mapkit';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initialize('YOUR_MAPKIT_API_KEY').then(() => setReady(true));
  }, []);
  return ready ? <YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.311081, longitude: 69.240562, zoom: 12 }} /> : null;
}
