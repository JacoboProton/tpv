import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { fetchFloor } from '../../lib/api';
import { C } from '../../lib/theme';
import { globalFloor, setGlobalFloor } from '../_layout';
import type { Floor, Table } from '../../lib/types';

const STATUS_COLORS: Record<string, string> = {
  libre: C.sage, ocupado: C.brass, cuenta: C.wine,
};

function getTableStatus(table: Table, floor: Floor): string {
  if (table.status === 'cuenta') return 'cuenta';
  if (table.orderIds && table.orderIds.length > 0) return 'ocupado';
  if (table.orderId) return 'ocupado';
  return 'libre';
}

function TableCard({ table, floor, onPress }: { table: Table; floor: Floor; onPress: () => void }) {
  const status = getTableStatus(table, floor);
  const bgColor = STATUS_COLORS[status] || C.surface;
  const itemCount = table.orderIds?.reduce((sum, oid) => {
    const order = floor.orders?.[oid];
    return sum + (order?.items?.length || 0);
  }, 0) || 0;

  return (
    <TouchableOpacity
      style={[styles.tableCard, { borderLeftColor: bgColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.tableHeader}>
        <View style={[styles.statusDot, { backgroundColor: bgColor }]} />
        <Text style={styles.tableName}>{table.name}</Text>
      </View>
      <Text style={styles.tableStatus}>{status === 'libre' ? 'Libre' : status === 'ocupado' ? `${itemCount} artículos` : 'Pendiente pago'}</Text>
      {table.type === 'mesa' && <Text style={styles.tableSeats}>{table.seats} pers.</Text>}
    </TouchableOpacity>
  );
}

export default function SaloonScreen() {
  const [floor, setFloor] = useState<Floor | null>(globalFloor);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(!globalFloor);

  useEffect(() => {
    if (!globalFloor) loadFloor();
  }, []);

  // Sync from global realtime updates
  useEffect(() => {
    if (globalFloor) setFloor(globalFloor);
  }, [globalFloor]);



  async function loadFloor() {
    try {
      const f = await fetchFloor();
      setFloor(f);
      setGlobalFloor(f);
    } catch (e) {
      console.error('Error loading floor', e);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadFloor();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.brass} />
      </View>
    );
  }

  if (!floor) {
    return (
      <View style={styles.center}>
        <Text style={{ color: C.muted }}>Error al cargar el salón</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadFloor}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mesas = floor.tables.filter(t => t.type === 'mesa');
  const barras = floor.tables.filter(t => t.type === 'barra');
  const delivery = floor.tables.filter(t => t.type === 'llevar' || t.type === 'domicilio');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brass} />}
    >
      <View style={styles.legend}>
        {Object.entries(STATUS_COLORS).map(([key, color]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>
              {key === 'libre' ? 'Libre' : key === 'ocupado' ? 'Ocupado' : 'Cuenta'}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>M E S A S</Text>
      <View style={styles.tableGrid}>
        {mesas.map(table => (
          <TableCard
            key={table.id}
            table={table}
            floor={floor}
            onPress={() => router.push(`/mesa/${table.id}`)}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>B A R R A</Text>
      <View style={styles.tableGrid}>
        {barras.map(table => (
          <TableCard
            key={table.id}
            table={table}
            floor={floor}
            onPress={() => router.push(`/mesa/${table.id}`)}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>P A R A   L L E V A R   /   D O M I C I L I O</Text>
      <View style={styles.tableGrid}>
        {delivery.map(table => (
          <TableCard
            key={table.id}
            table={table}
            floor={floor}
            onPress={() => router.push(`/mesa/${table.id}`)}
          />
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.base, padding: 12 },
  center: { flex: 1, backgroundColor: C.base, justifyContent: 'center', alignItems: 'center' },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginBottom: 16, paddingVertical: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: C.muted, fontSize: 12 },
  sectionTitle: { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 2, marginBottom: 8, marginTop: 8 },
  tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tableCard: {
    backgroundColor: C.surface, borderRadius: 10, padding: 12,
    borderLeftWidth: 3, width: '30%', minWidth: 100, flexGrow: 1,
  },
  tableHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  tableName: { fontSize: 14, fontWeight: '600', color: C.cream },
  tableStatus: { fontSize: 11, color: C.muted },
  tableSeats: { fontSize: 10, color: C.muted, marginTop: 2 },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.surface, borderRadius: 8 },
  retryText: { color: C.brass, fontWeight: '600' },
});
