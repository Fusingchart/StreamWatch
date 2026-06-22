import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Send, Trash2, AlertTriangle, CheckCircle, MapPin } from 'lucide-react-native';
import { uploadPhoto, submitSighting } from '../src/services/sightings';
import { useAppStore } from '../src/store';
import { POLLUTION_CLASSES } from '../src/constants/pollution';
import { getSeverity } from '../src/utils/routing';
import { getCounty } from '../src/utils/geocode';
import { colors, font, radius, space } from '../src/constants/theme';
import { getDownstreamImpacts, POI_META, DownstreamHit } from '../src/data/downstream';

const SEV_COLOR = { HIGH: colors.high, MEDIUM: colors.warning, NONE: colors.none };
const SEV_BG = { HIGH: colors.high + '18', MEDIUM: colors.warning + '18', NONE: colors.none + '18' };
const SEV_BORDER = { HIGH: colors.high + '44', MEDIUM: colors.warning + '44', NONE: colors.none + '44' };
const SEV_LABEL = {
  HIGH: 'High severity — agency will be notified',
  MEDIUM: 'Medium severity — agency will be notified',
  NONE: 'No pollution detected — no action needed',
};

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function DownstreamCard({ hits, sevColor }: { hits: DownstreamHit[]; sevColor: string }) {
  if (hits.length === 0) return null;
  return (
    <BlurView intensity={50} tint="dark" style={styles.downstreamCard}>
      {/* Header */}
      <View style={styles.downstreamHeader}>
        <View style={[styles.downstreamPill, { backgroundColor: sevColor + '22', borderColor: sevColor + '55' }]}>
          <Text style={[styles.downstreamPillText, { color: sevColor }]}>
            {hits.length} downstream {hits.length === 1 ? 'impact' : 'impacts'}
          </Text>
        </View>
        <Text style={styles.downstreamSubtitle}>within the affected watershed</Text>
      </View>

      {/* POI rows */}
      {hits.map((hit, i) => {
        const meta = POI_META[hit.type];
        return (
          <View key={hit.id}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.poiRow}>
              <Text style={styles.poiEmoji}>{meta.emoji}</Text>
              <View style={styles.poiBody}>
                <View style={styles.poiTitleRow}>
                  <Text style={styles.poiName} numberOfLines={1}>{hit.name}</Text>
                  <Text style={[styles.poiDist, { color: meta.color }]}>{formatDist(hit.distanceKm)}</Text>
                </View>
                <Text style={styles.poiDesc} numberOfLines={2}>{hit.description}</Text>
                <View style={[styles.poiTypePill, { backgroundColor: meta.color + '18' }]}>
                  <Text style={[styles.poiTypeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </BlurView>
  );
}

export default function ConfirmScreen() {
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const [submitting, setSubmitting] = useState(false);

  const userId = useAppStore((s) => s.userId);
  const pendingResult = useAppStore((s) => s.pendingResult);
  const pendingPhotoUri = useAppStore((s) => s.pendingPhotoUri);
  const addSighting = useAppStore((s) => s.addSighting);
  const clearPending = useAppStore((s) => s.clearPending);

  useEffect(() => {
    if (!pendingResult || !pendingPhotoUri) {
      router.replace('/');
    }
  }, [pendingResult, pendingPhotoUri]);

  if (!pendingResult || !pendingPhotoUri) return null;

  const meta = POLLUTION_CLASSES[pendingResult.pollutionClass];
  const severity = getSeverity(pendingResult.pollutionClass);
  const sevColor = SEV_COLOR[severity];
  const latitude = parseFloat(lat ?? '0');
  const longitude = parseFloat(lng ?? '0');
  const confidence = Math.round(pendingResult.confidence * 100);

  const downstreamHits = useMemo(
    () => (severity !== 'NONE' && latitude !== 0)
      ? getDownstreamImpacts(latitude, longitude)
      : [],
    [latitude, longitude, severity]
  );

  async function handleSubmit() {
    if (!userId || !pendingResult || !pendingPhotoUri) return;
    setSubmitting(true);
    try {
      const [photoUrl, county] = await Promise.all([
        uploadPhoto(pendingPhotoUri, userId),
        getCounty(latitude, longitude),
      ]);

      const id = await submitSighting({
        userId, pollutionClass: pendingResult.pollutionClass,
        severity, confidence: pendingResult.confidence,
        latitude, longitude, county, photoUrl,
      });

      addSighting({
        id, userId, pollutionClass: pendingResult.pollutionClass,
        severity, confidence: pendingResult.confidence,
        latitude, longitude, county, photoUrl,
        reportedAt: new Date(), agencyEmailed: null, hidden: false,
      });

      clearPending();
      router.replace('/');
      Alert.alert(
        severity !== 'NONE' ? 'Report Submitted' : 'Sighting Recorded',
        severity !== 'NONE'
          ? 'The relevant agency has been notified.'
          : 'No pollution detected at this location.'
      );
    } catch (e: any) {
      Alert.alert('Submission Failed', e.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDiscard() {
    clearPending();
    router.back();
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Image source={{ uri: pendingPhotoUri }} style={StyleSheet.absoluteFill} blurRadius={4} />
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Nav */}
        <View style={styles.nav}>
          <TouchableOpacity onPress={handleDiscard} activeOpacity={0.7}>
            <BlurView intensity={50} tint="dark" style={styles.navBtn}>
              <ChevronLeft size={18} color="#fff" strokeWidth={2.5} />
            </BlurView>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Review Report</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Classification card */}
          <BlurView intensity={50} tint="dark" style={styles.card}>
            <View style={[styles.classIconWrap, { backgroundColor: meta.color + '22' }]}>
              <View style={[styles.classIconDot, { backgroundColor: meta.color }]} />
            </View>
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

          {/* Severity banner */}
          <BlurView
            intensity={50} tint="dark"
            style={[styles.sevBanner, { borderColor: SEV_BORDER[severity] }]}
          >
            <View style={[styles.sevIconWrap, { backgroundColor: SEV_BG[severity] }]}>
              {severity === 'NONE'
                ? <CheckCircle size={16} color={sevColor} strokeWidth={2} />
                : <AlertTriangle size={16} color={sevColor} strokeWidth={2} />}
            </View>
            <Text style={[styles.sevLabel, { color: sevColor }]}>{SEV_LABEL[severity]}</Text>
          </BlurView>

          {/* Downstream impact card — only for non-clean detections */}
          <DownstreamCard hits={downstreamHits} sevColor={sevColor} />

          {/* Location */}
          {latitude !== 0 && (
            <BlurView intensity={50} tint="dark" style={styles.card}>
              <MapPin size={16} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.locText}>
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </Text>
            </BlurView>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Send size={16} color="#fff" strokeWidth={2} />
                    <Text style={styles.submitText}>Submit Report</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDiscard} activeOpacity={0.7}>
              <BlurView intensity={40} tint="dark" style={styles.discardBtn}>
                <Trash2 size={15} color={colors.textSecondary} strokeWidth={1.8} />
                <Text style={styles.discardText}>Discard</Text>
              </BlurView>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  nav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md, paddingVertical: 12,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: radius.full,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: colors.border,
  },
  navTitle: { fontSize: font.size.lg, fontWeight: font.weight.semibold, color: '#fff' },

  scroll: { paddingHorizontal: space.md, paddingBottom: 40, gap: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: radius.md,
    overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border,
  },
  classIconWrap: {
    width: 44, height: 44, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  classIconDot: { width: 16, height: 16, borderRadius: 8 },
  classBody: { flex: 1 },
  className: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: '#fff', marginBottom: 8 },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confTrack: {
    flex: 1, height: 5, backgroundColor: colors.border,
    borderRadius: radius.full, overflow: 'hidden',
  },
  confFill: { height: '100%', borderRadius: radius.full },
  confPct: { fontSize: font.size.sm, fontWeight: font.weight.bold, width: 34, textAlign: 'right' },

  sevBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: radius.md,
    overflow: 'hidden', borderWidth: 0.5,
  },
  sevIconWrap: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  sevLabel: { flex: 1, fontSize: font.size.sm, fontWeight: font.weight.medium, lineHeight: 18 },

  // Downstream impact card
  downstreamCard: {
    borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border,
    paddingVertical: 14,
  },
  downstreamHeader: { paddingHorizontal: 14, marginBottom: 12, gap: 4 },
  downstreamPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 0.5,
  },
  downstreamPillText: { fontSize: 12, fontWeight: font.weight.semibold },
  downstreamSubtitle: { fontSize: 11, color: colors.textMuted },

  divider: { height: 0.5, backgroundColor: colors.border, marginHorizontal: 14 },

  poiRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  poiEmoji: { fontSize: 22, lineHeight: 28 },
  poiBody: { flex: 1, gap: 4 },
  poiTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  poiName: { flex: 1, fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text },
  poiDist: { fontSize: 11, fontWeight: font.weight.bold },
  poiDesc: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  poiTypePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.full,
  },
  poiTypeText: { fontSize: 10, fontWeight: font.weight.medium },

  locText: { fontSize: font.size.sm, color: colors.textSecondary, flex: 1 },

  actions: { gap: 10, marginTop: 6 },
  submitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: radius.md,
  },
  submitText: { color: '#fff', fontWeight: font.weight.semibold, fontSize: font.size.md },
  discardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: radius.md,
    overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border,
  },
  discardText: { color: colors.textSecondary, fontWeight: font.weight.medium, fontSize: font.size.md },
});
