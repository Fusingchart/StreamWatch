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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { uploadPhoto, submitSighting } from '../src/services/sightings';
import { useAppStore } from '../src/store';
import { POLLUTION_CLASSES } from '../src/constants/pollution';
import { getSeverity } from '../src/utils/routing';
import { getCounty } from '../src/utils/geocode';

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
  const latitude = parseFloat(lat ?? '0');
  const longitude = parseFloat(lng ?? '0');

  async function handleSubmit() {
    if (!userId || !pendingResult || !pendingPhotoUri) return;
    setSubmitting(true);
    try {
      const [photoUrl, county] = await Promise.all([
        uploadPhoto(pendingPhotoUri, userId),
        getCounty(latitude, longitude),
      ]);

      const severity = getSeverity(pendingResult.pollutionClass);
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
        id,
        userId,
        pollutionClass: pendingResult.pollutionClass,
        severity,
        confidence: pendingResult.confidence,
        latitude,
        longitude,
        county,
        photoUrl,
        reportedAt: new Date(),
        agencyEmailed: null,
        hidden: false,
      });

      clearPending();
      router.replace('/');
      Alert.alert('Reported!', 'Your sighting has been submitted.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Submission failed.');
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Image source={{ uri: pendingPhotoUri }} style={styles.photo} />

        <View style={styles.card}>
          <View style={[styles.colorBar, { backgroundColor: meta.color }]} />
          <View style={styles.cardBody}>
            <Text style={styles.classLabel}>{meta.label}</Text>
            <Text style={styles.confidence}>
              {Math.round(pendingResult.confidence * 100)}% confidence
            </Text>
            <View style={[styles.severityBadge, { backgroundColor: meta.color + '22' }]}>
              <Text style={[styles.severityText, { color: meta.color }]}>
                {meta.severity} SEVERITY
              </Text>
            </View>
          </View>
        </View>

        {meta.severity !== 'NONE' && (
          <Text style={styles.agencyNote}>
            This report will be emailed to the appropriate WA agency.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Report</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.discardButton]} onPress={handleDiscard}>
          <Text style={[styles.buttonText, { color: '#6B7280' }]}>Discard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 20 },
  photo: { width: '100%', height: 260, borderRadius: 16, marginBottom: 16 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  colorBar: { width: 6 },
  cardBody: { flex: 1, padding: 16 },
  classLabel: { fontSize: 20, fontWeight: '700' },
  confidence: { color: '#6B7280', marginTop: 4 },
  severityBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: { fontSize: 12, fontWeight: '700' },
  agencyNote: {
    color: '#374151',
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitButton: { backgroundColor: '#3A86FF' },
  discardButton: { backgroundColor: '#E5E7EB' },
  buttonText: { fontWeight: '600', fontSize: 16, color: '#fff' },
});
