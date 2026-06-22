import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { getDownstreamImpacts, POI_META, DownstreamHit } from '../data/downstream';
import { colors, font, radius } from '../constants/theme';

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

interface Props {
  latitude: number;
  longitude: number;
  sevColor: string;
  /** Pass pre-computed hits to skip recalculation */
  hits?: DownstreamHit[];
}

export default function DownstreamCard({ latitude, longitude, sevColor, hits: propHits }: Props) {
  const hits = propHits ?? getDownstreamImpacts(latitude, longitude);
  if (hits.length === 0) return null;

  return (
    <BlurView intensity={50} tint="dark" style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.pill, { backgroundColor: sevColor + '22', borderColor: sevColor + '55' }]}>
          <Text style={[styles.pillText, { color: sevColor }]}>
            {hits.length} downstream {hits.length === 1 ? 'impact' : 'impacts'}
          </Text>
        </View>
        <Text style={styles.subtitle}>within the affected watershed</Text>
      </View>

      {hits.map((hit, i) => {
        const meta = POI_META[hit.type];
        return (
          <View key={hit.id}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.row}>
              <Text style={styles.emoji}>{meta.emoji}</Text>
              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={styles.name} numberOfLines={1}>{hit.name}</Text>
                  <Text style={[styles.dist, { color: meta.color }]}>{formatDist(hit.distanceKm)}</Text>
                </View>
                <Text style={styles.desc} numberOfLines={2}>{hit.description}</Text>
                <View style={[styles.typePill, { backgroundColor: meta.color + '18' }]}>
                  <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
    paddingVertical: 14,
  },
  header: { paddingHorizontal: 14, marginBottom: 12, gap: 4 },
  pill: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 0.5,
  },
  pillText: { fontSize: 12, fontWeight: font.weight.semibold },
  subtitle: { fontSize: 11, color: colors.textMuted },
  divider: { height: 0.5, backgroundColor: colors.border, marginHorizontal: 14 },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  emoji: { fontSize: 22, lineHeight: 28 },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text },
  dist: { fontSize: 11, fontWeight: font.weight.bold },
  desc: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  typePill: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  typeText: { fontSize: 10, fontWeight: font.weight.medium },
});
