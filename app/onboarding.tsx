import { useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, font, radius, space } from '../src/constants/theme';

export const ONBOARDING_KEY = '@streamwatch_onboarding_done';

const { width: W } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '💧',
    accentColor: colors.primary,
    gradientColors: ['#001a3a', '#000'] as const,
    title: 'Pollution goes\nunreported',
    body: "Most waterway incidents in WA-01 are never documented. By the time someone calls it in, the damage is done and the source is gone.",
    detail: 'StreamWatch makes reporting take 30 seconds.',
  },
  {
    emoji: '📷',
    accentColor: colors.none,
    gradientColors: ['#001a12', '#000'] as const,
    title: 'Take a photo.\nWe do the rest.',
    body: null,
    detail: null,
    steps: [
      { emoji: '📍', label: 'Locate', sub: 'GPS pins the spot automatically' },
      { emoji: '📷', label: 'Photograph', sub: 'Point at the water and shoot' },
      { emoji: '📬', label: 'Submit', sub: 'The right agency gets notified' },
    ],
  },
  {
    emoji: '📊',
    accentColor: colors.warning,
    gradientColors: ['#1a1000', '#000'] as const,
    title: 'See what others\nare finding',
    body: 'Reports from the whole community build waterway health scores over time. You can see which rivers are improving, which are getting worse, and what is at risk downstream.',
    detail: null,
  },
];

async function finish() {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  router.replace('/');
}

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  function next() {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: W * (index + 1), animated: true });
    } else {
      finish();
    }
  }

  function onScroll(e: any) {
    const page = Math.round(e.nativeEvent.contentOffset.x / W);
    setIndex(page);
  }

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient transitions per slide */}
      <LinearGradient
        colors={slide.gradientColors}
        style={StyleSheet.absoluteFill}
      />

      {/* Accent glow */}
      <View style={[styles.glow, { backgroundColor: slide.accentColor + '18' }]} />

      <SafeAreaView style={styles.safeArea}>
        {/* Skip */}
        <TouchableOpacity onPress={finish} style={styles.skipBtn} activeOpacity={0.6}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Slides */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          scrollEventThrottle={16}
          style={styles.slides}
        >
          {SLIDES.map((s, i) => (
            <View key={i} style={styles.slide}>
              {/* Icon card */}
              <BlurView intensity={30} tint="dark" style={[styles.iconCard, { borderColor: s.accentColor + '44' }]}>
                <Text style={styles.emoji}>{s.emoji}</Text>
              </BlurView>

              {/* Title */}
              <Text style={styles.title}>{s.title}</Text>

              {/* Body */}
              {s.body && <Text style={styles.body}>{s.body}</Text>}
              {s.detail && <Text style={[styles.detail, { color: s.accentColor }]}>{s.detail}</Text>}

              {/* Steps (slide 2) */}
              {s.steps && (
                <View style={styles.steps}>
                  {s.steps.map((step, si) => (
                    <View key={si} style={styles.stepRow}>
                      <BlurView intensity={30} tint="dark" style={[styles.stepIcon, { borderColor: s.accentColor + '44' }]}>
                        <Text style={styles.stepEmoji}>{step.emoji}</Text>
                      </BlurView>
                      {si < s.steps!.length - 1 && (
                        <View style={[styles.stepArrow, { backgroundColor: s.accentColor + '40' }]} />
                      )}
                    </View>
                  ))}
                </View>
              )}
              {s.steps && (
                <View style={styles.stepLabels}>
                  {s.steps.map((step, si) => (
                    <View key={si} style={styles.stepLabelCol}>
                      <Text style={[styles.stepLabel, { color: s.accentColor }]}>{step.label}</Text>
                      <Text style={styles.stepSub}>{step.sub}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Bottom */}
        <View style={styles.bottom}>
          {/* Dots */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === index
                    ? { width: 20, backgroundColor: slide.accentColor }
                    : { backgroundColor: colors.border },
                ]}
              />
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={next}
            activeOpacity={0.85}
            style={[styles.cta, { backgroundColor: slide.accentColor }]}
          >
            <Text style={styles.ctaText}>{isLast ? 'Get Started' : 'Continue'}</Text>
          </TouchableOpacity>

          {/* Privacy note */}
          <Text style={styles.privacy}>
            No account needed · Reports are anonymous · Location used only for reporting
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glow: {
    position: 'absolute',
    top: -100, left: -100, right: -100,
    height: 400,
    borderRadius: 999,
  },
  safeArea: { flex: 1 },

  skipBtn: { alignSelf: 'flex-end', padding: space.md },
  skipText: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: font.weight.medium },

  slides: { flex: 1 },
  slide: {
    width: W,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },

  iconCard: {
    width: 110, height: 110, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1,
    marginBottom: 8,
  },
  emoji: { fontSize: 52 },

  title: {
    fontSize: 32, fontWeight: font.weight.bold,
    color: colors.text, textAlign: 'center', lineHeight: 38,
  },
  body: {
    fontSize: font.size.md, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 24,
  },
  detail: {
    fontSize: font.size.md, fontWeight: font.weight.semibold,
    textAlign: 'center',
  },

  steps: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 8,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepIcon: {
    width: 68, height: 68, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1,
  },
  stepEmoji: { fontSize: 28 },
  stepArrow: { width: 24, height: 2, marginHorizontal: 4 },

  stepLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    width: '100%', paddingHorizontal: 4,
  },
  stepLabelCol: { width: 80, alignItems: 'center', gap: 3 },
  stepLabel: { fontSize: 12, fontWeight: font.weight.bold, textAlign: 'center' },
  stepSub: { fontSize: 10, color: colors.textMuted, textAlign: 'center', lineHeight: 13 },

  bottom: { paddingHorizontal: space.md, paddingBottom: space.md, gap: 16, alignItems: 'center' },

  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },

  cta: {
    width: '100%', paddingVertical: 16,
    borderRadius: radius.md, alignItems: 'center',
  },
  ctaText: { fontSize: font.size.md, fontWeight: font.weight.bold, color: '#fff' },

  privacy: {
    fontSize: 11, color: colors.textMuted,
    textAlign: 'center', lineHeight: 16,
  },
});
