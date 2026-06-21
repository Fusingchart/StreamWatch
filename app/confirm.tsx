import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Send, Trash2, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { uploadPhoto, submitSighting } from '../src/services/sightings';
import { useAppStore } from '../src/store';
import { POLLUTION_CLASSES } from '../src/constants/pollution';
import { getSeverity } from '../src/utils/routing';
import { getCounty } from '../src/utils/geocode';
import { colors, font, radius, space } from '../src/constants/theme';

const SEVERITY_COLOR = { HIGH: colors.high, MEDIUM: colors.warning, NONE: colors.success };
const SEVERITY_BG = { HIGH: '#FFF0EE', MEDIUM: '#FFF8EE', NONE: '#EDFAF1' };
const SEVERITY_LABEL = { HIGH: 'High severity — agency will be notified', MEDIUM: 'Medium severity — agency will be notified', NONE: 'No pollution detected' };

export default function ConfirmScreen() {
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { userId, pendingResult, pendingPhotoUri, addSighting, clearPending } =
    useAppStore((s) => ({
      userId: s.userId,
      pendingResult: s.pendingResult,
      pendingPhotoUri: s.pendingPhotoUri,
      addSighting: s.addSighting,
      clearPending: s.clearPending,
    }));

  if (!pendingResult || !pendingPhotoUri) {
    router.replace('/');
    return null;
  }

  const meta = POLLUTION_CLASSES[pendingResult.pollutionClass];
  const severity = getSeverity(pendingResult.pollutionClass);
  const sevColor = SEVERITY_COLOR[severity];
  const sevBg = SEVERITY_BG[severity];
  const latitude = parseFloat(lat ?? '0');
  const longitude = parseFloat(lng ?? '0');
  const confidence = Math.round(pendingResult.confidence * 100);

  async function handleSubmit() {
    if (!userId || !pendingResult || !pendingPhotoUri) return;
    setSubmitting(true);
    try {
      const [photoUrl, county] = await Promise.all([
        uploadPhoto(pendingPhotoUri, userId),
        getCounty(latitude, longitude),
      ]);

      const id = await submitSighting({
        userId,
        pollutionClass: pendingResult.pollutionClass,
        severity,
        confidence: pendingResult.confidence,
        latitude,
        longitude,
        county,
        photoUrl,
      });

      addSighting({
        id, userId,
        pollutionClass: pendingResult.pollutionClass,
        severity, confidence: pendingResult.confidence,
        latitude, longitude, county, photoUrl,
        reportedAt: new Date(),
        agencyEmailed: null,
        hidden: false,
      });

      clearPending();
      router.replace('/');
      Alert.alert('Reported!', severity !== 'NONE'
        ? 'Your report has been submitted and the relevant agency has been notified.'
        : 'Sighting recorded. No pollution detected.');
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={handleDiscard} style={styles.backBtn}>
          <ChevronLeft size={20} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Review Report</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Photo */}
        <Image source={{ uri: pendingPhotoUri }} style={styles.photo} />

        {/* Classification result */}
        <View style={styles.resultCard}>
          <View style={[styles.resultAccent, { backgroundColor: meta.color }]} />
          <View style={styles.resultBody}>
            <Text style={styles.resultClass}>{meta.label}</Text>
            <View style={styles.resultRow}>
              <View style={styles.confBar}>
                <View style={[styles.confFill, { width: `${confidence}%` as any, backgroundColor: meta.color }]} />
              </View>
              <Text style={[styles.confLabel, { color: meta.color }]}>{confidence}%</Text>
            </View>
          </View>
        </View>

        {/* Severity banner */}
        <View style={[styles.severityBanner, { backgroundColor: sevBg }]}>
          {severity === 'NONE'
            ? <CheckCircle size={18} color={sevColor} strokeWidth={2} />
            : <AlertTriangle size={18} color={sevColor} strokeWidth={2} />}
          <Text style={[styles.severityText, { color: sevColor }]}>
            {SEVERITY_LABEL[severity]}
          </Text>
        </View>

        {/* Location row */}
        {latitude !== 0 && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Location</Text>
            <Text style={styles.metaValue}>{latitude.toFixed(4)}, {longitude.toFixed(4)}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.submitBtn, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Send size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.submitText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.discardBtn]} onPress={handleDiscard}>
            <Trash2 size={16} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.discardText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  navTitle: { fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text },

  scroll: { paddingHorizontal: space.md, paddingBottom: 40 },

  photo: {
    width: '100%', height: 240,
    borderRadius: radius.lg,
    marginBottom: space.md,
    backgroundColor: colors.border,
  },

  resultCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: space.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  resultAccent: { width: 5 },
  resultBody: { flex: 1, padding: 16 },
  resultClass: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text, marginBottom: 10 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confBar: {
    flex: 1, height: 6, backgroundColor: colors.border,
    borderRadius: radius.full, overflow: 'hidden',
  },
  confFill: { height: '100%', borderRadius: radius.full },
  confLabel: { fontSize: font.size.sm, fontWeight: font.weight.bold, width: 36, textAlign: 'right' },

  severityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderRadius: radius.md, marginBottom: space.sm,
  },
  severityText: { fontSize: font.size.sm, fontWeight: font.weight.medium, flex: 1 },

  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: space.md,
  },
  metaLabel: { fontSize: font.size.sm, color: colors.textSecondary, fontWeight: font.weight.medium },
  metaValue: { fontSize: font.size.sm, color: colors.text, fontWeight: font.weight.semibold },

  actions: { gap: space.sm },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: radius.md,
  },
  submitBtn: { backgroundColor: colors.primary },
  discardBtn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  btnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: font.weight.semibold, fontSize: font.size.md },
  discardText: { color: colors.textSecondary, fontWeight: font.weight.medium, fontSize: font.size.md },
});
