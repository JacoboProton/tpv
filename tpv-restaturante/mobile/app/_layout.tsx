import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';
import { connectRealtime, disconnectRealtime, showReadyNotification } from '../lib/realtime';
import { startKeepalive, sessionLogout } from '../lib/session';
import { API_URL, TPV_API_KEY } from '../lib/config';
import { C } from '../lib/theme';
import type { Employee, Floor } from '../lib/types';
import { setLastFloor, setEmployeeSession, clearEmployeeSession, processPendingSales } from '../lib/api';
import { getTenantId } from '../lib/api';

export { ErrorBoundary } from 'expo-router';

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
  setGlobalUser = (u) => { setUser(u); if (u) setEmployeeSession(u.id, u.role); else clearEmployeeSession(); };

  useEffect(() => {
    const ch = connectRealtime(
      (f) => { setFloor(f); setLastFloor(f); },
      (data) => showReadyNotification(data),
      getTenantId(),
    );
    setReady(true);
    return () => { disconnectRealtime(); };
  }, []);

  // Keepalive + session invalidation detection
  useEffect(() => {
    if (!user) return;
    const cleanup = startKeepalive(user.id, () => {
      Alert.alert('Sesión cerrada', 'Tu sesión fue cerrada porque otro terminal inició sesión con tu usuario.');
      setGlobalUser(null);
      setUser(null);
    });
    return () => cleanup();
  }, [user?.id]);

  // Periodic retry of pending sales
  useEffect(() => {
    const iv = setInterval(() => processPendingSales(), 30000);
    return () => clearInterval(iv);
  }, []);

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: C.base }]}>
        <ActivityIndicator size="large" color={C.brass} />
      </View>
    );
  }

  return (
    <StripeTerminalProvider
      tokenProvider={async () => {
        const res = await fetch(`${API_URL}/api/stripe/terminal-connection-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-tpv-key': TPV_API_KEY },
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Error al conectar con Stripe');
        return d.connectionToken;
      }}
    >
      <View style={{ flex: 1, backgroundColor: C.base }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: C.base },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="mesa/[id]"
            options={{
              headerShown: true,
              headerTitle: 'Mesa',
              headerStyle: { backgroundColor: C.surface },
              headerTintColor: C.cream,
              presentation: 'fullScreenModal',
            }}
          />
        </Stack>
      </View>
    </StripeTerminalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
