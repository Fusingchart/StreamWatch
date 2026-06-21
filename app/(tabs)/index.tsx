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
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { classifyImage } from '../../src/services/roboflow';
import { useAppStore } from '../../src/store';
import { colors, font, radius } from '../../src/constants/theme';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const setPendingResult = useAppStore((s) => s.setPendingResult);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.permIcon}>
          <Zap color={colors.primary} size={36} strokeWidth={2} />
        </View>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permBody}>
          StreamWatch uses your camera to detect waterway pollution and route reports to the right agency.
        </Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
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
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        {/* Viewfinder corners */}
        <View style={styles.vfContainer}>
          <View style={styles.vfTop}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
          </View>
          <View style={styles.vfBottom}>
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Header label */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>StreamWatch</Text>
          <Text style={styles.headerSub}>Point at any waterway</Text>
        </View>

        {/* Shutter area */}
        <View style={styles.shutterRow}>
          {busy ? (
            <View style={styles.shutterBusy}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.analyzingText}>Analyzing…</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={capture} activeOpacity={0.8}>
              <View style={styles.shutterOuter}>
                <View style={styles.shutterInner} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = 'rgba(255,255,255,0.85)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },

  // Permission screen
  permContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  permIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  permTitle: {
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  permBody: {
    fontSize: font.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: radius.full,
  },
  permButtonText: {
    color: '#fff',
    fontWeight: font.weight.semibold,
    fontSize: font.size.md,
  },

  // Viewfinder corners
  vfContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 44,
  },
  vfTop: { flexDirection: 'row', justifyContent: 'space-between' },
  vfBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  corner: { width: CORNER_SIZE, height: CORNER_SIZE },
  cornerTL: {
    borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR, borderTopLeftRadius: 4,
  },
  cornerTR: {
    borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR, borderTopRightRadius: 4,
  },
  cornerBL: {
    borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR, borderBottomLeftRadius: 4,
  },
  cornerBR: {
    borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR, borderBottomRightRadius: 4,
  },

  // Header
  header: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    letterSpacing: 0.5,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: font.size.sm,
    marginTop: 4,
  },

  // Shutter
  shutterRow: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  shutterBusy: { alignItems: 'center', gap: 10 },
  analyzingText: {
    color: '#fff',
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
});
