import { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin } from 'lucide-react-native';
import { subscribeSightings } from '../../src/services/sightings';
import { useAppStore } from '../../src/store';
import { colors, font, radius, space } from '../../src/constants/theme';

export default function MapScreen() {
  const sightings = useAppStore((s) => s.sightings);
  const setSightings = useAppStore((s) => s.setSightings);

  useEffect(() => {
    const unsub = subscribeSightings(setSightings);
    return unsub;
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Subtle grid bg */}
      <LinearGradient
        colors={['#0a0f1a', '#000']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.heading}>Map</Text>
        </View>
        <View style={styles.center}>
          <BlurView intensity={40} tint="dark" style={styles.iconCard}>
            <MapPin size={36} color={colors.primary} strokeWidth={1.5} />
          </BlurView>
          <Text style={styles.title}>Community Map</Text>
          <Text style={styles.body}>
            Live sightings map arrives in Week 3–6.
          </Text>
          {sightings.length > 0 && (
            <BlurView intensity={40} tint="dark" style={styles.countCard}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={styles.countText}>
                {sightings.length} sighting{sightings.length !== 1 ? 's' : ''} queued for the map
              </Text>
            </BlurView>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm },
  heading: { fontSize: font.size.xxxl, fontWeight: font.weight.bold, color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconCard: {
    width: 80, height: 80, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border,
    marginBottom: space.lg,
  },
  title: { fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text, marginBottom: 8 },
  body: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  countCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: radius.full, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  countText: { fontSize: font.size.sm, color: colors.textSecondary, fontWeight: font.weight.medium },
});
