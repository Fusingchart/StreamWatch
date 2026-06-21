import { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { subscribeSightings } from '../../src/services/sightings';
import { useAppStore } from '../../src/store';
import { POLLUTION_CLASSES } from '../../src/constants/pollution';
import { colors, font, radius, space } from '../../src/constants/theme';
import { Sighting } from '../../src/types';
import { Droplets } from 'lucide-react-native';

const SEVERITY_BG: Record<string, string> = {
  HIGH: '#FFF0EE',
  MEDIUM: '#FFF8EE',
  NONE: '#EDFAF1',
};
const SEVERITY_COLOR: Record<string, string> = {
  HIGH: colors.high,
  MEDIUM: colors.warning,
  NONE: colors.success,
};

export default function HistoryScreen() {
  const { sightings, setSightings } = useAppStore((s) => ({
    sightings: s.sightings,
    setSightings: s.setSightings,
  }));

  useEffect(() => {
    const unsub = subscribeSightings(setSightings);
    return unsub;
  }, []);

  function formatTime(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  }

  function renderItem({ item }: { item: Sighting }) {
    const meta = POLLUTION_CLASSES[item.pollutionClass];
    const sevColor = SEVERITY_COLOR[item.severity];
    const sevBg = SEVERITY_BG[item.severity];
    const timeStr = item.reportedAt instanceof Date ? formatTime(item.reportedAt) : 'Pending…';

    return (
      <View style={styles.card}>
        <View style={[styles.classIcon, { backgroundColor: meta.color + '18' }]}>
          <View style={[styles.classDot, { backgroundColor: meta.color }]} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.classLabel}>{meta.label}</Text>
          <Text style={styles.cardSub}>
            {item.county || 'Unknown'} · {Math.round(item.confidence * 100)}% confident
          </Text>
          <Text style={styles.cardTime}>{timeStr}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: sevBg }]}>
          <Text style={[styles.severityText, { color: sevColor }]}>{item.severity}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.heading}>Sightings</Text>
        {sightings.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{sightings.length}</Text>
          </View>
        )}
      </View>
      <FlatList
        data={sightings}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Droplets size={48} color={colors.border} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No sightings yet</Text>
            <Text style={styles.emptyBody}>
              Head to the Report tab to submit the first waterway sighting in your area.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  heading: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text },
  countBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  countText: { color: colors.primary, fontSize: font.size.sm, fontWeight: font.weight.bold },

  list: { paddingHorizontal: space.md, paddingBottom: 32, paddingTop: 4 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  classIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  classDot: { width: 14, height: 14, borderRadius: 7 },
  cardBody: { flex: 1 },
  classLabel: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  cardSub: { fontSize: font.size.sm, color: colors.textSecondary, marginTop: 2 },
  cardTime: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 3 },
  severityBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginLeft: 8,
  },
  severityText: { fontSize: font.size.xs, fontWeight: font.weight.bold, letterSpacing: 0.3 },

  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: font.size.lg,
    fontWeight: font.weight.semibold,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
