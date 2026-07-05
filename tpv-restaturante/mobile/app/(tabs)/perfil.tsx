import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../lib/theme';
import { setGlobalUser, globalUser } from '../_layout';

export default function PerfilScreen() {
  const user = globalUser;

  function handleLogout() {
    setGlobalUser(null);
    router.replace('/');
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={C.brass} />
        </View>
        <Text style={styles.name}>{user?.name || 'Usuario'}</Text>
        <Text style={styles.role}>{user?.role === 'admin' ? 'Administrador' : 'Camarero'}</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Rol</Text>
          <Text style={styles.infoValue}>{user?.role === 'admin' ? 'Administrador' : 'Camarero'}</Text>
        </View>
        {user?.personalDiscountEnabled && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Descuento personal</Text>
            <Text style={styles.infoValue}>{user.monthlyUsed}€ / {user.monthlyLimit}€</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={C.wine} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>La Comanda v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.base, padding: 20 },
  profileCard: { alignItems: 'center', paddingVertical: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  name: { fontSize: 22, fontWeight: '700', color: C.cream },
  role: { fontSize: 13, color: C.muted, marginTop: 4 },
  infoSection: { backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 24 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.surfaceLight },
  infoLabel: { fontSize: 14, color: C.muted },
  infoValue: { fontSize: 14, color: C.cream, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: C.surface, borderRadius: 10 },
  logoutText: { color: C.wine, fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', color: C.muted, fontSize: 11, marginTop: 40 },
});
