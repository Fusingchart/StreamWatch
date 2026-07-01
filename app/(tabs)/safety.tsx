import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  StatusBar, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { Waves, CheckCircle, AlertTriangle, XCircle, HelpCircle, MapPin, RefreshCw } from 'lucide-react-native';
import { useAppStore } from '../../src/store';
import { BEACH_SPOTS, sortByDistance } from '../../src/data/beachSpots';
import { fetchAllBeachSafety, BeachSafetyResult, SafetyLevel } from '../../src/services/beachSafety';
import { colors, font, radius, space } from '../../src/constants/theme';

const LEVEL_CONFIG: Record<SafetyLevel, {
  label: string;
  color: string;
  icon: typeof CheckCircle;
  bg: string;
  border: string;
}> = {
  SAFE:    { label: 'Safe to swim',    color: colors.none,    icon: CheckCircle,   bg: colors.none + '15',    border: colors.none + '44' },
  CAUTION: { label: 'Use caution',     color: colors.warning, icon: AlertTriangle, bg: colors.warning + '15', border: colors.warning + '44' },
  AVOID:   { label: 'Avoid swimming',  color: colors.high,    icon: XCircle,       bg: colors.high + '15',    border: colors.high + '44' },
  UNKNOWN: { label: 'No data',         color: colors.textMuted, icon: HelpCircle,  bg: colors.border,         border: colors.border },
};

function formatDate(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

interface CardProps {
  spot: ReturnType<typeof sortByDistance>[0];
  result: BeachSafetyResult | undefined;
  expanded: boolean;
  onPress: () => void;
}

function BeachCard({ spot, result, expanded, onPress }: CardProps) {
  const level = result?.level ?? 'UNKNOWN';
  const cfg = LEVEL_CONFIG[level];
  const Icon = cfg.icon;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <BlurView intensity={45} tint="dark" style={[styles.card, { borderColor: expanded ? cfg.border : colors.border }]}>
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={[styles.levelBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Icon size={13} color={cfg.color} strokeWidth={2.2} />
            <Text style={[styles.levelText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <View style={styles.distRow}>
            <MapPin size={11} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.distText}>{formatDistance(spot.distanceKm)}</Text>
          </View>
        </View>

        {/* Name + water body */}
        <Text style={styles.beachName}>{spot.name}</Text>
        <Text style={styles.waterBody}>
          {spot.type === 'saltwater' ? '🌊' : '🏞'} {spot.waterBody} · {spot.county} County
        </Text>

        {/* StreamWatch alert */}
        {result && result.nearbyHighReports > 0 && (
          <View style={styles.swAlert}>
            <AlertTriangle size={11} color={colors.warning} strokeWidth={2.2} />
            <Text style={styles.swAlertText}>
              {result.nearbyHighReports} recent StreamWatch report{result.nearbyHighReports > 1 ? 's' : ''} nearby
              {result.nearbyReportTitles.length > 0 ? ` (${result.nearbyReportTitles.slice(0, 2).join(', ')})` : ''}
            </Text>
          </View>
        )}

        {/* Expanded detail */}
        {expanded && result && (
          <View style={styles.detail}>
            <View style={styles.detailDivider} />
            {result.officialStatus && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Official status</Text>
                <Text style={[styles.detailValue, { color: cfg.color }]}>{result.officialStatus}</Text>
              </View>
            )}
            {result.bacteriaCount !== null && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bacteria count</Text>
                <Text style={styles.detailValue}>{result.bacteriaCount} CFU/100mL</Text>
              </View>
            )}
            {result.officialSource && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Data source</Text>
                <Text style={styles.detailValue}>{result.officialSource}</Text>
              </View>
            )}
            {result.lastUpdated && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last updated</Text>
                <Text style={styles.detailValue}>{formatDate(result.lastUpdated)}</Text>
              </View>
            )}
            {!result.officialSource && (
              <Text style={styles.noDataNote}>
                No official monitoring data available for this location. Rating is based on StreamWatch community reports only.
              </Text>
            )}
          </View>
        )}
      </BlurView>
    </TouchableOpacity>
  );
}

export default function SafetyScreen() {
  const sightings = useAppStore((s) => s.sightings);
  const [results, setResults] = useState<BeachSafetyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedSpots = userCoords
    ? sortByDistance(BEACH_SPOTS, userCoords.lat, userCoords.lng)
    : BEACH_SPOTS.map((s) => ({ ...s, distanceKm: 0 }));

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
      const data = await fetchAllBeachSafety(BEACH_SPOTS, sightings);
      setResults(data);
    } catch {
      // keep whatever we had
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(() => load(true), [sightings]);

  // Overall summary
  const avoidCount = results.filter((r) => r.level === 'AVOID').length;
  const cautionCount = results.filter((r) => r.level === 'CAUTION').length;
  const safeCount = results.filter((r) => r.level === 'SAFE').length;
  const summaryLevel: SafetyLevel =
    avoidCount > 0 ? 'AVOID' : cautionCount > 0 ? 'CAUTION' : safeCount > 0 ? 'SAFE' : 'UNKNOWN';
  const summaryCfg = LEVEL_CONFIG[summaryLevel];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Swim Safety</Text>
            {results.length > 0 && (
              <Text style={[styles.subheading, { color: summaryCfg.color }]}>
                {safeCount} safe · {cautionCount} caution · {avoidCount} avoid
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
            <BlurView intensity={40} tint="dark" style={styles.refreshInner}>
              <RefreshCw size={16} color={colors.primary} strokeWidth={2} />
            </BlurView>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Checking beach conditions…</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {/* Data note */}
            <BlurView intensity={30} tint="dark" style={styles.sourceNote}>
              <Text style={styles.sourceNoteText}>
                Combines official water quality data (EPA BEACON, King County) with recent StreamWatch community reports within 3 km.
              </Text>
            </BlurView>

            {sortedSpots.map((spot) => {
              const result = results.find((r) => r.spotId === spot.id);
              return (
                <BeachCard
                  key={spot.id}
                  spot={spot}
                  result={result}
                  expanded={expandedId === spot.id}
                  onPress={() => setExpandedId(expandedId === spot.id ? null : spot.id)}
                />
              );
            })}

            <Text style={styles.disclaimer}>
              This information is for general guidance only. Always check official sources before swimming. Conditions can change rapidly.
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm,
  },
  heading: { fontSize: font.size.xxxl, fontWeight: font.weight.bold, color: colors.text },
  subheading: { fontSize: font.size.sm, fontWeight: font.weight.medium, marginTop: 2 },
  refreshBtn: { },
  refreshInner: {
    width: 38, height: 38, borderRadius: radius.md,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: colors.border,
  },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: colors.textMuted, fontSize: font.size.sm },

  list: { paddingHorizontal: space.md, paddingBottom: 110, gap: 10 },

  sourceNote: {
    borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
    padding: 12, marginBottom: 4,
  },
  sourceNoteText: {
    fontSize: 11, color: colors.textMuted, lineHeight: 16, textAlign: 'center',
  },

  card: {
    borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 0.5, padding: 14, gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 0.5,
  },
  levelText: { fontSize: 11, fontWeight: font.weight.bold, letterSpacing: 0.2 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distText: { fontSize: 11, color: colors.textMuted },

  beachName: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text },
  waterBody: { fontSize: font.size.sm, color: colors.textSecondary },

  swAlert: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: colors.warning + '12',
    borderRadius: radius.sm, padding: 8, marginTop: 4,
  },
  swAlertText: { flex: 1, fontSize: 11, color: colors.warning, lineHeight: 15 },

  detail: { gap: 8, marginTop: 4 },
  detailDivider: { height: 0.5, backgroundColor: colors.border },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  detailLabel: { fontSize: font.size.sm, color: colors.textMuted },
  detailValue: { fontSize: font.size.sm, color: colors.text, fontWeight: font.weight.medium, maxWidth: '55%', textAlign: 'right' },
  noDataNote: {
    fontSize: 11, color: colors.textMuted, lineHeight: 16,
    fontStyle: 'italic',
  },

  disclaimer: {
    fontSize: 10, color: colors.textMuted, textAlign: 'center',
    lineHeight: 15, paddingHorizontal: 8, marginTop: 4,
  },
});
