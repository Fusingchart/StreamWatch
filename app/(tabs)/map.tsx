import { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { subscribeSightings } from '../../src/services/sightings';
import { useAppStore } from '../../src/store';
import { colors, font, radius, space } from '../../src/constants/theme';

export default function MapScreen() {
  const { sightings, setSightings } = useAppStore((s) => ({
    sightings: s.sightings,
    setSightings: s.setSightings,
  }));

  useEffect(() => {
    const unsub = subscribeSightings(setSightings);
    return unsub;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.heading}>Map</Text>
      </View>
      <View style={styles.placeholder}>
        <View style={styles.iconWrap}>
          <MapPin size={36} color={colors.primary} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>Community Map</Text>
        <Text style={styles.body}>
          Live sightings map coming in Week 3–6.{'\n'}
          {sightings.length > 0
            ? `${sightings.length} sighting${sightings.length !== 1 ? 's' : ''} will appear here.`
            : 'Submit a report to add the first pin.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm },
  heading: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconWrap: {
    width: 80, height: 80, borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.lg,
  },
  title: { fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text, marginBottom: 8 },
  body: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
