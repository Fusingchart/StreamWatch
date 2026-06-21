import { useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  SafeAreaView, StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { subscribeSightings } from '../../src/services/sightings';
import { useAppStore } from '../../src/store';
import { POLLUTION_CLASSES } from '../../src/constants/pollution';
import { colors, font, radius, space } from '../../src/constants/theme';
import { Sighting } from '../../src/types';
import { Droplets } from 'lucide-react-native';

const SEV_COLOR: Record<string, string> = {
  HIGH: colors.high,
  MEDIUM: colors.warning,
  NONE: colors.none,
};

function formatTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SightingCard({ item }: { item: Sighting }) {
  const meta = POLLUTION_CLASSES[item.pollutionClass];
  const sevColor = SEV_COLOR[item.severity];
  const timeStr = item.reportedAt instanceof Date ? formatTime(item.reportedAt) : 'Pending…';

  return (
    <BlurView intensity={40} tint="dark" style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: meta.color }]} />
      <View style={[styles.iconWrap, { backgroundColor: meta.color + '22' }]}>
        <View style={[styles.iconDot, { backgroundColor: meta.color }]} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardClass}>{meta.label}</Text>
        <Text style={styles.cardMeta}>{item.county || 'Unknown'} · {Math.round(item.confidence * 100)}%</Text>
        <Text style={styles.cardTime}>{timeStr}</Text>
      </View>
      <View style={[styles.sevBadge, { borderColor: sevColor + '55', backgroundColor: sevColor + '18' }]}>
        <Text style={[styles.sevText, { color: sevColor }]}>{item.severity}</Text>
      </View>
    </BlurView>
  );
}

export default function HistoryScreen() {
  const { sightings, setSightings } = useAppStore((s) => ({
    sightings: s.sightings,
    setSightings: s.setSightings,
  }));

  useEffect(() => {
    const unsub = subscribeSightings(setSightings);
    return unsub;
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.heading}>Sightings</Text>
          {sightings.length > 0 && (
            <BlurView intensity={40} tint="dark" style={styles.countPill}>
              <Text style={styles.countText}>{sightings.length}</Text>
            </BlurView>
          )}
        </View>

        <FlatList
          data={sightings}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SightingCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Droplets size={52} color={colors.textMuted} strokeWidth={1.2} />
              <Text style={styles.emptyTitle}>No sightings yet</Text>
              <Text style={styles.emptyBody}>
                Go to Report and take a photo of any waterway to submit the first sighting.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm,
  },
  heading: { fontSize: font.size.xxxl, fontWeight: font.weight.bold, color: colors.text },
  countPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
  },
  countText: { color: colors.primary, fontSize: font.size.sm, fontWeight: font.weight.bold },

  list: { paddingHorizontal: space.md, paddingBottom: 100, gap: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
  },
  accentBar: { width: 3, alignSelf: 'stretch' },
  iconWrap: {
    width: 40, height: 40, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    margin: 12, marginLeft: 10,
  },
  iconDot: { width: 14, height: 14, borderRadius: 7 },
  cardBody: { flex: 1, paddingVertical: 12 },
  cardClass: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  cardMeta: { fontSize: font.size.sm, color: colors.textSecondary, marginTop: 2 },
  cardTime: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 3 },
  sevBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
    borderWidth: 0.5, marginRight: 12,
  },
  sevText: { fontSize: font.size.xs, fontWeight: font.weight.bold, letterSpacing: 0.4 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 44 },
  emptyTitle: {
    fontSize: font.size.lg, fontWeight: font.weight.semibold,
    color: colors.textSecondary, marginTop: 16, marginBottom: 8,
  },
  emptyBody: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
