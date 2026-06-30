import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { connectRealtime, disconnectRealtime, showReadyNotification } from '../lib/realtime';
import type { Employee, Floor } from '../lib/types';

export { ErrorBoundary } from 'expo-router';

const COLORS = {
  base: '#3d424f',
  surface: '#4d5363',
  surfaceLight: '#5f6578',
  brass: '#e0c06a',
  cream: '#f5f0e8',
  muted: '#c0b8ac',
  wine: '#d08080',
  sage: '#9abaa0',
};

export let globalFloor: Floor | null = null;
export let setGlobalFloor: (f: Floor | null) => void = () => {};
export let globalUser: Employee | null = null;
export let setGlobalUser: (u: Employee | null) => void = () => {};

export default function RootLayout() {
  const [floor, setFloor] = useState<Floor | null>(null);
  const [user, setUser] = useState<Employee | null>(null);
  const [ready, setReady] = useState(false);

  globalFloor = floor;
  setGlobalFloor = setFloor;
  globalUser = user;
  setGlobalUser = setUser;

  useEffect(() => {
    const ch = connectRealtime(
      (f) => setFloor(f),
      (data) => showReadyNotification(data),
    );
    setReady(true);
    return () => { disconnectRealtime(); };
  }, []);

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.base }]}>
        <ActivityIndicator size="large" color={COLORS.brass} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.base }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.base },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="mesa/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Mesa',
            headerStyle: { backgroundColor: COLORS.surface },
            headerTintColor: COLORS.cream,
            presentation: 'fullScreenModal',
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
