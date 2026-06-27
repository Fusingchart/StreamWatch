import { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { subscribeSightings } from '../../src/services/sightings';
import { useAppStore } from '../../src/store';
import { POLLUTION_CLASSES } from '../../src/constants/pollution';
import { colors, font, radius, space } from '../../src/constants/theme';
import { Sighting } from '../../src/types';
import { computeWaterwayHealth, WaterwayHealth } from '../../src/data/waterways';
import FilterBar, { FilterOption } from '../../src/components/FilterBar';

const SEV_OPTIONS: FilterOption[] = [
  { key: 'ALL', label: 'All', color: colors.primary },
  { key: 'HIGH', label: 'High', color: colors.high },
  { key: 'MEDIUM', label: 'Medium', color: colors.warning },
  { key: 'NONE', label: 'Clean', color: colors.none },
];

const SEV_COLOR = { HIGH: colors.high, MEDIUM: colors.warning, NONE: colors.none };

const INITIAL_REGION = {
  latitude: 47.9, longitude: -122.1,
  latitudeDelta: 0.8, longitudeDelta: 0.8,
};

function scoreColor(score: number): string {
  if (score >= 80) return colors.none;
  if (score >= 55) return colors.warning;
  return colors.high;
}

function TrendBadge({ trend, delta }: { trend: WaterwayHealth['trend']; delta: number }) {
  const map = {
    improving: { symbol: '↑', color: colors.none },
    declining:  { symbol: '↓', color: colors.high },
    stable:     { symbol: '→', color: colors.textMuted },
  };
  const { symbol, color } = map[trend];
  return (
    <Text style={[styles.trendText, { color }]}>
      {symbol}{delta > 0 ? ` ${delta}` : ''}
    </Text>
  );
}

function HealthScoreRing({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <View style={[styles.scoreRing, { borderColor: color + '55' }]}>
      <Text style={[styles.scoreNum, { color }]}>{score}</Text>
      <Text style={styles.scoreLabel}>/ 100</Text>
    </View>
  );
}

function WaterwayCard({
  health,
  onPress,
}: {
  health: WaterwayHealth;
  onPress: () => void;
}) {
  const { waterway, score, trend, trendDelta, sightingCount } = health;
  const color = scoreColor(score);
  const barWidth = `${score}%` as any;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <BlurView intensity={55} tint="dark" style={styles.waterwayCard}>
        <View style={[styles.waterwayAccent, { backgroundColor: color }]} />
        <View style={styles.waterwayBody}>
          <View style={styles.waterwayTop}>
            <Text style={styles.waterwayName} numberOfLines={1}>{waterway.shortName}</Text>
            <TrendBadge trend={trend} delta={trendDelta} />
          </View>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreBarFill, { width: barWidth, backgroundColor: color }]} />
          </View>
          <View style={styles.waterwayMeta}>
            <Text style={[styles.scoreInline, { color }]}>{score}</Text>
            <Text style={styles.waterwayCount}>
              {sightingCount === 0 ? 'No reports' : `${sightingCount} report${sightingCount !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const sightings = useAppStore((s) => s.sightings);
  const setSightings = useAppStore((s) => s.setSightings);
  const [selected, setSelected] = useState<Sighting | null>(null);
  const [view, setView] = useState<'sightings' | 'health'>('sightings');
  const [sevFilter, setSevFilter] = useState('ALL');

  useEffect(() => {
    const unsub = subscribeSightings(setSightings);
    return unsub;
  }, []);

  const visibleSightings = useMemo(() =>
    sevFilter === 'ALL' ? sightings : sightings.filter((s) => s.severity === sevFilter),
  [sightings, sevFilter]);

  const healthScores = useMemo(() => computeWaterwayHealth(sightings), [sightings]);
  const overallHealth = useMemo(() => {
    if (healthScores.length === 0) return null;
    return Math.round(healthScores.reduce((s, h) => s + h.score, 0) / healthScores.length);
  }, [healthScores]);

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

  function flyToWaterway(health: WaterwayHealth) {
    mapRef.current?.animateToRegion({
      latitude: health.waterway.centerLat,
      longitude: health.waterway.centerLng,
      latitudeDelta: 0.25,
      longitudeDelta: 0.25,
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
        {visibleSightings.map((s) => {
          const pinColor = s.resolved ? colors.textMuted : SEV_COLOR[s.severity];
          return (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.latitude, longitude: s.longitude }}
            onPress={() => { setSelected(s); setView('sightings'); }}
          >
            <View style={[styles.pin, { borderColor: pinColor, opacity: s.resolved ? 0.5 : 1 }]}>
              <View style={[styles.pinDot, { backgroundColor: pinColor }]} />
            </View>
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutClass}>
                  {POLLUTION_CLASSES[s.pollutionClass]?.label ?? s.pollutionClass}
                  {s.resolved ? '  ✓' : ''}
                </Text>
                <Text style={styles.calloutSub}>
                  {s.county} · {Math.round(s.confidence * 100)}% confidence
                </Text>
              </View>
            </Callout>
          </Marker>
          );
        })}
      </MapView>

      {/* Header */}
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.overlay}>
        <BlurView intensity={60} tint="dark" style={styles.header}>
          <View>
            <Text style={styles.heading}>Map</Text>
            {overallHealth !== null && (
              <Text style={[styles.overallHealth, { color: scoreColor(overallHealth) }]}>
                Watershed health: {overallHealth}/100
              </Text>
            )}
          </View>
          {/* View toggle */}
          <BlurView intensity={40} tint="dark" style={styles.toggle}>
            <TouchableOpacity
              onPress={() => setView('sightings')}
              style={[styles.toggleBtn, view === 'sightings' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, view === 'sightings' && styles.toggleTextActive]}>
                Reports
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setView('health'); setSelected(null); }}
              style={[styles.toggleBtn, view === 'health' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, view === 'health' && styles.toggleTextActive]}>
                Health
              </Text>
            </TouchableOpacity>
          </BlurView>
        </BlurView>

        {/* Severity filter — Reports view only */}
        {view === 'sightings' && (
          <BlurView intensity={50} tint="dark" style={styles.filterWrap}>
            <FilterBar options={SEV_OPTIONS} value={sevFilter} onChange={(k) => {
              setSevFilter(k);
              if (selected && k !== 'ALL' && selected.severity !== k) setSelected(null);
            }} />
          </BlurView>
        )}

        {/* Locate me */}
        <TouchableOpacity style={styles.locateBtn} onPress={centerOnUser} activeOpacity={0.8}>
          <BlurView intensity={60} tint="dark" style={styles.locateBtnInner}>
            <Text style={styles.locateIcon}>⊙</Text>
          </BlurView>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Health scores panel */}
      {view === 'health' && (
        <View style={styles.healthPanel} pointerEvents="box-none">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.healthScroll}
          >
            {healthScores.map((h) => (
              <WaterwayCard
                key={h.waterway.id}
                health={h}
                onPress={() => flyToWaterway(h)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Sighting detail card */}
      {view === 'sightings' && selected && (
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
    paddingHorizontal: space.md, paddingVertical: 10,
    borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
  },
  heading: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text },
  overallHealth: { fontSize: 11, fontWeight: font.weight.medium, marginTop: 1 },

  toggle: {
    flexDirection: 'row', borderRadius: radius.md,
    overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border,
  },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 7 },
  toggleActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: font.weight.medium },
  toggleTextActive: { color: '#fff' },

  filterWrap: {
    marginHorizontal: space.md, marginTop: 8,
    borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
  },
  locateBtn: { position: 'absolute', right: space.md + 4, top: 72 },
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

  // Health panel
  healthPanel: { position: 'absolute', bottom: 110, left: 0, right: 0 },
  healthScroll: { paddingHorizontal: space.md, gap: 10 },

  waterwayCard: {
    width: 160, flexDirection: 'row',
    borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
  },
  waterwayAccent: { width: 4 },
  waterwayBody: { flex: 1, padding: 12, gap: 6 },
  waterwayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waterwayName: { flex: 1, fontSize: 12, fontWeight: font.weight.semibold, color: colors.text },
  trendText: { fontSize: 13, fontWeight: font.weight.bold, marginLeft: 4 },

  scoreBar: {
    height: 4, backgroundColor: colors.border,
    borderRadius: radius.full, overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: radius.full },

  waterwayMeta: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  scoreInline: { fontSize: font.size.lg, fontWeight: font.weight.bold },
  waterwayCount: { fontSize: 10, color: colors.textMuted },

  // Sighting detail
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

  // Unused ring (kept for potential future use)
  scoreRing: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { fontSize: font.size.lg, fontWeight: font.weight.bold, lineHeight: 20 },
  scoreLabel: { fontSize: 9, color: colors.textMuted },
});
