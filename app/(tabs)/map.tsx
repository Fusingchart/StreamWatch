import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { subscribeSightings } from '../../src/services/sightings';
import { useAppStore } from '../../src/store';

// MapView will be wired in once react-native-maps is installed (Week 3-6 task)
export default function MapScreen() {
  const setSightings = useAppStore((s) => s.setSightings);

  useEffect(() => {
    const unsub = subscribeSightings(setSightings);
    return unsub;
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Map coming soon</Text>
      <Text style={styles.sub}>Google Maps integration in Week 3–6</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  placeholder: { fontSize: 18, fontWeight: '600', color: '#374151' },
  sub: { color: '#9CA3AF', marginTop: 8 },
});
