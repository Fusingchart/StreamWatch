import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Zap, Droplets } from 'lucide-react-native';
import { classifyImage } from '../../src/services/roboflow';
import { useAppStore } from '../../src/store';
import { colors, font, radius, space } from '../../src/constants/theme';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const setPendingResult = useAppStore((s) => s.setPendingResult);

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

  async function capture() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo) throw new Error('No photo captured');

      const [locResult, classification] = await Promise.all([
        Location.requestForegroundPermissionsAsync().then((p) =>
          p.granted ? Location.getCurrentPositionAsync() : null
        ),
        classifyImage(photo.uri),
      ]);

      setPendingResult(classification, photo.uri);
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Top gradient + header */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={styles.topGradient}
      >
        <View style={styles.header}>
          <Droplets color="#fff" size={18} strokeWidth={2} />
          <Text style={styles.headerTitle}>StreamWatch</Text>
        </View>
        <Text style={styles.headerSub}>Point camera at any waterway</Text>
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
          <TouchableOpacity onPress={capture} activeOpacity={0.85} style={styles.shutterWrapper}>
            <View style={styles.shutterOuter}>
              <View style={styles.shutterInner} />
            </View>
          </TouchableOpacity>
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
    paddingTop: 60, paddingHorizontal: space.lg, paddingBottom: 40,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  headerTitle: { color: '#fff', fontSize: font.size.lg, fontWeight: font.weight.bold },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: font.size.sm },

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
  shutterWrapper: { alignItems: 'center', justifyContent: 'center' },
  shutterOuter: {
    width: 78, height: 78, borderRadius: 39,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff',
  },
  analyzingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: radius.full, overflow: 'hidden',
  },
  analyzingText: { color: '#fff', fontSize: font.size.sm, fontWeight: font.weight.medium },
});
