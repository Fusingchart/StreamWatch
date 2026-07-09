import { useState, useEffect } from 'react';
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
import { signInAnon } from '../src/services/firebase';
import { useAppStore } from '../src/store';
import { POLLUTION_CLASSES } from '../src/constants/pollution';
import { getSeverity } from '../src/utils/routing';
import { getCounty } from '../src/utils/geocode';
import { colors, font, radius, space } from '../src/constants/theme';
import DownstreamCard from '../src/components/DownstreamCard';

const SEV_COLOR = { HIGH: colors.high, MEDIUM: colors.warning, NONE: colors.none };
const SEV_BG = { HIGH: colors.high + '18', MEDIUM: colors.warning + '18', NONE: colors.none + '18' };
const SEV_BORDER = { HIGH: colors.high + '44', MEDIUM: colors.warning + '44', NONE: colors.none + '44' };
const SEV_LABEL = {
  HIGH: 'High severity, agency will be notified',
  MEDIUM: 'Medium severity, agency will be notified',
  NONE: 'No pollution detected, no action needed',
};


export default function ConfirmScreen() {
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const [submitting, setSubmitting] = useState(false);

  const userId = useAppStore((s) => s.userId);
  const pendingResult = useAppStore((s) => s.pendingResult);
  const pendingPhotoUri = useAppStore((s) => s.pendingPhotoUri);
  const addSighting = useAppStore((s) => s.addSighting);
  const clearPending = useAppStore((s) => s.clearPending);
  const setUserId = useAppStore((s) => s.setUserId);
  const setAuthError = useAppStore((s) => s.setAuthError);

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


  async function handleSubmit() {
    if (!pendingResult || !pendingPhotoUri) return;

    let activeUserId = userId;
    if (!activeUserId) {
      // Sign-in likely failed on launch (no network, Firebase hiccup) and
      // was never retried. Try once more right now instead of silently
      // doing nothing when the user taps Submit.
      try {
        activeUserId = await signInAnon();
        setUserId(activeUserId);
      } catch (e: any) {
        Alert.alert(
          'Not signed in',
          "Couldn't connect to sign you in, so this report can't be submitted yet. Check your connection and try again."
        );
        setAuthError(e.message ?? 'Sign-in failed');
        return;
      }
    }

    setSubmitting(true);
    try {
      const [photoUrl, county] = await Promise.all([
        uploadPhoto(pendingPhotoUri, activeUserId),
        getCounty(latitude, longitude),
      ]);

      const id = await submitSighting({
        userId: activeUserId, pollutionClass: pendingResult.pollutionClass,
        severity, confidence: pendingResult.confidence,
        latitude, longitude, county, photoUrl,
      });

      addSighting({
        id, userId: activeUserId, pollutionClass: pendingResult.pollutionClass,
        severity, confidence: pendingResult.confidence,
        latitude, longitude, county, photoUrl,
        reportedAt: new Date(), agencyEmailed: null, hidden: false,
        resolved: false, resolvedAt: null, resolvedBy: null, resolveToken: '',
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

          {/* Downstream impact card, only for non-clean detections */}
          {severity !== 'NONE' && latitude !== 0 && (
            <DownstreamCard latitude={latitude} longitude={longitude} sevColor={sevColor} />
          )}

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
