import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInAnon } from '../src/services/firebase';
import { useAppStore } from '../src/store';
import { ONBOARDING_KEY } from './onboarding';

export default function RootLayout() {
  const setUserId = useAppStore((s) => s.setUserId);
  const setAuthError = useAppStore((s) => s.setAuthError);

  useEffect(() => {
    function trySignIn() {
      return signInAnon().then(setUserId).catch((e) => {
        console.error(e);
        setAuthError(e.message ?? 'Could not sign in. Check your connection.');
      });
    }

    async function init() {
      const [, seen] = await Promise.all([
        trySignIn(),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);
      if (!seen) router.replace('/onboarding');
    }
    init();

    // If sign-in failed (most commonly: no network on first launch), retry
    // whenever the app comes back to the foreground instead of leaving
    // userId permanently null with no way to recover.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !useAppStore.getState().userId) trySignIn();
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="confirm" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sighting/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
