import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';
import { AppProvider, useAppContext } from '../lib/store';
import { connectRealtime, disconnectRealtime, showReadyNotification } from '../lib/realtime';
import { startKeepalive } from '../lib/session';
import { API_URL, TPV_API_KEY } from '../lib/config';
import { C } from '../lib/theme';
import { setLastFloor, processPendingSales } from '../lib/api';
import { getTenantId } from '../lib/api';

export { ErrorBoundary } from 'expo-router';

function LayoutContent() {
  const { floor: _, setFloor, user, setUser } = useAppContext();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ch = connectRealtime(
      (f) => { setFloor(f); setLastFloor(f); },
      (data) => showReadyNotification(data),
      getTenantId(),
    );
    setReady(true);
    return () => { disconnectRealtime(); };
  }, [setFloor]);

  // Keepalive + session invalidation detection
  useEffect(() => {
    if (!user) return;
    const cleanup = startKeepalive(user.id, () => {
      Alert.alert('Sesión cerrada', 'Tu sesión fue cerrada porque otro terminal inició sesión con tu usuario.');
      setUser(null);
    });
    return () => cleanup();
  }, [user, setUser]);

  // Retry pending sales on startup, then every 30s
  useEffect(() => {
    processPendingSales();
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
          headers: { 'Content-Type': 'application/json', 'x-tpv-key': TPV_API_KEY, 'x-tenant-id': getTenantId() },
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

export default function RootLayout() {
  return (
    <AppProvider>
      <LayoutContent />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
