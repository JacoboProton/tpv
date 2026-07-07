import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { C } from '../../lib/theme';
import { globalFloor } from '../_layout';
import type { Floor } from '../../lib/types';

export default function PedidosScreen() {
  const [floor, setFloor] = useState<Floor | null>(globalFloor);

  useEffect(() => {
    if (globalFloor) setFloor(globalFloor);
  }, [globalFloor]);

  const pendingOrders = Object.values(floor?.orders || {}).filter(o =>
    o.items.some(i => i.sent && !i.delivered)
  );

  const readyCount = pendingOrders.reduce((sum, o) =>
    sum + o.items.filter(i => i.ready && !i.delivered).length, 0
  );
  const cookingCount = pendingOrders.reduce((sum, o) =>
    sum + o.items.filter(i => i.sent && !i.ready && !i.delivered).length, 0
  );
  const totalPending = readyCount + cookingCount;

  function getTableName(tableId: string) {
    return floor?.tables.find(t => t.id === tableId)?.name || tableId;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pedidos</Text>
        <Text style={styles.count}>{totalPending} artículos</Text>
      </View>

      {totalPending > 0 && (
        <View style={styles.summary}>
          <View style={[styles.summaryBadge, { backgroundColor: C.sage }]}>
            <Text style={styles.summaryText}>{readyCount} listos para servir</Text>
          </View>
          <View style={[styles.summaryBadge, { backgroundColor: C.brass }]}>
            <Text style={styles.summaryText}>{cookingCount} en cocina</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.list}>
        {pendingOrders.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No hay pedidos pendientes</Text>
          </View>
        )}

        {pendingOrders.map(order => {
          const pendingItems = order.items.filter(i => i.sent && !i.delivered);
          return (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push(`/mesa/${order.tableId}`)}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderTable}>{getTableName(order.tableId)}</Text>
                <Text style={styles.orderCount}>{pendingItems.length} pendientes</Text>
              </View>
              {pendingItems.map(item => (
                <View key={item.id} style={styles.orderItem}>
                  <Text style={styles.itemQty}>{item.qty}x</Text>
                  <Text style={[styles.itemName, item.ready && !item.delivered && { color: C.sage }]}>
                    {item.name}
                  </Text>
                  {item.ready && !item.delivered ? (
                    <View style={[styles.miniBadge, { backgroundColor: C.sage }]}>
                      <Text style={styles.miniBadgeText}>Listo</Text>
                    </View>
                  ) : (
                    <View style={[styles.miniBadge, { backgroundColor: C.brass }]}>
                      <Text style={styles.miniBadgeText}>En cocina</Text>
                    </View>
                  )}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <Text style={styles.itemMods}>{item.modifiers.join(', ')}</Text>
                  )}
                </View>
              ))}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.surface },
  title: { fontSize: 18, fontWeight: '700', color: C.cream },
  count: { fontSize: 13, color: C.brass },
  list: { flex: 1, padding: 12 },
  orderCard: { backgroundColor: C.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderTable: { fontSize: 15, fontWeight: '600', color: C.cream },
  orderCount: { fontSize: 12, color: C.brass },
  orderItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  itemQty: { fontSize: 13, color: C.muted, fontWeight: '600', minWidth: 24 },
  itemName: { fontSize: 13, color: C.cream, flex: 1 },
  itemMods: { fontSize: 11, color: C.muted, flexBasis: '100%', marginLeft: 30 },
  summary: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
  summaryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  summaryText: { fontSize: 11, color: C.base, fontWeight: '600' },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniBadgeText: { fontSize: 9, color: C.base, fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: C.muted, fontSize: 14 },
});
