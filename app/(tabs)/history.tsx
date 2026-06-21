import { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { subscribeSightings } from '../../src/services/sightings';
import { useAppStore } from '../../src/store';
import { POLLUTION_CLASSES } from '../../src/constants/pollution';
import { Sighting } from '../../src/types';

export default function HistoryScreen() {
  const { sightings, setSightings } = useAppStore((s) => ({
    sightings: s.sightings,
    setSightings: s.setSightings,
  }));

  useEffect(() => {
    const unsub = subscribeSightings(setSightings);
    return unsub;
  }, []);

  function renderItem({ item }: { item: Sighting }) {
    const meta = POLLUTION_CLASSES[item.pollutionClass];
    return (
      <View style={styles.card}>
        <View style={[styles.dot, { backgroundColor: meta.color }]} />
        <View style={styles.info}>
          <Text style={styles.label}>{meta.label}</Text>
          <Text style={styles.sub}>
            {Math.round(item.confidence * 100)}% confidence · {item.county || 'Unknown county'}
          </Text>
          <Text style={styles.time}>
            {item.reportedAt instanceof Date
              ? item.reportedAt.toLocaleString()
              : 'Pending…'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: meta.color + '22' }]}>
          <Text style={[styles.badgeText, { color: meta.color }]}>
            {item.severity}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Recent Sightings</Text>
      <FlatList
        data={sightings}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No sightings yet. Be the first to report!</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  heading: { fontSize: 22, fontWeight: '700', margin: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  info: { flex: 1 },
  label: { fontWeight: '600', fontSize: 15 },
  sub: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  time: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 60 },
});
