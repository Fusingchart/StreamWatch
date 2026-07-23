import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  AppState,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Zap, Droplets, WifiOff, ImagePlus } from 'lucide-react-native';
import { classifyImage } from '../../src/services/gemini';
import { enqueueReport, flushQueue, getQueuedReports } from '../../src/services/offlineQueue';
import { useAppStore } from '../../src/store';
import { POLLUTION_CLASSES } from '../../src/constants/pollution';
import { computeWaterwayHealth } from '../../src/data/waterways';
import { colors, font, radius, space } from '../../src/constants/theme';

function useStats() {
  const sightings = useAppStore((s) => s.sightings);

  return useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = sightings.filter(
      (s) => s.reportedAt instanceof Date && s.reportedAt.getTime() > weekAgo
    );

    // Most common pollution class this week (excluding clean_water)
    const counts: Record<string, number> = {};
    for (const s of thisWeek) {
      if (s.pollutionClass !== 'clean_water') {
        counts[s.pollutionClass] = (counts[s.pollutionClass] ?? 0) + 1;
      }
    }
    const topClass = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topLabel = topClass ? POLLUTION_CLASSES[topClass as keyof typeof POLLUTION_CLASSES]?.label : null;

    // Overall watershed health
    const healthScores = computeWaterwayHealth(sightings);
    const avgHealth = healthScores.length > 0
      ? Math.round(healthScores.reduce((s, h) => s + h.score, 0) / healthScores.length)
      : null;

    const healthColor = avgHealth === null ? colors.textMuted
      : avgHealth >= 80 ? colors.none
      : avgHealth >= 55 ? colors.warning
      : colors.high;

    return {
      weekCount: thisWeek.length,
      topLabel,
      avgHealth,
      healthColor,
    };
  }, [sightings]);
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const userId = useAppStore((s) => s.userId);
  const setPendingResult = useAppStore((s) => s.setPendingResult);
  const addSighting = useAppStore((s) => s.addSighting);
  const stats = useStats();

  const refreshPendingCount = useCallback(() => {
    getQueuedReports().then((q) => setPendingCount(q.length));
  }, []);

  const attemptFlush = useCallback(() => {
    if (!userId) return;
    flushQueue(userId, addSighting).finally(refreshPendingCount);
  }, [userId, addSighting, refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();
    attemptFlush();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') attemptFlush();
    });
    return () => sub.remove();
  }, [attemptFlush, refreshPendingCount]);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permIcon}>
          <Droplets color={colors.primary} size={34} strokeWidth={1.5} />
        </View>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permBody}>
          StreamWatch uses your camera to detect waterway pollution and alert the right agency automatically.
        </Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission} activeOpacity={0.8}>
          <Text style={styles.permButtonText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function processPhoto(uri: string) {
    if (busy) return;
    setBusy(true);
    try {
      // GPS works without a network connection, so get a location fix
      // regardless of whether classification (which needs a network call)
      // succeeds or not.
      const locResult = await Location.requestForegroundPermissionsAsync().then((p) =>
        p.granted ? Location.getCurrentPositionAsync() : null
      );

      let classification;
      try {
        classification = await classifyImage(uri);
      } catch (classifyError) {
        // Most likely a flaky/absent connection. Don't discard the report,
        // save it locally and retry automatically once back online.
        if (locResult) {
          await enqueueReport(uri, locResult.coords.latitude, locResult.coords.longitude);
          refreshPendingCount();
          Alert.alert(
            'Saved offline',
            "Couldn't reach the server, so this report was saved on your device. It'll submit automatically once you're back online."
          );
        } else {
          Alert.alert('Error', "Couldn't classify the photo and no location was available. Please try again.");
        }
        return;
      }

      setPendingResult(classification, uri);
      router.push({
        pathname: '/confirm',
        params: {
          lat: locResult?.coords.latitude ?? 0,
          lng: locResult?.coords.longitude ?? 0,
        },
      });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function capture() {
    if (!cameraRef.current || busy) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    if (!photo) {
      Alert.alert('Error', 'No photo captured');
      return;
    }
    await processPhoto(photo.uri);
  }

  async function pickFromLibrary() {
    if (busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo Access Needed', 'Allow access to your photo library to upload an existing photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    await processPhoto(result.assets[0].uri);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Top gradient + header */}
      <LinearGradient
        colors={['rgba(0,0,0,0.72)', 'rgba(0,0,0,0.0)']}
        style={styles.topGradient}
      >
        <View style={styles.header}>
          <Droplets color="#fff" size={18} strokeWidth={2} />
          <Text style={styles.headerTitle}>StreamWatch</Text>
          {pendingCount > 0 && (
            <View style={styles.pendingPill}>
              <WifiOff size={11} color={colors.warning} strokeWidth={2.2} />
              <Text style={styles.pendingText}>
                {pendingCount} pending
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSub}>Point camera at any waterway</Text>

        {/* Stats card */}
        <BlurView intensity={40} tint="dark" style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.weekCount}</Text>
            <Text style={styles.statLabel}>reports this week</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: stats.healthColor }]}>
              {stats.avgHealth ?? '—'}
            </Text>
            <Text style={styles.statLabel}>watershed health</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue} numberOfLines={1}>
              {stats.topLabel ?? 'None'}
            </Text>
            <Text style={styles.statLabel}>most common</Text>
          </View>
        </BlurView>
      </LinearGradient>

      {/* Viewfinder */}
      <View style={styles.vfWrapper} pointerEvents="none">
        <View style={styles.vfTop}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
        </View>
        <View style={styles.vfBottom}>
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      {/* Bottom gradient + shutter */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.bottomGradient}
      >
        {busy ? (
          <BlurView intensity={60} tint="dark" style={styles.analyzingPill}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.analyzingText}>Analyzing…</Text>
          </BlurView>
        ) : (
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={pickFromLibrary} activeOpacity={0.8} style={styles.galleryBtn}>
              <BlurView intensity={50} tint="dark" style={styles.galleryBtnInner}>
                <ImagePlus size={20} color="#fff" strokeWidth={2} />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity onPress={capture} activeOpacity={0.85} style={styles.shutterWrapper}>
              <View style={styles.shutterOuter}>
                <View style={styles.shutterInner} />
              </View>
            </TouchableOpacity>

            <View style={styles.galleryBtn} />
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const C = 24;
const T = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Permission
  permContainer: {
    flex: 1, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  permIcon: {
    width: 80, height: 80, borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.lg,
  },
  permTitle: {
    fontSize: font.size.xl, fontWeight: font.weight.bold,
    color: colors.text, marginBottom: 12, textAlign: 'center',
  },
  permBody: {
    fontSize: font.size.md, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: space.xl,
  },
  permButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: radius.full,
  },
  permButtonText: { color: '#fff', fontWeight: font.weight.semibold, fontSize: font.size.md },

  // Top
  topGradient: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 60, paddingHorizontal: space.lg, paddingBottom: 24,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  headerTitle: { color: '#fff', fontSize: font.size.lg, fontWeight: font.weight.bold },
  pendingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.full, backgroundColor: colors.warning + '22',
  },
  pendingText: { color: colors.warning, fontSize: 11, fontWeight: font.weight.semibold },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: font.size.sm, marginBottom: 14 },

  statsCard: {
    flexDirection: 'row',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statItem: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8,
    alignItems: 'center', gap: 2,
  },
  statValue: {
    fontSize: 15, fontWeight: font.weight.bold,
    color: '#fff', textAlign: 'center',
  },
  statLabel: {
    fontSize: 10, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', lineHeight: 13,
  },
  statDivider: {
    width: 0.5, marginVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // Viewfinder
  vfWrapper: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    justifyContent: 'center', padding: 48,
  },
  vfTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 160 },
  vfBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  corner: { width: C, height: C },
  cornerTL: { borderTopWidth: T, borderLeftWidth: T, borderColor: 'rgba(255,255,255,0.9)', borderTopLeftRadius: 4 },
  cornerTR: { borderTopWidth: T, borderRightWidth: T, borderColor: 'rgba(255,255,255,0.9)', borderTopRightRadius: 4 },
  cornerBL: { borderBottomWidth: T, borderLeftWidth: T, borderColor: 'rgba(255,255,255,0.9)', borderBottomLeftRadius: 4 },
  cornerBR: { borderBottomWidth: T, borderRightWidth: T, borderColor: 'rgba(255,255,255,0.9)', borderBottomRightRadius: 4 },

  // Bottom
  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: 110, paddingTop: 60, alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', paddingHorizontal: 44,
  },
  shutterWrapper: { alignItems: 'center', justifyContent: 'center' },
  shutterOuter: {
    width: 78, height: 78, borderRadius: 39,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff',
  },
  galleryBtn: { width: 44, height: 44 },
  galleryBtnInner: {
    width: 44, height: 44, borderRadius: radius.full,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  analyzingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: radius.full, overflow: 'hidden',
  },
  analyzingText: { color: '#fff', fontSize: font.size.sm, fontWeight: font.weight.medium },
});
