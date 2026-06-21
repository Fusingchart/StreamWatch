import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { signInAnon } from '../src/services/firebase';
import { useAppStore } from '../src/store';

export default function RootLayout() {
  const setUserId = useAppStore((s) => s.setUserId);

  useEffect(() => {
    signInAnon().then(setUserId).catch(console.error);
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="confirm" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
