import { useEffect, useMemo } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, AlertTriangle, CheckCircle, MapPin, Mail, Droplets } from 'lucide-react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useAppStore } from '../../src/store';
import { POLLUTION_CLASSES } from '../../src/constants/pollution';
import { getSeverity } from '../../src/utils/routing';
import { assignWaterway } from '../../src/data/waterways';
import DownstreamCard from '../../src/components/DownstreamCard';
import { colors, font, radius, space } from '../../src/constants/theme';

const SEV_COLOR = { HIGH: colors.high, MEDIUM: colors.warning, NONE: colors.none };
const SEV_BG    = { HIGH: colors.high + '18', MEDIUM: colors.warning + '18', NONE: colors.none + '18' };
const SEV_BORDER = { HIGH: colors.high + '44', MEDIUM: colors.warning + '44', NONE: colors.none + '44' };

function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function SightingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sighting = useAppStore((s) => s.sightings.find((x) => x.id === id));

  useEffect(() => {
    if (!sighting) router.back();
  }, [sighting]);

  const meta       = sighting ? POLLUTION_CLASSES[sighting.pollutionClass] : null;
  const severity   = sighting ? getSeverity(sighting.pollutionClass) : 'NONE';
  const sevColor   = SEV_COLOR[severity];
  const waterway   = sighting ? assignWaterway(sighting.latitude, sighting.longitude) : null;
  const confidence = sighting ? Math.round(sighting.confidence * 100) : 0;

  const mapRegion = useMemo(() => sighting ? {
    latitude: sighting.latitude,
    longitude: sighting.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : null, [sighting?.latitude, sighting?.longitude]);

  if (!sighting || !meta || !mapRegion) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero photo */}
      <View style={styles.hero}>
        <Image source={{ uri: sighting.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.85)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Floating nav */}
      <SafeAreaView edges={['top']} style={styles.navWrap} pointerEvents="box-none">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.75}>
          <BlurView intensity={55} tint="dark" style={styles.backBtn}>
            <ChevronLeft size={18} color="#fff" strokeWidth={2.5} />
          </BlurView>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Content scrolls over the hero */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Spacer so content starts below the hero */}
        <View style={styles.heroSpacer} />

        {/* Classification */}
        <BlurView intensity={55} tint="dark" style={styles.card}>
          <View style={[styles.classDot, { backgroundColor: meta.color }]} />
          <View style={styles.classBody}>
            <Text style={styles.className}>{meta.label}</Text>
            <View style={styles.confRow}>
              <View style={styles.confTrack}>
                <View style={[styles.confFill, { width: `${confidence}%` as any, backgroundColor: meta.color }]} />
              </View>
              <Text style={[styles.confPct, { color: meta.color }]}>{confidence}%</Text>
            </View>
          </View>
        </BlurView>

        {/* Severity */}
        <BlurView intensity={55} tint="dark" style={[styles.card, { borderColor: SEV_BORDER[severity] }]}>
          <View style={[styles.sevIcon, { backgroundColor: SEV_BG[severity] }]}>
            {severity === 'NONE'
              ? <CheckCircle size={15} color={sevColor} strokeWidth={2} />
              : <AlertTriangle size={15} color={sevColor} strokeWidth={2} />}
          </View>
          <View style={styles.sevBody}>
            <Text style={[styles.sevTitle, { color: sevColor }]}>{severity} severity</Text>
            {waterway && (
              <Text style={styles.sevSub}>
                <Droplets size={11} color={colors.textMuted} /> {waterway.name}
              </Text>
            )}
          </View>
        </BlurView>

        {/* Downstream impacts */}
        {severity !== 'NONE' && (
          <DownstreamCard
            latitude={sighting.latitude}
            longitude={sighting.longitude}
            sevColor={sevColor}
          />
        )}

        {/* Mini map */}
        <View style={styles.mapCard}>
          <MapView
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_DEFAULT}
            initialRegion={mapRegion}
            mapType="mutedStandard"
            userInterfaceStyle="dark"
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            showsCompass={false}
          >
            <Marker coordinate={{ latitude: sighting.latitude, longitude: sighting.longitude }}>
              <View style={[styles.pin, { borderColor: sevColor }]}>
                <View style={[styles.pinDot, { backgroundColor: sevColor }]} />
              </View>
            </Marker>
          </MapView>
          {/* Coords overlay */}
          <BlurView intensity={50} tint="dark" style={styles.coordsChip}>
            <MapPin size={11} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.coordsText}>
              {sighting.latitude.toFixed(5)}, {sighting.longitude.toFixed(5)}
            </Text>
          </BlurView>
        </View>

        {/* Details card */}
        <BlurView intensity={55} tint="dark" style={styles.detailsCard}>
          <DetailRow label="County" value={sighting.county || 'Unknown'} />
          <View style={styles.detailDivider} />
          <DetailRow label="Reported" value={formatDate(new Date(sighting.reportedAt))} />
          {sighting.agencyEmailed && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Agency notified</Text>
                <View style={styles.agencyRow}>
                  <Mail size={11} color={colors.none} strokeWidth={2} />
                  <Text style={[styles.detailValue, { color: colors.none }]} numberOfLines={1}>
                    {sighting.agencyEmailed}
                  </Text>
                </View>
              </View>
            </>
          )}
        </BlurView>
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const HERO_H = 280;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  hero: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: HERO_H,
  },

  navWrap: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: space.md, paddingTop: space.sm,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: radius.full,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: colors.border,
    alignSelf: 'flex-start',
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: space.md, paddingBottom: 48, gap: 10 },
  heroSpacer: { height: HERO_H - 40 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: radius.md,
    overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border,
  },
  classDot: { width: 14, height: 14, borderRadius: 7, flexShrink: 0 },
  classBody: { flex: 1 },
  className: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text, marginBottom: 8 },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confTrack: { flex: 1, height: 5, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  confFill: { height: '100%', borderRadius: radius.full },
  confPct: { fontSize: font.size.sm, fontWeight: font.weight.bold, width: 34, textAlign: 'right' },

  sevIcon: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  sevBody: { flex: 1 },
  sevTitle: { fontSize: font.size.md, fontWeight: font.weight.semibold },
  sevSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },

  mapCard: {
    height: 180, borderRadius: radius.md,
    overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border,
  },
  coordsChip: {
    position: 'absolute', bottom: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.full, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
  },
  coordsText: { fontSize: 10, color: colors.textSecondary, fontWeight: font.weight.medium },

  pin: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 7, height: 7, borderRadius: 4 },

  detailsCard: {
    borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14,
  },
  detailDivider: { height: 0.5, backgroundColor: colors.border },
  detailLabel: { fontSize: font.size.sm, color: colors.textMuted },
  detailValue: { fontSize: font.size.sm, color: colors.text, fontWeight: font.weight.medium, maxWidth: '60%' },
  agencyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '60%' },
});
