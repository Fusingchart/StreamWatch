import { Tabs } from 'expo-router';
import { Camera, Map, List } from 'lucide-react-native';
import { colors } from '../../src/constants/theme';
import { Platform } from 'react-native';
import { BlurView } from 'expo-blur';

function TabBarBackground() {
  return (
    <BlurView
      intensity={80}
      tint="dark"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Report',
          tabBarIcon: ({ color, size }) => <Camera color={color} size={size - 2} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size - 2} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <List color={color} size={size - 2} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}
