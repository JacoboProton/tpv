import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { verifyPin, fetchEmployees } from '../lib/api';
import { sessionLogin } from '../lib/session';
import type { Employee } from '../lib/types';
import { C } from '../lib/theme';
import { classifyError } from '../lib/errors';
import { useAppContext } from '../lib/store';
import { logError, logWarn, logInfo, logDebug } from '../lib/logger';

export default function LoginScreen() {
  const { setUser } = useAppContext();
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

  async function doVerify(emp: Employee, p: string) {
    setVerifying(true);
    try {
      const user = await verifyPin(p);

      // Check session (best-effort, no bloquea el login si falla)
      try {
        const sessionRes = await sessionLogin(user.id, user.role);
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
          if (!force) { setVerifying(false); setPin(''); return; }
          await sessionLogin(user.id, user.role, true);
        }
      } catch (e) {
        logWarn('Session check failed during login (non-critical)', { error: e, userId: user.id });
      }

      setUser(user);
      router.replace('/(tabs)/saloon');
    } catch {
      setPin('');
      Alert.alert('PIN incorrecto', 'Inténtalo de nuevo');
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
  pinDots: { flexDirection: 'row', gap: 12, marginBottom: 24 },
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
