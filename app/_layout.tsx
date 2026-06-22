import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInAnon } from '../src/services/firebase';
import { useAppStore } from '../src/store';
import { ONBOARDING_KEY } from './onboarding';

export default function RootLayout() {
  const setUserId = useAppStore((s) => s.setUserId);

  useEffect(() => {
    async function init() {
      const [, seen] = await Promise.all([
        signInAnon().then(setUserId).catch(console.error),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);
      if (!seen) router.replace('/onboarding');
    }
    init();
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
