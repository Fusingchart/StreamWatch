import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { subscribeSightings } from '../../src/services/sightings';
import { useAppStore } from '../../src/store';
import { POLLUTION_CLASSES } from '../../src/constants/pollution';
import { colors, font, radius, space } from '../../src/constants/theme';
import { Sighting } from '../../src/types';

const SEV_COLOR = {
  HIGH: colors.high,
  MEDIUM: colors.warning,
  NONE: colors.none,
};

const INITIAL_REGION = {
  // WA-01 (Snohomish/north King County area)
  latitude: 47.8,
  longitude: -122.1,
  latitudeDelta: 0.8,
  longitudeDelta: 0.8,
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const sightings = useAppStore((s) => s.sightings);
  const setSightings = useAppStore((s) => s.setSightings);
  const [selected, setSelected] = useState<Sighting | null>(null);

  useEffect(() => {
    const unsub = subscribeSightings(setSightings);
    return unsub;
  }, []);

  async function centerOnUser() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateToRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 600);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_REGION}
        mapType="mutedStandard"
        userInterfaceStyle="dark"
        showsUserLocation
        showsCompass={false}
        showsScale={false}
      >
        {sightings.map((s) => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.latitude, longitude: s.longitude }}
            onPress={() => setSelected(s)}
          >
            <View style={[styles.pin, { borderColor: SEV_COLOR[s.severity] }]}>
              <View style={[styles.pinDot, { backgroundColor: SEV_COLOR[s.severity] }]} />
            </View>
            <Callout tooltip onPress={() => setSelected(s)}>
              <View style={styles.callout}>
                <Text style={styles.calloutClass}>
                  {POLLUTION_CLASSES[s.pollutionClass]?.label ?? s.pollutionClass}
                </Text>
                <Text style={styles.calloutSub}>
                  {s.county} · {Math.round(s.confidence * 100)}% confidence
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Header overlay */}
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.overlay}>
        <BlurView intensity={60} tint="dark" style={styles.header}>
          <Text style={styles.heading}>Map</Text>
          <View style={styles.badge}>
            <View style={[styles.dot, { backgroundColor: sightings.length ? colors.primary : colors.textMuted }]} />
            <Text style={styles.badgeText}>{sightings.length} sighting{sightings.length !== 1 ? 's' : ''}</Text>
          </View>
        </BlurView>

        {/* Locate me button */}
        <TouchableOpacity style={styles.locateBtn} onPress={centerOnUser} activeOpacity={0.8}>
          <BlurView intensity={60} tint="dark" style={styles.locateBtnInner}>
            <Text style={styles.locateIcon}>⊙</Text>
          </BlurView>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Detail card for selected marker */}
      {selected && (
        <View style={styles.detailWrap} pointerEvents="box-none">
          <BlurView intensity={70} tint="dark" style={styles.detailCard}>
            <View style={[styles.sevBar, { backgroundColor: SEV_COLOR[selected.severity] }]} />
            <View style={styles.detailBody}>
              <Text style={styles.detailClass}>
                {POLLUTION_CLASSES[selected.pollutionClass]?.label ?? selected.pollutionClass}
              </Text>
              <Text style={styles.detailMeta}>
                {selected.county} County · {Math.round(selected.confidence * 100)}% confidence
              </Text>
              <Text style={styles.detailMeta}>
                {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: space.md, marginTop: space.sm,
    paddingHorizontal: space.md, paddingVertical: 12,
    borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
  },
  heading: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: font.size.sm, color: colors.textSecondary, fontWeight: font.weight.medium },

  locateBtn: { position: 'absolute', right: space.md + 4, top: 70 },
  locateBtnInner: {
    width: 42, height: 42, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border,
  },
  locateIcon: { fontSize: 20, color: colors.primary },

  pin: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },
  pinDot: { width: 8, height: 8, borderRadius: 4 },

  callout: {
    backgroundColor: 'rgba(28,28,30,0.95)',
    borderRadius: radius.md, padding: 10,
    borderWidth: 0.5, borderColor: colors.border, minWidth: 160,
  },
  calloutClass: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text },
  calloutSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  detailWrap: { position: 'absolute', bottom: 110, left: space.md, right: space.md },
  detailCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
  },
  sevBar: { width: 4, alignSelf: 'stretch' },
  detailBody: { flex: 1, padding: space.md },
  detailClass: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  detailMeta: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  closeBtn: { paddingHorizontal: space.md, paddingVertical: space.md },
  closeText: { fontSize: 16, color: colors.textMuted },
});
