import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { verifyPin, fetchEmployees, loadStoredSession, setSessionToken } from '../lib/api';
import { sessionLogin, sessionKeepalive } from '../lib/session';
import type { Employee } from '../lib/types';
import { C } from '../lib/theme';
import { classifyError } from '../lib/errors';
import { useAppContext } from '../lib/store';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { usePinLockout } from '../hooks/usePinLockout';
import { logWarn } from '../lib/logger';

export default function LoginScreen() {
  const { setUser } = useAppContext();
  const { supported, enrolled, authenticate } = useBiometricAuth();
  const { locked, remainingLabel, registerFailure, reset } = usePinLockout();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchEmployees()
      .then(setEmployees)
      .catch((e: unknown) => {
        const { title, message } = classifyError(e);
        Alert.alert(title, message);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleDigit(d: string) {
    if (locked) return;
    const next = pin + d;
    if (next.length > 4) return;
    setPin(next);
    if (next.length === 4 && selected) {
      doVerify(selected, next);
    }
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1));
  }

  async function establishSession(user: Employee, ticket?: string): Promise<boolean> {
    try {
      const sessionRes = await sessionLogin(user.id, user.role, false, ticket);
      if (sessionRes && sessionRes.conflict) {
        const force = await new Promise<boolean>(resolve => {
          Alert.alert(
            'Sesión duplicada',
            `${user.name} ya está conectado en otro terminal. ¿Cerrar esa sesión y continuar aquí?`,
            [
              { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Cerrar y continuar', style: 'destructive', onPress: () => resolve(true) },
            ],
          );
        });
        if (!force) return false;
        await sessionLogin(user.id, user.role, true, ticket);
      }
    } catch (e) {
      logWarn('Session check failed during login (non-critical)', { error: e, userId: user.id });
    }

    setUser(user);
    reset();
    router.replace('/(tabs)/saloon');
    return true;
  }

  async function doVerify(emp: Employee, p: string) {
    setVerifying(true);
    try {
      const user = await verifyPin(p);
      const ok = await establishSession(user, user.loginTicket);
      if (!ok) { setVerifying(false); setPin(''); }
    } catch {
      registerFailure();
      setPin('');
      Alert.alert('PIN incorrecto', 'Inténtalo de nuevo');
    } finally {
      setVerifying(false);
    }
  }

  async function doBiometricLogin(emp: Employee) {
    setVerifying(true);
    try {
      const ok = await authenticate();
      if (ok) {
        const stored = await loadStoredSession();
        if (stored.token && stored.employeeId === emp.id) {
          setSessionToken(stored.token);
          const sessionRes = await sessionKeepalive(emp.id);
          if (sessionRes && !sessionRes.invalidated) {
            setUser(emp);
            reset();
            router.replace('/(tabs)/saloon');
            setVerifying(false);
            return;
          }
        }
        setPin('');
        Alert.alert('Usa tu PIN', 'Autentícate primero con tu PIN para habilitar el acceso biométrico');
      }
    } catch {
      setPin('');
      Alert.alert('Autenticación fallida', 'Prueba de nuevo o usa tu PIN');
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={C.brass} />
      </View>
    );
  }

  if (locked) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>LA COMANDA</Text>
        <Text style={styles.lockTitle}>Demasiados intentos</Text>
        <Text style={styles.lockText}>
          PIN incorrecto repetido. La app queda bloqueada{'\n'}
          temporalmente. Inténtalo de nuevo en:{'\n\n'}
          <Text style={styles.lockTimer}>{remainingLabel}</Text>
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LA COMANDA</Text>
      <Text style={styles.subtitle}>Selecciona tu perfil</Text>

      <View style={styles.employeeList}>
        {employees.map(emp => (
          <TouchableOpacity
            key={emp.id}
            style={[
              styles.employeeBtn,
              selected?.id === emp.id && styles.employeeBtnActive,
            ]}
            onPress={() => { setSelected(emp); setPin(''); }}
          >
            <Text style={[
              styles.employeeName,
              selected?.id === emp.id && styles.employeeNameActive,
            ]}>{emp.name}</Text>
            <Text style={styles.employeeRole}>
              {emp.role === 'admin' ? 'Administrador' : 'Camarero'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selected && (
        <View style={styles.pinSection}>
          <Text style={styles.pinLabel}>PIN de {selected.name}</Text>
          <View style={styles.pinDots}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[styles.pinDot, pin.length > i && styles.pinDotFilled]} />
            ))}
          </View>
          {supported && enrolled && (
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={() => doBiometricLogin(selected)}
              disabled={verifying}
            >
              <Ionicons
                name={Platform.OS === 'ios' ? 'finger-print-outline' : 'finger-print'}
                size={20}
                color={C.brass}
              />
              <Text style={styles.biometricText}>Usar biometría</Text>
            </TouchableOpacity>
          )}
          <View style={styles.keypad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k, i) => (
              <TouchableOpacity
                key={i}
                style={styles.keyBtn}
                onPress={() => {
                  if (k === '⌫') handleDelete();
                  else if (typeof k === 'number') handleDigit(String(k));
                }}
                disabled={verifying}
              >
                <Text style={styles.keyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {verifying && (
        <View style={styles.verifyingOverlay}>
          <ActivityIndicator size="large" color={C.brass} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.base, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 36, fontWeight: '700', color: C.brass, letterSpacing: 4, marginBottom: 4, fontFamily: 'monospace' },
  subtitle: { fontSize: 14, color: C.muted, marginBottom: 32 },
  lockTitle: { fontSize: 22, fontWeight: '700', color: C.wine, marginBottom: 12 },
  lockText: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22 },
  lockTimer: { fontSize: 28, fontWeight: '700', color: C.brass },
  employeeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 32 },
  employeeBtn: {
    backgroundColor: C.surface, paddingHorizontal: 24, paddingVertical: 16,
    borderRadius: 12, borderWidth: 2, borderColor: 'transparent', minWidth: 140, alignItems: 'center',
  },
  employeeBtnActive: { borderColor: C.brass, backgroundColor: C.surfaceLight },
  employeeName: { fontSize: 16, fontWeight: '600', color: C.cream },
  employeeNameActive: { color: C.brassLight },
  employeeRole: { fontSize: 11, color: C.muted, marginTop: 2 },
  pinSection: { alignItems: 'center', width: '100%', maxWidth: 280 },
  pinLabel: { fontSize: 13, color: C.muted, marginBottom: 16 },
  biometricBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  biometricText: { fontSize: 13, color: C.brass, fontWeight: '600' },
  pinDots: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pinDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.surfaceLight, borderWidth: 2, borderColor: C.muted },
  pinDotFilled: { backgroundColor: C.brass, borderColor: C.brass },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  keyBtn: {
    width: 80, height: 56, backgroundColor: C.surface, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  keyText: { fontSize: 22, color: C.cream, fontWeight: '500' },
  verifyingOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
});
