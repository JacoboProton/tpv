import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { C } from '../../lib/theme';
import { classifyError } from '../../lib/errors';
import { fetchGestoriaOperations } from '../../lib/api';
import type { GestoriaOperationsResponse, GestoriaOperationEntry } from '../../lib/api';

type Section = 'adquisiciones' | 'entregas';

export default function OperationsRoute() {
  const [data, setData] = useState<GestoriaOperationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('adquisiciones');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchGestoriaOperations();
      setData(result);
    } catch (e: unknown) {
      const { title, message } = classifyError(e);
      setError(`${title}: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.brass} />
        <Text style={styles.loadingText}>Cargando operaciones...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const items: GestoriaOperationEntry[] =
    section === 'adquisiciones' ? data?.adquisiciones_intra || [] : data?.entregas_intra || [];

  function renderItem({ item }: { item: GestoriaOperationEntry }) {
    return (
      <View style={styles.item}>
        <Text style={styles.itemTitle}>NIF: {item.nif || '—'}</Text>
        <Text style={styles.itemSub}>Nombre: {item.name || '—'}</Text>
        <Text style={styles.itemSub}>Base: {item.base.toFixed(2)} €</Text>
        <Text style={styles.itemSub}>Operación: {item.operacion}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Operaciones intracomunitarias</Text>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, section === 'adquisiciones' && styles.tabActive]}
          onPress={() => setSection('adquisiciones')}
        >
          <Text style={[styles.tabText, section === 'adquisiciones' && styles.tabTextActive]}>
            Adquisiciones
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, section === 'entregas' && styles.tabActive]}
          onPress={() => setSection('entregas')}
        >
          <Text style={[styles.tabText, section === 'entregas' && styles.tabTextActive]}>
            Entregas
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item, i) => item.nif + '-' + i}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No hay operaciones.</Text>}
      />

      <View style={styles.totalBox}>
        <Text style={styles.total}>
          Total operaciones: {data?.total_operaciones?.toFixed(2) ?? '0.00'} €
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: C.base },
  center: { flex: 1, backgroundColor: C.base, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: C.muted, marginTop: 8 },
  errorText: { color: C.wine, fontSize: 14 },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.surface, borderRadius: 8 },
  retryText: { color: C.brass, fontWeight: '600' },
  header: { fontSize: 20, fontWeight: '700', color: C.cream, marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: C.surface },
  tabActive: { backgroundColor: C.brass },
  tabText: { color: C.muted, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: C.base },
  item: { padding: 12, marginVertical: 6, backgroundColor: C.surface, borderRadius: 8 },
  itemTitle: { fontWeight: '600', color: C.cream, marginBottom: 4 },
  itemSub: { color: C.muted, fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 20, color: C.muted },
  totalBox: { padding: 12, marginTop: 10, backgroundColor: C.surfaceLight, borderRadius: 8 },
  total: { fontSize: 16, fontWeight: '600', color: C.brass },
});
