import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { fetchFloor, saveFloor, addSale } from '../../lib/api';
import { C } from '../../lib/theme';
import { globalFloor, setGlobalFloor, globalUser } from '../_layout';
import { broadcastFloorUpdate } from '../../lib/realtime';
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

function TableCard({ 
  table, 
  floor, 
  onPress, 
  onLongPress 
}: { 
  table: Table; 
  floor: Floor; 
  onPress: () => void; 
  onLongPress: () => void;
}) {
  const status = getTableStatus(table, floor);
  const bgColor = STATUS_COLORS[status] || C.surface;
  
  const itemCount = table.orderIds?.reduce((sum, oid) => {
    const order = floor.orders?.[oid];
    return sum + (order?.items?.length || 0);
  }, 0) || 0;

  const totalAmount = table.orderIds?.reduce((sum, oid) => {
    const order = floor.orders?.[oid];
    return sum + (order?.items?.reduce((s, i) => s + i.price * i.qty, 0) || 0);
  }, 0) || 0;

  const hasReadyItems = table.orderIds?.some(oid => {
    const order = floor.orders?.[oid];
    return order?.items?.some(i => i.sent && i.ready && !i.delivered);
  }) || false;

  return (
    <TouchableOpacity
      style={[styles.tableCard, { borderLeftColor: bgColor }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.tableHeader}>
        <View style={[styles.statusDot, { backgroundColor: bgColor }]} />
        <Text style={styles.tableName}>{table.name}</Text>
        {hasReadyItems && (
          <View style={styles.readyIndicator}>
            <Text style={styles.readyIndicatorText}>🛎️ listo</Text>
          </View>
        )}
      </View>
      <Text style={styles.tableStatus}>
        {status === 'libre' 
          ? 'Libre' 
          : status === 'ocupado' 
            ? `${itemCount} art. · ${totalAmount.toFixed(2)}€` 
            : `Pte. cuenta · ${totalAmount.toFixed(2)}€`}
      </Text>
      {table.type === 'mesa' && <Text style={styles.tableSeats}>{table.seats} pers.</Text>}
    </TouchableOpacity>
  );
}

export default function SaloonScreen() {
  const [floor, setFloor] = useState<Floor | null>(globalFloor);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(!globalFloor);
  const [activeZone, setActiveZone] = useState('Todos');

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

  // --- Quick Actions Logic ---
  async function pedirCuenta(table: Table) {
    if (!floor) return;
    const f = JSON.parse(JSON.stringify(floor)) as Floor;
    const t = f.tables.find(x => x.id === table.id);
    if (t) {
      t.status = 'cuenta';
      setFloor(f);
      setGlobalFloor(f);
      try {
        await saveFloor(f);
        broadcastFloorUpdate(f);
        Alert.alert('Cuenta solicitada', `El estado de la ${table.name} ha cambiado a "Cuenta".`);
      } catch (e) {
        Alert.alert('Error', 'No se pudo actualizar el estado en el servidor');
      }
    }
  }

  async function cobrarRapidoEfectivo(table: Table, total: number) {
    if (!floor) return;
    const f = JSON.parse(JSON.stringify(floor)) as Floor;
    const t = f.tables.find(x => x.id === table.id);
    
    const allOrderItems = Object.values(f.orders)
      .filter(o => o.tableId === table.id)
      .flatMap(o => o.items.map(i => ({ id: i.id, productId: i.productId, name: i.name, qty: i.qty, price: i.price })));

    if (t) { 
      t.status = 'libre'; 
      t.orderIds = []; 
      t.orderId = null; 
    }
    for (const oid of Object.keys(f.orders)) {
      if (f.orders[oid].tableId === table.id) {
        delete f.orders[oid];
      }
    }

    try {
      await addSale({
        id: Math.random().toString(36).slice(2, 10),
        tableId: table.id,
        tableName: table.name,
        items: allOrderItems,
        subtotal: total,
        discount: 0,
        discountAmount: 0,
        total,
        tip: 0,
        totalWithTip: total,
        payments: [{ method: 'efectivo', amount: total }],
        paymentMethod: 'Efectivo',
        isFiado: false,
        isDebtPayment: false,
        employeeId: null,
        employeeName: globalUser?.name || 'Camarero',
        closedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Error saving quick cash sale:', e);
    }

    setFloor(f);
    setGlobalFloor(f);
    try {
      await saveFloor(f);
      broadcastFloorUpdate(f);
      Alert.alert('✅ Mesa Cerrada', `Mesa ${table.name} cobrada en efectivo (${total.toFixed(2)}€)`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el estado en el servidor');
    }
  }

  function handleTableLongPress(table: Table) {
    if (!floor) return;
    const status = getTableStatus(table, floor);
    const totalAmount = table.orderIds?.reduce((sum, oid) => {
      const order = floor.orders?.[oid];
      return sum + (order?.items?.reduce((s, i) => s + i.price * i.qty, 0) || 0);
    }, 0) || 0;

    if (status === 'libre') {
      Alert.alert(
        `Mesa ${table.name}`,
        'La mesa está libre.',
        [
          { text: 'Abrir mesa (Añadir comanda)', onPress: () => router.push(`/mesa/${table.id}`) },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      return;
    }

    Alert.alert(
      `Acciones Rápidas: ${table.name}`,
      `Estado: ${status === 'ocupado' ? 'Ocupada' : 'Pendiente cuenta'}\nTotal: ${totalAmount.toFixed(2)}€`,
      [
        { text: 'Ver Detalle / Editar', onPress: () => router.push(`/mesa/${table.id}`) },
        { 
          text: 'Pedir Cuenta (Imprimir)', 
          onPress: () => pedirCuenta(table)
        },
        { 
          text: 'Cobrar en Efectivo (Rápido)', 
          onPress: () => cobrarRapidoEfectivo(table, totalAmount),
          style: 'destructive'
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  }

  // --- Grouping and Filtering Logic ---
  const regularTables = useMemo(() => {
    return floor ? floor.tables.filter(t => t.type !== 'llevar' && t.type !== 'domicilio') : [];
  }, [floor]);

  const deliveryTables = useMemo(() => {
    return floor ? floor.tables.filter(t => t.type === 'llevar' || t.type === 'domicilio') : [];
  }, [floor]);

  // Group regular tables by zone
  const tablesByZone = useMemo(() => {
    const groups: Record<string, Table[]> = {};
    for (const t of regularTables) {
      const zone = t.zone || 'Salón';
      if (!groups[zone]) {
        groups[zone] = [];
      }
      groups[zone].push(t);
    }
    return groups;
  }, [regularTables]);

  // Zones list for tabs
  const zonesList = useMemo(() => {
    if (!floor) return ['Todos'];
    const names = floor.zones?.map(z => z.name) || [];
    const present = Object.keys(tablesByZone);
    const combined = [
      ...names.filter(n => present.includes(n)),
      ...present.filter(n => !names.includes(n))
    ];
    if (deliveryTables.length > 0) {
      combined.push('Llevar / Domicilio');
    }
    return ['Todos', ...combined];
  }, [floor, tablesByZone, deliveryTables]);

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

  return (
    <View style={styles.container}>
      {/* Leyenda */}
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

      {/* Selector de zonas */}
      <View style={styles.zoneBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {zonesList.map(zoneName => (
            <TouchableOpacity
              key={zoneName}
              style={[styles.zoneBtn, activeZone === zoneName && styles.zoneBtnActive]}
              onPress={() => setActiveZone(zoneName)}
            >
              <Text style={[styles.zoneText, activeZone === zoneName && styles.zoneTextActive]}>
                {zoneName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brass} />}
      >
        {/* Render grouped tables */}
        {Object.entries(tablesByZone).map(([zoneName, tables]) => {
          if (activeZone !== 'Todos' && activeZone !== zoneName) return null;
          if (tables.length === 0) return null;
          return (
            <View key={zoneName} style={styles.zoneSection}>
              <Text style={styles.sectionTitle}>{zoneName.toUpperCase()}</Text>
              <View style={styles.tableGrid}>
                {tables.map(table => (
                  <TableCard
                    key={table.id}
                    table={table}
                    floor={floor}
                    onPress={() => router.push(`/mesa/${table.id}`)}
                    onLongPress={() => handleTableLongPress(table)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        {/* Render delivery/takeaway tables */}
        {deliveryTables.length > 0 && (activeZone === 'Todos' || activeZone === 'Llevar / Domicilio') && (
          <View style={styles.zoneSection}>
            <Text style={styles.sectionTitle}>PARA LLEVAR / DOMICILIO</Text>
            <View style={styles.tableGrid}>
              {deliveryTables.map(table => (
                <TableCard
                  key={table.id}
                  table={table}
                  floor={floor}
                  onPress={() => router.push(`/mesa/${table.id}`)}
                  onLongPress={() => handleTableLongPress(table)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.base, padding: 12 },
  scrollView: { flex: 1 },
  center: { flex: 1, backgroundColor: C.base, justifyContent: 'center', alignItems: 'center' },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginBottom: 12, paddingVertical: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: C.muted, fontSize: 12 },
  zoneBar: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.surface, marginBottom: 12 },
  zoneBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: C.surface, marginRight: 8 },
  zoneBtnActive: { backgroundColor: C.brass },
  zoneText: { fontSize: 12, color: C.muted },
  zoneTextActive: { color: C.base, fontWeight: '600' },
  zoneSection: { marginBottom: 8 },
  sectionTitle: { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 2, marginBottom: 8, marginTop: 4 },
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
  readyIndicator: {
    marginLeft: 'auto',
    backgroundColor: C.wine,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  readyIndicatorText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.surface, borderRadius: 8 },
  retryText: { color: C.brass, fontWeight: '600' },
});
